-- Abschottungstest. Läuft bei jedem `npm test` gegen PGlite und nach jedem Einspielen gegen das echte Projekt.
-- Alles in einem Block: Er legt Konto A, Konto B und Gäste an, prüft und wirft am Ende immer eine Ausnahme,
-- damit nichts davon in der Datenbank bleibt. Ergebnis steht in der Meldung:
--   ABSCHOTTUNG_OK (n Prüfungen)   oder   ABSCHOTTUNG_FEHLER: …
-- Tabellen und Funktionen liest der Test aus der Datenbank selbst, damit keine neue vergessen wird.

do $abschottung$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  la uuid; la2 uuid; lb uuid;
  wa1 uuid; wa2 uuid; wa3 uuid; wa4 uuid; wa5 uuid; wb1 uuid;
  schl text; schl2 text; schlb text;
  g1 text := 'geraet-eins-' || replace(gen_random_uuid()::text, '-', '');
  g2 text := 'geraet-zwei-' || replace(gen_random_uuid()::text, '-', '');
  g3 text := 'geraet-drei-' || replace(gen_random_uuid()::text, '-', '');
  t record;
  f record;
  n integer;
  j jsonb;
  k text;
  ok boolean;
  vorher text;
  nachher text;
  fehler text[] := '{}';
  pruefungen integer := 0;
  pa uuid; pa2 uuid; pb uuid; arta uuid; artb uuid; ea uuid; abo text; ich_a uuid;
  privat text := 'GEHEIM-' || replace(gen_random_uuid()::text, '-', '');
  buch text[] := array['person', 'steckbrief', 'beziehung', 'art', 'eintrag', 'geschenk', 'kalender_abo'];
  -- Was gast_liste herausgeben darf, sonst nichts.
  erlaubt_oben text[] := array['titel', 'anlass_datum', 'besitzer', 'archiviert', 'vorschau', 'wuensche'];
  erlaubt_wunsch text[] := array['id', 'titel', 'beschreibung', 'bild_pfad', 'shop_url', 'haendler', 'preis_ca',
                                 'preis_stand', 'menge', 'groesse', 'noch', 'zusammenlegen', 'entfernt', 'stand', 'voll', 'beteiligte', 'vornamen'];
  -- Die einzigen Funktionen, die Gäste bzw. Angemeldete aufrufen dürfen.
  fuer_gaeste text[] := array['gast_liste', 'gast_reservieren', 'gast_zuruecknehmen', 'gast_voll'];
  fuer_angemeldete text[] := array['gast_liste', 'gast_reservieren', 'gast_zuruecknehmen', 'gast_voll',
                                   'mein_stand', 'neuer_schluessel'];
