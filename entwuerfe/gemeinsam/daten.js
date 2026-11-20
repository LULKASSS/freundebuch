/* Beispielinhalte für alle vier Entwürfe. Alles erfunden: Personen, Geburtstage, Geschichten, Wünsche.
 * Jeder Entwurf liest dieselben Daten, damit nur das Design verglichen wird.
 * „Heute“ ist im Entwurf fest der 20.11.2026, damit Alter und „in X Tagen“ stimmen. */

export const HEUTE = '2026-11-20';

/* Vorgegebene Arten (Plan 2: mag, mag nicht, Interesse, Geschichte, Erlebnis, Geschenkidee) + eine eigene. */
export const ARTEN = [
  { id: 'mag', name: 'mag', zeichnung: 'herz' },
  { id: 'magnicht', name: 'mag nicht', zeichnung: 'nein' },
  { id: 'interesse', name: 'Interesse', zeichnung: 'spross' },
  { id: 'geschichte', name: 'Geschichte', zeichnung: 'blase' },
  { id: 'erlebnis', name: 'Erlebnis', zeichnung: 'berg' },
  { id: 'geschenkidee', name: 'Geschenkidee', zeichnung: 'geschenk' },
  { id: 'zitat', name: 'Zitat', zeichnung: 'feder', eigene: true },
];

export const PERSONEN = [
  {
    id: 'mia', name: 'Mia Brandt', rufname: 'Mia', geburtstag: '1992-11-26',
    kennen: 'Studium in Freiburg, erste WG in der Hebelstraße',
    farbe: 'pfirsich',
    steckbrief: [
      { bez: 'Kleidung', wert: 'M' },
      { bez: 'Schuhe', wert: '39' },
      { bez: 'Ring', wert: '54' },
    ],
    familie: [
      { name: 'Tom', art: 'Partner', person: 'tom' },
      { name: 'Ella', art: 'Tochter, 4' },
    ],
    beschenken: ['geburtstag', 'weihnachten'],
  },
  {
    id: 'jonas', name: 'Jonas Keller', rufname: 'Jonas', geburtstag: '1990-01-12',
    kennen: 'Kletterhalle, seit 2019 fester Seilpartner', farbe: 'salbei',
    steckbrief: [{ bez: 'Kleidung', wert: 'L' }, { bez: 'Schuhe', wert: '45' }],
    familie: [{ name: 'Leni', art: 'Freundin' }], beschenken: ['geburtstag'],
  },
  {
    id: 'hilde', name: 'Hilde Rückert', rufname: 'Oma Hilde', geburtstag: '1938-12-02',
    kennen: 'Oma mütterlicherseits', farbe: 'flieder',
    steckbrief: [{ bez: 'Lieblingsblume', wert: 'Ranunkeln' }],
    familie: [{ name: 'Mama', art: 'Tochter' }], beschenken: ['geburtstag', 'weihnachten'],
  },
  {
    id: 'tom', name: 'Tom Brandt', rufname: 'Tom', geburtstag: '1990-07-03',
    kennen: 'Mias Partner, seit dem Sommerfest 2017', farbe: 'sand',
    steckbrief: [{ bez: 'Kleidung', wert: 'XL' }], familie: [{ name: 'Mia', art: 'Partnerin', person: 'mia' }],
    beschenken: ['geburtstag'],
  },
  {
    id: 'sophie', name: 'Sophie Lang', rufname: 'Sophie', geburtstag: '1995-03-18',
    kennen: 'Chor, Alt neben mir', farbe: 'rose', steckbrief: [], familie: [], beschenken: ['geburtstag'],
  },
  {
    id: 'ben', name: 'Ben Rückert', rufname: 'Ben', geburtstag: '1999-12-09',
    kennen: 'mein Bruder', farbe: 'salbei', steckbrief: [{ bez: 'Schuhe', wert: '46' }],
    familie: [], beschenken: ['geburtstag', 'weihnachten'],
  },
];

/* Meine eigene Seite: dieselbe Form wie jede Person. */
export const ICH = {
  id: 'ich', name: 'Lukas', rufname: 'Ich', ist_ich: true, geburtstag: '1996-05-07',
  kennen: '', farbe: 'flieder',
  steckbrief: [
    { bez: 'Kleidung', wert: 'L' },
    { bez: 'Schuhe', wert: '44' },
    { bez: 'Kaffee', wert: 'Siebträger, 58 mm' },
  ],
  familie: [{ name: 'Ben', art: 'Bruder', person: 'ben' }],
};

