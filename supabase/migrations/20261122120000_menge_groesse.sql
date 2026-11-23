-- Wunsch mehrfach (z. B. ein Trikot zweimal) und mit Größe.
-- Ein Wunsch mit Anzahl 2 kann von zwei Geräten je einmal reserviert werden; erst dann ist er für
-- alle anderen weg. Ein Gerät reserviert pro Wunsch höchstens ein Stück (Annahme, Lukas entscheidet).
-- Zusammenlegen gibt es nur für Wünsche mit Anzahl 1.

alter table public.wunsch
  add column menge   smallint not null default 1 check (menge between 1 and 9),
  add column groesse text not null default '' check (char_length(groesse) <= 20),
  add constraint wunsch_zusammen_einmal check (not zusammenlegen or menge = 1);

grant update (menge, groesse) on public.wunsch to authenticated;

-- „Das schenke ich“ darf es jetzt so oft geben, wie der Wunsch Stück hat. Die Grenze prüft
-- gast_reservieren unter Sperre des Wunsches; ein Gerät bleibt pro Wunsch einmalig (reservierung_geraet).
-- Wichtig: Jede künftige Funktion, die Reservierungen einträgt, muss den Wunsch ebenso sperren (for update).
drop index public.reservierung_einmal;

-- ---------- Gast: Liste ansehen ----------
-- Neu: menge, groesse und noch (wie viele Stück noch frei sind; in der Vorschau immer alle).
create or replace function public.gast_liste(p_schluessel text, p_geraet text) returns jsonb
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
             'menge', w.menge,
             'groesse', w.groesse,
             'noch', case when vorschau or w.zusammenlegen then w.menge
                          else greatest(0, w.menge - n.vergeben) end,
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
    cross join lateral (
      select count(*)::integer as vergeben, count(*) filter (where r.art = 'schenke_ich')::integer as schenke
      from public.reservierung r where r.wunsch_id = w.id) n
    left join public.reservierung meins on not vorschau and meins.wunsch_id = w.id and meins.geraet_hash = g
    left join public.wunsch_voll v on v.wunsch_id = w.id
    where lw.liste_id = l.id
      and (
        vorschau and w.entfernt_am is null
        or not vorschau and (
          meins.id is not null                      -- meins: immer sichtbar, auch wenn entfernt
          or w.entfernt_am is null
             and v.wunsch_id is null                -- voll: weg für alle anderen
             and case
                   when w.zusammenlegen then n.schenke = 0   -- fremdes „Das schenke ich“: weg
                   else n.vergeben < w.menge                  -- alle Stück vergeben: weg
                 end
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
-- Neu: ein normaler Wunsch ist erst weg, wenn so viele Stück vergeben sind, wie er hat.
create or replace function public.gast_reservieren(p_schluessel text, p_wunsch uuid, p_geraet text, p_vorname text default null)
returns jsonb
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  l public.liste;
  w public.wunsch;
  g text := public.geraet_pruefsumme(p_geraet);
  vn text := nullif(left(btrim(regexp_replace(coalesce(p_vorname, ''), '\s+', ' ', 'g')), 30), '');
begin
  l := public.gast_liste_finden(p_schluessel);
  -- Sperrt den Wunsch: zwei gleichzeitige Tipps laufen nacheinander, nur so viele gewinnen, wie Stück da sind.
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
    if (select count(*) from public.reservierung where wunsch_id = w.id) >= w.menge then
      return jsonb_build_object('ok', false, 'grund', 'weg');
    end if;
    insert into public.reservierung (konto_id, wunsch_id, liste_id, art, geraet_hash)
    values (w.konto_id, w.id, l.id, 'schenke_ich', g);
  end if;
  return jsonb_build_object('ok', true);
exception when unique_violation then
  return jsonb_build_object('ok', false, 'grund', 'weg');
end $$;

revoke all on function public.gast_liste(text, text) from public;
revoke all on function public.gast_reservieren(text, uuid, text, text) from public;
grant execute on function public.gast_liste(text, text) to anon, authenticated;
grant execute on function public.gast_reservieren(text, uuid, text, text) to anon, authenticated;
