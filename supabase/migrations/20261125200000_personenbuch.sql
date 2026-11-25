-- Etappe 2: Personenbuch.
-- Alles hier ist privat: lesen und schreiben nur mit dem eigenen Konto, Gäste haben auf nichts Rechte.
-- Verweise zwischen den Tabellen laufen immer über (id, konto_id), damit nichts an fremden Zeilen hängen kann.

-- ---------- Person (Menschen in meinem Leben und ich selbst) ----------
create table public.person (
  id                 uuid primary key default gen_random_uuid(),
  konto_id           uuid not null default auth.uid() references public.konto (id) on delete cascade,
  ist_ich            boolean not null default false,
  name               text not null check (char_length(btrim(name)) between 1 and 80),
  rufname            text not null default '' check (char_length(rufname) <= 40),
  geburtstag_tag     smallint,
  geburtstag_monat   smallint check (geburtstag_monat between 1 and 12),
  geburtsjahr        smallint check (geburtsjahr between 1850 and 2200),
  kennen_woher       text not null default '' check (char_length(kennen_woher) <= 200),
  schenke_geburtstag boolean not null default true,
  schenke_weihnachten boolean not null default false,
  farbe              text not null default 'flieder' check (farbe in ('flieder', 'pfirsich', 'salbei', 'sand', 'rose')),
  angelegt           timestamptz not null default now(),
  unique (id, konto_id),
  check ((geburtstag_tag is null) = (geburtstag_monat is null)),
  check (geburtsjahr is null or geburtstag_tag is not null),
  check (geburtstag_tag between 1 and case when geburtstag_monat = 2 then 29
                                           when geburtstag_monat in (4, 6, 9, 11) then 30 else 31 end)
);
create index person_konto on public.person (konto_id);
create unique index person_ich on public.person (konto_id) where ist_ich;

-- ---------- Steckbrief: freie Zeilen (Schuhgröße: 42) ----------
create table public.steckbrief (
  id          uuid primary key default gen_random_uuid(),
  konto_id    uuid not null default auth.uid() references public.konto (id) on delete cascade,
  person_id   uuid not null,
  bezeichnung text not null check (char_length(btrim(bezeichnung)) between 1 and 40),
  wert        text not null check (char_length(btrim(wert)) between 1 and 200),
  reihenfolge integer not null default 0,
  foreign key (person_id, konto_id) references public.person (id, konto_id) on delete cascade
);
create index steckbrief_person on public.steckbrief (person_id);
create index steckbrief_konto on public.steckbrief (konto_id);

-- ---------- Familie: Name, dazu freiwillig die Person im Buch ----------
create table public.beziehung (
  id               uuid primary key default gen_random_uuid(),
  konto_id         uuid not null default auth.uid() references public.konto (id) on delete cascade,
  person_id        uuid not null,
  andere_person_id uuid,
  name             text not null check (char_length(btrim(name)) between 1 and 80),
  art              text not null default '' check (char_length(art) <= 40),
  reihenfolge      integer not null default 0,
  foreign key (person_id, konto_id) references public.person (id, konto_id) on delete cascade,
  foreign key (andere_person_id, konto_id) references public.person (id, konto_id) on delete set null (andere_person_id),
  check (andere_person_id is distinct from person_id)
);
create index beziehung_person on public.beziehung (person_id);
create index beziehung_andere on public.beziehung (andere_person_id);
create index beziehung_konto on public.beziehung (konto_id);

-- ---------- Eigene Arten (die vorgegebenen stehen fest in eintrag.art) ----------
create table public.art (
  id       uuid primary key default gen_random_uuid(),
  konto_id uuid not null default auth.uid() references public.konto (id) on delete cascade,
  name     text not null check (char_length(btrim(name)) between 1 and 24),
  angelegt timestamptz not null default now(),
  unique (id, konto_id)
);
create unique index art_name on public.art (konto_id, lower(name));