/* Einträge: Art (leer erlaubt), Datum = Tag des Geschehens. */
export const EINTRAEGE = [
  { id: 'e1', person: 'mia', art: 'geschichte', datum: '2014-10-09', text: 'Hat in der ersten WG-Woche mit Pfannkuchen den Rauchmelder ausgelöst und der Feuerwehr danach welche angeboten.' },
  { id: 'e2', person: 'mia', art: 'erlebnis', datum: '2016-08-21', text: 'Interrail bis Lissabon. Nachtzug-Panne in Irun, wir haben bis vier Uhr am Bahnsteig Uno gespielt.' },
  { id: 'e3', person: 'mia', art: 'mag', datum: '2018-02-03', text: 'Lakritz, je salziger, desto besser.' },
  { id: 'e4', person: 'mia', art: 'magnicht', datum: '2018-02-03', text: 'Koriander. Schmeckt für sie nach Seife.' },
  { id: 'e5', person: 'mia', art: 'geschichte', datum: '2019-06-15', text: 'Hat auf Toms Antrag geantwortet: „Moment, ich muss erst das Brot aus dem Ofen holen.“ Dann ja.' },
  { id: 'e6', person: 'mia', art: 'geschichte', datum: '2021-12-24', text: 'Hat mit mir den Baum in den vierten Stock getragen, ohne Aufzug, und oben gesagt: „Nächstes Jahr Plastik.“ Hat sie nie gemacht.' },
  { id: 'e7', person: 'mia', art: 'erlebnis', datum: '2023-05-14', text: 'Ellas Taufe. Mia hat die ganze Rede ohne Zettel gehalten.' },
  { id: 'e8', person: 'mia', art: 'interesse', datum: '2024-03-02', text: 'Töpfert, hat eine eigene Drehscheibe im Keller.' },
  { id: 'e9', person: 'mia', art: 'mag', datum: '2025-09-28', text: 'Frühstück im Bett, aber erst nach neun.' },
  { id: 'e10', person: 'mia', art: 'zitat', datum: '2025-12-26', text: '„Geschenke, die man aufessen kann, zählen doppelt.“' },
  { id: 'e11', person: 'mia', art: null, datum: '2026-10-30', text: 'Ella geht ab Januar in die Waldkita.' },
  { id: 'e12', person: 'mia', art: 'interesse', datum: '2026-11-08', text: 'Hört gerade jeden Abend einen Krimi-Podcast beim Töpfern.' },
  { id: 'e20', person: 'jonas', art: 'geschichte', datum: '2020-07-11', text: 'Hat in der Fränkischen den Schlüssel vom Bus im Topseil-Beutel gelassen. Wir sind per Anhalter zurück.' },
  { id: 'e21', person: 'jonas', art: 'mag', datum: '2022-04-01', text: 'Dunkles Bier aus Bamberg.' },
  { id: 'e22', person: 'jonas', art: 'interesse', datum: '2026-09-20', text: 'Plant mit Leni eine Alpenüberquerung im Sommer.' },
  { id: 'e30', person: 'hilde', art: 'geschichte', datum: '1958-06-01', text: 'Ist mit dem Fahrrad von Ulm an den Bodensee gefahren, um Opa zu besuchen. An einem Tag.' },
  { id: 'e31', person: 'hilde', art: 'mag', datum: '2020-12-24', text: 'Eierlikör, selbst gemacht, und das Kreuzworträtsel in der Samstagszeitung.' },
  { id: 'e32', person: 'hilde', art: 'magnicht', datum: '2023-12-02', text: 'Wenn man sich für sie „in Unkosten stürzt“.' },
  { id: 'e40', person: 'ich', art: 'mag', datum: '2024-01-10', text: 'Espresso aus dem Siebträger, am liebsten hell geröstet.' },
  { id: 'e41', person: 'ich', art: 'interesse', datum: '2025-04-05', text: 'Rennrad, gerade die Runde um den Schönbuch.' },
  { id: 'e42', person: 'ich', art: 'magnicht', datum: '2025-04-05', text: 'Deko, die nur herumsteht.' },
];

/* Geschenkideen mit Stand und Anlass (Plan 2, Tabelle geschenk). */
export const GESCHENKE = [
  { id: 'g1', person: 'mia', titel: 'Glasur-Set für Steinzeug', haendler: 'Töpferbedarf Keller', preis: 42, stand: 'idee', anlass: 'Geburtstag 2026', zeichnung: 'glasur' },
  { id: 'g2', person: 'mia', titel: 'Raku-Brennkurs für zwei', haendler: 'Keramikwerkstatt', preis: 120, stand: 'besorgt', anlass: 'Weihnachten 2026', zeichnung: 'vase' },
  { id: 'g3', person: 'mia', titel: 'Salzlakritz-Box', haendler: 'Lakritzladen', preis: 18, stand: 'verschenkt', anlass: 'Geburtstag 2025', zeichnung: 'box' },
  { id: 'g4', person: 'hilde', titel: 'Rätselheft-Abo', haendler: 'Zeitschriftenladen', preis: 30, stand: 'idee', anlass: 'Geburtstag 2026', zeichnung: 'buch' },
];

