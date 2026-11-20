-- Etappe 1: Wunschliste.
-- Jede Zeile gehört einem Konto (konto_id). Zeilenschutz auf jeder Tabelle.
-- Reservierungen liegen in eigenen Tabellen, die niemand direkt lesen darf; nur die Funktionen
-- unten kommen dran. So gibt die Datenbank meiner Ansicht nie heraus, welcher Wunsch reserviert ist.

-- ---------- Konto ----------
create table public.konto (
  id          uuid primary key references auth.users (id) on delete cascade,
  anzeigename text not null default '' check (char_length(anzeigename) <= 40),
  angelegt    timestamptz not null default now()
);

-- Neues Anmeldekonto bekommt automatisch seine Zeile (Name aus dem Teil vor dem @, änderbar).
create function public.konto_anlegen() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.konto (id, anzeigename)
  values (new.id, initcap(left(split_part(coalesce(new.email, ''), '@', 1), 40)))
  on conflict (id) do nothing;
  return new;
end $$;
revoke all on function public.konto_anlegen() from public, anon, authenticated;

create trigger konto_anlegen after insert on auth.users
  for each row execute function public.konto_anlegen();

-- ---------- Wunsch (gehört mir, nicht der Liste) ----------
create table public.wunsch (
  id            uuid primary key default gen_random_uuid(),
  konto_id      uuid not null default auth.uid() references public.konto (id) on delete cascade,
  titel         text not null check (char_length(titel) between 1 and 120),
  beschreibung  text not null default '' check (char_length(beschreibung) <= 400),
  bild_pfad     text check (bild_pfad ~ '^[a-z0-9-]+/[a-z0-9-]+\.(jpg|png|webp|gif|avif)$'),
  shop_url      text check (shop_url ~* '^https?://' and char_length(shop_url) <= 2000),
  haendler      text not null default '' check (char_length(haendler) <= 40),
  preis_ca      numeric(10, 2) check (preis_ca >= 0),
  preis_stand   date,
  zusammenlegen boolean not null default false,
  angelegt      timestamptz not null default now(),
  entfernt_am   timestamptz,
  unique (id, konto_id)
);
create index wunsch_konto on public.wunsch (konto_id);

-- ---------- Liste (ein Anlass, ein Link) ----------
create function public.neuer_schluessel() returns text
language sql volatile set search_path = public, pg_temp as $$
  -- 132 Bit aus zwei Zufalls-UUIDs, URL-tauglich (22 Zeichen).
  select left(translate(encode(sha256(convert_to(gen_random_uuid()::text || gen_random_uuid()::text, 'UTF8')), 'base64'), '+/=', '-_'), 22)
$$;
revoke all on function public.neuer_schluessel() from public, anon;
grant execute on function public.neuer_schluessel() to authenticated; -- Vorgabewert beim Anlegen einer Liste

create table public.liste (
  id              uuid primary key default gen_random_uuid(),
  konto_id        uuid not null default auth.uid() references public.konto (id) on delete cascade,
  titel           text not null check (char_length(titel) between 1 and 60),
  anlass_datum    date,
  link_schluessel text not null unique default public.neuer_schluessel(),
  archiviert      boolean not null default false,
  angelegt        timestamptz not null default now(),
  unique (id, konto_id)
);
create index liste_konto on public.liste (konto_id);

create table public.liste_wunsch (
  liste_id    uuid not null,
  wunsch_id   uuid not null,
  konto_id    uuid not null default auth.uid(),
  reihenfolge integer not null default 0,
  primary key (liste_id, wunsch_id),
  -- Liste und Wunsch müssen demselben Konto gehören.
  foreign key (liste_id, konto_id) references public.liste (id, konto_id) on delete cascade,
  foreign key (wunsch_id, konto_id) references public.wunsch (id, konto_id) on delete cascade
);
create index liste_wunsch_wunsch on public.liste_wunsch (wunsch_id);
create index liste_wunsch_konto on public.liste_wunsch (konto_id);

