/* Entwurf „Pinnwand“ – Freundebuch mit Wunschliste.
 * Jede Person ist eine ruhige Wand: oben ein Polaroid und der Steckbrief als Karteikarte, darunter Zettel.
 * Zustand nur im Speicher (außer der Gastwahl in localStorage). Alle Inhalte erfunden. */
import {
  HEUTE, ARTEN, PERSONEN, ICH, EINTRAEGE, GESCHENKE, WUENSCHE, LISTE, LISTEN, RESERVIERUNGEN,
  euro, datumKurz, datumLang, naechsterGeburtstag, person,
} from '../gemeinsam/daten.js';
import { PRODUKT, ART, SCHMUCK } from '../gemeinsam/zeichnungen.js';

/* ---------- Eigene kleine Zeichnungen ---------- */
const svg = (inhalt, vb = '0 0 48 48', w = 2.4) =>
  `<svg viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${inhalt}</svg>`;
const ZEICHEN = {
  start: svg('<path d="M9 23.5 24 10.5l15 13"/><path d="M13 20.5v16c0 1.2.8 2 2 2h6v-9h6.5v9H33c1.2 0 2-.8 2-2v-16"/>'),
  menschen: svg('<circle cx="18" cy="17" r="6"/><path d="M7.5 37c1-6.5 5.2-10 10.5-10s9.5 3.5 10.5 10"/><circle cx="32.5" cy="19" r="4.6"/><path d="M30 27.4c5-.6 9.2 2.5 10.3 8.6"/>'),
  plus: svg('<path d="M24 12.5v23M12.5 24.2h23"/>', '0 0 48 48', 3.2),
  suche: svg('<circle cx="21" cy="21" r="10.5"/><path d="m29 29.5 9 8.5"/>'),
  ich: svg('<path d="M24 9.5c8.3 0 14.5 6.4 14.5 14.5S32.3 38.6 24 38.6 9.6 32.2 9.6 24 15.8 9.5 24 9.5z"/><path d="M18.5 21.5v1M29.5 21.5v1"/><path d="M17.8 29c3.6 3.4 8.8 3.4 12.4 0"/>'),
  schliessen: svg('<path d="M14 14.5 34 34M34 14 14 34.5"/>', '0 0 48 48', 3),
  raus: svg('<path d="M20 14h-6c-1.2 0-2 .8-2 2v18c0 1.2.8 2 2 2h18c1.2 0 2-.8 2-2v-6"/><path d="M26 12h10v10M36 12 22.5 25.5"/>'),
  schloss: svg('<rect x="12" y="21" width="24" height="17" rx="4"/><path d="M17 21v-4.5c0-4 3-7 7-7s7 3 7 7V21"/><path d="M24 28v3.5"/>'),
  haken: svg('<path d="m13 25 7.5 7L35 16"/>', '0 0 48 48', 3.2),
  kette: svg('<path d="M21 27.5a6.5 6.5 0 0 0 9.2 0l5.3-5.3a6.5 6.5 0 0 0-9.2-9.2l-2 2"/><path d="M27 20.5a6.5 6.5 0 0 0-9.2 0l-5.3 5.3a6.5 6.5 0 0 0 9.2 9.2l2-2"/>'),
  auge: svg('<path d="M6 24.5C10 17 16.5 13 24 13s14 4 18 11.5C38 32 31.5 36 24 36S10 32 6 24.5z"/><circle cx="24" cy="24.5" r="5"/>'),
};
/* Zeichen für selbst angelegte Arten: eine Pinnnadel, passend zur Wand. */
const NADEL = `<svg viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M60 66v36"/><circle fill="var(--fuell, transparent)" cx="60" cy="44" r="22"/><path d="M50 37c2-5 6-8 11-9"/></svg>`;
/* Kritzelkreis hinter dem Anfangsbuchstaben auf dem Polaroid. */
const KRITZEL = `<svg class="kritzel" viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M26 64c-3-24 14-42 36-42 21 0 35 15 34 36-1 22-17 38-38 37-17-1-30-11-32-27"/><path d="M94 22l5-6M101 31l7-2M88 15l1-7"/><path d="M18 96c3 2 6 2 9 0"/></svg>`;
/* Strichliste für die Gäste (nur Anzahl, nie welcher Wunsch). */
const striche = (n) => n === 0 ? '' :
  `<svg class="striche" viewBox="0 0 ${n * 9 + 6} 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true">${
    Array.from({ length: n }, (_, i) => `<path d="M${6 + i * 9} ${4 + (i % 2)}c-.6 5-.4 10 .4 ${15 - (i % 2)}"/>`).join('')}</svg>`;
/* Der runde Stempel „Von dir“. Text im SVG, damit er als Bild gilt und nicht als Fließtext. IDs je Karte eindeutig. */
const stempel = (l, k) => `<svg class="stempel" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
  <defs><path id="stempel-bogen-${k}" d="M60 60m-41 0a41 41 0 1 1 82 0a41 41 0 1 1 -82 0"/>
  <filter id="stempel-rau-${k}"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.2 1.45"/><feComposite in="SourceGraphic" operator="in"/></filter></defs>
  <circle cx="60" cy="60" r="55" style="fill: var(--stempel-grund)"/>
  <g filter="url(#stempel-rau-${k})" fill="none" stroke="currentColor"><circle cx="60" cy="60" r="54" stroke-width="4"/><circle cx="60" cy="60" r="31" stroke-width="2"/>
    <text font-size="12" letter-spacing="2.1" fill="currentColor" stroke="none" font-weight="700"><textPath href="#stempel-bogen-${k}" startOffset="2%">FÜR ${esc(l.besitzer.toUpperCase())} · ${esc(l.titel.toUpperCase())} ·</textPath></text>
    <text x="60" y="58" text-anchor="middle" font-size="17" font-weight="800" fill="currentColor" stroke="none">Von</text>
    <text x="60" y="76" text-anchor="middle" font-size="17" font-weight="800" fill="currentColor" stroke="none">dir</text>
  </g></svg>`;

/* ---------- Hilfen ---------- */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ohneTrenn = (s) => String(s ?? '').replace(/­/g, '');
const norm = (s) => ohneTrenn(s).toLocaleLowerCase('de');
const hash = (s) => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const dreh = (id, max = 1.5) => (((hash(id) % 1000) / 1000) * 2 * max - max).toFixed(2);
const tape = (id) => {
  const n = hash(id + 't');
  return `<span class="tape tape-${n % 4}" style="--tx:${38 + (n % 24)}%;--td:${((n >> 3) % 9) - 4}deg" aria-hidden="true"></span>`;
};
const ruhig = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const tageText = (t) => (t === 0 ? 'heute' : t === 1 ? 'morgen' : `in ${t} Tagen`);
const monatTag = (d) => d.toLocaleDateString('de-DE', { day: 'numeric', month: 'long' });
const wochentag = (d) => d.toLocaleDateString('de-DE', { weekday: 'long' });
const anfang = (p) => p.name.trim()[0].toUpperCase();
const nameListe = (namen) => namen.length <= 1 ? namen.join('') : `${namen.slice(0, -1).join(', ')} und ${namen.at(-1)}`;
const GROESSEN = ['Kleidung', 'Schuhe', 'Ring', 'Hose', 'Hut'];
const preisZeile = (w) => `${euro(w.preis)} · Stand ${datumKurz(w.stand)}`;
const LINKS = { l1: 'https://freundebuch.example/l/k7Qm2xVbR4', l2: 'https://freundebuch.example/l/p3Wd8nZtQ6' };
const listeVon = (id) => LISTEN.find((l) => l.id === id) || LISTE;