/* Wunschliste (Etappe 1). Wünsche gehören mir, die Liste ist eine Auswahl daraus. */
export const WUENSCHE = [
  { id: 'w1', titel: 'Tamper mit Federdruck', beschreibung: '58 mm, damit der Espresso gleichmäßig wird.', preis: 35, stand: '2026-11-18', haendler: 'Amazon', url: 'https://www.amazon.de/', zeichnung: 'tamper' },
  { id: 'w2', titel: 'Merino-Langarmshirt', beschreibung: 'Größe L, grau oder dunkelgrün.', preis: 45, stand: '2026-11-18', haendler: 'Decathlon', url: 'https://www.decathlon.de/', zeichnung: 'shirt' },
  { id: 'w3', titel: 'Rücklicht mit Bremslicht', beschreibung: 'Für die Sattelstütze vom Rennrad.', preis: 60, stand: '2026-11-12', haendler: 'bike-components', url: 'https://www.bike-components.de/', zeichnung: 'licht' },
  { id: 'w4', titel: 'Wanderführer Allgäu', beschreibung: 'Die 50 schönsten Touren, gern die neue Auflage.', preis: 20, stand: '2026-11-15', haendler: 'Thalia', url: 'https://www.thalia.de/', zeichnung: 'buch' },
  { id: 'w5', titel: 'Zehnerkarte Kletterhalle', beschreibung: 'Für die Halle in Reutlingen.', preis: 150, stand: '2026-11-01', haendler: 'Kletterzentrum', url: 'https://www.alpenverein.de/', zeichnung: 'karte', zusammenlegen: true },
  { id: 'w6', titel: 'Kaffeemühle von Hand', beschreibung: 'Mit Stahlmahlwerk, fürs Wochenende.', preis: 80, stand: '2026-11-18', haendler: 'Amazon', url: 'https://www.amazon.de/', zeichnung: 'muehle' },
  { id: 'w7', titel: 'Kopfhörer mit Geräusch\u00ADunterdrückung', beschreibung: 'Für den Zug, ohne Kabel.', preis: 250, stand: '2026-11-10', haendler: 'MediaMarkt', url: 'https://www.mediamarkt.de/', zeichnung: 'kopfhoerer', zusammenlegen: true },
  { id: 'w8', titel: 'Brettspiel für zwei', beschreibung: 'Kooperativ, dauert unter einer Stunde.', preis: 30, stand: '2026-11-16', haendler: 'Thalia', url: 'https://www.thalia.de/', zeichnung: 'spiel' },
];

export const LISTE = {
  id: 'l1', titel: 'Weihnachten 2026', anlass: '2026-12-24', aufdeckenAb: '2026-12-25',
  besitzer: 'Lukas', wuensche: ['w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8'],
  gaeste: ['Mama', 'Papa', 'Mia', 'Tom', 'Oma Hilde', 'Jonas'],
};

/* Zweite Liste für einen anderen Anlass (Plan: mehrere Anlässe als eigene Listen). Eigene Gäste, eigene
 * Reservierungen; RESERVIERUNGEN unten gelten nur für LISTE (Weihnachten). */
export const LISTE2 = {
  id: 'l2', titel: 'Geburtstag 2027', anlass: '2027-05-07', aufdeckenAb: '2027-05-08',
  besitzer: 'Lukas', wuensche: ['w4', 'w6', 'w8'],
  gaeste: ['Mia', 'Tom', 'Jonas', 'Ben'],
  reservierungen: [{ wunsch: 'w6', gast: 'Ben', art: 'schenke_ich' }],
};
export const LISTEN = [LISTE, LISTE2];

/* Stand der Reservierungen, wie ihn der Server kennt. Der Gast sieht davon nur „weg“ oder
 * „Zusammenlegen mit …“, ich als Besitzer nur die Anzahl je Gast. */
export const RESERVIERUNGEN = [
  { wunsch: 'w2', gast: 'Mama', art: 'schenke_ich' },
  { wunsch: 'w3', gast: 'Papa', art: 'schenke_ich' },
  { wunsch: 'w5', gast: 'Mia', art: 'bin_dabei' },
  { wunsch: 'w5', gast: 'Jonas', art: 'bin_dabei' },
];

/* Hilfen */
export const euro = (n) => `ca. ${n.toLocaleString('de-DE')} €`;
export const datumKurz = (iso) => new Date(iso + 'T12:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric' }) ;
export const datumLang = (iso) => new Date(iso + 'T12:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
export function naechsterGeburtstag(iso, heute = HEUTE) {
  const h = new Date(heute + 'T12:00'), g = new Date(iso + 'T12:00');
  let n = new Date(h.getFullYear(), g.getMonth(), g.getDate(), 12);
  if (n < h) n = new Date(h.getFullYear() + 1, g.getMonth(), g.getDate(), 12);
  return { tage: Math.round((n - h) / 864e5), alter: n.getFullYear() - g.getFullYear(), datum: n };
}
export const person = (id) => (id === 'ich' ? ICH : PERSONEN.find((p) => p.id === id));
export const art = (id) => ARTEN.find((a) => a.id === id);