-- ---------- Eintrag: ein Satz über jemanden ----------
create table public.eintrag (
  id        uuid primary key default gen_random_uuid(),
  konto_id  uuid not null default auth.uid() references public.konto (id) on delete cascade,
  person_id uuid not null,
  art       text check (art in ('mag', 'magnicht', 'interesse', 'geschichte', 'erlebnis')),
  art_id    uuid,
  text      text not null check (char_length(btrim(text)) between 1 and 4000),
  datum     date not null default current_date,      -- Tag des Geschehens, danach sortiert der Faden
  genau     text not null default 'tag' check (genau in ('tag', 'monat', 'jahr')), -- „2014“ reicht
  angelegt  timestamptz not null default now(),
  geaendert timestamptz not null default now(),
  foreign key (person_id, konto_id) references public.person (id, konto_id) on delete cascade,
  foreign key (art_id, konto_id) references public.art (id, konto_id) on delete set null (art_id),
  check (art is null or art_id is null)
);
create index eintrag_person on public.eintrag (person_id, datum);
create index eintrag_konto on public.eintrag (konto_id);
create index eintrag_art on public.eintrag (art_id);

-- ---------- Geschenk: Idee / besorgt / verschenkt, für welchen Anlass ----------
create table public.geschenk (
  id          uuid primary key default gen_random_uuid(),
  konto_id    uuid not null default auth.uid() references public.konto (id) on delete cascade,
  person_id   uuid not null,
  titel       text not null check (char_length(btrim(titel)) between 1 and 200),
  notiz       text not null default '' check (char_length(notiz) <= 4000),
  bild_pfad   text check (bild_pfad ~ '^[a-z0-9-]+/[a-z0-9-]+\.(jpg|png|webp|gif|avif)$'),
  shop_url    text check (shop_url ~* '^https?://' and char_length(shop_url) <= 2000),
  haendler    text not null default '' check (char_length(haendler) <= 40),
  preis_ca    numeric(10, 2) check (preis_ca >= 0),
  preis_stand date,
  stand       text not null default 'idee' check (stand in ('idee', 'besorgt', 'verschenkt')),
  anlass      text not null default '' check (char_length(anlass) <= 40),
  anlass_jahr smallint check (anlass_jahr between 1900 and 2200),
  angelegt    timestamptz not null default now(),
  foreign key (person_id, konto_id) references public.person (id, konto_id) on delete cascade
);
create index geschenk_person on public.geschenk (person_id);
create index geschenk_konto on public.geschenk (konto_id);

-- ---------- Kalender zum Abonnieren: ein Schlüssel je Konto, neu erzeugbar ----------
create table public.kalender_abo (
  konto_id   uuid primary key default auth.uid() references public.konto (id) on delete cascade,
  schluessel text not null unique default public.neuer_schluessel(),
  angelegt   timestamptz not null default now()
);

-- ---------- Rechte und Zeilenschutz ----------
alter table public.person       enable row level security;
alter table public.steckbrief   enable row level security;
alter table public.beziehung    enable row level security;
alter table public.art          enable row level security;
alter table public.eintrag      enable row level security;
alter table public.geschenk     enable row level security;
alter table public.kalender_abo enable row level security;

revoke all on public.person, public.steckbrief, public.beziehung, public.art, public.eintrag, public.geschenk, public.kalender_abo
  from anon, public, authenticated;

grant select, delete on public.person, public.steckbrief, public.beziehung, public.art, public.eintrag, public.geschenk, public.kalender_abo
  to authenticated;
grant insert on public.person, public.steckbrief, public.beziehung, public.art, public.eintrag, public.geschenk to authenticated;
grant insert (konto_id) on public.kalender_abo to authenticated; -- Schlüssel kommt immer aus der Datenbank
-- konto_id, id und ist_ich lassen sich nie ändern.
grant update (name, rufname, geburtstag_tag, geburtstag_monat, geburtsjahr, kennen_woher, schenke_geburtstag, schenke_weihnachten, farbe)
  on public.person to authenticated;
