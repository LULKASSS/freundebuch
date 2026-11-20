/* Entwurf „Poesiealbum“: das Freundebuch als erwachsenes Album.
 * Eine Seite mit Hash-Wegen, Zustand nur im Speicher (nur die Gast-Wahl merkt sich das Gerät).
 * Alle Inhalte erfunden, sie kommen aus ../gemeinsam/daten.js. */
import {
  HEUTE, ARTEN, PERSONEN, ICH, EINTRAEGE, GESCHENKE, WUENSCHE, LISTE, LISTE2, LISTEN, RESERVIERUNGEN,
  euro, datumKurz, datumLang, naechsterGeburtstag, person,
} from '../gemeinsam/daten.js';
import { PRODUKT, ART, SCHMUCK } from '../gemeinsam/zeichnungen.js';

/* ---------- Zustand ---------- */
const GAST_SCHLUESSEL = 'freundebuch.poesiealbum.gast';
const zustand = {
  eintraege: EINTRAEGE.map((e) => ({ ...e })),
  arten: ARTEN.map((a) => ({ ...a })), // vorgegebene plus eigene
  geschenke: GESCHENKE.map((g) => ({ ...g })),
  filter: 'alle',
  reihenfolge: 'neu', // 'neu' = neu→alt, 'alt' = alt→neu (für die Rede)
  zuletzt: ['mia', 'jonas', 'hilde', 'tom', 'ich', 'sophie', 'ben'],
  /* Reservierungen je Liste, wie sie der Server kennt (RESERVIERUNGEN gelten nur für Weihnachten). */
  reservierungen: { l1: RESERVIERUNGEN.map((r) => ({ ...r })), l2: LISTE2.reservierungen.map((r) => ({ ...r })) },
  voll: { l1: new Set(), l2: new Set() },
  gast: gastLesen(),
  vorschau: null, // Weg zurück zur eigenen Liste, wenn der Gast-Blick von dort geöffnet wurde
  frisch: null, // gerade festgehaltener Eintrag (für die Schreib-Bewegung)
  suche: '',
  fh: { person: null, art: null, suche: '' },
};
const art = (id) => zustand.arten.find((a) => a.id === id);
const listeVon = (id) => LISTEN.find((l) => l.id === id) || LISTE;
const ohneTrenn = (s) => String(s ?? '').replace(/­/g, '');

function gastLesen() {
  try { return localStorage.getItem(GAST_SCHLUESSEL) || null; } catch { return null; }
}
function gastMerken(name) {
  zustand.gast = name;
  try { name ? localStorage.setItem(GAST_SCHLUESSEL, name) : localStorage.removeItem(GAST_SCHLUESSEL); } catch { /* Gerät merkt es dann eben nicht */ }
}