begin
  -- ===== 1. Aufbau der Datenbank =====
  for t in
    select c.oid, c.relname, c.relrowsecurity, c.relkind
    from pg_class c join pg_namespace s on s.oid = c.relnamespace
    where s.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm', 'f')
  loop
    pruefungen := pruefungen + 1;
    if t.relkind in ('v', 'm', 'f') then
      fehler := fehler || format('%s ist eine Sicht/fremde Tabelle im Schema public (umgeht den Zeilenschutz)', t.relname);
    elsif not t.relrowsecurity then
      fehler := fehler || format('Tabelle %s hat keinen Zeilenschutz', t.relname);
    end if;
    foreach k in array array['select', 'insert', 'update', 'delete', 'truncate', 'references', 'trigger'] loop
      if has_table_privilege('anon', t.oid, k) then
        fehler := fehler || format('Gast hat Recht %s auf Tabelle %s', k, t.relname);
      end if;
    end loop;
    if t.relname in ('reservierung', 'wunsch_voll') then
      foreach k in array array['select', 'insert', 'update', 'delete', 'truncate'] loop
        if has_table_privilege('authenticated', t.oid, k) then
          fehler := fehler || format('Angemeldete haben Recht %s auf %s', k, t.relname);
        end if;
      end loop;
    end if;
  end loop;

  for f in
    select p.oid, p.proname, p.prosecdef
    from pg_proc p join pg_namespace s on s.oid = p.pronamespace
    where s.nspname = 'public'
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  loop
    pruefungen := pruefungen + 1;
    if has_function_privilege('anon', f.oid, 'execute') and not f.proname = any (fuer_gaeste) then
      fehler := fehler || format('Gast darf Funktion %s aufrufen', f.proname);
    end if;
    if has_function_privilege('authenticated', f.oid, 'execute') and not f.proname = any (fuer_angemeldete) then
      fehler := fehler || format('Angemeldete dürfen Funktion %s aufrufen (nicht in der Liste des Tests)', f.proname);
    end if;
  end loop;

  -- ===== 2. Daten: Konto A und B, je Liste und Wünsche (als die Konten selbst, über den Zeilenschutz) =====
  insert into auth.users (id, email) values (a, 'konto-a@beispiel.invalid'), (b, 'konto-b@beispiel.invalid');

  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  insert into public.liste (titel, anlass_datum) values ('Weihnachten', '2026-12-24') returning id, link_schluessel into la, schl;
  insert into public.liste (titel) values ('Geburtstag') returning id, link_schluessel into la2, schl2;
  insert into public.wunsch (titel, haendler, preis_ca, shop_url) values ('Buch', 'Buchladen', 20, 'https://beispiel.invalid/buch') returning id into wa1;
  insert into public.wunsch (titel, zusammenlegen, preis_ca) values ('Fahrrad', true, 600) returning id into wa2;
  insert into public.wunsch (titel) values ('Tasse') returning id into wa3;
  insert into public.wunsch (titel) values ('Schal') returning id into wa4;
  insert into public.wunsch (titel, menge, groesse) values ('Trikot', 2, 'M') returning id into wa5;
  insert into public.liste_wunsch (liste_id, wunsch_id, reihenfolge)
    values (la, wa1, 1), (la, wa2, 2), (la, wa3, 3), (la, wa4, 4), (la2, wa1, 1), (la2, wa5, 2);
  -- Zusammenlegen gibt es nur einmal, nicht mehrfach.
  pruefungen := pruefungen + 1;
  begin
    insert into public.wunsch (titel, zusammenlegen, menge) values ('Doppelt zusammen', true, 2);
    fehler := fehler || 'Wunsch zum Zusammenlegen mit Anzahl 2 ließ sich anlegen';
  exception when check_violation then null;
  end;

  -- Personenbuch von A: in jeder Tabelle eine Zeile, jede mit einem geheimen Wort.
  select id into ich_a from public.person where ist_ich;
  pruefungen := pruefungen + 1;
  if ich_a is null then fehler := fehler || 'Neues Konto hat keine eigene Seite'; end if;
  insert into public.person (name, kennen_woher, geburtstag_tag, geburtstag_monat, geburtsjahr) values ('Mia ' || privat, privat, 29, 2, 1992) returning id into pa;
  insert into public.person (name) values ('Tom ' || privat) returning id into pa2;
  insert into public.steckbrief (person_id, bezeichnung, wert) values (pa, 'Schuhe', privat);
  insert into public.beziehung (person_id, andere_person_id, name, art) values (pa, pa2, privat, 'Partner');
  insert into public.art (name) values ('Zitat') returning id into arta;
  insert into public.eintrag (person_id, art_id, text) values (pa, arta, privat) returning id into ea;
  insert into public.geschenk (person_id, titel, notiz) values (pa, privat, privat);
  insert into public.kalender_abo (konto_id) values (a) returning schluessel into abo;
  pruefungen := pruefungen + 1;
  begin
    insert into public.kalender_abo (konto_id, schluessel) values (a, 'selbstgewaehlt');
    fehler := fehler || 'Kalender-Schlüssel lässt sich selbst wählen';
  exception when insufficient_privilege then null;
  end;
  pruefungen := pruefungen + 1;
  begin
    insert into public.person (name, ist_ich) values ('Zweites Ich', true);
    fehler := fehler || 'Zweite eigene Seite ließ sich anlegen';
  exception when insufficient_privilege or unique_violation then null;
  end;
  pruefungen := pruefungen + 1;
  delete from public.person where id = ich_a;
  get diagnostics n = row_count;
  if n > 0 then fehler := fehler || 'Die eigene Seite ließ sich löschen'; end if;
  -- Jede Tabelle des Buchs hat wirklich eine Zeile von A, sonst prüfen die Teile 4 und 5 ins Leere.
  foreach k in array buch loop
    pruefungen := pruefungen + 1;
    execute format('select count(*) from public.%I where konto_id = %L', k, a) into n;
    if n = 0 then fehler := fehler || format('Test hat keine Zeile in %s', k); end if;
  end loop;

  -- Was A sehen kann, vor allen Reservierungen (für den Vergleich in Teil 6).
  select string_agg(x, '|') into vorher from (
    select to_jsonb(w)::text x from public.wunsch w
    union all select to_jsonb(l)::text from public.liste l
    union all select to_jsonb(lw)::text from public.liste_wunsch lw
    union all select to_jsonb(ko)::text from public.konto ko) s;

  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  insert into public.liste (titel) values ('Liste B') returning id, link_schluessel into lb, schlb;
  insert into public.wunsch (titel) values ('Wunsch B') returning id into wb1;
  insert into public.liste_wunsch (liste_id, wunsch_id) values (lb, wb1);
  insert into public.person (name) values ('Person von B') returning id into pb;
  insert into public.art (name) values ('Art von B') returning id into artb;

  -- ===== 3. Gäste reservieren über den Link (ohne Anmeldung) =====
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);

  j := public.gast_reservieren(schl, wa1, g1);
  pruefungen := pruefungen + 1;
  if not (j->>'ok')::boolean then fehler := fehler || 'Gast 1 konnte Buch nicht reservieren'; end if;
  j := public.gast_reservieren(schl, wa1, g2);
  pruefungen := pruefungen + 1;
  if (j->>'ok')::boolean then fehler := fehler || 'Buch ließ sich doppelt reservieren'; end if;
  j := public.gast_reservieren(schl, wa2, g1, 'Anna');
  j := public.gast_reservieren(schl, wa2, g2, '  Ben  ');
  pruefungen := pruefungen + 1;
  if not (j->>'ok')::boolean then fehler := fehler || 'Zweiter konnte beim Zusammenlegen nicht dabei sein'; end if;
  j := public.gast_reservieren(schl, wa3, g2);
  j := public.gast_reservieren(schlb, wb1, g3);

  -- Gast 3 sieht: Buch weg, Tasse weg, Fahrrad mit „Anna und Ben“, Schal frei.
  j := public.gast_liste(schl, g3);
  pruefungen := pruefungen + 1;
  if (select array_agg(e->>'titel' order by e->>'titel') from jsonb_array_elements(j->'wuensche') e) is distinct from array['Fahrrad', 'Schal'] then
    fehler := fehler || format('Gast 3 sieht falsche Wünsche: %s', j->'wuensche');
  end if;
  pruefungen := pruefungen + 1;
  if (select e->'vornamen' from jsonb_array_elements(j->'wuensche') e where e->>'titel' = 'Fahrrad') is distinct from '["Anna", "Ben"]'::jsonb then
    fehler := fehler || 'Vornamen beim Zusammenlegen fehlen oder falsch';
  end if;

  -- Gast 1 sieht Buch als „von dir“, Fahrrad als „dabei“ mit nur Ben als anderem.
  j := public.gast_liste(schl, g1);
  pruefungen := pruefungen + 1;
  if (select e->>'stand' from jsonb_array_elements(j->'wuensche') e where e->>'titel' = 'Buch') is distinct from 'von_dir'
     or (select e->'vornamen' from jsonb_array_elements(j->'wuensche') e where e->>'titel' = 'Fahrrad') is distinct from '["Ben"]'::jsonb then
    fehler := fehler || format('Gast 1 sieht seinen Stand falsch: %s', j->'wuensche');
  end if;

  -- Nur Beteiligte markieren voll; dann ist der Wunsch für andere weg.
  j := public.gast_voll(schl, wa2, g3);
  pruefungen := pruefungen + 1;
  if (j->>'ok')::boolean then fehler := fehler || 'Unbeteiligter konnte „Ist voll“ setzen'; end if;
  j := public.gast_voll(schl, wa2, g2);
  j := public.gast_liste(schl, g3);
  pruefungen := pruefungen + 1;
  if exists (select 1 from jsonb_array_elements(j->'wuensche') e where e->>'titel' = 'Fahrrad') then
    fehler := fehler || 'Voller Wunsch ist für andere noch sichtbar';
  end if;

  -- Zurücknehmen nur vom selben Gerät.
  j := public.gast_zuruecknehmen(schl, wa3, g1);
  pruefungen := pruefungen + 1;
  if (j->>'ok')::boolean then fehler := fehler || 'Fremdes Gerät konnte zurücknehmen'; end if;
  j := public.gast_liste(schl, g3);
  pruefungen := pruefungen + 1;
  if exists (select 1 from jsonb_array_elements(j->'wuensche') e where e->>'titel' = 'Tasse') then
    fehler := fehler || 'Tasse nach fremdem Zurücknehmen wieder frei';
  end if;

  -- Anzahl 2: zwei Geräte bekommen je ein Stück, danach ist der Wunsch für alle anderen weg.
  j := public.gast_reservieren(schl2, wa5, g1);
  pruefungen := pruefungen + 1;
  if not (j->>'ok')::boolean then fehler := fehler || 'Erstes Stück vom Trikot ließ sich nicht reservieren'; end if;
  j := public.gast_reservieren(schl2, wa5, g1);
  j := public.gast_liste(schl2, g3);
  pruefungen := pruefungen + 1;
  if (select (e->>'noch')::int from jsonb_array_elements(j->'wuensche') e where e->>'titel' = 'Trikot') is distinct from 1 then
    fehler := fehler || format('Trikot zeigt nach einem Stück (und doppeltem Tipp) nicht „noch 1“: %s', j->'wuensche');
  end if;
  j := public.gast_reservieren(schl2, wa5, g2);
  pruefungen := pruefungen + 1;
  if not (j->>'ok')::boolean then fehler := fehler || 'Zweites Stück vom Trikot ließ sich nicht reservieren'; end if;
  j := public.gast_reservieren(schl2, wa5, g3);
  pruefungen := pruefungen + 1;
  if (j->>'ok')::boolean then fehler := fehler || 'Trikot ließ sich ein drittes Mal reservieren'; end if;
  j := public.gast_liste(schl2, g3);
  pruefungen := pruefungen + 1;
  if exists (select 1 from jsonb_array_elements(j->'wuensche') e where e->>'titel' = 'Trikot') then
    fehler := fehler || 'Trikot ist nach zwei Stück für andere noch sichtbar';
  end if;
  j := public.gast_liste(schl2, g1);
  pruefungen := pruefungen + 1;
  if (select e->>'stand' from jsonb_array_elements(j->'wuensche') e where e->>'titel' = 'Trikot') is distinct from 'von_dir' then
    fehler := fehler || 'Gast 1 sieht sein Stück vom Trikot nicht als „von dir“';
  end if;

  -- Falscher Schlüssel: nichts.
  pruefungen := pruefungen + 1;
  if public.gast_liste('falsch-' || schl, g1) is not null then fehler := fehler || 'Falscher Schlüssel liefert eine Liste'; end if;
  begin
    j := public.gast_reservieren('falsch-' || schl, wa4, g1);
    fehler := fehler || 'Reservieren mit falschem Schlüssel ging durch';
  exception when others then null;
  end;
  pruefungen := pruefungen + 1;
  -- Schlüssel von Liste B, Wunsch von A: geht nicht.
  j := public.gast_reservieren(schlb, wa4, g1);
  pruefungen := pruefungen + 1;
  if (j->>'ok')::boolean then fehler := fehler || 'Wunsch von A über den Link von B reserviert'; end if;

  -- ===== 4. Gast ohne Konto: keine Tabelle, nur erlaubte Felder =====
  for t in
    select c.relname from pg_class c join pg_namespace s on s.oid = c.relnamespace
    where s.nspname = 'public' and c.relkind in ('r', 'p')
  loop
    pruefungen := pruefungen + 1;
    begin
      execute format('select count(*) from public.%I', t.relname) into n;
      if n > 0 then fehler := fehler || format('Gast liest %s Zeilen aus %s', n, t.relname); end if;
    exception when insufficient_privilege then null;
    end;
  end loop;

  begin
    perform public.mein_stand(la);
    fehler := fehler || 'Gast darf mein_stand aufrufen';
  exception when insufficient_privilege then null;
  end;
  pruefungen := pruefungen + 1;

  j := public.gast_liste(schl, g1);
  pruefungen := pruefungen + 1;
  for k in select jsonb_object_keys(j) loop
    if not k = any (erlaubt_oben) then fehler := fehler || format('gast_liste gibt Feld %s heraus', k); end if;
  end loop;
  for k in select distinct jsonb_object_keys(e) from jsonb_array_elements(j->'wuensche') e loop
    if not k = any (erlaubt_wunsch) then fehler := fehler || format('gast_liste gibt Wunsch-Feld %s heraus', k); end if;
  end loop;
  pruefungen := pruefungen + 1;
  if j::text like '%' || a::text || '%' or j::text like '%' || la::text || '%' or j::text like '%' || schl || '%' then
    fehler := fehler || 'gast_liste verrät Konto-, Listen-Kennung oder Schlüssel';
  end if;
  pruefungen := pruefungen + 1;
  if j::text like '%' || privat || '%' then fehler := fehler || 'gast_liste verrät etwas aus dem Personenbuch'; end if;
  pruefungen := pruefungen + 1;
  begin
    perform public.kalender_daten(abo);
    fehler := fehler || 'Gast darf kalender_daten aufrufen';
  exception when insufficient_privilege then null;
  end;
  pruefungen := pruefungen + 1;
  if j::text like '%' || encode(sha256(convert_to(g2, 'UTF8')), 'hex') || '%' then
    fehler := fehler || 'gast_liste verrät die Prüfsumme eines anderen Geräts';
  end if;

  -- ===== 5. Fremdes Konto B: liest und ändert nichts von A =====
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  for t in
    select c.relname,
           (select a2.attname from pg_attribute a2 where a2.attrelid = c.oid and a2.attnum > 0 and not a2.attisdropped
             order by a2.attnum limit 1) as spalte
    from pg_class c join pg_namespace s on s.oid = c.relnamespace
    where s.nspname = 'public' and c.relkind in ('r', 'p')
  loop
    pruefungen := pruefungen + 1;
    begin
      execute format('select count(*) from public.%I x where to_jsonb(x)::text like %L', t.relname, '%' || a::text || '%') into n;
      if n > 0 then fehler := fehler || format('Konto B liest %s Zeilen von A aus %s', n, t.relname); end if;
    exception when insufficient_privilege then null;
    end;
    begin
      execute format('update public.%I x set %I = x.%I where to_jsonb(x)::text like %L', t.relname, t.spalte, t.spalte, '%' || a::text || '%');
      get diagnostics n = row_count;
      if n > 0 then fehler := fehler || format('Konto B ändert %s Zeilen von A in %s', n, t.relname); end if;
    exception when insufficient_privilege then null;
    end;
    begin
      execute format('delete from public.%I x where to_jsonb(x)::text like %L', t.relname, '%' || a::text || '%');
      get diagnostics n = row_count;
      if n > 0 then fehler := fehler || format('Konto B löscht %s Zeilen von A in %s', n, t.relname); end if;
    exception when insufficient_privilege then null;
    end;
  end loop;

  pruefungen := pruefungen + 1;
  begin
    insert into public.wunsch (konto_id, titel) values (a, 'untergeschoben');
    fehler := fehler || 'Konto B legt einen Wunsch für A an';
  exception when insufficient_privilege or check_violation or others then null;
  end;
  pruefungen := pruefungen + 1;
  begin
    insert into public.liste_wunsch (liste_id, wunsch_id, konto_id) values (lb, wa1, b);
    fehler := fehler || 'Konto B hängt einen Wunsch von A an seine Liste';
  exception when others then null;
  end;
  pruefungen := pruefungen + 1;
  begin
    insert into public.liste_wunsch (liste_id, wunsch_id, konto_id) values (la, wb1, a);
    fehler := fehler || 'Konto B hängt etwas an die Liste von A';
  exception when others then null;
  end;
  -- Personenbuch: B sieht nichts von A, schiebt nichts unter und hängt nichts an fremde Zeilen.
  foreach k in array buch loop
    pruefungen := pruefungen + 1;
    execute format('select count(*) from public.%I x where x.konto_id <> %L or to_jsonb(x)::text like %L', k, b, '%' || privat || '%') into n;
    if n > 0 then fehler := fehler || format('Konto B liest %s fremde Zeilen aus %s', n, k); end if;
    pruefungen := pruefungen + 1;
    begin
      execute format('update public.%I x set konto_id = %L', k, a);
      fehler := fehler || format('Konto B kann konto_id in %s ändern', k);
    exception when others then null;
    end;
  end loop;
  pruefungen := pruefungen + 1;
  begin insert into public.person (konto_id, name) values (a, 'untergeschoben'); fehler := fehler || 'B legt bei A eine Person an'; exception when others then null; end;
  pruefungen := pruefungen + 1;
  begin insert into public.eintrag (person_id, text) values (pa, 'x'); fehler := fehler || 'B hängt einen Eintrag an eine Person von A'; exception when others then null; end;
  pruefungen := pruefungen + 1;
  begin insert into public.geschenk (person_id, titel) values (pa, 'x'); fehler := fehler || 'B hängt ein Geschenk an eine Person von A'; exception when others then null; end;
  pruefungen := pruefungen + 1;
  begin insert into public.steckbrief (person_id, bezeichnung, wert) values (pa, 'x', 'x'); fehler := fehler || 'B hängt Steckbrief an eine Person von A'; exception when others then null; end;
  pruefungen := pruefungen + 1;
  begin insert into public.eintrag (person_id, art_id, text) values (pb, arta, 'x'); fehler := fehler || 'B nutzt eine Art von A'; exception when others then null; end;
  pruefungen := pruefungen + 1;
  begin insert into public.beziehung (person_id, andere_person_id, name) values (pb, pa, 'x'); fehler := fehler || 'B verknüpft eine Person von A'; exception when others then null; end;
  pruefungen := pruefungen + 1;
  begin insert into public.kalender_abo (konto_id) values (a); fehler := fehler || 'B legt für A einen Kalender an'; exception when others then null; end;
  pruefungen := pruefungen + 1;
  begin perform public.kalender_daten(abo); fehler := fehler || 'Angemeldete dürfen kalender_daten aufrufen'; exception when insufficient_privilege then null; end;

  pruefungen := pruefungen + 1;
  if public.mein_stand(la) is not null then fehler := fehler || 'mein_stand gibt B den Stand von A'; end if;

  -- ===== 6. Konto A sieht nie, welcher Wunsch reserviert ist =====
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  pruefungen := pruefungen + 1;
  select string_agg(x, '|') into nachher from (
    select to_jsonb(w)::text x from public.wunsch w
    union all select to_jsonb(l)::text from public.liste l
    union all select to_jsonb(lw)::text from public.liste_wunsch lw
    union all select to_jsonb(ko)::text from public.konto ko) s;
  if vorher is distinct from nachher then
    fehler := fehler || 'Was A lesen kann (auch Reihenfolge), ändert sich durch Reservierungen';
  end if;

  foreach k in array array['reservierung', 'wunsch_voll'] loop
    pruefungen := pruefungen + 1;
    begin
      execute format('select count(*) from public.%I', k) into n;
      fehler := fehler || format('A kann %s lesen', k);
    exception when insufficient_privilege then null;
    end;
  end loop;

  pruefungen := pruefungen + 1;
  n := public.mein_stand(la);
  if n is distinct from 3 then fehler := fehler || format('mein_stand zählt %s statt 3', n); end if;

  -- Eigener Link, angemeldet: nur Vorschau ohne Stand, alle Wünsche da.
  j := public.gast_liste(schl, null);
  pruefungen := pruefungen + 1;
  if not (j->>'vorschau')::boolean
     or jsonb_array_length(j->'wuensche') <> 4
     or exists (select 1 from jsonb_array_elements(j->'wuensche') e
                where e->>'stand' <> 'frei' or (e->>'voll')::boolean or (e->>'beteiligte')::int <> 0 or e->'vornamen' <> '[]'::jsonb) then
    fehler := fehler || format('Eigener Link verrät A den Stand: %s', j);
  end if;
  pruefungen := pruefungen + 1;
  begin
    j := public.gast_reservieren(schl, wa4, g1);
    fehler := fehler || 'A kann auf der eigenen Liste reservieren (und so testen, was weg ist)';
  exception when others then null;
  end;
  pruefungen := pruefungen + 1;
  begin
    perform public.gast_zuruecknehmen(schl, wa1, g1);
    fehler := fehler || 'A kann auf der eigenen Liste zurücknehmen';
  exception when others then null;
  end;

  -- Liste mit Reservierungen lässt sich nicht löschen (sonst wären Wünsche auf anderen Listen wieder frei).
  pruefungen := pruefungen + 1;
  begin
    delete from public.liste where id = la;
    get diagnostics n = row_count;
    if n > 0 then fehler := fehler || 'Liste mit Reservierungen ließ sich löschen'; end if;
  exception when foreign_key_violation then null;
  end;

  -- Wünsche lassen sich nicht löschen (sonst verriete die Zahl, welcher vergeben war).
  pruefungen := pruefungen + 1;
  begin
    delete from public.wunsch where id = wa1;
    get diagnostics n = row_count;
    if n > 0 then fehler := fehler || 'A kann einen Wunsch löschen'; end if;
  exception when insufficient_privilege then null;
  end;

  -- ===== Ergebnis =====
  perform set_config('role', 'none', true);
  -- Kalender: mit Schlüssel nur Name und Tag, ohne nichts.
  pruefungen := pruefungen + 1;
  j := public.kalender_daten(abo);
  if jsonb_array_length(j) is distinct from 1
     or (select array_agg(x order by x) from jsonb_object_keys(j->0) x) is distinct from array['id', 'jahr', 'monat', 'name', 'tag'] then
    fehler := fehler || format('kalender_daten gibt anderes heraus als Name und Tag: %s', j);
  end if;
  pruefungen := pruefungen + 1;
  if public.kalender_daten('falsch-' || abo) is not null then fehler := fehler || 'Kalender mit falschem Schlüssel'; end if;
  -- Person löschen nimmt alles mit, was an ihr hängt; eine gelöschte Verknüpfung behält den Namen.
  pruefungen := pruefungen + 1;
  delete from public.person where id = pa2;
  if not exists (select 1 from public.beziehung where person_id = pa and andere_person_id is null and name = privat) then
    fehler := fehler || 'Beziehung verliert ihren Namen, wenn die verknüpfte Person gelöscht wird';
  end if;
  delete from public.art where id = arta;
  if not exists (select 1 from public.eintrag where id = ea and art_id is null) then fehler := fehler || 'Eintrag verschwindet mit seiner Art'; end if;
  -- Ein ganzes Konto lässt sich samt allem löschen (Etappe 3), auch mit Reservierungen.
  pruefungen := pruefungen + 1;
  begin
    delete from auth.users where id = a;
    if exists (select 1 from public.liste where konto_id = a) or exists (select 1 from public.reservierung where konto_id = a)
       or exists (select 1 from public.person where konto_id = a) or exists (select 1 from public.eintrag where konto_id = a)
       or exists (select 1 from public.geschenk where konto_id = a) or exists (select 1 from public.kalender_abo where konto_id = a) then
      fehler := fehler || 'Nach dem Löschen des Kontos bleibt etwas übrig';
    end if;
  exception when others then
    fehler := fehler || format('Konto ließ sich nicht löschen: %s', sqlerrm);
  end;
  if array_length(fehler, 1) > 0 then
    raise exception 'ABSCHOTTUNG_FEHLER: %', array_to_string(fehler, ' | ');
  end if;
  raise exception 'ABSCHOTTUNG_OK (% Prüfungen)', pruefungen;
end
$abschottung$;