-- ---------- Reservierungen: für niemanden lesbar ----------
create table public.reservierung (
  id          uuid primary key default gen_random_uuid(),
  konto_id    uuid not null references public.konto (id) on delete cascade, -- Besitzer der Liste
  wunsch_id   uuid not null references public.wunsch (id) on delete cascade,
  liste_id    uuid not null references public.liste (id) on delete cascade, -- über welchen Link
  art         text not null check (art in ('schenke_ich', 'bin_dabei')),
  vorname     text check (art = 'bin_dabei' or vorname is null) check (char_length(vorname) <= 30),
  geraet_hash text not null check (char_length(geraet_hash) = 64),
  angelegt    timestamptz not null default now()
);
-- Ein Wunsch kann nur einmal „Das schenke ich“ haben; ein Gerät ist pro Wunsch höchstens einmal dabei.
create unique index reservierung_einmal on public.reservierung (wunsch_id) where art = 'schenke_ich';
create unique index reservierung_geraet on public.reservierung (wunsch_id, geraet_hash);
create index reservierung_liste on public.reservierung (liste_id);
create index reservierung_konto on public.reservierung (konto_id);

create table public.wunsch_voll (
  wunsch_id           uuid primary key references public.wunsch (id) on delete cascade,
  konto_id            uuid not null references public.konto (id) on delete cascade,
  liste_id            uuid not null references public.liste (id) on delete cascade,
  markiert_von_geraet text not null check (char_length(markiert_von_geraet) = 64),
  markiert_am         timestamptz not null default now()
);
create index wunsch_voll_konto on public.wunsch_voll (konto_id);
create index wunsch_voll_liste on public.wunsch_voll (liste_id);

-- ---------- Zeilenschutz ----------
alter table public.konto        enable row level security;
alter table public.wunsch       enable row level security;
alter table public.liste        enable row level security;
alter table public.liste_wunsch enable row level security;
alter table public.reservierung enable row level security;
alter table public.wunsch_voll  enable row level security;

-- Gäste ohne Anmeldung bekommen auf keine Tabelle Rechte.
revoke all on public.konto, public.wunsch, public.liste, public.liste_wunsch, public.reservierung, public.wunsch_voll from anon, public;
-- Reservierungen: auch angemeldet keine Rechte. Nur die Funktionen unten.
revoke all on public.reservierung, public.wunsch_voll from authenticated;

revoke all on public.konto from authenticated;
grant select, update (anzeigename) on public.konto to authenticated;
create policy konto_eigen_lesen on public.konto for select to authenticated using (id = (select auth.uid()));
create policy konto_eigen_aendern on public.konto for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Wünsche werden nie gelöscht, nur ausgeblendet (entfernt_am). Sonst verriete das Verschwinden
-- einer Reservierung aus „3 Wünsche vergeben“, welcher Wunsch vergeben war.
revoke all on public.wunsch from authenticated;
grant select, insert on public.wunsch to authenticated;
grant update (titel, beschreibung, bild_pfad, shop_url, haendler, preis_ca, preis_stand, zusammenlegen, entfernt_am)
  on public.wunsch to authenticated;
create policy wunsch_eigen_lesen on public.wunsch for select to authenticated using (konto_id = (select auth.uid()));
create policy wunsch_eigen_anlegen on public.wunsch for insert to authenticated with check (konto_id = (select auth.uid()));
create policy wunsch_eigen_aendern on public.wunsch for update to authenticated
  using (konto_id = (select auth.uid())) with check (konto_id = (select auth.uid()));

