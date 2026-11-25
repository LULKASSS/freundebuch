// Baut aus den Geburtstagen einen Kalender (iCalendar). Nur Name und Tag, keine Einträge.
// Je Person ein ganztägiger Termin für das vorige, dieses und die nächsten zwei Jahre, damit das Alter stimmt;
// abonnierte Kalender holen sich die Datei regelmäßig neu.
const zwei = (n) => String(n).padStart(2, '0');
const text = (t) => String(t).replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/[\r\n]+/g, ' ');
// Zeilen dürfen höchstens 75 Bytes lang sein.
function falten(zeile) {
  const k = new TextEncoder();
  let aus = '', laenge = 0;
  for (const z of zeile) {
    const b = k.encode(z).length;
    if (laenge + b > 74) { aus += '\r\n '; laenge = 1; }
    aus += z;
    laenge += b;
  }
  return aus;
}
export function kalender(personen, jetzt = new Date()) {
  const jahr = jetzt.getUTCFullYear();
  const stempel = jetzt.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const zeilen = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Freundebuch//Geburtstage//DE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'X-WR-CALNAME:Geburtstage', 'NAME:Geburtstage', 'REFRESH-INTERVAL;VALUE=DURATION:PT12H', 'X-PUBLISHED-TTL:PT12H'];
  for (const p of personen) {
    for (let j = jahr - 1; j <= jahr + 2; j++) {
      if (p.jahr && j <= p.jahr) continue;
      const letzter = new Date(Date.UTC(j, p.monat, 0)).getUTCDate(); // 29. Februar: sonst am 28.
      const von = new Date(Date.UTC(j, p.monat - 1, Math.min(p.tag, letzter)));
      const bis = new Date(von.getTime() + 864e5);
      const tag = (d) => `${d.getUTCFullYear()}${zwei(d.getUTCMonth() + 1)}${zwei(d.getUTCDate())}`;
      zeilen.push('BEGIN:VEVENT', `UID:${p.id}-${j}@freundebuch`, `DTSTAMP:${stempel}`, `DTSTART;VALUE=DATE:${tag(von)}`, `DTEND;VALUE=DATE:${tag(bis)}`,
        `SUMMARY:${text(p.jahr ? `${p.name} wird ${j - p.jahr}` : `${p.name} hat Geburtstag`)}`, 'TRANSP:TRANSPARENT', 'END:VEVENT');
    }
  }
  zeilen.push('END:VCALENDAR');
  return zeilen.map(falten).join('\r\n') + '\r\n';
}