/* ---------- Zustand (nur im Speicher) ---------- */
const GAST_SCHLUESSEL = 'freundebuch-pinnwand-gast';
const z = {
  eintraege: EINTRAEGE.map((e, i) => ({ ...e, reihe: i })),
  arten: ARTEN.map((a) => ({ ...a })),
  geschenke: GESCHENKE.map((g, i) => ({ ...g, reihe: i })),
  filter: 'alle',
  richtung: 'neu',
  filterPerson: null,
  zuletzt: ['mia', 'jonas', 'hilde', 'tom', 'sophie', 'ben', 'ich'],
  /* Reservierungen je Liste, wie der Server sie kennt. */
  reserv: Object.fromEntries(LISTEN.map((l) => [l.id, (l.id === LISTE.id ? RESERVIERUNGEN : l.reservierungen || []).map((r) => ({ ...r }))])),
  voll: new Set(), // „liste/wunsch“
  gast: (() => { try { return localStorage.getItem(GAST_SCHLUESSEL); } catch { return null; } })(),
  neu: null,
  neuIdee: null,
  suche: '',
};
const merkeGast = (name) => {
  z.gast = name;
  try { name ? localStorage.setItem(GAST_SCHLUESSEL, name) : localStorage.removeItem(GAST_SCHLUESSEL); } catch { /* privates Fenster: nur im Speicher */ }
};
const zuletztNach = (id) => { z.zuletzt = [id, ...z.zuletzt.filter((x) => x !== id)]; };

/* Arten: vorgegebene plus selbst angelegte. */
const artVon = (id) => z.arten.find((a) => a.id === id);
const artName = (id) => (id ? artVon(id)?.name ?? 'ohne Art' : 'ohne Art');
const zeichenVon = (a) => (a?.zeichnung === 'nadel' ? NADEL : ART[a?.zeichnung] || ART.frei);
const artZeichen = (id) => (id ? zeichenVon(artVon(id)) : ART.frei);
function artAnlegen(roh) {
  const name = roh.trim().replace(/\s+/g, ' ').slice(0, 24);
  if (!name) return null;
  const da = z.arten.find((a) => norm(a.name) === norm(name));
  if (da) return da.id;
  const id = `eigen${z.arten.length + 1}`;
  z.arten.push({ id, name, zeichnung: 'nadel', eigene: true });
  return id;
}

/* Geschenkideen einer Person; neue zuerst, sonst in der Reihenfolge, in der sie entstanden sind. */
const ideenVon = (pid) => z.geschenke.filter((g) => g.person === pid).sort((a, b) => a.reihe - b.reihe);
/* Nächster Anlass, zu dem ich die Person beschenke („Geburtstag 2026“, „Weihnachten 2026“). */
function naechsterAnlass(p) {
  const h = new Date(HEUTE + 'T12:00');
  const g = naechsterGeburtstag(p.geburtstag);
  const anlaesse = [{ name: 'Geburtstag', tage: g.tage, jahr: g.datum.getFullYear() }];
  if (p.beschenken?.includes('weihnachten')) {
    let w = new Date(h.getFullYear(), 11, 24, 12);
    if (w < h) w = new Date(h.getFullYear() + 1, 11, 24, 12);
    anlaesse.push({ name: 'Weihnachten', tage: Math.round((w - h) / 864e5), jahr: w.getFullYear() });
  }
  const a = anlaesse.sort((x, y) => x.tage - y.tage)[0];
  return `${a.name} ${a.jahr}`;
}