const ruhig = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Kleine Hilfen ---------- */
const h = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const tageText = (t) => (t === 0 ? 'heute' : t === 1 ? 'morgen' : `in ${t} Tagen`);
const monatKurz = (iso) => new Date(iso + 'T12:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
const wochentag = (d) => d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
const jahr = (iso) => iso.slice(0, 4);
const alle = () => [...PERSONEN, ICH];
const GROESSEN = ['Kleidung', 'Schuhe', 'Ring', 'Hose', 'Hut', 'Handschuh'];

/* Eigene kleine Zeichnungen für die Leiste (Strich in currentColor, leicht unregelmäßig). */
const z = (inhalt, vb = '0 0 32 32') =>
  `<svg viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inhalt}</svg>`;
const ZEICHEN = {
  start: z('<path d="M5.5 15.2 16 6.3l10.6 8.8"/><path d="M8.3 13.4v12.3h15.5V13.2"/><path d="M13.6 25.6v-6.4c0-1 .9-1.7 2.4-1.7s2.4.7 2.4 1.7v6.4"/>'),
  menschen: z('<circle cx="11.5" cy="11" r="4.2"/><path d="M3.8 25.5c.6-4.7 3.6-7.3 7.7-7.3s7.1 2.6 7.7 7.3"/><circle cx="22.2" cy="12.4" r="3.3"/><path d="M20.6 18.6c3.9-.4 6.9 1.8 7.6 6"/>'),
  feder: z('<path d="M16 3.6c3.4 4.3 6.6 8.4 6.6 12.4 0 3-1.8 5.4-3.9 8.2h-5.4c-2.1-2.8-3.9-5.2-3.9-8.2 0-4 3.2-8.1 6.6-12.4z"/><path d="M16 15.2v9"/><circle cx="16" cy="13.4" r="1.6"/><path d="M12.6 28.2h6.8"/>'),
  lupe: z('<circle cx="13.6" cy="13.4" r="7.6"/><path d="m19.3 19.2 7.4 7.3"/>'),
  ich: z('<circle cx="16" cy="10.6" r="4.8"/><path d="M6.6 27c.8-5.6 4.4-8.6 9.4-8.6s8.6 3 9.4 8.6"/>'),
  zu: z('<path d="m9 9 14 14M23 9 9 23"/>'),
  shop: z('<path d="M13 7H7.5A2.5 2.5 0 0 0 5 9.5v15A2.5 2.5 0 0 0 7.5 27h15a2.5 2.5 0 0 0 2.5-2.5V19"/><path d="M18 5h9v9M27 5 15 17"/>'),
  link: z('<path d="M13.5 18.5a5 5 0 0 0 7.1 0l4-4a5 5 0 0 0-7.1-7.1l-1.6 1.6"/><path d="M18.5 13.5a5 5 0 0 0-7.1 0l-4 4a5 5 0 0 0 7.1 7.1l1.6-1.6"/>'),
  schloss: z('<rect x="7" y="14" width="18" height="13" rx="3"/><path d="M11 14v-3.5a5 5 0 0 1 10 0V14"/>'),
  auge: z('<path d="M3.5 16c3.2-5.6 7.4-8.4 12.5-8.4s9.3 2.8 12.5 8.4c-3.2 5.6-7.4 8.4-12.5 8.4S6.7 21.6 3.5 16z"/><circle cx="16" cy="16" r="3.6"/>'),
  pfeil: z('<path d="M6 16h19M19 9.5l6.5 6.5-6.5 6.5"/>'),
  zurueck: z('<path d="M26 16H7M13 9.5 6.5 16l6.5 6.5"/>'),
  plus: z('<path d="M16 7.5v17M7.5 16.2h17"/>'),
  haken: z('<path d="M7 16.8l5.6 5.4L25.5 9.6"/>'),
  hand: z('<circle cx="12" cy="12.5" r="4.6"/><circle cx="20.5" cy="12.5" r="4.6"/><path d="M3.5 26c.9-4.4 4-6.8 8.5-6.8 2 0 3.7.5 5 1.4M14.5 21c1.4-1.2 3.4-1.8 6-1.8 4.5 0 7.6 2.4 8.5 6.8"/>'),
};
/* Handgezeichneter Unterstrich unter Namen und Überschriften. */
const UNTERSTRICH = '<svg class="unterstrich" viewBox="0 0 200 14" preserveAspectRatio="none" aria-hidden="true"><path d="M3 9.5c30-5 62-6.5 96-4.6 30 1.6 60 3.6 98-.8" /></svg>';

/* ---------- Gemeinsame Bausteine ---------- */
function fotoeck(p, gross = true, sticker = '') {
  const b = p.name.trim().charAt(0).toUpperCase();
  /* Der Anfangsbuchstabe ist gezeichnet (SVG-Text in Handschrift), das Bild ist nur Schmuck. */
  return `<div class="fotoeck farbe-${h(p.farbe)} ${gross ? '' : 'klein'}" aria-hidden="true">
    <span class="ecke oben-links"></span><span class="ecke oben-rechts"></span><span class="ecke unten-links"></span><span class="ecke unten-rechts"></span>
    <svg class="buchstabe" viewBox="0 0 100 100"><text x="50" y="74" text-anchor="middle">${h(b)}</text></svg>${gross ? `<span class="kringel">${SCHMUCK.stern}</span>` : ''}${sticker}
  </div>`;
}
/* Schleife: dieselbe Masche beim Zeichnen und danach auf der Karte (Mitte bei 40/22). */
const MASCHE = 'M40 22c-8-15-30-19-30-7 0 9 18 9 30 7zM40 22c8-15 30-19 30-7 0 9-18 9-30 7zM40 22l-11 15M40 22l11 15';
const SCHLEIFE_KLEIN = `<svg viewBox="0 0 80 40" aria-hidden="true"><path class="masche" d="${MASCHE}"/></svg>`;
/* Eigene Arten bekommen ein schlichtes eigenes Zeichen: ihren Anfangsbuchstaben in Handschrift. */
const artZeichen = (a) => (a?.buchstabe
  ? `<span class="art-zeichen art-buchstabe" aria-hidden="true">${h(a.buchstabe)}</span>`
  : `<span class="art-zeichen">${ART[a ? a.zeichnung : 'frei'] || ART.frei}</span>`);

/* ---------- Leiste ---------- */
function leisteZeichnen(ziel) {
  const eintrag = (id, href, name, zeichen, kbd = '') =>
    `<a href="${href}" data-ziel="${id}" ${ziel === id ? 'aria-current="page"' : ''}>${zeichen}<span class="leiste-name">${name}</span>${kbd ? `<kbd>${kbd}</kbd>` : ''}${UNTERSTRICH}</a>`;
  document.getElementById('leiste').innerHTML = `
    ${eintrag('start', '#start', 'Start', ZEICHEN.start)}
    ${eintrag('menschen', '#menschen', 'Menschen', ZEICHEN.menschen)}
    <button type="button" class="leiste-feder" data-aktion="festhalten" data-ziel="festhalten" aria-keyshortcuts="N">
      <span class="feder-kreis">${ZEICHEN.feder}</span><span class="leiste-name">Festhalten</span><kbd>N</kbd>
    </button>
    ${eintrag('suche', '#suche', 'Suche', ZEICHEN.lupe, '/')}
    ${eintrag('ich', '#person/ich', 'Ich', ZEICHEN.ich)}`;
}

/* ---------- Personenseite ---------- */
function steckbriefZeilen(p) {
  const zeilen = [];
  if (p.geburtstag) {
    const g = naechsterGeburtstag(p.geburtstag);
    zeilen.push(['Geburtstag', `${h(datumLang(p.geburtstag))}<span class="akzent">wird ${g.alter} · ${tageText(g.tage)}</span>`]);
  }
  if (p.kennen) zeilen.push(['Woher wir uns kennen', h(p.kennen)]);
  const groessen = p.steckbrief.filter((s) => GROESSEN.includes(s.bez));
  if (groessen.length) {
    zeilen.push(['Größen', `<span class="groessen">${groessen.map((s) => `<span class="groesse"><span class="groesse-bez">${h(s.bez)}</span> <b>${h(s.wert)}</b></span>`).join('')}</span>`]);
  }
  for (const s of p.steckbrief.filter((s) => !GROESSEN.includes(s.bez))) zeilen.push([s.bez, h(s.wert)]);
  if (p.familie?.length) {
    zeilen.push(['Familie', p.familie.map((f) => {
      const name = f.person ? `<a class="verweis" href="#person/${h(f.person)}">${h(f.name)}</a>` : `<b>${h(f.name)}</b>`;
      return `<span class="familie">${name}, ${h(f.art)}</span>`;
    }).join('<span class="trenner" aria-hidden="true">·</span>').replace(/^/, '<span class="familien">') + '</span>']);
  }
  return `<dl class="steckbrief">${zeilen.map(([v, w]) => `<div class="zeile"><dt class="vorgabe">${h(v)}</dt><dd>${w}</dd></div>`).join('')}</dl>`;
}

/* Geschenkideen: aus der Liste und aus Einträgen der Art Geschenkidee (die dann eine Idee mit Stand tragen). */
const STAENDE = ['idee', 'besorgt', 'verschenkt'];
const STAND_NAME = { idee: 'Idee', besorgt: 'besorgt', verschenkt: 'verschenkt' };
const ideenVon = (pid) => zustand.geschenke.filter((g) => g.person === pid);
/* Einträge der Art Geschenkidee, die (noch) keine Idee mit Stand haben, etwa nachträglich umgestellte. */
const ideenEintraegeOhneStand = (pid) => zustand.eintraege.filter((e) => e.person === pid && e.art === 'geschenkidee' && !zustand.geschenke.some((g) => g.eintrag === e.id));
function naechsterAnlass(p) {
  const wofuer = p.beschenken?.length ? p.beschenken : ['geburtstag'];
  const heute = new Date(HEUTE + 'T12:00');
  const kandidaten = [];
  if (p.geburtstag && wofuer.includes('geburtstag')) {
    const g = naechsterGeburtstag(p.geburtstag);
    kandidaten.push({ tage: g.tage, titel: `Geburtstag ${g.datum.getFullYear()}` });
  }
  if (wofuer.includes('weihnachten')) {
    let w = new Date(heute.getFullYear(), 11, 24, 12);
    if (w < heute) w = new Date(heute.getFullYear() + 1, 11, 24, 12);
    kandidaten.push({ tage: Math.round((w - heute) / 864e5), titel: `Weihnachten ${w.getFullYear()}` });
  }
  kandidaten.sort((a, b) => a.tage - b.tage);
  return kandidaten[0]?.titel || `Geburtstag ${heute.getFullYear()}`;
}
function geschenkPunkt(g) {
  const naechster = STAND_NAME[STAENDE[(STAENDE.indexOf(g.stand) + 1) % STAENDE.length]];
  const kleinzeile = [g.haendler && h(g.haendler), g.preis && `<span class="ohne-umbruch">${euro(g.preis)}</span>`].filter(Boolean).join(' · ');
  return `<li class="geschenk stand-${g.stand} ${zustand.frisch?.includes(g.id) ? 'frisch' : ''}" data-geschenk="${g.id}">
        <span class="geschenk-bild">${PRODUKT[g.zeichnung] || ART.geschenk}</span>
        <span class="geschenk-text">
          <span class="geschenk-anlass">für ${h(g.anlass)}</span>
          <b class="geschenk-titel">${h(g.titel)}</b>
          ${kleinzeile ? `<span class="klein">${kleinzeile}</span>` : ''}
        </span>
        <button type="button" class="stempel" data-aktion="stand" data-id="${g.id}" aria-label="Stand: ${STAND_NAME[g.stand]}, weiter zu ${naechster}">${STAND_NAME[g.stand]}</button>
      </li>`;
}
function geschenkeBlock(p) {
  const liste = ideenVon(p.id);
  if (!liste.length) return '';
  return `<section class="abschnitt geschenke" aria-labelledby="gt-${p.id}">
    <h2 class="titel" id="gt-${p.id}">Geschenkideen${UNTERSTRICH}</h2>
    <ul class="geschenk-liste">${liste.map(geschenkPunkt).join('')}
    </ul>
  </section>`;
}

/* Wünsche: Bild und Titel führen mit einem Klick zum Shop. */
const shopLink = (w, inhalt, klasse = '', bild = false) =>
  `<a class="${klasse}" href="${h(w.url)}" target="_blank" rel="noopener noreferrer"${bild ? ' tabindex="-1" aria-hidden="true"' : ''}>${inhalt}</a>`;
const preisZeile = (w) => `<b>${euro(w.preis)}</b> · Stand ${datumKurz(w.stand)}`;

function ichBlock() {
  return `<section class="abschnitt brauche" aria-labelledby="brauche-titel">
      <h2 class="titel" id="brauche-titel">Was ich brauche${UNTERSTRICH}</h2>
      <ul class="brauche-liste">${WUENSCHE.map((x) => `
        <li>${shopLink(x, PRODUKT[x.zeichnung] || '', 'brauche-bild', true)}${shopLink(x, h(x.titel), 'brauche-name')}<span class="brauche-preis">${preisZeile(x)}</span></li>`).join('')}
      </ul>
      <span class="vorgabe geteilt-vorgabe">Geteilt als</span>
      <ul class="geteilt-liste">${LISTEN.map((l) => `
        <li><a class="geteilt" href="#liste/${l.id}">
          <span class="geteilt-schleife">${SCHMUCK.schleife}</span>
          <span class="geteilt-text"><b>${h(l.titel)}</b><span class="klein">${l.wuensche.length} Wünsche · ${h(datumLang(l.anlass))}</span></span>
          ${ZEICHEN.pfeil}
        </a></li>`).join('')}
      </ul>
    </section>`;
}

function eintraegeFuer(pid) {
  let liste = zustand.eintraege.filter((e) => e.person === pid);
  if (zustand.filter === 'geschenkidee') liste = ideenEintraegeOhneStand(pid);
  else if (zustand.filter !== 'alle') liste = liste.filter((e) => e.art === zustand.filter);
  liste.sort((a, b) => (a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : 0));
  if (zustand.reihenfolge === 'neu') liste.reverse();
  return liste;
}

function zeitleiste(pid) {
  const liste = eintraegeFuer(pid);
  /* Mit dem Filter Geschenkidee stehen die Ideen (Stand, Anlass) oben, darunter Einträge ohne Stand. */
  const ideen = zustand.filter === 'geschenkidee' ? ideenVon(pid) : [];
  const ideenHtml = ideen.length ? `<ul class="geschenk-liste in-eintraegen">${ideen.map(geschenkPunkt).join('')}</ul>` : '';
  if (!liste.length) {
    return ideenHtml || `<div class="leer">${ART.feder}<span>Noch nichts${zustand.filter !== 'alle' ? ' unter dieser Art' : ''}.</span></div>`;
  }
  let letztesJahr = null;
  const teile = [];
  for (const e of liste) {
    if (jahr(e.datum) !== letztesJahr) {
      letztesJahr = jahr(e.datum);
      teile.push(`<li class="jahr"><span>${letztesJahr}</span></li>`);
    }
    const a = e.art ? art(e.art) : null;
    teile.push(`<li class="notiz ${zustand.frisch?.includes(e.id) ? 'frisch' : ''}" data-id="${e.id}">
      <div class="rand"><time datetime="${e.datum}">${e.datum === HEUTE ? 'heute' : h(monatKurz(e.datum))}</time></div>
      <div class="notiz-inhalt">
        <button type="button" class="art-marke ${a ? '' : 'ohne'}" data-aktion="art-waehlen" data-id="${e.id}" aria-haspopup="true" aria-expanded="false" aria-label="${a ? `Art: ${h(a.name)}, ändern` : 'Art wählen'}">${artZeichen(a)}<span>${a ? h(a.name) : 'Art wählen'}</span></button>
        <p class="notiz-text">${h(e.text)}</p>
      </div>
    </li>`);
  }
  return `${ideenHtml}<ol class="zeitleiste">${teile.join('')}</ol>`;
}

function filterReihe(pid) {
  const eigene = zustand.eintraege.filter((e) => e.person === pid);
  /* Geschenkidee zählt die Ideen mit Stand plus die Einträge dieser Art ohne Stand, genau das, was der Filter zeigt. */
  const anzahl = (a) => (a.id === 'geschenkidee' ? ideenVon(pid).length + ideenEintraegeOhneStand(pid).length : eigene.filter((e) => e.art === a.id).length);
  const chip = (id, name, zeichen, n) =>
    `<button type="button" class="chip" data-aktion="filter" data-art="${id}" aria-pressed="${zustand.filter === id}">${zeichen}<span>${h(name)}</span><span class="anzahl">${n}</span></button>`;
  return `<div class="filter" role="group" aria-label="Nach Art filtern">
    ${chip('alle', 'alle', '', eigene.length)}
    ${zustand.arten.map((a) => chip(a.id, a.name, artZeichen(a), anzahl(a))).join('')}
  </div>`;
}

function personenseite(pid) {
  const p = person(pid);
  if (!p) return `<div class="blatt einzeln"><p>Diese Seite gibt es nicht.</p><a href="#menschen">Zu den Menschen</a></div>`;
  const g = p.geburtstag ? naechsterGeburtstag(p.geburtstag) : null;
  const sticker = g && g.tage <= 30 && !p.ist_ich
    ? `<span class="sticker"><span>${tageText(g.tage)}</span><b>${g.alter}</b></span>` : '';
  return `<div class="aufschlag personenseite">
    <section class="blatt links" aria-label="Steckbrief">
      <header class="kopf">
        ${fotoeck(p, true, sticker)}
        <div class="kopf-text">
          <span class="vorgabe">${p.ist_ich ? 'Das bin ich' : 'Name'}</span>
          <h1 class="name">${h(p.name)}${UNTERSTRICH}</h1>
        </div>
      </header>
      ${steckbriefZeilen(p)}
      ${p.ist_ich ? ichBlock() : geschenkeBlock(p)}
    </section>
    <section class="blatt rechts" aria-labelledby="eintraege-titel">
      <div class="eintraege-kopf">
        <h2 class="titel" id="eintraege-titel">Einträge${UNTERSTRICH}</h2>
        <button type="button" class="reihenfolge" data-aktion="reihenfolge" aria-label="Reihenfolge umschalten, jetzt ${zustand.reihenfolge === 'neu' ? 'neu nach alt' : 'alt nach neu'}">${zustand.reihenfolge === 'neu' ? 'neu → alt' : 'alt → neu'}</button>
      </div>
      ${filterReihe(pid)}
      ${zeitleiste(pid)}
    </section>
  </div>`;
}

/* ---------- Start ---------- */
function geburtstageSortiert() {
  return PERSONEN.map((p) => ({ p, ...naechsterGeburtstag(p.geburtstag) })).sort((a, b) => a.tage - b.tage);
}
function geschenkFehlt(ausser) {
  const grenze = 42; // die nächsten sechs Wochen
  const heute = new Date(HEUTE + 'T12:00');
  const weihnachten = new Date(heute.getFullYear(), 11, 24, 12);
  const tageBisWeihnachten = Math.round((weihnachten - heute) / 864e5);
  const anlaesse = [];
  for (const p of PERSONEN) {
    const g = naechsterGeburtstag(p.geburtstag);
    if (p.beschenken?.includes('geburtstag') && g.tage <= grenze) anlaesse.push({ p, name: 'Geburtstag', titel: `Geburtstag ${g.datum.getFullYear()}`, tage: g.tage, datum: g.datum });
    if (p.beschenken?.includes('weihnachten') && tageBisWeihnachten >= 0 && tageBisWeihnachten <= grenze) anlaesse.push({ p, name: 'Weihnachten', titel: `Weihnachten ${weihnachten.getFullYear()}`, tage: tageBisWeihnachten, datum: weihnachten });
  }
  return anlaesse
    .filter((a) => !zustand.geschenke.some((g) => g.person === a.p.id && g.anlass === a.titel && g.stand !== 'idee'))
    .filter((a) => !(ausser && a.p.id === ausser.p.id && a.name === 'Geburtstag'))
    .map((a) => ({ ...a, idee: zustand.geschenke.find((g) => g.person === a.p.id && g.anlass === a.titel && g.stand === 'idee') }))
    .sort((a, b) => a.tage - b.tage);
}

function startseite() {
  const [erster, ...rest] = geburtstageSortiert();
  const idee = zustand.geschenke.find((g) => g.person === erster.p.id && g.anlass === `Geburtstag ${erster.datum.getFullYear()}`);
  const geschenkZeile = !idee ? '<b>noch kein Geschenk</b>'
    : idee.stand === 'idee' ? `<b>noch kein Geschenk</b><span class="blickfang-idee">Idee: ${h(idee.titel)}</span>` : `<b>Geschenk ${idee.stand}</b>`;
  const fehlt = geschenkFehlt(erster);
  return `<div class="aufschlag startseite">
    <section class="blatt links" aria-label="Nächster Geburtstag">
      <a class="blickfang farbe-${h(erster.p.farbe)}" href="#person/${erster.p.id}">
        <span class="klebe a" aria-hidden="true"></span><span class="klebe b" aria-hidden="true"></span>
        <span class="blickfang-bild">${SCHMUCK.kuchen}</span>
        <span class="vorgabe">Als Nächstes</span>
        <h1 class="blickfang-titel">${h(erster.p.rufname)} wird ${erster.alter}</h1>
        <span class="blickfang-wann"><b>${tageText(erster.tage)}</b> · ${h(wochentag(erster.datum))}</span>
        <span class="blickfang-geschenk">${geschenkZeile}</span>
      </a>
    </section>
    <section class="blatt rechts">
      <section class="abschnitt" aria-labelledby="bald-titel">
        <h2 class="titel" id="bald-titel">Bald${UNTERSTRICH}</h2>
        <ul class="bald">${rest.slice(0, 3).map((b) => `
          <li><a href="#person/${b.p.id}">
            <span class="bald-datum">${h(monatKurz(b.datum.toISOString().slice(0, 10)))}</span>
            <span class="bald-name">${h(b.p.rufname)}</span>
            <span class="bald-info">wird ${b.alter} · ${tageText(b.tage)}</span>
          </a></li>`).join('')}
        </ul>
      </section>
      <section class="abschnitt" aria-labelledby="fehlt-titel">
        <h2 class="titel" id="fehlt-titel">Geschenk fehlt${UNTERSTRICH}</h2>
        <ul class="fehlt">${fehlt.map((f) => `
          <li><a href="#person/${f.p.id}">
            <span class="fehlt-zeichen">${f.name === 'Weihnachten' ? SCHMUCK.stern : SCHMUCK.kuchen}</span>
            <span class="fehlt-text"><b>${h(f.p.rufname)}</b> · ${f.name}<span class="klein">${tageText(f.tage)}${f.idee ? ` · Idee: ${h(f.idee.titel)}` : ''}</span></span>
          </a></li>`).join('')}
        </ul>
      </section>
    </section>
  </div>`;
}

/* ---------- Menschen ---------- */
function menschenseite() {
  const liste = [...PERSONEN].sort((a, b) => a.name.localeCompare(b.name, 'de'));
  return `<div class="blatt einzeln menschen">
    <h1 class="seitentitel">Menschen${UNTERSTRICH}</h1>
    <ol class="inhalt">${liste.map((p) => `
      <li><a href="#person/${p.id}">
        ${fotoeck(p, false)}
        <span class="inhalt-text"><b>${h(p.name)}</b><span class="klein">${h(p.kennen)}</span></span>
        <span class="punkte" aria-hidden="true"></span>
        <span class="inhalt-tag">${h(monatKurz(p.geburtstag))}</span>
      </a></li>`).join('')}
    </ol>
  </div>`;
}

/* ---------- Suche ---------- */
/* Verglichen wird ohne weiches Trennzeichen (­), damit „Geräuschunterdrückung“ auch gefunden wird. */
function markieren(text, wort) {
  const t = ohneTrenn(text);
  if (!wort) return h(t);
  const klein = t.toLocaleLowerCase('de'), w = ohneTrenn(wort).toLocaleLowerCase('de');
  let aus = '', i = 0, j;
  while ((j = klein.indexOf(w, i)) !== -1) {
    aus += h(t.slice(i, j)) + `<mark>${h(t.slice(j, j + w.length))}</mark>`;
    i = j + w.length;
  }
  return aus + h(t.slice(i));
}
function suchtreffer(wort) {
  const w = ohneTrenn(wort).trim().toLocaleLowerCase('de');
  if (!w) return null;
  const passt = (s) => ohneTrenn(s).toLocaleLowerCase('de').includes(w);
  const gruppen = { Menschen: [], Steckbrief: [], 'Einträge': [], Geschenkideen: [], 'Wünsche': [] };
  for (const p of alle()) {
    if (passt(p.name) || passt(p.rufname)) gruppen.Menschen.push({ p, text: p.name });
    const felder = [['Woher wir uns kennen', p.kennen], ...p.steckbrief.map((s) => [s.bez, s.wert]), ...(p.familie || []).map((f) => ['Familie', `${f.name}, ${f.art}`])];
    for (const [bez, text] of felder) if (passt(text)) gruppen.Steckbrief.push({ p, bez, text });
  }
  for (const e of zustand.eintraege) if (passt(e.text)) gruppen['Einträge'].push({ p: person(e.person), text: e.text, e });
  for (const g of zustand.geschenke) if (passt(g.titel) || passt(g.haendler) || passt(g.anlass)) gruppen.Geschenkideen.push({ p: person(g.person), text: [g.titel, g.haendler].filter(Boolean).join(' · '), g });
  for (const x of WUENSCHE) if (passt(x.titel) || passt(x.beschreibung) || passt(x.haendler)) gruppen['Wünsche'].push({ p: ICH, text: `${x.titel} · ${x.haendler}`, bez: 'Was ich brauche' });
  return gruppen;
}
function trefferZeichnen() {
  const wort = zustand.suche.trim();
  const gruppen = suchtreffer(wort);
  if (!gruppen) return '';
  const summe = Object.values(gruppen).reduce((n, l) => n + l.length, 0);
  if (!summe) return `<p class="leer-satz">Nichts zu „${h(wort)}“.</p>`;
  return Object.entries(gruppen).filter(([, l]) => l.length).map(([titel, l]) => `
    <section class="treffer-gruppe" aria-label="${titel}">
      <h2 class="vorgabe">${titel}</h2>
      <ul>${l.map((t) => `<li><a href="#person/${t.p.id}">
        <span class="treffer-wer">${h(t.p.rufname === 'Ich' ? 'Ich' : t.p.rufname)}${t.e ? ` · ${h(monatKurz(t.e.datum))} ${jahr(t.e.datum)}` : ''}${t.bez ? ` · ${h(t.bez)}` : ''}${t.g ? ` · ${h(t.g.anlass)}` : ''}</span>
        <span class="treffer-text">${markieren(t.text, wort)}</span>
      </a></li>`).join('')}</ul>
    </section>`).join('');
}
function suchseite() {
  return `<div class="blatt einzeln suche">
    <label class="seitentitel" for="suchfeld">Suche${UNTERSTRICH}</label>
    <div class="suchzeile">${ZEICHEN.lupe}<input id="suchfeld" type="search" autocomplete="off" spellcheck="false" placeholder="Name, Wort, Geschenk" value="${h(zustand.suche)}"></div>
    <div id="treffer" aria-live="polite">${trefferZeichnen()}</div>
  </div>`;
}

/* ---------- Wunschliste: Ich ---------- */
const reservierungenVon = (lid) => zustand.reservierungen[lid] || [];
function gastAnzahl(lid, name) { return reservierungenVon(lid).filter((r) => r.gast === name).length; }
function striche(n) {
  if (!n) return '';
  let s = '';
  for (let i = 0; i < n; i++) s += `<path d="M${5 + i * 7} 4c.6 5 .2 10 .8 16"/>`;
  return `<svg class="striche" viewBox="0 0 ${8 + n * 7} 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true">${s}</svg>`;
}
function wunschZeile(w) {
  return `<li class="wunschzeile">
    ${shopLink(w, PRODUKT[w.zeichnung] || '', 'wz-bild', true)}
    <span class="wz-text">${shopLink(w, h(w.titel), 'wz-titel')}<span class="klein">${h(w.beschreibung)}</span>
    <span class="wz-preis">${preisZeile(w)} · ${h(w.haendler)}${w.zusammenlegen ? ' · <span class="zl-marke">zum Zusammenlegen</span>' : ''}</span></span>
  </li>`;
}
function listeIch(lid) {
  const l = listeVon(lid);
  const wuensche = l.wuensche.map((id) => WUENSCHE.find((w) => w.id === id));
  const gastWeg = l.id === LISTE.id ? '#gast' : `#gast/${l.id}`;
  return `<div class="blatt einzeln liste-ich">
    <nav class="listen-wechsel" aria-label="Deine Listen">${LISTEN.map((x) => `
      <a href="#liste/${x.id}" data-liste="${x.id}" ${x.id === l.id ? 'aria-current="page"' : ''}>${h(x.titel)}</a>`).join('<span aria-hidden="true">·</span>')}
    </nav>
    <header class="liste-kopf">
      <span class="vorgabe">Geteilt als</span>
      <h1 class="seitentitel">${h(l.titel)}${UNTERSTRICH}</h1>
      <span class="klein">${h(datumLang(l.anlass).replace(/ \d{4}$/, ''))} · ${wuensche.length} Wünsche</span>
    </header>
    <div class="teilen">
      <button type="button" class="knopf haupt" data-aktion="link-kopieren" data-liste="${l.id}">${ZEICHEN.link}<span>Link teilen</span></button>
      <a class="knopf neben" href="${gastWeg}" data-aktion="vorschau">${ZEICHEN.auge}<span>So sehen es deine Leute</span></a>
    </div>
    <section class="abschnitt" aria-labelledby="gaeste-titel">
      <h2 class="titel" id="gaeste-titel">Ausgesucht haben${UNTERSTRICH}</h2>
      <ul class="gaeste">${l.gaeste.map((g) => {
        const n = gastAnzahl(l.id, g);
        return `<li class="${n ? '' : 'null'}"><span class="gast-name">${h(g)} · ${n}</span>${striche(n)}</li>`;
      }).join('')}</ul>
      <button type="button" class="aufdecken" aria-disabled="true">${ZEICHEN.schloss}<span>Aufdecken ab ${datumKurz(l.aufdeckenAb)}</span></button>
    </section>
    <section class="abschnitt" aria-labelledby="wuensche-titel">
      <h2 class="titel" id="wuensche-titel">Wünsche${UNTERSTRICH}</h2>
      <ul class="wunschzeilen">${wuensche.map(wunschZeile).join('')}</ul>
    </section>
  </div>`;
}

/* ---------- Wunschliste: Gast ---------- */
const NEIGUNG = ['-0.7deg', '0.5deg', '-0.3deg', '0.8deg', '-0.5deg', '0.3deg', '-0.8deg', '0.6deg'];
function namenListe(namen) {
  if (namen.length <= 1) return namen.join('');
  return namen.slice(0, -1).join(', ') + ' und ' + namen.at(-1);
}
function wunschStatus(lid, w, gast) {
  const r = reservierungenVon(lid).filter((x) => x.wunsch === w.id);
  const meine = r.find((x) => x.gast === gast);
  if (meine) return { von: 'mir', art: meine.art };
  if (r.some((x) => x.art === 'schenke_ich')) return { von: 'weg' };
  if (w.zusammenlegen && zustand.voll[lid].has(w.id)) return { von: 'weg' };
  return { von: 'frei' };
}
function wunschKarte(lid, w, i, gast) {
  const st = wunschStatus(lid, w, gast);
  const dabei = reservierungenVon(lid).filter((x) => x.wunsch === w.id && x.art === 'bin_dabei').map((x) => (x.gast === gast ? 'du' : x.gast));
  const andere = dabei.filter((n) => n !== 'du');
  const shop = `<a class="knopf neben" href="${h(w.url)}" target="_blank" rel="noopener noreferrer">${ZEICHEN.shop}<span>Zum Shop</span></a>`;
  let zl = '', knoepfe;
  if (w.zusammenlegen) {
    const wer = st.von === 'mir' ? namenListe([...andere, 'du']) + ' seid dabei'
      : andere.length ? `${namenListe(andere)} ${andere.length === 1 ? 'ist' : 'sind'} dabei` : 'noch niemand dabei';
    zl = `<p class="zusammen">${ZEICHEN.hand}<span><b>Zusammenlegen</b> · ${h(wer)}</span></p>`;
  }
  if (st.von === 'mir' && st.art === 'bin_dabei') {
    const istVoll = zustand.voll[lid].has(w.id);
    knoepfe = `${istVoll ? `<span class="stempel voll">voll</span>` : `<button type="button" class="knopf neben" data-aktion="voll" data-id="${w.id}">Ist voll</button>`}
      <button type="button" class="knopf neben" data-aktion="doch-nicht" data-id="${w.id}">Doch nicht</button>`;
  } else if (st.von === 'mir') {
    knoepfe = `${shop}<button type="button" class="knopf neben" data-aktion="zuruecknehmen" data-id="${w.id}">Zurücknehmen</button>`;
  } else if (w.zusammenlegen) {
    knoepfe = `${shop}<button type="button" class="knopf haupt" data-aktion="dabei" data-id="${w.id}">Ich bin dabei</button>`;
  } else {
    knoepfe = `${shop}<button type="button" class="knopf haupt" data-aktion="schenke" data-id="${w.id}">Das schenke ich</button>`;
  }
  return `<li class="wunsch ${st.von === 'mir' ? 'verpackt' : ''}" data-wunsch="${w.id}" style="--neigung:${NEIGUNG[i % NEIGUNG.length]}; --band: var(--klebe-${(i % 3) + 1})">
    ${st.von === 'mir' ? `<span class="schleife-klein" aria-hidden="true">${SCHLEIFE_KLEIN}</span>` : ''}
    ${shopLink(w, PRODUKT[w.zeichnung] || '', 'wunsch-bild', true)}
    <div class="wunsch-text">
      <h3>${shopLink(w, h(w.titel), 'wunsch-titel')}</h3>
      <p class="beschr">${h(w.beschreibung)}</p>
      <p class="preis">${preisZeile(w)}</p>
      <p class="haendler">${h(w.haendler)}</p>
    </div>
    ${zl}
    <div class="wunsch-knoepfe">${knoepfe}</div>
  </li>`;
}
function gastseite(lid) {
  const l = listeVon(lid);
  const kopf = `<header class="gast-kopf">
      <span class="gast-schleife">${SCHMUCK.schleife}</span>
      <span class="vorgabe">${h(l.besitzer)} wünscht sich</span>
      <h1 class="seitentitel">${h(l.titel)}${UNTERSTRICH}</h1>
    </header>`;
  /* Zurück nur für mich, wenn ich aus der eigenen Liste hineingeschaut habe; ein Gast sieht das nicht. */
  const zurueck = zustand.vorschau ? `<a class="leise vorschau-zu" href="${h(zustand.vorschau)}">${ZEICHEN.zurueck}<span>Zurück</span></a>` : '';
  if (!zustand.gast || !l.gaeste.includes(zustand.gast)) {
    return `<div class="blatt einzeln gast wer">
      ${zurueck}
      ${kopf}
      <h2 class="titel" id="wer-titel">Wer bist du?${UNTERSTRICH}</h2>
      <div class="namen" role="group" aria-labelledby="wer-titel">${l.gaeste.map((g, i) => `
        <button type="button" class="namensfeld" data-aktion="gast-waehlen" data-name="${h(g)}" style="--neigung:${NEIGUNG[i]}">
          <span class="namens-kreis">${h(g.charAt(0))}</span><span>${h(g)}</span>
        </button>`).join('')}
      </div>
    </div>`;
  }
  const gast = zustand.gast;
  const wuensche = l.wuensche.map((id) => WUENSCHE.find((w) => w.id === id));
  const meine = wuensche.filter((w) => wunschStatus(l.id, w, gast).von === 'mir');
  const frei = wuensche.filter((w) => wunschStatus(l.id, w, gast).von === 'frei');
  return `<div class="blatt einzeln gast">
    ${zurueck}
    ${kopf}
    <p class="ich-bin">Für <b>${h(gast)}</b><span aria-hidden="true"> · </span><button type="button" class="leise" data-aktion="gast-wechseln">Nicht ${h(gast)}?</button></p>
    ${meine.length ? `<section class="abschnitt von-dir" aria-labelledby="vondir-titel">
      <h2 class="titel" id="vondir-titel">Von dir${UNTERSTRICH}</h2>
      <ul class="wunschkarten">${meine.map((w) => wunschKarte(l.id, w, wuensche.indexOf(w), gast)).join('')}</ul>
    </section>` : ''}
    <section class="abschnitt" aria-labelledby="frei-titel">
      <h2 class="titel" id="frei-titel">Noch zu haben${UNTERSTRICH}</h2>
      ${frei.length ? `<ul class="wunschkarten">${frei.map((w) => wunschKarte(l.id, w, wuensche.indexOf(w), gast)).join('')}</ul>` : '<p class="leer-satz">Alles ist vergeben.</p>'}
    </section>
  </div>`;
}

/* ---------- Seiten zeichnen ---------- */
function weg(hash = location.hash) {
  const roh = decodeURIComponent(hash.replace(/^#/, ''));
  if (!roh) return { seite: 'person', id: 'mia' };
  const [seite, id] = roh.split('/');
  return { seite, id };
}
let gezeichnet = { weg: null, leiste: null };
function zeichnen({ fokus = false } = {}) {
  const { seite, id } = weg();
  const inhalt = document.getElementById('inhalt');
  /* Die wischbare Filterreihe bleibt beim Neuzeichnen derselben Seite stehen, statt an den Anfang zu springen. */
  const schluessel = `${seite}/${id || ''}`;
  const reiheX = gezeichnet.weg === schluessel ? document.querySelector('.filter')?.scrollLeft || 0 : 0;
  document.body.dataset.seite = seite;
  let html, ziel = seite;
  if (seite === 'person') { html = personenseite(id); ziel = id === 'ich' ? 'ich' : 'menschen'; }
  else if (seite === 'start') html = startseite();
  else if (seite === 'menschen') html = menschenseite();
  else if (seite === 'suche') html = suchseite();
  else if (seite === 'liste') { html = listeIch(id); ziel = 'ich'; }
  else if (seite === 'gast') { html = gastseite(id); ziel = ''; }
  else html = personenseite('mia');
  if (gezeichnet.leiste !== ziel) { leisteZeichnen(ziel); gezeichnet.leiste = ziel; }
  inhalt.innerHTML = html;
  const reihe = document.querySelector('.filter');
  if (reihe && reiheX) reihe.scrollLeft = reiheX;
  gezeichnet.weg = schluessel;
  if (seite === 'suche') {
    const feld = document.getElementById('suchfeld');
    if (fokus) { feld.focus(); feld.setSelectionRange(feld.value.length, feld.value.length); }
  } else if (fokus) inhalt.focus({ preventScroll: true });
  if (zustand.frisch) frischZeigen();
}

let letzterWeg = '';
window.addEventListener('hashchange', () => {
  const neu = location.hash;
  const p = weg(), alt = weg(letzterWeg);
  if (p.seite === 'person') { zustand.zuletzt = [p.id, ...zustand.zuletzt.filter((x) => x !== p.id)]; }
  /* „Zurück“ im Gast-Blick nur, wenn ich ihn aus meiner Liste geöffnet habe. */
  if (p.seite === 'gast') zustand.vorschau = alt.seite === 'liste' ? (letzterWeg || '#liste') : alt.seite === 'gast' ? zustand.vorschau : null;
  else zustand.vorschau = null;
  if (neu !== letzterWeg) { zustand.filter = 'alle'; scrollTo(0, 0); }
  letzterWeg = neu;
  zeichnen({ fokus: true });
});

/* ---------- Festgehalten: Zeile schreibt sich ins Album ---------- */
function frischZeigen() {
  zustand.frisch = null;
  const alleFrisch = [...document.querySelectorAll('.frisch')];
  if (!alleFrisch.length) return;
  const haupt = document.querySelector('.notiz.frisch') || alleFrisch[0];
  haupt.scrollIntoView({ block: 'center', behavior: ruhig() ? 'auto' : 'smooth' });
  if (ruhig()) return;
  for (const el of alleFrisch) {
    if (el.classList.contains('notiz')) {
      el.querySelector('.notiz-text').animate([{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 760, easing: 'cubic-bezier(.45,.05,.35,1)', fill: 'backwards', delay: 120 });
      el.querySelector('.art-marke').animate([{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: 'ease-out', fill: 'backwards' });
    } else {
      el.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: 'ease-out', fill: 'backwards', delay: 200 });
    }
  }
}

/* ---------- Meldung ---------- */
let meldungUhr;
function melden(text, link = null) {
  const m = document.getElementById('meldung');
  m.innerHTML = link
    ? `<a href="${h(link)}" data-aktion="meldung-link">${ZEICHEN.haken}<span>${h(text)}</span>${ZEICHEN.pfeil}</a>`
    : `${ZEICHEN.haken}<span>${h(text)}</span>`;
  m.classList.toggle('mit-link', Boolean(link));
  m.classList.remove('an'); void m.offsetWidth; m.classList.add('an');
  clearTimeout(meldungUhr);
  meldungUhr = setTimeout(() => m.classList.remove('an'), link ? 5000 : 2600);
}

/* ---------- Eigene Art anlegen ---------- */
let eigeneZaehler = 0;
function neueArtAnlegen(name) {
  const n = name.trim().replace(/\s+/g, ' ');
  if (!n) return null;
  const da = zustand.arten.find((a) => a.name.toLocaleLowerCase('de') === n.toLocaleLowerCase('de'));
  if (da) return da;
  const a = { id: `eigen${++eigeneZaehler}`, name: n, zeichnung: 'feder', buchstabe: n.charAt(0).toLocaleUpperCase('de'), eigene: true };
  zustand.arten.push(a);
  return a;
}
const artNeuKnopf = (ort, id = '') =>
  `<button type="button" class="art-neu" data-aktion="art-neu" data-ort="${ort}" data-id="${id}" aria-label="Eigene Art anlegen">${ZEICHEN.plus}<span>Art</span></button>`;
function neueArtFeldZeigen(knopf) {
  const feld = document.createElement('input');
  feld.type = 'text';
  feld.className = 'neue-art-feld';
  feld.placeholder = 'Name der Art';
  feld.maxLength = 24;
  feld.autocomplete = 'off';
  feld.setAttribute('aria-label', 'Name der neuen Art, Enter legt sie an');
  feld.dataset.ort = knopf.dataset.ort;
  feld.dataset.id = knopf.dataset.id;
  knopf.replaceWith(feld);
  feld.focus();
}
function neueArtFertig(feld) {
  const a = neueArtAnlegen(feld.value);
  if (!a) { feld.classList.add('fehlt'); return; }
  if (feld.dataset.ort === 'fh') {
    zustand.fh.art = a.id;
    fhArtenZeichnen();
    document.querySelector(`.fh-art[data-art="${a.id}"]`)?.focus();
    return;
  }
  const e = zustand.eintraege.find((x) => x.id === feld.dataset.id);
  if (e) e.art = a.id;
  zeichnen();
  document.querySelector(`.art-marke[data-id="${feld.dataset.id}"]`)?.focus();
  melden(`Jetzt: ${a.name}`);
}
function neueArtAbbrechen(feld) {
  if (feld.dataset.ort === 'fh') { fhArtenZeichnen(); document.querySelector('.fh-arten .art-neu')?.focus(); return; }
  const knopf = document.querySelector(`.art-marke[data-id="${feld.dataset.id}"]`);
  artAuswahlSchliessen();
  if (knopf) artAuswahlOeffnen(knopf);
}

/* ---------- Art eines Eintrags ändern ---------- */
function artAuswahlSchliessen(zurueck = false) {
  const offen = document.querySelector('.art-auswahl');
  if (!offen) return;
  const knopf = document.querySelector(`.art-marke[data-id="${offen.dataset.id}"]`);
  offen.remove();
  if (knopf) { knopf.setAttribute('aria-expanded', 'false'); if (zurueck) knopf.focus(); }
}
function artAuswahlOeffnen(knopf) {
  const id = knopf.dataset.id;
  const vorher = document.querySelector('.art-auswahl');
  artAuswahlSchliessen();
  if (vorher?.dataset.id === id) return;
  const e = zustand.eintraege.find((x) => x.id === id);
  const div = document.createElement('div');
  div.className = 'art-auswahl';
  div.dataset.id = id;
  div.setAttribute('role', 'group');
  div.setAttribute('aria-label', 'Art wählen');
  div.innerHTML = [...zustand.arten.map((a) => [a.id, a.name, a]), ['', 'ohne Art', null]].map(([aid, name, a]) =>
    `<button type="button" data-aktion="art-setzen" data-id="${id}" data-art="${aid}" aria-pressed="${(e.art || '') === aid}">${artZeichen(a)}<span>${h(name)}</span></button>`).join('')
    + artNeuKnopf('eintrag', id);
  knopf.closest('.notiz').appendChild(div);
  knopf.setAttribute('aria-expanded', 'true');
  div.querySelector('[aria-pressed="true"]')?.focus() || div.querySelector('button').focus();
}

/* ---------- Festhalten ---------- */
function fhPersonen() {
  const w = zustand.fh.suche.trim().toLocaleLowerCase('de');
  let reihe = zustand.zuletzt.map(person).filter(Boolean);
  if (w) reihe = reihe.filter((p) => p.name.toLocaleLowerCase('de').includes(w) || p.rufname.toLocaleLowerCase('de').includes(w));
  reihe = reihe.slice(0, 3);
  const gewaehlt = zustand.fh.person && person(zustand.fh.person);
  if (gewaehlt && !reihe.includes(gewaehlt) && !w) reihe = [gewaehlt, ...reihe.slice(0, 2)];
  return reihe;
}
function fhPersonenZeichnen() {
  const box = document.getElementById('fh-wahl');
  const reihe = fhPersonen();
  box.innerHTML = reihe.length ? reihe.map((p) => `<button type="button" role="radio" class="chip person-chip" data-aktion="fh-person" data-id="${p.id}" aria-checked="${zustand.fh.person === p.id}">
      <span class="punkt farbe-${h(p.farbe)}" aria-hidden="true">${h(p.name.charAt(0))}</span><span>${h(p.rufname)}</span></button>`).join('')
    : `<span class="klein">Niemand mit „${h(zustand.fh.suche)}“</span>`;
  /* Speichern geht erst, wenn jemand gewählt ist. */
  const speichern = document.querySelector('.fh-speichern');
  if (speichern) speichern.disabled = !zustand.fh.person;
}
function fhArtenZeichnen() {
  const a = zustand.fh.art ? art(zustand.fh.art) : null;
  const box = document.querySelector('.fh-arten');
  if (box) {
    box.innerHTML = zustand.arten.map((x) => `
      <button type="button" class="fh-art" data-aktion="fh-art" data-art="${x.id}" aria-pressed="${zustand.fh.art === x.id}" aria-label="${h(x.name)}" title="${h(x.name)}">${artZeichen(x)}</button>`).join('')
      + artNeuKnopf('fh');
  }
  document.getElementById('fh-artname').textContent = a ? a.name : 'freiwillig';
}
function festhaltenOeffnen() {
  const dlg = document.getElementById('festhalten');
  if (dlg.open) return;
  const { seite, id } = weg();
  /* Auf einer Personenseite ist diese Person gewählt, sonst niemand. */
  zustand.fh = { person: seite === 'person' && person(id) ? id : null, art: null, suche: '' };
  if (zustand.fh.person) zustand.zuletzt = [id, ...zustand.zuletzt.filter((x) => x !== id)];
  dlg.innerHTML = `<form class="fh" method="dialog" novalidate>
    <div class="fh-kopf">
      <h2 class="titel" id="fh-titel">Festhalten${UNTERSTRICH}</h2>
      <button type="button" class="rund" data-aktion="fh-zu" aria-label="Schließen">${ZEICHEN.zu}</button>
    </div>
    <div class="fh-feld">
      <label class="vorgabe" for="fh-suche">über</label>
      <input id="fh-suche" class="fh-suche" type="text" autocomplete="off" placeholder="Name suchen" aria-controls="fh-wahl">
    </div>
    <div class="fh-wahl" id="fh-wahl" role="radiogroup" aria-label="Person"></div>
    <label class="vorgabe fh-label" for="fh-text">was dir eingefallen ist</label>
    <textarea id="fh-text" class="fh-text" rows="3" enterkeyhint="done"></textarea>
    <div class="fh-feld fh-artzeile">
      <span class="vorgabe">Art</span><span class="fh-artname" id="fh-artname">freiwillig</span>
    </div>
    <div class="fh-arten" role="group" aria-label="Art, freiwillig"></div>
    <button type="submit" class="knopf haupt fh-speichern">${ZEICHEN.feder}<span>Eintragen</span></button>
  </form>`;
  fhPersonenZeichnen();
  fhArtenZeichnen();
  dlg.showModal();
  if (!ruhig()) dlg.querySelector('.fh').animate([{ transform: 'translateY(24px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 240, easing: 'cubic-bezier(.2,.8,.2,1)' });
  (zustand.fh.person ? dlg.querySelector('#fh-text') : dlg.querySelector('#fh-suche')).focus();
}
function festhaltenSchliessen() {
  const dlg = document.getElementById('festhalten');
  if (dlg.open) dlg.close();
}
function festhaltenSpeichern() {
  const dlg = document.getElementById('festhalten');
  const text = dlg.querySelector('#fh-text').value.trim();
  if (!zustand.fh.person) { const s = dlg.querySelector('#fh-suche'); s.focus(); s.classList.add('fehlt'); return; }
  if (!text) { const t = dlg.querySelector('#fh-text'); t.focus(); t.classList.add('fehlt'); return; }
  const pid = zustand.fh.person;
  const p = person(pid);
  const neu = { id: 'n' + Date.now(), person: pid, art: zustand.fh.art, datum: HEUTE, text };
  zustand.eintraege.push(neu);
  const frisch = [neu.id];
  /* Geschenkidee: der Eintrag ist zugleich eine Idee mit Stand und Anlass. */
  if (neu.art === 'geschenkidee') {
    const g = { id: 'g' + Date.now(), person: pid, titel: text, stand: 'idee', anlass: naechsterAnlass(p), eintrag: neu.id };
    zustand.geschenke.push(g);
    frisch.push(g.id);
  }
  zustand.zuletzt = [pid, ...zustand.zuletzt.filter((x) => x !== pid)];
  dlg.close();
  /* Ich bleibe, wo ich war. Auf der Seite dieser Person schreibt sich der Eintrag direkt in die Zeitleiste. */
  const { seite, id } = weg();
  const hier = seite === 'person' && id === pid;
  if (hier) {
    if (zustand.filter !== 'alle' && zustand.filter !== neu.art) zustand.filter = 'alle';
    zustand.frisch = frisch;
  }
  zeichnen();
  if (!document.activeElement || document.activeElement === document.body) document.getElementById('inhalt').focus({ preventScroll: true });
  melden(p.ist_ich ? 'Bei dir festgehalten' : `Bei ${p.rufname} festgehalten`, hier ? null : `#person/${pid}`);
}

/* ---------- Reservieren: Schleife zeichnet sich, Karte legt sich unter „Von dir“ ---------- */
function kartenLagen() {
  const lagen = new Map();
  document.querySelectorAll('.wunsch[data-wunsch]').forEach((el) => lagen.set(el.dataset.wunsch, el.getBoundingClientRect()));
  return lagen;
}
function flip(vorher, hauptId) {
  document.querySelectorAll('.wunsch[data-wunsch]').forEach((el) => {
    const alt = vorher.get(el.dataset.wunsch);
    const neu = el.getBoundingClientRect();
    if (!alt) {
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: 'ease-out' });
      return;
    }
    const dx = alt.left - neu.left, dy = alt.top - neu.top;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
    const haupt = el.dataset.wunsch === hauptId;
    el.animate([
      { transform: `translate(${dx}px, ${dy}px) rotate(var(--neigung))`, zIndex: haupt ? 5 : 1 },
      ...(haupt ? [{ transform: `translate(${dx * 0.4}px, ${dy * 0.4}px) rotate(var(--neigung)) scale(.985)`, offset: 0.5, zIndex: 5 }] : []),
      { transform: 'translate(0, 0) rotate(var(--neigung))', zIndex: haupt ? 5 : 1 },
    ], { duration: haupt ? 400 : 360, easing: 'cubic-bezier(.3,.7,.2,1)' });
  });
}
function schleifeZeichnen(karte) {
  return new Promise((fertig) => {
    const w = karte.offsetWidth + 10; const hh = karte.offsetHeight + 10, rr = 14;
    const mx = w / 2;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'schleife-zug');
    svg.setAttribute('viewBox', `0 0 ${w} ${hh}`);
    svg.setAttribute('aria-hidden', 'true');
    const m = 3.5;
    svg.innerHTML = `
      <path pathLength="1" d="M${mx} ${m} H${w - rr} Q${w - m} ${m} ${w - m} ${rr} V${hh - rr} Q${w - m} ${hh - m} ${w - rr} ${hh - m} H${rr} Q${m} ${hh - m} ${m} ${hh - rr} V${rr} Q${m} ${m} ${rr} ${m} Z"/>
      <path pathLength="1" class="masche" transform="translate(${mx - 40} ${5 - 22})" d="${MASCHE}"/>`;
    karte.appendChild(svg);
    const pfade = [...svg.querySelectorAll('path')];
    const zeiten = [[0, 360], [220, 240]];
    const anims = pfade.map((p, i) => p.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: zeiten[i][1], delay: zeiten[i][0], easing: 'cubic-bezier(.5,0,.3,1)', fill: 'both' }));
    Promise.all(anims.map((a) => a.finished)).then(() => setTimeout(fertig, 40)).catch(fertig);
  });
}
const LINKS = { l1: 'https://freundebuch.example/w/k7Qm-29xR-pL4v', l2: 'https://freundebuch.example/w/b3Tz-81nW-qD6e' };
async function wunschHandlung(aktion, id) {
  const lid = listeVon(weg().id).id;
  const karte = document.querySelector(`.wunsch[data-wunsch="${id}"]`);
  const gast = zustand.gast;
  const vorwaerts = aktion === 'schenke' || aktion === 'dabei';
  if (vorwaerts && karte && !ruhig()) {
    document.body.classList.add('beschaeftigt');
    karte.classList.add('wird-verpackt');
    await schleifeZeichnen(karte);
    document.body.classList.remove('beschaeftigt');
  }
  const vorher = kartenLagen();
  const res = zustand.reservierungen;
  if (aktion === 'schenke') res[lid].push({ wunsch: id, gast, art: 'schenke_ich' });
  if (aktion === 'dabei') res[lid].push({ wunsch: id, gast, art: 'bin_dabei' });
  if (aktion === 'zuruecknehmen' || aktion === 'doch-nicht') {
    res[lid] = res[lid].filter((r) => !(r.wunsch === id && r.gast === gast));
    zustand.voll[lid].delete(id);
  }
  if (aktion === 'voll') zustand.voll[lid].add(id);
  zeichnen();
  if (!ruhig()) flip(vorher, id);
  const w = WUENSCHE.find((x) => x.id === id);
  const fokusZiel = {
    schenke: `[data-aktion="zuruecknehmen"][data-id="${id}"]`, dabei: `[data-aktion="voll"][data-id="${id}"]`,
    zuruecknehmen: `[data-aktion="schenke"][data-id="${id}"]`, 'doch-nicht': `[data-aktion="dabei"][data-id="${id}"]`,
    voll: `[data-aktion="doch-nicht"][data-id="${id}"]`,
  }[aktion];
  document.querySelector(fokusZiel)?.focus({ preventScroll: true });
  const neueKarte = document.querySelector(`.wunsch[data-wunsch="${id}"]`);
  if (neueKarte) {
    const r = neueKarte.getBoundingClientRect();
    if (r.top < 0 || r.bottom > innerHeight) setTimeout(() => neueKarte.scrollIntoView({ block: 'nearest', behavior: ruhig() ? 'auto' : 'smooth' }), ruhig() ? 0 : 430);
  }
  const titel = ohneTrenn(w.titel);
  const text = { schenke: `${titel}: schenkst du`, dabei: `${titel}: du bist dabei`, zuruecknehmen: `${titel}: zurückgenommen`, 'doch-nicht': `${titel}: nicht mehr dabei`, voll: `${titel}: ist voll` }[aktion];
  melden(text);
}

/* ---------- Ereignisse ---------- */
document.addEventListener('click', async (ev) => {
  const el = ev.target.closest('[data-aktion]');
  if (!el) {
    if (!ev.target.closest('.art-auswahl')) artAuswahlSchliessen();
    return;
  }
  const a = el.dataset.aktion;
  if (a !== 'art-waehlen' && a !== 'art-setzen' && !(a === 'art-neu' && el.dataset.ort === 'eintrag')) artAuswahlSchliessen();
  if (document.body.classList.contains('beschaeftigt')) return;
  switch (a) {
    case 'festhalten': festhaltenOeffnen(); break;
    case 'filter': {
      zustand.filter = el.dataset.art;
      zeichnen();
      /* Aktiven Chip ins Bild holen, ohne dass die Reihe an den Anfang springt. */
      const chip = document.querySelector(`.chip[data-art="${el.dataset.art}"]`);
      if (chip) { chip.focus({ preventScroll: true }); chip.scrollIntoView({ inline: 'nearest', block: 'nearest' }); }
      break;
    }
    case 'reihenfolge': zustand.reihenfolge = zustand.reihenfolge === 'neu' ? 'alt' : 'neu'; zeichnen(); document.querySelector('.reihenfolge')?.focus(); break;
    case 'art-waehlen': artAuswahlOeffnen(el); break;
    case 'art-setzen': {
      const e = zustand.eintraege.find((x) => x.id === el.dataset.id);
      e.art = el.dataset.art || null;
      zeichnen();
      const knopf = document.querySelector(`.art-marke[data-id="${e.id}"]`);
      if (knopf) {
        knopf.focus();
        if (!ruhig()) knopf.animate([{ transform: 'scale(.92) rotate(-3deg)' }, { transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.3,1.4,.5,1)' });
      }
      melden(e.art ? `Jetzt: ${art(e.art).name}` : 'Ohne Art');
      break;
    }
    case 'art-neu': neueArtFeldZeigen(el); break;
    case 'stand': {
      const g = zustand.geschenke.find((x) => x.id === el.dataset.id);
      g.stand = STAENDE[(STAENDE.indexOf(g.stand) + 1) % STAENDE.length];
      const inEintraegen = Boolean(el.closest('.in-eintraegen'));
      zeichnen();
      const neu = document.querySelector(`${inEintraegen ? '.in-eintraegen' : '.geschenke'} [data-aktion="stand"][data-id="${g.id}"]`);
      if (neu) {
        neu.focus({ preventScroll: true });
        if (!ruhig()) neu.animate([{ transform: 'scale(1.25) rotate(-12deg)', opacity: 0.4 }, { transform: 'none', opacity: 1 }], { duration: 260, easing: 'cubic-bezier(.3,1.3,.5,1)' });
      }
      melden(`Jetzt: ${STAND_NAME[g.stand]}`);
      break;
    }
    case 'meldung-link': document.getElementById('meldung').classList.remove('an'); break;
    case 'fh-zu': festhaltenSchliessen(); break;
    case 'fh-person': zustand.fh.person = el.dataset.id; fhPersonenZeichnen(); document.querySelector(`.person-chip[data-id="${el.dataset.id}"]`)?.focus(); document.getElementById('fh-suche').classList.remove('fehlt'); break;
    case 'fh-art': zustand.fh.art = zustand.fh.art === el.dataset.art ? null : el.dataset.art; fhArtenZeichnen(); document.querySelector(`.fh-art[data-art="${el.dataset.art}"]`)?.focus(); break;
    case 'link-kopieren': {
      const link = LINKS[el.dataset.liste] || LINKS.l1;
      try { await navigator.clipboard.writeText(link); } catch { /* im Entwurf egal */ }
      melden('Link kopiert');
      break;
    }
    case 'gast-waehlen': gastMerken(el.dataset.name); zeichnen(); document.querySelector('.ich-bin button')?.focus(); break;
    case 'gast-wechseln': gastMerken(null); zeichnen(); document.querySelector('.namensfeld')?.focus(); break;
    case 'schenke': case 'dabei': case 'zuruecknehmen': case 'doch-nicht': case 'voll':
      ev.preventDefault();
      wunschHandlung(a, el.dataset.id);
      break;
    default: break;
  }
});

document.addEventListener('input', (ev) => {
  if (ev.target.id === 'suchfeld') {
    zustand.suche = ev.target.value;
    document.getElementById('treffer').innerHTML = trefferZeichnen();
  }
  if (ev.target.id === 'fh-suche') {
    zustand.fh.suche = ev.target.value;
    if (zustand.fh.suche.trim()) zustand.fh.person = fhPersonen()[0]?.id || null;
    fhPersonenZeichnen();
    ev.target.classList.remove('fehlt');
  }
  if (ev.target.id === 'fh-text') ev.target.classList.remove('fehlt');
  if (ev.target.classList.contains('neue-art-feld')) ev.target.classList.remove('fehlt');
});

/* Leeres Feld für eine neue Art verlassen: wieder der kleine Knopf. */
document.addEventListener('focusout', (ev) => {
  const feld = ev.target;
  if (!feld.classList?.contains('neue-art-feld') || feld.value.trim()) return;
  setTimeout(() => { if (feld.isConnected && document.activeElement !== feld) feld.replaceWith(Object.assign(document.createElement('template'), { innerHTML: artNeuKnopf(feld.dataset.ort, feld.dataset.id) }).content); }, 0);
});

document.addEventListener('submit', (ev) => {
  if (ev.target.closest('#festhalten')) { ev.preventDefault(); festhaltenSpeichern(); }
});

document.addEventListener('keydown', (ev) => {
  /* Feld für eine neue Art: Enter legt an, Esc bricht nur das Feld ab. */
  if (ev.target.classList?.contains('neue-art-feld')) {
    if (ev.key === 'Enter') { ev.preventDefault(); neueArtFertig(ev.target); }
    else if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); neueArtAbbrechen(ev.target); }
    return;
  }
  const dlg = document.getElementById('festhalten');
  if (dlg.open) {
    if (ev.key === 'Enter' && !ev.shiftKey && (ev.target.id === 'fh-text' || ev.target.id === 'fh-suche')) {
      ev.preventDefault();
      if (ev.target.id === 'fh-suche') {
        const erste = fhPersonen()[0];
        if (erste) { zustand.fh.person = erste.id; fhPersonenZeichnen(); ev.target.classList.remove('fehlt'); }
        if (!dlg.querySelector('#fh-text').value.trim()) { if (erste) dlg.querySelector('#fh-text').focus(); return; }
      }
      festhaltenSpeichern();
    }
    return; // Esc schließt der Dialog selbst
  }
  if (ev.key === 'Escape' && document.querySelector('.art-auswahl')) { artAuswahlSchliessen(true); return; }
  const tippt = ev.target.closest?.('input, textarea, select, [contenteditable="true"]');
  if (tippt || ev.metaKey || ev.ctrlKey || ev.altKey) return;
  if (weg().seite === 'gast') return;
  if (ev.key === 'n' || ev.key === 'N') { ev.preventDefault(); festhaltenOeffnen(); }
  if (ev.key === '/') {
    ev.preventDefault();
    if (weg().seite === 'suche') document.getElementById('suchfeld')?.focus();
    else location.hash = '#suche';
  }
});

/* Dialog: Klick auf den Hintergrund schließt; Esc im Feld für eine neue Art schließt ihn nicht. */
const fhDialog = document.getElementById('festhalten');
fhDialog.addEventListener('click', (ev) => {
  if (ev.target.id === 'festhalten') festhaltenSchliessen();
});
fhDialog.addEventListener('cancel', (ev) => {
  if (document.activeElement?.classList.contains('neue-art-feld')) ev.preventDefault();
});

/* ---------- Los ---------- */
letzterWeg = location.hash;
zeichnen();