revoke all on public.liste from authenticated;
grant select, insert, delete on public.liste to authenticated;
grant update (titel, anlass_datum, archiviert) on public.liste to authenticated;
create policy liste_eigen_lesen on public.liste for select to authenticated using (konto_id = (select auth.uid()));
create policy liste_eigen_anlegen on public.liste for insert to authenticated with check (konto_id = (select auth.uid()));
create policy liste_eigen_aendern on public.liste for update to authenticated
  using (konto_id = (select auth.uid())) with check (konto_id = (select auth.uid()));
create policy liste_eigen_loeschen on public.liste for delete to authenticated using (konto_id = (select auth.uid()));

revoke all on public.liste_wunsch from authenticated;
grant select, insert, delete on public.liste_wunsch to authenticated;
grant update (reihenfolge) on public.liste_wunsch to authenticated;
create policy lw_eigen_lesen on public.liste_wunsch for select to authenticated using (konto_id = (select auth.uid()));
create policy lw_eigen_anlegen on public.liste_wunsch for insert to authenticated with check (konto_id = (select auth.uid()));
create policy lw_eigen_aendern on public.liste_wunsch for update to authenticated
  using (konto_id = (select auth.uid())) with check (konto_id = (select auth.uid()));
create policy lw_eigen_loeschen on public.liste_wunsch for delete to authenticated using (konto_id = (select auth.uid()));

-- ---------- Hilfen für die Gast-Funktionen ----------
-- Prüfsumme des Geräte-Schlüssels. Der Schlüssel selbst wird nie gespeichert.
create function public.geraet_pruefsumme(p_geraet text) returns text
language plpgsql immutable set search_path = public, pg_temp as $$
begin
  if p_geraet is null or p_geraet !~ '^[A-Za-z0-9_-]{32,128}$' then
    raise exception 'geraet_ungueltig' using errcode = '22023';
  end if;
  return encode(sha256(convert_to(p_geraet, 'UTF8')), 'hex');
end $$;
revoke all on function public.geraet_pruefsumme(text) from public, anon, authenticated;

-- Liste zum Schlüssel; nur nicht archivierte, nur fremde (der Besitzer reserviert nicht bei sich selbst).
create function public.gast_liste_finden(p_schluessel text) returns public.liste
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare l public.liste;
begin
  select * into l from public.liste where link_schluessel = p_schluessel;
  if not found or l.archiviert then
    raise exception 'liste_unbekannt' using errcode = 'P0002';
  end if;
  if auth.uid() is not null and auth.uid() = l.konto_id then
    raise exception 'eigene_liste' using errcode = '42501';
  end if;
  return l;
end $$;
revoke all on function public.gast_liste_finden(text) from public, anon, authenticated;

-- ---------- Gast: Liste ansehen ----------
-- Gibt nur festgelegte Felder heraus. Fremde Reservierungen erscheinen nur als „weg“ (Wunsch fehlt).
-- Ruft der angemeldete Besitzer seinen eigenen Link auf, kommt eine Vorschau ohne jeden Stand.
create function public.gast_liste(p_schluessel text, p_geraet text) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  l public.liste;
  name text;
  g text;
  vorschau boolean;
  wuensche jsonb;
