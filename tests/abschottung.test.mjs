/* Abschottungstest gegen eine echte Postgres-Datenbank im Gerät (PGlite).
 * Baut Supabase nach, spielt alle Migrationen ein und lässt tests/abschottung.sql laufen. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const wurzel = new URL('..', import.meta.url);
const lies = (pfad) => readFile(new URL(pfad, wurzel), 'utf8');

async function datenbank() {
  const db = new PGlite();
  await db.exec(await lies('tests/supabase-nachbau.sql'));
  const dateien = (await readdir(new URL('supabase/migrations/', wurzel))).filter((d) => d.endsWith('.sql')).sort();
  for (const d of dateien) await db.exec(await lies(`supabase/migrations/${d}`));
  return db;
}

test('Abschottung: fremdes Konto und Gast kommen an nichts Privates', async () => {
  const db = await datenbank();
  const meldung = await db.exec(await lies('tests/abschottung.sql')).then(() => 'kein Ergebnis', (e) => e.message);
  assert.match(meldung, /^ABSCHOTTUNG_OK/, meldung);
  console.log(meldung);
});

test('Abschottung merkt eine Tabelle ohne Zeilenschutz', async () => {
  const db = await datenbank();
  await db.exec('create table public.vergessen (id int, konto_id uuid); grant select on public.vergessen to anon;');
  const meldung = await db.exec(await lies('tests/abschottung.sql')).then(() => '', (e) => e.message);
  assert.match(meldung, /Tabelle vergessen hat keinen Zeilenschutz/);
  assert.match(meldung, /Gast hat Recht select auf Tabelle vergessen/);
});

test('Abschottung merkt eine neue Funktion, die Gäste aufrufen dürfen', async () => {
  const db = await datenbank();
  await db.exec('create function public.leck() returns int language sql security definer as $$ select 1 $$;');
  const meldung = await db.exec(await lies('tests/abschottung.sql')).then(() => '', (e) => e.message);
  assert.match(meldung, /Gast darf Funktion leck aufrufen/);
});

test('Abschottung merkt, wenn ich meine Reservierungen lesen könnte', async () => {
  const db = await datenbank();
  await db.exec(`grant select on public.reservierung to authenticated;
    create policy leck on public.reservierung for select to authenticated using (konto_id = auth.uid());`);
  const meldung = await db.exec(await lies('tests/abschottung.sql')).then(() => '', (e) => e.message);
  assert.match(meldung, /Angemeldete haben Recht select auf reservierung/);
  assert.match(meldung, /A kann reservierung lesen/);
});

test('Abschottung merkt einen Reservierungsstand am Wunsch', async () => {
  const db = await datenbank();
  await db.exec(`alter table public.wunsch add column vergeben boolean default false;
    create function public.merken() returns trigger language plpgsql security definer as $$
    begin update public.wunsch set vergeben = true where id = new.wunsch_id; return new; end $$;
    revoke all on function public.merken() from anon, authenticated, public;
    create trigger merken after insert on public.reservierung for each row execute function public.merken();`);
  const meldung = await db.exec(await lies('tests/abschottung.sql')).then(() => '', (e) => e.message);
  assert.match(meldung, /ändert sich durch Reservierungen/);
});

test('Abschottung merkt, wenn das Personenbuch für andere Konten lesbar wäre', async () => {
  const db = await datenbank();
  await db.exec('create policy leck on public.eintrag for select to authenticated using (true);');
  const meldung = await db.exec(await lies('tests/abschottung.sql')).then(() => '', (e) => e.message);
  assert.match(meldung, /Konto B liest .* aus eintrag/);
});