grant update (bezeichnung, wert, reihenfolge) on public.steckbrief to authenticated;
grant update (andere_person_id, name, art, reihenfolge) on public.beziehung to authenticated;
grant update (name) on public.art to authenticated;
grant update (person_id, art, art_id, text, datum, genau, geaendert) on public.eintrag to authenticated;
grant update (person_id, titel, notiz, bild_pfad, shop_url, haendler, preis_ca, preis_stand, stand, anlass, anlass_jahr)
  on public.geschenk to authenticated;

do $$
declare t text;
begin
  foreach t in array array['steckbrief', 'beziehung', 'art', 'eintrag', 'geschenk'] loop
    execute format('create policy %I on public.%I for select to authenticated using (konto_id = (select auth.uid()))', t || '_eigen_lesen', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (konto_id = (select auth.uid()))', t || '_eigen_anlegen', t);
    execute format('create policy %I on public.%I for update to authenticated using (konto_id = (select auth.uid())) with check (konto_id = (select auth.uid()))', t || '_eigen_aendern', t);
    execute format('create policy %I on public.%I for delete to authenticated using (konto_id = (select auth.uid()))', t || '_eigen_loeschen', t);
  end loop;
end $$;

-- Die eigene Seite legt nur die Datenbank an, und sie lässt sich nicht einzeln löschen.
create policy person_eigen_lesen on public.person for select to authenticated using (konto_id = (select auth.uid()));
create policy person_eigen_anlegen on public.person for insert to authenticated with check (konto_id = (select auth.uid()) and not ist_ich);
create policy person_eigen_aendern on public.person for update to authenticated
  using (konto_id = (select auth.uid())) with check (konto_id = (select auth.uid()));
create policy person_eigen_loeschen on public.person for delete to authenticated using (konto_id = (select auth.uid()) and not ist_ich);

create policy kalender_eigen_lesen on public.kalender_abo for select to authenticated using (konto_id = (select auth.uid()));
create policy kalender_eigen_anlegen on public.kalender_abo for insert to authenticated with check (konto_id = (select auth.uid()));
create policy kalender_eigen_loeschen on public.kalender_abo for delete to authenticated using (konto_id = (select auth.uid()));

-- ---------- Meine eigene Seite: jedes Konto hat genau eine ----------
create function public.ich_anlegen() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.person (konto_id, ist_ich, name, schenke_geburtstag)
  values (new.id, true, coalesce(nullif(btrim(new.anzeigename), ''), 'Ich'), false);
  return new;
end $$;
revoke all on function public.ich_anlegen() from public, anon, authenticated;
create trigger ich_anlegen after insert on public.konto for each row execute function public.ich_anlegen();

insert into public.person (konto_id, ist_ich, name, schenke_geburtstag)
select k.id, true, coalesce(nullif(btrim(k.anzeigename), ''), 'Ich'), false from public.konto k
where not exists (select 1 from public.person p where p.konto_id = k.id and p.ist_ich);

-- ---------- Kalender: nur Name und Tag, nur für die Edge Function ----------
create function public.kalender_daten(p_schluessel text) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', p.id, 'name', coalesce(nullif(p.rufname, ''), p.name),
           'tag', p.geburtstag_tag, 'monat', p.geburtstag_monat, 'jahr', p.geburtsjahr)
           order by p.geburtstag_monat, p.geburtstag_tag) filter (where p.id is not null), '[]'::jsonb)
  from public.kalender_abo a
  left join public.person p on p.konto_id = a.konto_id and not p.ist_ich and p.geburtstag_tag is not null
  where a.schluessel = p_schluessel
  having count(a.konto_id) > 0
$$;
revoke all on function public.kalender_daten(text) from public, anon, authenticated;
grant execute on function public.kalender_daten(text) to service_role;