begin
  select * into l from public.liste where link_schluessel = p_schluessel;
  if not found then
    return null;
  end if;
  select anzeigename into name from public.konto where id = l.konto_id;
  if l.archiviert then
    return jsonb_build_object('titel', l.titel, 'besitzer', name, 'archiviert', true);
  end if;
  vorschau := auth.uid() is not null and auth.uid() = l.konto_id;
  g := case when vorschau then null else public.geraet_pruefsumme(p_geraet) end;

  select coalesce(jsonb_agg(jsonb_build_object(
             'id', w.id,
             'titel', w.titel,
             'beschreibung', w.beschreibung,
             'bild_pfad', w.bild_pfad,
             'shop_url', w.shop_url,
             'haendler', w.haendler,
             'preis_ca', w.preis_ca,
             'preis_stand', w.preis_stand,
             'zusammenlegen', w.zusammenlegen,
             'entfernt', w.entfernt_am is not null,
             'stand', case
                        when vorschau then 'frei'
                        when meins.art = 'schenke_ich' then 'von_dir'
                        when meins.art = 'bin_dabei' then 'dabei'
                        else 'frei' end,
             'voll', case when not vorschau and meins.art = 'bin_dabei' then v.wunsch_id is not null else false end,
             'beteiligte', case when vorschau or not w.zusammenlegen then 0 else (
                 select count(*) from public.reservierung r2
                 where r2.wunsch_id = w.id and r2.art = 'bin_dabei' and r2.geraet_hash <> g) end,
             'vornamen', case when vorschau or not w.zusammenlegen then '[]'::jsonb else (
                 select coalesce(jsonb_agg(r2.vorname order by r2.angelegt), '[]'::jsonb) from public.reservierung r2
                 where r2.wunsch_id = w.id and r2.art = 'bin_dabei' and r2.geraet_hash <> g and r2.vorname is not null) end
           ) order by lw.reihenfolge, w.angelegt), '[]'::jsonb) into wuensche
    from public.liste_wunsch lw
    join public.wunsch w on w.id = lw.wunsch_id
    left join public.reservierung meins on not vorschau and meins.wunsch_id = w.id and meins.geraet_hash = g
    left join public.wunsch_voll v on v.wunsch_id = w.id
    where lw.liste_id = l.id
      and (
        vorschau and w.entfernt_am is null
        or not vorschau and (
          meins.id is not null                      -- meins: immer sichtbar, auch wenn entfernt
          or w.entfernt_am is null
             and v.wunsch_id is null                -- voll: weg für alle anderen
             and not exists (                        -- fremdes „Das schenke ich“: weg
               select 1 from public.reservierung r
               where r.wunsch_id = w.id and r.art = 'schenke_ich')
             and (w.zusammenlegen or not exists (     -- normaler Wunsch mit irgendeiner Reservierung: weg
               select 1 from public.reservierung r where r.wunsch_id = w.id))
        )
      );

  return jsonb_build_object(
    'titel', l.titel,
    'anlass_datum', l.anlass_datum,
    'besitzer', name,
    'archiviert', false,
    'vorschau', vorschau,
    'wuensche', wuensche
  );
end $$;

-- ---------- Gast: reservieren ----------
create function public.gast_reservieren(p_schluessel text, p_wunsch uuid, p_geraet text, p_vorname text default null)
returns jsonb
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  l public.liste;
  w public.wunsch;
  g text := public.geraet_pruefsumme(p_geraet);
  vn text := nullif(left(btrim(regexp_replace(coalesce(p_vorname, ''), '\s+', ' ', 'g')), 30), '');
begin
  l := public.gast_liste_finden(p_schluessel);
  -- Sperrt den Wunsch: zwei gleichzeitige Tipps laufen nacheinander, nur der erste gewinnt.
  select w2.* into w from public.wunsch w2
    join public.liste_wunsch lw on lw.wunsch_id = w2.id and lw.liste_id = l.id
    where w2.id = p_wunsch
    for update of w2;
  if not found or w.entfernt_am is not null then
    return jsonb_build_object('ok', false, 'grund', 'weg');
  end if;
  if exists (select 1 from public.reservierung where wunsch_id = w.id and geraet_hash = g) then
    return jsonb_build_object('ok', true);
  end if;
  if w.zusammenlegen then
    if exists (select 1 from public.wunsch_voll where wunsch_id = w.id)
       or exists (select 1 from public.reservierung where wunsch_id = w.id and art = 'schenke_ich') then
      return jsonb_build_object('ok', false, 'grund', 'weg');
    end if;
    insert into public.reservierung (konto_id, wunsch_id, liste_id, art, vorname, geraet_hash)
    values (w.konto_id, w.id, l.id, 'bin_dabei', vn, g);
  else
    if exists (select 1 from public.reservierung where wunsch_id = w.id) then
      return jsonb_build_object('ok', false, 'grund', 'weg');
    end if;
    insert into public.reservierung (konto_id, wunsch_id, liste_id, art, geraet_hash)
    values (w.konto_id, w.id, l.id, 'schenke_ich', g);
  end if;
  return jsonb_build_object('ok', true);
