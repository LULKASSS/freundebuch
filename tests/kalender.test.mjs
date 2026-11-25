import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kalender } from '../supabase/functions/kalender/ical.js';

const jetzt = new Date('2026-11-25T12:00:00Z');
test('Kalender: Termin je Jahr mit richtigem Alter, ganztägig', () => {
  const t = kalender([{ id: 'x', name: 'Mia', tag: 30, monat: 11, jahr: 1992 }], jetzt);
  assert.match(t, /DTSTART;VALUE=DATE:20261130\r\nDTEND;VALUE=DATE:20261201\r\nSUMMARY:Mia wird 34\r\n/);
  assert.equal(t.match(/BEGIN:VEVENT/g).length, 4);
});
test('Kalender: 29. Februar, ohne Jahr, Sonderzeichen', () => {
  const t = kalender([{ id: 'y', name: 'Ö; a, b', tag: 29, monat: 2, jahr: null }], jetzt);
  assert.match(t, /DTSTART;VALUE=DATE:20270228/);
  assert.match(t, /DTSTART;VALUE=DATE:20280229/);
  assert.match(t, /SUMMARY:Ö\; a\\, b hat Geburtstag/);
});
test('Kalender: lange Namen werden auf 75 Bytes gefaltet', () => {
  const t = kalender([{ id: 'z', name: 'ä'.repeat(40), tag: 1, monat: 1, jahr: null }], jetzt);
  for (const z of t.split('\r\n')) assert.ok(Buffer.byteLength(z) <= 75, z);
});