/* ---------- Wege ---------- */
const main = document.getElementById('inhalt');
const leiste = document.getElementById('leiste');
const weg = () => {
  const [name, id] = location.hash.replace(/^#/, '').split('/');
  return { name: name || 'person', id };
};
const gastListe = () => listeVon(weg().id);

/* ---------- Navigation ---------- */
function leisteZeichnen(w) {
  const aktiv = (ziel) => {
    if (ziel === 'ich') return (w.name === 'person' && w.id === 'ich') || w.name === 'liste';
    if (ziel === 'menschen') return w.name === 'menschen' || (w.name === 'person' && w.id !== 'ich');
    return w.name === ziel;
  };
  const punkt = (ziel, href, text, zeichen, taste = '') =>
    `<a class="nav-punkt" href="${href}"${aktiv(ziel) ? ' aria-current="page"' : ''}>${zeichen}<span>${text}</span>${taste ? `<kbd aria-hidden="true">${taste}</kbd>` : ''}</a>`;
  leiste.innerHTML = `
    ${punkt('start', '#start', 'Start', ZEICHEN.start)}
    ${punkt('menschen', '#menschen', 'Menschen', ZEICHEN.menschen)}
    <button class="nav-punkt nav-plus" type="button" data-festhalten aria-keyshortcuts="N"><span class="plus-kreis">${ZEICHEN.plus}</span><span>Festhalten</span><kbd aria-hidden="true">N</kbd></button>
    ${punkt('suche', '#suche', 'Suche', ZEICHEN.suche, '/')}
    ${punkt('ich', '#person/ich', 'Ich', ZEICHEN.ich)}`;
}

/* ---------- Bausteine ---------- */
function polaroid(p, { gross = true, dreh: d = -2.6, ueberschrift = 'h1' } = {}) {
  const Tag = ueberschrift;
  return `<figure class="polaroid farbe-${esc(p.farbe)}${gross ? '' : ' klein'}" style="--dreh:${d}">
    ${gross ? tape(p.id + 'pol') : ''}
    <div class="foto" aria-hidden="true">${KRITZEL}<span class="buchstabe">${esc(anfang(p))}</span></div>
    <figcaption><${Tag} class="pol-name">${esc(gross ? p.name : p.rufname)}</${Tag}>${p.ist_ich ? '<span class="pol-ich">ich</span>' : ''}</figcaption>
  </figure>`;
}

function geburtstagZettel(p) {
  const g = naechsterGeburtstag(p.geburtstag);
  return `<div class="gb-zettel" style="--dreh:2.2">
    <span class="gb-zeichen" aria-hidden="true">${SCHMUCK.kuchen}</span>
    <p class="gb-datum">${esc(monatTag(g.datum))}</p>
    <p class="gb-alter">wird ${g.alter}</p>
    <p class="gb-tage"><span>${tageText(g.tage)}</span></p>
  </div>`;
}

function steckbrief(p) {
  const groessen = p.steckbrief.filter((s) => GROESSEN.includes(s.bez));
  const sonst = p.steckbrief.filter((s) => !GROESSEN.includes(s.bez));
  const zeilen = [];
  if (p.kennen) zeilen.push(`<div class="sb-zeile"><dt>Kennen uns</dt><dd>${esc(p.kennen)}</dd></div>`);
  if (groessen.length) zeilen.push(`<div class="sb-zeile"><dt>Größen</dt><dd class="groessen">${groessen.map((s) =>
    `<span class="groesse"><b>${esc(s.wert)}</b><small>${esc(s.bez)}</small></span>`).join('')}</dd></div>`);
  for (const s of sonst) zeilen.push(`<div class="sb-zeile"><dt>${esc(s.bez)}</dt><dd>${esc(s.wert)}</dd></div>`);
  if (p.familie.length) zeilen.push(`<div class="sb-zeile"><dt>Familie</dt><dd class="familie">${p.familie.map((f) =>
    `<span class="fam">${f.person ? `<a href="#person/${esc(f.person)}">${esc(f.name)}</a>` : esc(f.name)}<small>${esc(f.art)}</small></span>`).join('')}</dd></div>`);
  if (!zeilen.length) zeilen.push(`<div class="sb-zeile"><dt>Steckbrief</dt><dd class="leer">noch leer</dd></div>`);
  return `<section class="karteikarte" style="--dreh:-0.6" aria-label="Steckbrief">${tape(p.id + 'sb')}<dl>${zeilen.join('')}</dl></section>`;
}

const STAND = { idee: 'Idee', besorgt: 'besorgt', verschenkt: 'verschenkt' };
const STAND_WEITER = { idee: 'besorgt', besorgt: 'verschenkt', verschenkt: 'idee' };
/* Eine Geschenkidee als Anhänger. Der Stand ist per Tipp weiterschaltbar. */
function anhaenger(g, ort) {
  return `<li class="anhaenger stand-${g.stand}${z.neuIdee === g.id ? ' neu' : ''}" data-idee="${esc(g.id)}" style="--dreh:${dreh(g.id, 0.8)}"><div class="anh-karte">
    <span class="anh-bild" aria-hidden="true">${PRODUKT[g.zeichnung] || ART.geschenk}</span>
    <p class="anh-titel">${esc(g.titel)}</p>
    <p class="anh-info"><span>${esc(g.anlass)}</span>${g.preis ? `<span>${esc(euro(g.preis))}</span>` : ''}</p>
    <button class="stand" type="button" data-stand="${esc(g.id)}" data-ort="${ort}" aria-label="Stand: ${STAND[g.stand]}. Weiterschalten">${g.stand === 'besorgt' ? ZEICHEN.haken : ''}${STAND[g.stand]}</button>
  </div></li>`;
}
function geschenkideen(p) {
  const liste = ideenVon(p.id);
  return `<section class="geschenke" aria-labelledby="gs-titel">
    <h2 id="gs-titel" class="handkopf">Geschenkideen</h2>
    ${liste.length ? `<ul class="anhaenger-liste">${liste.map((g) => anhaenger(g, 'kopf')).join('')}</ul>` : '<p class="leer-zettel">Noch keine Idee</p>'}
  </section>`;
}

function wasIchBrauche() {
  const ws = WUENSCHE.slice(0, 5);
  return `<section class="geteilt" aria-labelledby="geteilt-titel">
      <h2 id="geteilt-titel" class="geteilt-kopf">Geteilt als</h2>
      <div class="umschlaege">${LISTEN.map((l, i) => `<a class="umschlag" href="#liste/${l.id}" style="--dreh:${i % 2 ? 1 : -1.2}">
        <span class="umschlag-titel">${esc(l.titel)}</span>
        <span class="umschlag-info">${l.wuensche.length} Wünsche · ${l.gaeste.length} Gäste</span>
      </a>`).join('')}</div>
    </section>
    <section class="einkaufszettel" style="--dreh:1.1" aria-labelledby="brauche-titel">
      ${tape('brauche')}
      <h2 id="brauche-titel" class="handkopf">Was ich brauche</h2>
      <ul>${ws.map((w) => `<li><span>${esc(w.titel)}</span><small>${esc(euro(w.preis))}<span>Stand ${esc(datumKurz(w.stand))}</span></small></li>`).join('')}
        <li class="mehr"><a href="#liste">alle ${WUENSCHE.length} Wünsche</a></li></ul>
    </section>`;
}

/* Ein Zettel an der Wand. Größe der Schrift richtet sich nach der Länge des Satzes. */
function zettel(e) {
  const laenge = e.text.length;
  const groesse = laenge < 45 ? 'gross' : laenge < 95 ? 'mittel' : 'klein';
  const eigene = e.art && artVon(e.art)?.eigene && e.art !== 'zitat';
  const papier = e.art ? (eigene ? 'eigen' : e.art) : 'ohne';
  return `<div class="platz" data-id="${esc(e.id)}"><article class="zettel papier-${papier} schrift-${groesse}${z.neu === e.id ? ' neu' : ''}" style="--dreh:${dreh(e.id)}" tabindex="-1" aria-label="${esc(artName(e.art))}, ${esc(datumLang(e.datum))}">
    ${tape(e.id)}
    <button class="art-knopf${e.art ? '' : ' ohne'}" type="button" data-art-fuer="${esc(e.id)}" aria-haspopup="menu" aria-expanded="false"${e.art ? ` aria-label="Art: ${esc(artName(e.art))}. Ändern"` : ''}>${artZeichen(e.art)}<span>${e.art ? esc(artName(e.art)) : 'Art wählen'}</span></button>
    <p class="zettel-text">${esc(e.text)}</p>
    <time datetime="${esc(e.datum)}">${esc(datumLang(e.datum))}</time>
  </article></div>`;
}

function wand(p) {
  const alle = z.eintraege.filter((e) => e.person === p.id);
  const ideen = ideenVon(p.id);
  /* Jeder Chip zählt genau das, was er zeigt: Geschenkidee = Ideen dieser Person plus Zettel dieser Art. */
  const zaehl = (id) => id === 'alle' ? alle.length : alle.filter((e) => e.art === id).length + (id === 'geschenkidee' ? ideen.length : 0);
  const sicht = alle
    .filter((e) => z.filter === 'alle' || e.art === z.filter)
    .sort((a, b) => (a.datum === b.datum ? a.reihe - b.reihe : a.datum < b.datum ? -1 : 1) * (z.richtung === 'neu' ? -1 : 1));
  const zeigeIdeen = z.filter === 'geschenkidee' && ideen.length;
  const chip = (id, name, zeichen) =>
    `<button class="chip${z.filter === id ? ' an' : ''}" type="button" data-filter="${id}" aria-pressed="${z.filter === id}">${zeichen || ''}<span>${esc(name)}</span><small>${zaehl(id)}</small></button>`;
  return `<section class="wandbereich" aria-labelledby="wand-titel">
    <div class="wandkopf">
      <h2 id="wand-titel" class="handkopf">An der Wand</h2>
      <button class="reihenfolge" type="button" data-richtung aria-label="Reihenfolge: ${z.richtung === 'neu' ? 'neu zuerst' : 'alt zuerst'}. Umdrehen">
        ${z.richtung === 'neu' ? 'neu' : 'alt'}<span class="pfeil-quer" aria-hidden="true">→</span>${z.richtung === 'neu' ? 'alt' : 'neu'}</button>
    </div>
    <div class="filter" role="group" aria-label="Nach Art filtern">
      ${chip('alle', 'alle', '')}
      ${z.arten.map((a) => chip(a.id, a.name, zeichenVon(a))).join('')}
    </div>
    ${zeigeIdeen ? `<ul class="anhaenger-liste in-wand" aria-label="Geschenkideen">${ideen.map((g) => anhaenger(g, 'wand')).join('')}</ul>` : ''}
    ${sicht.length ? `<div class="wand">${sicht.map(zettel).join('')}</div>`
      : zeigeIdeen ? '' : `<p class="leer-zettel gross">Noch kein Zettel</p>`}
  </section>`;
}

/* ---------- Seiten ---------- */
function seitePerson(id) {
  const p = person(id);
  if (!p) return seiteFehlt();
  if (z.filterPerson !== id) { z.filter = 'alle'; z.filterPerson = id; }
  zuletztNach(id);
  return `<div class="personenseite">
    <header class="kopfwand">
      <div class="kopf-bild">${polaroid(p)}${geburtstagZettel(p)}</div>
      ${steckbrief(p)}
      <div class="kopf-seite">${p.ist_ich ? wasIchBrauche() : geschenkideen(p)}</div>
    </header>
    ${wand(p)}
  </div>`;
}

function seiteStart() {
  const mitGb = PERSONEN.map((p) => ({ p, g: naechsterGeburtstag(p.geburtstag) })).sort((a, b) => a.g.tage - b.g.tage);
  const erster = mitGb[0];
  const bald = mitGb.slice(1, 4);
  const heute = new Date(HEUTE + 'T12:00');
  const weihnacht = Math.round((new Date(heute.getFullYear(), 11, 24, 12) - heute) / 864e5);
  /* Anlässe der nächsten sechs Wochen ohne besorgtes Geschenk, je Person zusammengefasst. */
  const fehlt = [];
  for (const { p, g } of mitGb) {
    const anlaesse = [];
    const pruefe = (name, tage, jahr) => {
      if (tage > 42) return;
      const passend = z.geschenke.filter((x) => x.person === p.id && x.anlass === `${name} ${jahr}`);
      if (passend.some((x) => x.stand !== 'idee')) return;
      anlaesse.push({ name, tage, ideen: passend.length });
    };
    if (p.beschenken.includes('geburtstag')) pruefe('Geburtstag', g.tage, g.datum.getFullYear());
    if (p.beschenken.includes('weihnachten')) pruefe('Weihnachten', weihnacht, heute.getFullYear());
    if (anlaesse.length) fehlt.push({ p, anlaesse, ideen: anlaesse.reduce((s, a) => s + a.ideen, 0) });
  }
  const ideenGeb = z.geschenke.filter((x) => x.person === erster.p.id && x.anlass === `Geburtstag ${erster.g.datum.getFullYear()}`);
  const besorgt = ideenGeb.some((x) => x.stand !== 'idee');
  const ideeText = (n) => `${n} ${n === 1 ? 'Idee' : 'Ideen'}`;
  return `<div class="startseite">
    <p class="heute-zeile">${esc(wochentag(heute))}, ${esc(datumLang(HEUTE))}</p>
    <a class="blickfang" href="#person/${erster.p.id}" style="--dreh:-0.7">
      ${tape('blickfang')}
      <div class="bf-text">
        <span class="bf-kuchen" aria-hidden="true">${SCHMUCK.kuchen}</span>
        <h1 class="bf-titel">${esc(erster.p.rufname)} wird ${erster.g.alter}</h1>
        <p class="bf-wann"><b>${tageText(erster.g.tage)}</b><span>${esc(wochentag(erster.g.datum))}, ${esc(monatTag(erster.g.datum))}</span></p>
        <p class="bf-geschenk${besorgt ? ' ok' : ''}">${besorgt ? 'Geschenk besorgt' : ideenGeb.length ? `noch kein Geschenk · ${ideeText(ideenGeb.length)}` : 'noch kein Geschenk'}</p>
      </div>
      <div class="bf-bild">${polaroid(erster.p, { gross: false, dreh: 4, ueberschrift: 'span' })}</div>
    </a>
    <div class="start-raster">
      <section class="start-gruppe" aria-labelledby="bald-titel" style="--dreh:-0.8">
        ${tape('bald')}
        <h2 id="bald-titel" class="handkopf">Bald</h2>
        <ul class="bald-liste">${bald.map(({ p, g }) => `<li><a href="#person/${p.id}">
          <span class="bald-datum"><b>${g.datum.getDate()}.</b>${esc(g.datum.toLocaleDateString('de-DE', { month: 'short' }).replace('.', ''))}</span>
          <span class="bald-name">${esc(p.rufname)}<small>wird ${g.alter}</small></span>
          <span class="bald-tage">${tageText(g.tage)}</span></a></li>`).join('')}</ul>
      </section>
      <section class="start-gruppe fehlt" aria-labelledby="fehlt-titel" style="--dreh:0.9">
        ${tape('fehlt')}
        <h2 id="fehlt-titel" class="handkopf">Geschenk fehlt</h2>
        <ul class="fehlt-liste">${fehlt.map(({ p, anlaesse, ideen }) => `<li><a href="#person/${p.id}">
          <span class="mini-kreis farbe-${p.farbe}" aria-hidden="true">${esc(anfang(p))}</span>
          <span class="fehlt-name">${esc(p.rufname)}<small>${anlaesse.map((a) => a.name === 'Geburtstag' ? `Geburtstag ${tageText(a.tage)}` : a.name).join(' · ')}</small></span>
          <span class="fehlt-ideen">${ideen ? ideeText(ideen) : 'keine Idee'}</span></a></li>`).join('')}</ul>
      </section>
    </div>
  </div>`;
}

function seiteMenschen() {
  const alle = [...PERSONEN].sort((a, b) => a.rufname.localeCompare(b.rufname, 'de'));
  return `<div class="menschenseite">
    <h1 class="seitentitel">Menschen</h1>
    <ul class="polaroid-wand">${alle.map((p) => {
      const g = naechsterGeburtstag(p.geburtstag);
      return `<li><a class="pol-link" href="#person/${p.id}">
        ${polaroid(p, { gross: false, dreh: dreh(p.id, 2.4), ueberschrift: 'span' })}
        <span class="pol-unter">${esc(datumKurz(p.geburtstag))} · ${tageText(g.tage)}</span></a></li>`;
    }).join('')}</ul>
  </div>`;
}

function seiteSuche() {
  return `<div class="suchseite">
    <h1 class="seitentitel">Suche</h1>
    <label class="suchfeld">${ZEICHEN.suche}<span class="unsichtbar">Suchen</span>
      <input id="suche-feld" type="search" autocomplete="off" spellcheck="false" placeholder="Name, Wort, Geschenk" value="${esc(z.suche)}"></label>
    <div id="treffer" class="treffer" aria-live="polite">${treffer(z.suche)}</div>
  </div>`;
}

/* Hervorheben ohne weiche Trennzeichen, damit „Geräuschunterdrückung“ auch getrennt gefunden wird. */
function markiere(text, q) {
  const t = ohneTrenn(text);
  if (!q) return esc(t);
  const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return t.split(re).map((teil, i) => (i % 2 ? `<mark>${esc(teil)}</mark>` : esc(teil))).join('');
}
function treffer(roh) {
  const q = ohneTrenn(roh).trim();
  if (!q) return '';
  const k = norm(q);
  const hat = (s) => norm(s).includes(k);
  const leute = [...PERSONEN, ICH];
  const menschen = leute.map((p) => {
    const felder = [p.name, p.rufname, p.kennen, ...p.steckbrief.map((s) => `${s.bez} ${s.wert}`), ...p.familie.map((f) => `${f.name} (${f.art})`)];
    const fund = felder.find(hat);
    return fund ? { p, fund } : null;
  }).filter(Boolean);
  const zettelT = z.eintraege.filter((e) => hat(e.text));
  const ideen = z.geschenke.filter((g) => hat(g.titel) || hat(g.haendler) || hat(g.anlass));
  if (!menschen.length && !zettelT.length && !ideen.length) return '<p class="leer-zettel gross">Nichts gefunden</p>';
  return `
    ${menschen.length ? `<section aria-label="Menschen"><h2 class="treffer-kopf">Menschen</h2><ul class="treffer-liste">${menschen.map(({ p, fund }) => `
      <li><a class="treffer-mensch" href="#person/${p.id}"><span class="mini-kreis farbe-${p.farbe}" aria-hidden="true">${esc(anfang(p))}</span>
        <span><b>${markiere(p.name, q)}</b>${fund !== p.name ? `<small>${markiere(fund, q)}</small>` : ''}</span></a></li>`).join('')}</ul></section>` : ''}
    ${zettelT.length ? `<section aria-label="Zettel"><h2 class="treffer-kopf">Zettel</h2><ul class="treffer-liste">${zettelT.map((e) => {
      const p = person(e.person);
      const papier = e.art ? (artVon(e.art)?.eigene && e.art !== 'zitat' ? 'eigen' : e.art) : 'ohne';
      return `<li><a class="treffer-zettel papier-${papier}" href="#person/${p.id}" style="--dreh:${dreh(e.id, 0.7)}">
        <span class="tz-kopf"><b>${esc(p.rufname)}</b> · ${esc(artName(e.art))} · ${esc(datumKurz(e.datum))}${e.datum.slice(0, 4)}</span>
        <span class="tz-text">${markiere(e.text, q)}</span></a></li>`;
    }).join('')}</ul></section>` : ''}
    ${ideen.length ? `<section aria-label="Geschenkideen"><h2 class="treffer-kopf">Geschenkideen</h2><ul class="treffer-liste">${ideen.map((g) => {
      const p = person(g.person);
      return `<li><a class="treffer-idee stand-${g.stand}" href="#person/${p.id}"><span class="anh-bild" aria-hidden="true">${PRODUKT[g.zeichnung] || ART.geschenk}</span>
        <span><b>${markiere(g.titel, q)}</b><small>${esc(p.rufname)} · ${markiere(g.anlass, q)}</small></span><span class="stand">${STAND[g.stand]}</span></a></li>`;
    }).join('')}</ul></section>` : ''}`;
}

/* Wunschliste, wie ich sie sehe: immer vollständig, ohne jeden Reservierungsstand. Je Gast nur die Anzahl. */
function seiteListe(listeId) {
  const l = listeVon(listeId);
  const anzahl = Object.fromEntries(l.gaeste.map((g) => [g, 0]));
  for (const r of z.reserv[l.id]) if (r.gast in anzahl) anzahl[r.gast]++;
  const ws = l.wuensche.map((id) => WUENSCHE.find((w) => w.id === id));
  const shop = (w, inhalt, extra = '') => `<a href="${esc(w.url)}" target="_blank" rel="noopener noreferrer"${extra}>${inhalt}</a>`;
  return `<div class="listenseite">
    <header class="listenkopf">
      <nav class="listen-wechsel" aria-label="Meine Wunschlisten">${LISTEN.map((x) =>
        `<a href="#liste/${x.id}"${x.id === l.id ? ' aria-current="page"' : ''}>${esc(x.titel)}</a>`).join('')}</nav>
      <h1 class="seitentitel">${esc(l.titel)}</h1>
      <p class="listen-info">${esc(datumLang(l.anlass).replace(/ \d{4}$/, ''))} · ${ws.length} Wünsche</p>
      <div class="knopfreihe">
        <button class="knopf haupt" type="button" data-teilen="${l.id}">${ZEICHEN.kette}<span>Link teilen</span></button>
        <a class="knopf zweit" href="${l.id === LISTE.id ? '#gast' : `#gast/${l.id}`}">${ZEICHEN.auge}<span>So sehen es deine Leute</span></a>
      </div>
    </header>
    <div class="listen-raster">
      <aside class="gaeste-zettel" style="--dreh:-1" aria-labelledby="gaeste-titel">
        ${tape('gaeste' + l.id)}
        <h2 id="gaeste-titel" class="handkopf">Gäste</h2>
        <ul>${l.gaeste.map((g) => `<li class="${anzahl[g] ? '' : 'null'}"><span class="g-name">${esc(g)} · ${anzahl[g]}</span>${striche(anzahl[g])}</li>`).join('')}</ul>
        <button class="knopf aus" type="button" disabled>${ZEICHEN.schloss}<span>Aufdecken ab ${esc(datumKurz(l.aufdeckenAb))}</span></button>
      </aside>
      <div class="wand wunschwand">${ws.map((w) => `<div class="platz"><article class="wunsch-zettel" style="--dreh:${dreh(w.id)}">
        ${tape(w.id)}
        ${shop(w, PRODUKT[w.zeichnung] || '', ' class="wz-bild" tabindex="-1" aria-hidden="true"')}
        <h2 class="wz-titel">${shop(w, `${esc(w.titel)}<span class="unsichtbar"> (${esc(w.haendler)}, neuer Tab)</span>`)}</h2>
        <p class="wz-beschr">${esc(w.beschreibung)}</p>
        <p class="wz-preis">${esc(preisZeile(w))}</p>
        <p class="wz-haendler">${esc(w.haendler)}${w.zusammenlegen ? '<span class="zl-marke">zum Zusammenlegen</span>' : ''}</p>
      </article></div>`).join('')}</div>
    </div>
  </div>`;
}

/* ---------- Gast ---------- */
function seiteGast(l) {
  const kopf = `<p class="gast-ueber">${esc(l.besitzer)} wünscht sich</p>`;
  const ende = `<a class="vorschau-ende" href="#liste/${l.id}">Vorschau beenden</a>`;
  if (!z.gast || !l.gaeste.includes(z.gast)) {
    return `<div class="gastseite wer">
      <header class="gast-kopf">${kopf}<p class="gast-anlass">${esc(l.titel)}</p></header>
      <h1 class="wer-frage">Wer bist du?</h1>
      <ul class="namensschilder">${l.gaeste.map((g) => `<li><button class="namensschild" type="button" data-gast="${esc(g)}" style="--dreh:${dreh(g, 1.6)}">
        <span class="ns-band">Hallo, ich bin</span><span class="ns-name">${esc(g)}</span></button></li>`).join('')}</ul>
      ${ende}
    </div>`;
  }
  const ich = z.gast;
  const vonMir = [], frei = [];
  for (const id of l.wuensche) {
    const w = WUENSCHE.find((x) => x.id === id);
    const rs = z.reserv[l.id].filter((r) => r.wunsch === id);
    const meins = rs.find((r) => r.gast === ich);
    if (meins) { vonMir.push({ w, art: meins.art, rs }); continue; }
    if (rs.some((r) => r.art === 'schenke_ich')) continue; // von jemand anderem: für mich weg
    if (w.zusammenlegen && z.voll.has(`${l.id}/${id}`)) continue; // voll markiert: für alle anderen weg
    frei.push({ w, rs });
  }
  return `<div class="gastseite">
    <header class="gast-kopf">
      <div class="gast-oben">${kopf}<p class="gast-wer"><span>Für ${esc(ich)}</span><span aria-hidden="true">·</span><button class="leise-knopf" type="button" data-gast-wechsel>Nicht ${esc(ich)}?</button></p></div>
      <h1 class="gast-titel">${esc(l.titel)}</h1>
    </header>
    ${vonMir.length ? `<section class="von-dir" aria-labelledby="vondir-titel">
      <h2 id="vondir-titel" class="handkopf">Von dir</h2>
      <div class="gast-wand">${vonMir.map((x) => wunschKarte(l, x, true)).join('')}</div>
    </section>` : ''}
    <section aria-labelledby="frei-titel">
      <h2 id="frei-titel" class="handkopf">${vonMir.length ? 'Noch zu haben' : 'Such dir was aus'}</h2>
      ${frei.length ? `<div class="gast-wand">${frei.map((x) => wunschKarte(l, x, false)).join('')}</div>` : '<p class="leer-zettel gross">Alles vergeben</p>'}
    </section>
    ${ende}
  </div>`;
}

function wunschKarte(l, { w, art: meineArt, rs }, meins) {
  const ich = z.gast;
  const voll = z.voll.has(`${l.id}/${w.id}`);
  const dabei = rs.filter((r) => r.art === 'bin_dabei' && r.gast !== ich).map((r) => r.gast);
  const binDabei = meins && meineArt === 'bin_dabei';
  let zeile = '';
  if (w.zusammenlegen) {
    const namen = binDabei ? [...dabei, 'du'] : dabei;
    const text = namen.length ? `${nameListe(namen)} ${namen.length === 1 && !binDabei ? 'ist' : 'sind'} dabei` : 'noch keiner dabei';
    zeile = `<p class="zl-zeile">${voll ? '<b>Ist voll</b>' : '<b>Zusammenlegen</b>'} · ${esc(binDabei && namen.length === 1 ? 'nur du bist dabei' : text)}</p>`;
  }
  let knoepfe;
  if (!meins) {
    knoepfe = w.zusammenlegen
      ? `<button class="knopf haupt" type="button" data-dabei="${w.id}">Ich bin dabei</button>`
      : `<button class="knopf haupt" type="button" data-schenken="${w.id}">Das schenke ich</button>`;
  } else if (binDabei) {
    knoepfe = `<button class="knopf leise" type="button" data-doch-nicht="${w.id}">Doch nicht</button>${voll ? '' : `<button class="knopf haupt" type="button" data-voll="${w.id}">Ist voll</button>`}`;
  } else {
    knoepfe = `<button class="knopf leise" type="button" data-zuruecknehmen="${w.id}">Zurücknehmen</button>`;
  }
  const ziel = `href="${esc(w.url)}" target="_blank" rel="noopener noreferrer"`;
  return `<article class="wunsch${meins ? ' meins' : ''}${binDabei ? ' gemeinsam' : ''}" data-wunsch="${w.id}" style="--dreh:${dreh(w.id, meins ? 0.8 : 1.2)};view-transition-name:wunsch-${w.id}">
    ${tape(w.id)}
    <a class="w-bild" ${ziel} tabindex="-1" aria-hidden="true">${PRODUKT[w.zeichnung] || ''}</a>
    <div class="w-text">
      <h3 class="w-titel"><a ${ziel}>${esc(w.titel)}<span class="unsichtbar"> (${esc(w.haendler)}, neuer Tab)</span></a></h3>
      <p class="w-beschr">${esc(w.beschreibung)}</p>
      <p class="w-preis">${esc(preisZeile(w))}</p>
      <p class="w-haendler">${esc(w.haendler)}</p>
    </div>
    ${zeile}
    <div class="w-knoepfe">
      <a class="shop-link" ${ziel}>Zum Shop${ZEICHEN.raus}<span class="unsichtbar"> (${esc(w.haendler)}, neuer Tab)</span></a>
      <span class="w-aktionen">${knoepfe}</span>
    </div>
    ${meins && !binDabei ? `<span class="stempel-platz">${stempel(l, w.id)}</span>` : ''}
  </article>`;
}

function seiteFehlt() {
  return `<div class="leerseite"><h1 class="seitentitel">Nicht gefunden</h1><p><a href="#start">Zum Start</a></p></div>`;
}

/* ---------- Zeichnen ---------- */
let letzterWeg = '';
function zeichnen({ scroll = true } = {}) {
  const w = weg();
  const schluessel = `${w.name}/${w.id || ''}`;
  /* Die wischbare Filterreihe behält ihre Stellung, wenn die Seite neu gezeichnet wird. */
  const filterX = schluessel === letzterWeg ? main.querySelector('.filter')?.scrollLeft || 0 : 0;
  document.body.dataset.weg = w.name;
  leisteZeichnen(w);
  let html;
  switch (w.name) {
    case 'person': html = seitePerson(w.id || 'mia'); break;
    case 'start': html = seiteStart(); break;
    case 'menschen': html = seiteMenschen(); break;
    case 'suche': html = seiteSuche(); break;
    case 'liste': html = seiteListe(w.id); break;
    case 'gast': html = seiteGast(gastListe()); break;
    default: html = seiteFehlt();
  }
  main.innerHTML = html;
  const reihe = main.querySelector('.filter');
  if (reihe && filterX) reihe.scrollLeft = filterX;
  if (scroll && schluessel !== letzterWeg) window.scrollTo(0, 0);
  letzterWeg = schluessel;
}

/* Mit sanftem Übergang umstellen, wenn der Browser es kann und Bewegung erwünscht ist. */
function umstellen(fn) {
  if (!document.startViewTransition || ruhig()) { fn(); return Promise.resolve(); }
  return document.startViewTransition(fn).finished.catch(() => {});
}

/* ---------- Hinweis (ruhige Bestätigung) ---------- */
const hinweisEl = document.getElementById('hinweis');
let hinweisZeit;
function hinweis(html, dauer = 2800) {
  hinweisEl.innerHTML = `<span>${html}</span>`;
  hinweisEl.classList.remove('zeigt');
  void hinweisEl.offsetWidth;
  hinweisEl.classList.add('zeigt');
  clearTimeout(hinweisZeit);
  hinweisZeit = setTimeout(() => hinweisEl.classList.remove('zeigt'), dauer);
}

/* ---------- Art ändern (kleine Auswahl) ---------- */
const artwahl = document.getElementById('artwahl');
let artKnopf = null;
function artwahlOeffnen(knopf) {
  const e = z.eintraege.find((x) => x.id === knopf.dataset.artFuer);
  artKnopf = knopf;
  knopf.setAttribute('aria-expanded', 'true');
  const wahl = [...z.arten, { id: null, name: 'ohne Art' }];
  artwahl.innerHTML = wahl.map((a) => `<button type="button" role="menuitemradio" aria-checked="${(e.art ?? null) === a.id}" data-setze-art="${a.id ?? ''}" class="${a.id ? '' : 'ohne'}">${a.id ? zeichenVon(a) : ART.frei}<span>${esc(a.name)}</span></button>`).join('')
    + `<button type="button" role="menuitem" class="art-neu" data-art-neu aria-label="Neue Art">${ZEICHEN.plus}<span>Art</span></button>`;
  artwahl.hidden = false;
  /* Passt die Auswahl unter dem Knopf nicht ins Fenster (Leiste unten), erst sanft hochscrollen. */
  const fehlt = knopf.getBoundingClientRect().bottom + 6 + artwahl.offsetHeight - fensterUnten();
  if (fehlt > 0) scrollBy({ top: fehlt, behavior: 'instant' });
  artwahlPlatzieren();
  (artwahl.querySelector('[aria-checked="true"]') || artwahl.querySelector('button')).focus();
}
/* „＋ Art“: kleines Feld an Ort und Stelle, Enter legt an und setzt die Art. */
function artwahlFeld() {
  const k = artwahl.querySelector('[data-art-neu]');
  if (!k) return;
  k.outerHTML = `<label class="art-neu-feld">${NADEL}<span class="unsichtbar">Neue Art</span><input id="artwahl-neu" type="text" maxlength="24" autocomplete="off" placeholder="Neue Art"></label>`;
  artwahlPlatzieren();
  artwahl.querySelector('#artwahl-neu').focus();
}
/* Unterkante des freien Fensters: am Handy über der Leiste. */
const fensterUnten = () => {
  const l = leiste.getBoundingClientRect();
  return (l.width >= innerWidth - 1 && l.top < innerHeight ? l.top : innerHeight) - 8;
};
function artwahlPlatzieren() {
  if (artwahl.hidden || !artKnopf) return;
  const r = artKnopf.getBoundingClientRect(), m = artwahl.getBoundingClientRect();
  const links = Math.min(Math.max(8, r.left - 4), innerWidth - m.width - 8);
  const wunsch = r.bottom + 6 + m.height > fensterUnten() && r.top - m.height - 6 > 8 ? r.top - m.height - 6 : r.bottom + 6;
  /* Folgt dem Knopf beim Scrollen, bleibt aber immer ganz im Fenster. */
  const oben = Math.max(8, Math.min(wunsch, fensterUnten() - m.height));
  artwahl.style.left = `${links}px`;
  artwahl.style.top = `${oben}px`;
}
function artwahlSchliessen(fokusZurueck = false) {
  if (artwahl.hidden) return;
  artwahl.hidden = true;
  artKnopf?.setAttribute('aria-expanded', 'false');
  if (fokusZurueck) artKnopf?.focus();
  artKnopf = null;
}
function artSetzen(neueArt) {
  const id = artKnopf.dataset.artFuer;
  const e = z.eintraege.find((x) => x.id === id);
  e.art = neueArt || null;
  artwahlSchliessen();
  zeichnen({ scroll: false });
  const k = main.querySelector(`[data-art-fuer="${id}"]`);
  if (k) { k.classList.add('frisch'); k.focus(); } else main.querySelector('.filter .chip.an')?.focus();
  hinweis(`Jetzt: ${esc(artName(e.art))}`);
}

/* ---------- Festhalten ---------- */
const dialog = document.getElementById('festhalten');
const fh = { person: null, art: null, suche: '' };
function festhaltenOeffnen() {
  if (dialog.open) return;
  artwahlSchliessen();
  const w = weg();
  /* Auf einer Personenseite ist diese Person gewählt, sonst niemand. */
  fh.person = w.name === 'person' && person(w.id || 'mia') ? (w.id || 'mia') : null;
  fh.art = null;
  fh.suche = '';
  dialog.innerHTML = `<form class="blatt" novalidate>
    <div class="blatt-kopf">
      <h2 id="festhalten-titel" class="handkopf">Festhalten</h2>
      <button class="rund-knopf" type="button" data-schliessen aria-label="Schließen">${ZEICHEN.schliessen}</button>
    </div>
    <div class="fh-person">
      <label class="fh-suche"><span>Für</span><input id="fh-suche" type="text" autocomplete="off" spellcheck="false" placeholder="Name suchen" aria-describedby="fh-wahl-text"></label>
      <div class="personen-wahl" id="fh-personen" role="group" aria-label="Person"></div>
      <span id="fh-wahl-text" class="unsichtbar"></span>
    </div>
    <div class="fh-notiz">
      ${tape('fh')}
      <textarea id="fh-text" rows="3" placeholder="Was ist dir eingefallen?" aria-label="Satz"></textarea>
    </div>
    <div class="fh-arten" id="fh-arten" role="group" aria-label="Art, freiwillig"></div>
    <div class="blatt-fuss"><button class="knopf haupt gross" type="submit" id="fh-speichern">Anheften</button></div>
  </form>`;
  dialog.showModal();
  personenWahlZeichnen();
  fhArtenZeichnen();
  dialog.querySelector(fh.person ? '#fh-text' : '#fh-suche').focus();
}
const passtZu = (p, k) => norm(p.name).includes(k) || norm(p.rufname).includes(k);
function fhTreffer() {
  const k = norm(fh.suche.trim());
  const leute = z.zuletzt.map(person);
  return k ? leute.filter((p) => passtZu(p, k)) : leute;
}
/* Alle Menschen in einer wischbaren Reihe, zuletzt genutzte zuerst; Tippen ins Feld sucht. */
function personenWahlZeichnen() {
  const auswahl = fhTreffer();
  const sucht = !!fh.suche.trim();
  const ort = dialog.querySelector('#fh-personen');
  ort.innerHTML = auswahl.length ? auswahl.map((p, i) => `<button type="button" class="person-chip${p.id === fh.person ? ' an' : ''}${sucht && i === 0 ? ' erster' : ''}" data-fh-person="${p.id}" aria-pressed="${p.id === fh.person}">
      <span class="mini-kreis farbe-${p.farbe}" aria-hidden="true">${esc(anfang(p))}</span><span>${esc(p.rufname)}</span></button>`).join('')
    : '<span class="fh-keiner">Niemand gefunden</span>';
  ort.scrollLeft = 0;
  ort.querySelector('.an')?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  dialog.querySelector('#fh-wahl-text').textContent = fh.person ? `Gewählt: ${person(fh.person).rufname}` : 'Noch niemand gewählt';
  const knopf = dialog.querySelector('#fh-speichern');
  knopf.setAttribute('aria-disabled', String(!fh.person));
}
function fhArtenZeichnen(feld = false) {
  const ort = dialog.querySelector('#fh-arten');
  ort.innerHTML = z.arten.map((a) => `<button type="button" class="chip klein${fh.art === a.id ? ' an' : ''}" data-fh-art="${a.id}" aria-pressed="${fh.art === a.id}">${zeichenVon(a)}<span>${esc(a.name)}</span></button>`).join('')
    + (feld
      ? `<label class="chip klein art-feld">${NADEL}<span class="unsichtbar">Neue Art</span><input id="fh-neue-art" type="text" maxlength="24" autocomplete="off" placeholder="Neue Art"></label>`
      : `<button type="button" class="chip klein plus-art" data-fh-art-neu aria-label="Neue Art">${ZEICHEN.plus}<span>Art</span></button>`);
}
const wackel = (el) => { el.classList.remove('wackelt'); void el.offsetWidth; el.classList.add('wackelt'); };
function personWaehlen(id) {
  fh.person = id;
  fh.suche = '';
  dialog.querySelector('#fh-suche').value = '';
  personenWahlZeichnen();
}
function festhaltenSpeichern() {
  if (!fh.person) { dialog.querySelector('#fh-suche').focus(); wackel(dialog.querySelector('.fh-person')); return; }
  const feld = dialog.querySelector('#fh-text');
  const text = feld.value.trim();
  if (!text) { feld.focus(); wackel(feld); return; }
  const p = person(fh.person);
  const w = weg();
  const aufSeite = w.name === 'person' && (w.id || 'mia') === fh.person;
  const istIdee = fh.art === 'geschenkidee';
  let ziel;
  if (istIdee) {
    /* Eine Geschenkidee ist ein Eintrag dieser Art: sie steht danach bei den Geschenkideen. */
    const id = `g${Date.now()}`;
    z.geschenke.push({ id, person: fh.person, titel: text, haendler: '', preis: null, stand: 'idee', anlass: naechsterAnlass(p), zeichnung: null, reihe: -Date.now() });
    z.neuIdee = id;
    ziel = `[data-idee="${id}"]`;
  } else {
    const id = `n${Date.now()}`;
    z.eintraege.push({ id, person: fh.person, art: fh.art, datum: HEUTE, text, reihe: z.eintraege.length });
    z.neu = id;
    ziel = `.platz[data-id="${id}"] .zettel`;
  }
  zuletztNach(fh.person);
  dialog.close();
  const wer = p.ist_ich ? 'dir' : esc(p.rufname);
  if (aufSeite) {
    if (istIdee && p.ist_ich) z.filter = 'geschenkidee';
    else if (!istIdee && z.filter !== 'alle' && z.filter !== fh.art) z.filter = 'alle';
    zeichnen({ scroll: false });
    nachHeften(ziel);
    hinweis(`Bei ${wer} festgehalten`);
  } else {
    /* Ich bleibe, wo ich war. Die Bestätigung führt auf Wunsch zur Person. */
    z.neu = null; z.neuIdee = null;
    zeichnen({ scroll: false });
    hinweis(`Bei <a href="#person/${p.id}">${wer}</a> festgehalten`, 5200);
  }
}
function nachHeften(sel) {
  requestAnimationFrame(() => {
    const el = main.querySelector(sel);
    if (el) {
      const r = el.getBoundingClientRect();
      if (r.top < 0 || r.bottom > fensterUnten()) el.scrollIntoView({ block: 'center', behavior: ruhig() ? 'auto' : 'smooth' });
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
      el.focus({ preventScroll: true });
    }
    setTimeout(() => { z.neu = null; z.neuIdee = null; }, 50);
  });
}

dialog.addEventListener('click', (ev) => {
  if (ev.target === dialog) { dialog.close(); return; } // Tipp neben das Blatt schließt
  const t = ev.target.closest('button');
  if (!t) return;
  if (t.matches('[data-schliessen]')) dialog.close();
  else if (t.dataset.fhPerson) { personWaehlen(t.dataset.fhPerson); dialog.querySelector(`[data-fh-person="${fh.person}"]`)?.focus(); }
  else if ('fhArtNeu' in t.dataset) { fhArtenZeichnen(true); const f = dialog.querySelector('#fh-neue-art'); f.scrollIntoView({ inline: 'nearest', block: 'nearest' }); f.focus(); }
  else if (t.dataset.fhArt) {
    fh.art = fh.art === t.dataset.fhArt ? null : t.dataset.fhArt;
    for (const b of dialog.querySelectorAll('[data-fh-art]')) { const an = b.dataset.fhArt === fh.art; b.classList.toggle('an', an); b.setAttribute('aria-pressed', an); }
  }
});
dialog.addEventListener('submit', (ev) => { ev.preventDefault(); festhaltenSpeichern(); });
dialog.addEventListener('input', (ev) => {
  if (ev.target.id === 'fh-suche') { fh.suche = ev.target.value; personenWahlZeichnen(); }
});
dialog.addEventListener('focusout', (ev) => {
  /* Leeres Feld für eine neue Art verschwindet wieder, wenn man weitergeht. */
  if (ev.target.id === 'fh-neue-art' && !ev.target.value.trim()) setTimeout(() => { if (dialog.open && dialog.querySelector('#fh-neue-art') && document.activeElement?.id !== 'fh-neue-art') fhArtenZeichnen(); });
});
dialog.addEventListener('keydown', (ev) => {
  const id = ev.target.id;
  if (ev.key === 'Escape' && id === 'fh-neue-art') {
    ev.preventDefault();
    fhArtenZeichnen();
    dialog.querySelector('[data-fh-art-neu]').focus();
    return;
  }
  if (ev.key !== 'Enter' || ev.shiftKey || ev.isComposing) return;
  if (id === 'fh-suche') {
    ev.preventDefault();
    const erster = fh.suche.trim() ? fhTreffer()[0] : null;
    if (erster) personWaehlen(erster.id);
    if (fh.person) dialog.querySelector('#fh-text').focus();
    else wackel(dialog.querySelector('.fh-person'));
  } else if (id === 'fh-text') { ev.preventDefault(); festhaltenSpeichern(); }
  else if (id === 'fh-neue-art') {
    ev.preventDefault();
    const neu = artAnlegen(ev.target.value);
    if (neu) fh.art = neu;
    fhArtenZeichnen();
    const chip = dialog.querySelector(neu ? `[data-fh-art="${neu}"]` : '[data-fh-art-neu]');
    chip.scrollIntoView({ inline: 'nearest', block: 'nearest' });
    chip.focus();
    if (neu) zeichnen({ scroll: false }); // neue Art steht sofort auch als Filter da
  }
});

/* ---------- Reservieren (Gast) ---------- */
let beschaeftigt = false;
async function schenken(id) {
  if (beschaeftigt) return;
  beschaeftigt = true;
  const l = gastListe();
  const karte = main.querySelector(`[data-wunsch="${id}"]`);
  const still = ruhig();
  for (const b of karte.querySelectorAll('button')) b.disabled = true;
  const platz = document.createElement('span');
  platz.className = 'stempel-platz drueckt';
  platz.innerHTML = stempel(l, `${id}-druck`);
  karte.append(platz);
  if (!still) {
    const st = platz.animate([
      { transform: 'translate(-50%,-50%) scale(1.9) rotate(-34deg)', opacity: 0 },
      { transform: 'translate(-50%,-50%) scale(.94) rotate(-13deg)', opacity: 0.95, offset: 0.68 },
      { transform: 'translate(-50%,-50%) scale(1) rotate(-12deg)', opacity: 0.9 },
    ], { duration: 360, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'forwards' });
    karte.animate([{ scale: 1 }, { scale: 1 }, { scale: 0.975 }, { scale: 1 }], { duration: 420, easing: 'ease-out' });
    await st.finished;
    await pause(140);
  } else {
    await pause(320);
  }
  await umstellen(() => {
    z.reserv[l.id].push({ wunsch: id, gast: z.gast, art: 'schenke_ich' });
    zeichnen({ scroll: false });
  });
  beschaeftigt = false;
  main.querySelector(`[data-wunsch="${id}"] [data-zuruecknehmen]`)?.focus({ preventScroll: true });
}
async function gastAendern(fn, fokus) {
  await umstellen(() => { fn(gastListe().id); zeichnen({ scroll: false }); });
  if (fokus) main.querySelector(fokus)?.focus({ preventScroll: true });
}
const ohneMich = (lid, wid) => { z.reserv[lid] = z.reserv[lid].filter((r) => !(r.wunsch === wid && r.gast === z.gast)); };

/* ---------- Ereignisse ---------- */
document.addEventListener('click', async (ev) => {
  const t = ev.target.closest('button, a');
  if (!artwahl.hidden && !ev.target.closest('#artwahl') && !t?.dataset.artFuer) artwahlSchliessen();
  if (!t) return;
  const d = t.dataset;
  if ('festhalten' in d) festhaltenOeffnen();
  else if (d.filter) {
    z.filter = d.filter;
    zeichnen({ scroll: false });
    const chip = main.querySelector(`[data-filter="${d.filter}"]`);
    chip?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
    chip?.focus({ preventScroll: true });
  }
  else if ('richtung' in d) { z.richtung = z.richtung === 'neu' ? 'alt' : 'neu'; zeichnen({ scroll: false }); main.querySelector('[data-richtung]')?.focus(); }
  else if (d.artFuer) { if (artKnopf === t) artwahlSchliessen(true); else { artwahlSchliessen(); artwahlOeffnen(t); } }
  else if ('artNeu' in d) artwahlFeld();
  else if ('setzeArt' in d) artSetzen(d.setzeArt);
  else if (d.stand) {
    const g = z.geschenke.find((x) => x.id === d.stand);
    g.stand = STAND_WEITER[g.stand];
    zeichnen({ scroll: false });
    main.querySelector(`[data-stand="${d.stand}"][data-ort="${d.ort}"]`)?.focus();
  }
  else if ('teilen' in d) {
    const l = listeVon(d.teilen);
    try { await navigator.clipboard.writeText(LINKS[l.id]); } catch { /* Entwurf: Kopieren darf scheitern */ }
    hinweis(`Link zu ${esc(l.titel)} kopiert`);
  }
  else if (d.gast) { merkeGast(d.gast); zeichnen(); main.focus(); }
  else if ('gastWechsel' in d) { merkeGast(null); zeichnen(); main.querySelector('.namensschild')?.focus(); }
  else if (d.schenken) schenken(d.schenken);
  else if (d.zuruecknehmen) gastAendern((lid) => ohneMich(lid, d.zuruecknehmen), `[data-wunsch="${d.zuruecknehmen}"] [data-schenken]`);
  else if (d.dabei) gastAendern((lid) => z.reserv[lid].push({ wunsch: d.dabei, gast: z.gast, art: 'bin_dabei' }), `[data-wunsch="${d.dabei}"] [data-voll]`);
  else if (d.voll) gastAendern((lid) => z.voll.add(`${lid}/${d.voll}`), `[data-wunsch="${d.voll}"] [data-doch-nicht]`);
  else if (d.dochNicht) gastAendern((lid) => { ohneMich(lid, d.dochNicht); z.voll.delete(`${lid}/${d.dochNicht}`); }, `[data-wunsch="${d.dochNicht}"] [data-dabei]`);
});

artwahl.addEventListener('keydown', (ev) => {
  if (ev.target.id === 'artwahl-neu' && ev.key === 'Enter') {
    ev.preventDefault();
    const neu = artAnlegen(ev.target.value);
    if (neu) artSetzen(neu); else artwahlSchliessen(true);
    return;
  }
  const knoepfe = [...artwahl.querySelectorAll('button, input')];
  const i = knoepfe.indexOf(document.activeElement);
  if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
    ev.preventDefault();
    knoepfe[(i + (ev.key === 'ArrowDown' ? 1 : -1) + knoepfe.length) % knoepfe.length].focus();
  } else if (ev.key === 'Escape') { ev.preventDefault(); artwahlSchliessen(true); }
  else if (ev.key === 'Tab') artwahlSchliessen(true);
});
/* Beim Scrollen bleibt die Auswahl am Knopf hängen. */
addEventListener('scroll', () => artwahlPlatzieren(), { passive: true });
/* Nur bei neuer Breite neu setzen: eine kurz geänderte Höhe (Bildschirmfoto, Tastatur) soll die Auswahl nicht verschieben. */
let letzteBreite = innerWidth;
addEventListener('resize', () => { if (innerWidth !== letzteBreite) { letzteBreite = innerWidth; artwahlPlatzieren(); } });

main.addEventListener('input', (ev) => {
  if (ev.target.id === 'suche-feld') { z.suche = ev.target.value; document.getElementById('treffer').innerHTML = treffer(z.suche); }
});

/* Tastatur: N öffnet Festhalten, / die Suche (nicht beim Schreiben, nicht für Gäste). */
document.addEventListener('keydown', (ev) => {
  if (ev.metaKey || ev.ctrlKey || ev.altKey || dialog.open) return;
  const schreibt = ev.target.closest?.('input, textarea, [contenteditable]');
  if (schreibt || document.body.dataset.weg === 'gast') return;
  if (ev.key === 'n' || ev.key === 'N') { ev.preventDefault(); festhaltenOeffnen(); }
  else if (ev.key === '/') {
    ev.preventDefault();
    if (weg().name !== 'suche') location.hash = '#suche';
    requestAnimationFrame(() => document.getElementById('suche-feld')?.focus());
  }
});

addEventListener('hashchange', () => {
  artwahlSchliessen();
  zeichnen();
  const w = weg();
  if (w.name === 'suche') document.getElementById('suche-feld')?.focus();
  else if (!z.neu) main.focus({ preventScroll: true });
});

if (!location.hash) history.replaceState(null, '', '#person/mia');
zeichnen();