exception when unique_violation then
  return jsonb_build_object('ok', false, 'grund', 'weg');
end $$;

-- ---------- Gast: zurücknehmen (nur dasselbe Gerät) ----------
-- Steigt jemand beim Zusammenlegen aus, ist der Wunsch nicht mehr voll und für andere wieder da.
create function public.gast_zuruecknehmen(p_schluessel text, p_wunsch uuid, p_geraet text) returns jsonb
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  l public.liste;
  g text := public.geraet_pruefsumme(p_geraet);
  weg public.reservierung;
begin
  l := public.gast_liste_finden(p_schluessel);
  delete from public.reservierung r
   where r.wunsch_id = p_wunsch and r.geraet_hash = g
     and exists (select 1 from public.liste_wunsch lw where lw.liste_id = l.id and lw.wunsch_id = r.wunsch_id)
  returning * into weg;
  if weg.id is null then
    return jsonb_build_object('ok', false);
  end if;
  if weg.art = 'bin_dabei' then
    delete from public.wunsch_voll where wunsch_id = p_wunsch;
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- ---------- Gast: „Ist voll“ (nur Beteiligte) ----------
create function public.gast_voll(p_schluessel text, p_wunsch uuid, p_geraet text) returns jsonb
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  l public.liste;
  g text := public.geraet_pruefsumme(p_geraet);
  r public.reservierung;
begin
  l := public.gast_liste_finden(p_schluessel);
  select * into r from public.reservierung
   where wunsch_id = p_wunsch and geraet_hash = g and art = 'bin_dabei'
     and exists (select 1 from public.liste_wunsch lw where lw.liste_id = l.id and lw.wunsch_id = p_wunsch);
  if not found then
    return jsonb_build_object('ok', false);
  end if;
  insert into public.wunsch_voll (wunsch_id, konto_id, liste_id, markiert_von_geraet)
  values (p_wunsch, r.konto_id, l.id, g)
  on conflict (wunsch_id) do nothing;
  return jsonb_build_object('ok', true);
end $$;

-- ---------- Ich: nur die Zahl ----------
-- Zählt Wünsche, die über den Link dieser Liste vergeben wurden. Nie welche, nie von wem.
create function public.mein_stand(p_liste uuid) returns integer
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null or not exists (select 1 from public.liste where id = p_liste and konto_id = auth.uid()) then
    return null;
  end if;
  return (select count(distinct wunsch_id)::integer from public.reservierung where liste_id = p_liste);
end $$;

-- ---------- Ausführungsrechte: nur ausdrücklich ----------
revoke all on function public.gast_liste(text, text) from public;
revoke all on function public.gast_reservieren(text, uuid, text, text) from public;
revoke all on function public.gast_zuruecknehmen(text, uuid, text) from public;
revoke all on function public.gast_voll(text, uuid, text) from public;
revoke all on function public.mein_stand(uuid) from public, anon;
grant execute on function public.gast_liste(text, text) to anon, authenticated;
grant execute on function public.gast_reservieren(text, uuid, text, text) to anon, authenticated;
grant execute on function public.gast_zuruecknehmen(text, uuid, text) to anon, authenticated;
grant execute on function public.gast_voll(text, uuid, text) to anon, authenticated;
grant execute on function public.mein_stand(uuid) to authenticated;

-- ---------- Bilder: öffentlicher Ordner, zufällige Namen, schreiben nur der Server ----------
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('wunschbilder', 'wunschbilder', true, 3145728,
            array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'])
    on conflict (id) do nothing;
  end if;
end $$;
