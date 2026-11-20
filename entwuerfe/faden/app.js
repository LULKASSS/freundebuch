/* Entwurf „Faden“: Das Leben eines Menschen als von Hand gezogener Faden, an dem die Einträge
 * wie Anhänger hängen. Ein ES-Modul ohne Build, Zustand nur im Speicher (außer der Gastwahl).
 * Alle Inhalte sind erfunden und kommen aus ../gemeinsam/daten.js. */
import {
  HEUTE, ARTEN, PERSONEN, ICH, EINTRAEGE, GESCHENKE, WUENSCHE, LISTE, LISTE2, LISTEN, RESERVIERUNGEN,
  euro, datumKurz, naechsterGeburtstag, person,
} from '../gemeinsam/daten.js';
import { PRODUKT, ART, SCHMUCK } from '../gemeinsam/zeichnungen.js';

/* ---------- Kleine Hilfen ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ruhig = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const breit = () => matchMedia('(min-width: 700px)').matches;
const warte = (ms) => new Promise((r) => setTimeout(r, ms));
const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const datum = (iso) => new Date(iso + 'T12:00');
const tagMonat = (iso) => { const d = datum(iso); return `${d.getDate()}. ${MONATE[d.getMonth()]}`; };
const tagMonatJahr = (iso) => `${tagMonat(iso)} ${iso.slice(0, 4)}`;
const tagMonatKurz = (d) => d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
const inTagen = (n) => (n === 0 ? 'heute' : n === 1 ? 'morgen' : `in ${n} Tagen`);
const undListe = (a) => (a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} und ${a[a.length - 1]}`);
const ruf = (p) => (p.ist_ich ? 'mich' : p.rufname);

/* Zufall mit Startwert, damit jeder Faden immer gleich gezogen ist. */
function zufall(text) {
  let h = 1779033703 ^ text.length;
  for (const c of text) { h = Math.imul(h ^ c.charCodeAt(0), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

/* Weiche Kurve durch Punkte (Catmull-Rom als Bézier), dazu Abtasten für „x an der Stelle y“. */
function segmente(p, zu = false) {
  const n = p.length, hol = (i) => (zu ? p[(i + n) % n] : p[Math.max(0, Math.min(n - 1, i))]);
  const s = [];
  for (let i = 0; i < (zu ? n : n - 1); i++) {
    const [a, b, c, d] = [hol(i - 1), hol(i), hol(i + 1), hol(i + 2)];
    s.push([b, [b[0] + (c[0] - a[0]) / 6, b[1] + (c[1] - a[1]) / 6], [c[0] - (d[0] - b[0]) / 6, c[1] - (d[1] - b[1]) / 6], c]);
  }
  return s;
}
const z = (v) => v.toFixed(1);
const pfad = (s) => `M${z(s[0][0][0])},${z(s[0][0][1])}` + s.map(([, c1, c2, e]) => `C${z(c1[0])},${z(c1[1])} ${z(c2[0])},${z(c2[1])} ${z(e[0])},${z(e[1])}`).join('');
function abtasten(s) {
  const pkt = [];
  for (const [a, b, c, d] of s) for (let t = 0; t <= 1; t += 1 / 16) {
    const u = 1 - t, k = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
    pkt.push([k[0] * a[0] + k[1] * b[0] + k[2] * c[0] + k[3] * d[0], k[0] * a[1] + k[1] * b[1] + k[2] * c[1] + k[3] * d[1]]);
  }
  return (y) => {
    for (let i = 1; i < pkt.length; i++) if (pkt[i][1] >= y) {
      const [p, q] = [pkt[i - 1], pkt[i]], f = q[1] === p[1] ? 0 : (y - p[1]) / (q[1] - p[1]);
      return p[0] + (q[0] - p[0]) * f;
    }
    return pkt[pkt.length - 1][0];
  };
}

/* Statt Kreis: ein kleines Schildchen mit Loch, wie ein Anhänger am Faden, mit dem Anfangsbuchstaben. */
const SCHILD_FORM = 'M40 4C45 4 70 18 73 22c2.5 3.2 3 5.5 3 9.5V88c0 6-3 9-9 9H13c-6 0-9-3-9-9V31.5c0-4 .5-6.3 3-9.5C10 18 35 4 40 4z';
const SCHILD_LOCH = 'M34.5 21a5.5 5.5 0 1 0 11 0a5.5 5.5 0 1 0-11 0z';
const mono = (p, g = 48) => {
  const kipp = ((zufall(p.id)() * 2 - 1) * 6).toFixed(1);
  return `<span class="mono" style="${g ? `--g:${g}px;` : ''}--mono:var(--ton-${p.farbe});--kipp:${kipp}deg" aria-hidden="true"><svg viewBox="0 0 80 100"><path fill-rule="evenodd" d="${SCHILD_FORM} ${SCHILD_LOCH}"/></svg><span>${esc(p.name.trim()[0])}</span></span>`;
};

/* Zeichen für selbst angelegte Arten: ein kleiner Anhänger mit zwei Zeilen. */
const EIGEN = `<svg viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path fill="var(--fuell, transparent)" d="M60 24c5 0 25 13 28 17 1.5 2 2 4 2 7v42c0 5-3 8-8 8H38c-5 0-8-3-8-8V48c0-3 .5-5 2-7 3-4 23-17 28-17z"/><circle cx="60" cy="41" r="5"/><path d="M60 36c-2-10-8-19-17-24"/><path d="M46 64h28M46 78h17"/></svg>`;
const artBild = (z) => ART[z] || (z === 'eigen' ? EIGEN : ART.frei);

/* Eigene kleine Zeichen, Strich wie von Hand. */
const zeichen = (inhalt) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inhalt}</svg>`;
const ICON = {
  start: zeichen('<path d="M3.8 11.6 12 4.4l8.3 7.1"/><path d="M6.1 9.9c-.2 3.2-.1 6.2.1 9.4 3.9.2 7.7.2 11.6 0 .2-3.2.2-6.3 0-9.5"/><path d="M10 19.2c0-1.8-.1-3.4.1-5 1.3-.1 2.6-.1 3.8 0 .1 1.7.1 3.3 0 5"/>'),
  menschen: zeichen('<circle cx="9" cy="8.6" r="3.3"/><path d="M3.3 19.4c.5-3.6 2.8-5.6 5.7-5.6s5.3 2 5.8 5.6"/><path d="M15.4 5.6c1.9-.4 3.6.9 3.7 2.8.1 1.7-1.2 3.1-2.9 3.2"/><path d="M17.1 14.2c2 .5 3.3 2.2 3.6 4.9"/>'),
  plus: zeichen('<path d="M12.1 5.2c-.2 4.6-.1 9.1.1 13.6"/><path d="M5.3 12.2c4.5-.3 9-.2 13.5.1"/>'),
  suche: zeichen('<path d="M10.6 4.6c3.4-.1 6 2.5 6 5.8 0 3.4-2.6 6-5.9 6-3.4.1-6.1-2.5-6.1-5.9 0-3.3 2.6-5.8 6-5.9z"/><path d="m15.1 15.2 4.8 4.6"/>'),
  ich: zeichen('<path d="M12 4.3c2 0 3.5 1.5 3.5 3.6S14 11.6 12 11.6 8.4 10 8.4 7.9s1.6-3.6 3.6-3.6z"/><path d="M5.2 19.6c.6-3.9 3.3-6 6.8-6s6.3 2.1 6.9 6"/>'),
  pfeile: zeichen('<path d="M8 4.5v14.8M4.8 16.3 8 19.5l3.1-3.2"/><path d="M16 19.4V4.6M12.9 7.6 16 4.5l3.2 3.2"/>'),
  raus: zeichen('<path d="M10 5.5H6.2c-.6 0-1 .4-1 1v11.3c0 .6.4 1 1 1h11.3c.6 0 1-.4 1-1V14"/><path d="M13.6 5h5.4v5.4M19 5l-7.6 7.6"/>'),
  link: zeichen('<path d="M10.2 13.8a3.6 3.6 0 0 0 5.2.2l3-3a3.7 3.7 0 0 0-5.2-5.2l-1.2 1.1"/><path d="M13.8 10.2a3.6 3.6 0 0 0-5.2-.2l-3 3a3.7 3.7 0 0 0 5.2 5.2l1.1-1.1"/>'),
  auge: zeichen('<path d="M2.8 12.2C5 8 8.2 6.1 12 6.1s7 1.9 9.2 6.1C19 16.2 15.8 18 12 18s-7-1.8-9.2-5.8z"/><circle cx="12" cy="12.1" r="2.7"/>'),
  schloss: zeichen('<rect x="5.4" y="10.6" width="13.2" height="9.2" rx="2.2"/><path d="M8.4 10.4V8a3.6 3.6 0 0 1 7.2 0v2.4"/>'),
  zusammen: zeichen('<path d="M9.2 7.4c2.6 0 4.6 2 4.6 4.6s-2 4.6-4.6 4.6-4.6-2-4.6-4.6 2-4.6 4.6-4.6z"/><path d="M14.8 7.4c2.6 0 4.6 2 4.6 4.6s-2 4.6-4.6 4.6"/>'),
  weiter: zeichen('<path d="M9.4 5.8 15.6 12l-6.2 6.2"/>'),
  klein: zeichen('<path d="m7.6 10 4.4 4.3 4.4-4.3"/>'),
};

/* ---------- Zustand (nur im Speicher) ---------- */
const listeVon = (id) => LISTEN.find((l) => l.id === id) || LISTE;
const GAST_SCHLUESSEL = (lid) => `freundebuch.faden.gast.${lid}`;
function gastLesen(L) {
  try { const n = localStorage.getItem(GAST_SCHLUESSEL(L.id)); return L.gaeste.includes(n) ? n : null; } catch { return null; }
}
function gastMerken(L, n) {
  try { if (n) localStorage.setItem(GAST_SCHLUESSEL(L.id), n); else localStorage.removeItem(GAST_SCHLUESSEL(L.id)); } catch { /* ohne Speicher geht es auch */ }
}

const zustand = {
  arten: ARTEN.map((a) => ({ ...a })),
  eintraege: EINTRAEGE.map((e) => ({ ...e })),
  geschenke: GESCHENKE.map((g) => ({ ...g })),
  res: { l1: RESERVIERUNGEN.map((r) => ({ ...r })), l2: (LISTE2.reservierungen || []).map((r) => ({ ...r })) },
  voll: { l1: new Set(), l2: new Set() },
  gast: { l1: gastLesen(LISTE), l2: gastLesen(LISTE2) },
  filter: 'alle',
  reihenfolge: 'neu',
  filterFuer: null,
  zuletzt: ['mia', 'jonas', 'hilde', 'tom', 'ben', 'sophie', 'ich'],
  besucht: [],
  neuId: null,
  flugVon: null,
  springeZu: null,
  blatt: null,
  menue: null,
  ersteAnzeige: true,
};
const artVon = (id) => zustand.arten.find((a) => a.id === id) || null;

/* Eine eigene Art anlegen; gibt es den Namen schon, wird die vorhandene genommen. */
function artAnlegen(roh) {
  const name = roh.trim().replace(/\s+/g, ' ').slice(0, 24);
  if (!name) return null;
  const da = zustand.arten.find((a) => a.name.toLowerCase() === name.toLowerCase());
  if (da) return da;
  const basis = 'eigen-' + (name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'art');
  let id = basis, n = 2;
  while (artVon(id)) id = `${basis}-${n++}`;
  const a = { id, name, zeichnung: 'eigen', eigene: true };
  zustand.arten.push(a);
  return a;
}

/* ---------- Navigation ---------- */
const ZIELE = [
  { id: 'start', href: '#start', name: 'Start', icon: ICON.start },
  { id: 'menschen', href: '#menschen', name: 'Menschen', icon: ICON.menschen },
  { id: 'festhalten', name: 'Festhalten', icon: ICON.plus, taste: 'N' },
  { id: 'suche', href: '#suche', name: 'Suche', icon: ICON.suche, taste: '/' },
  { id: 'ich', href: '#person/ich', name: 'Ich', icon: ICON.ich },
];
$('.leiste').innerHTML = ZIELE.map((z) => {
  const innen = `<span class="ziel-zeichen">${z.icon}</span><span class="ziel-name">${z.name}</span>${z.taste ? `<kbd aria-hidden="true">${z.taste}</kbd>` : ''}`;
  return z.href
    ? `<a class="ziel" href="${z.href}" data-ziel="${z.id}">${innen}</a>`
    : `<button class="ziel ziel-festhalten" type="button" data-aktion="festhalten" aria-keyshortcuts="N">${innen}</button>`;
}).join('');

function route() {
  const [teil, id] = (location.hash.slice(1) || '').split('/');
  return { teil, id };
}

/* ---------- Seiten ---------- */
function geburtstagszeile(p) {
  const g = naechsterGeburtstag(p.geburtstag);
  return `${tagMonatJahr(p.geburtstag)} · wird ${g.alter} · <strong>${inTagen(g.tage)}</strong>`;
}

function ausweis(p) {
  const groessen = p.steckbrief.filter((s) => ['Kleidung', 'Schuhe', 'Ring'].includes(s.bez));
  const andere = p.steckbrief.filter((s) => !groessen.includes(s));
  const zeilen = [];
  if (p.kennen) zeilen.push(['Kennen uns', esc(p.kennen)]);
  if (groessen.length) zeilen.push(['Größen', groessen.map((s) => `<span class="paar"><span class="paar-bez">${esc(s.bez)}</span> ${esc(s.wert)}</span>`).join('')]);
  for (const s of andere) zeilen.push([esc(s.bez), esc(s.wert)]);
  if (p.familie.length) zeilen.push(['Familie', p.familie.map((f) => (f.person
    ? `<a class="verweis" href="#person/${f.person}">${esc(f.name)}</a> <span class="leise">${esc(f.art)}</span>`
    : `<span>${esc(f.name)}</span> <span class="leise">${esc(f.art)}</span>`)).join('<span class="trenner" aria-hidden="true">·</span>')]);
  const erster = p.name.split(' ')[0];
  const genannt = !p.ist_ich && p.rufname !== erster ? `<p class="genannt">genannt ${esc(p.rufname)}</p>` : '';
  return `<header class="ausweis">
    <span class="ausweis-schlitz" aria-hidden="true"></span>
    <div class="ausweis-kopf">
      ${mono(p, 0)}
      <div class="ausweis-name">
        ${p.ist_ich ? '<p class="ueberzeile">Meine Seite</p>' : ''}
        <h1 class="name" tabindex="-1">${esc(p.name)}</h1>
        ${genannt}
        <p class="geburtstag">${geburtstagszeile(p)}</p>
      </div>
    </div>
    ${zeilen.length ? `<dl class="steckbrief">${zeilen.map(([dt, dd]) => `<div><dt>${dt}</dt><dd>${dd}</dd></div>`).join('')}</dl>` : ''}
    <span class="ausweis-oese" aria-hidden="true"></span>
  </header>`;
}

/* ---------- Geschenkideen ---------- */
const STAENDE = [['idee', 'Idee'], ['besorgt', 'besorgt'], ['verschenkt', 'verschenkt']];
const standName = (id) => (STAENDE.find(([s]) => s === id) || STAENDE[0])[1];
const ideenVon = (pid) => zustand.geschenke.filter((g) => g.person === pid);
/* Der Tag des Anlasses, damit eine Idee an der richtigen Stelle am Faden hängt. */
function anlassDatum(g) {
  const p = person(g.person), jahr = (g.anlass.match(/\d{4}/) || [HEUTE.slice(0, 4)])[0];
  if (/Geburtstag/.test(g.anlass)) return `${jahr}-${p.geburtstag.slice(5)}`;
  if (/Weihnachten/.test(g.anlass)) return `${jahr}-12-24`;
  return `${jahr}-12-31`;
}
/* Der nächste Anlass einer Person, für neue Ideen aus dem Festhalten. */
function naechsterAnlass(p) {
  const g = naechsterGeburtstag(p.geburtstag);
  const moegliche = [{ name: `Geburtstag ${g.datum.getFullYear()}`, tage: g.tage }];
  if (p.beschenken?.includes('weihnachten')) {
    const jahr = +HEUTE.slice(0, 4), w = datum(`${jahr}-12-24`) < datum(HEUTE) ? jahr + 1 : jahr;
    moegliche.push({ name: `Weihnachten ${w}`, tage: Math.round((datum(`${w}-12-24`) - datum(HEUTE)) / 864e5) });
  }
  return moegliche.sort((a, b) => a.tage - b.tage)[0].name;
}
const standKnopf = (g, ort) => `<button class="idee-stand" type="button" data-aktion="stand" data-idee="${g.id}" data-ort="${ort}" aria-label="Stand: ${standName(g.stand)}. Tippen schaltet weiter">${STAENDE.map(([id, name]) => `<span class="stand${id === g.stand ? ' ist' : ''}">${name}</span>`).join('<span class="stand-strich" aria-hidden="true"></span>')}</button>`;
const ideeMeta = (g) => [g.haendler && esc(g.haendler), g.preis ? euro(g.preis) : ''].filter(Boolean).join(' · ');

function geschenkideen(p) {
  if (p.ist_ich) return '';
  const liste = ideenVon(p.id);
  const inhalt = liste.length ? `<ul class="ideen-liste">${liste.map((g) => `
      <li class="idee" data-idee-karte="${g.id}">
        <span class="idee-schnur" aria-hidden="true"></span>
        <span class="loch" aria-hidden="true"></span>
        <span class="idee-bild">${PRODUKT[g.zeichnung] || ART.geschenk}</span>
        <div class="idee-text">
          <h3 class="idee-titel">${esc(g.titel)}</h3>
          <p class="idee-anlass">${esc(g.anlass)}</p>
          ${standKnopf(g, 'ideen')}
          ${ideeMeta(g) ? `<p class="idee-meta">${ideeMeta(g)}</p>` : ''}
        </div>
      </li>`).join('')}</ul>` : '<p class="leer-zeile">Noch keine Idee.</p>';
  return `<section class="ideen" aria-labelledby="ideen-titel">
    <h2 class="abschnitt" id="ideen-titel">Geschenkideen</h2>
    <svg class="leine" viewBox="0 0 600 24" preserveAspectRatio="none" aria-hidden="true"><path d="M0,4 Q300,26 600,4" vector-effect="non-scaling-stroke"/></svg>
    ${inhalt}
  </section>`;
}

/* ---------- Meine Seite: was ich brauche ---------- */
const TOENE = ['flieder', 'pfirsich', 'salbei', 'sand', 'rose'];
const wunschTon = (w) => TOENE[WUENSCHE.indexOf(w) % TOENE.length];
const standKurz = (iso) => `Stand ${datumKurz(iso).replace(/\.?$/, '.')}`;
const ohneTrenner = (t) => String(t ?? '').replace(/­/g, '');

function wasIchBrauche() {
  const vier = WUENSCHE.slice(0, 4);
  return `<section class="brauche" aria-labelledby="brauche-titel">
    <h2 class="abschnitt" id="brauche-titel">Was ich brauche</h2>
    <ul class="brauche-liste">${vier.map((w) => `<li><span class="brauche-bild" style="--fuell:var(--ton-${wunschTon(w)})">${PRODUKT[w.zeichnung] || ''}</span><span class="brauche-text"><span class="brauche-titel">${esc(w.titel)}</span><span class="brauche-preis">${euro(w.preis)} · ${standKurz(w.stand)}</span></span></li>`).join('')}</ul>
    <h3 class="geteilt-kopf">Geteilt als</h3>
    <ul class="geteilt-liste">${LISTEN.map((L) => `<li><a class="geteilt" href="#liste/${L.id}">
      <span class="geteilt-text"><span class="geteilt-titel">${esc(L.titel)}</span><span class="geteilt-zahl">${L.wuensche.length} Wünsche · ${L.gaeste.length} Gäste</span></span>${ICON.weiter}
    </a></li>`).join('')}</ul>
  </section>`;
}

/* ---------- Einträge am Faden ---------- */
function fadenPosten(p) {
  const eintraege = zustand.eintraege.filter((e) => e.person === p.id);
  const ideen = p.ist_ich ? [] : ideenVon(p.id).map((g) => ({ id: g.id, person: p.id, art: 'geschenkidee', datum: anlassDatum(g), idee: g }));
  return [...eintraege, ...ideen];
}

function anhaenger(e, seite) {
  const a = e.art ? artVon(e.art) : null;
  const dreh = ((zufall(e.id)() * 2 - 1) * 0.8).toFixed(2);
  if (e.idee) {
    const g = e.idee, meta = ideeMeta(g);
    return `<li class="anhaenger ist-idee seite-${seite}" data-eintrag="${e.id}" style="--dreh:${dreh}deg" tabindex="-1">
      <span class="loch" aria-hidden="true"></span>
      <div class="anh-kopf">
        <span class="art-marke"><span class="art-zeichen art-geschenkidee">${ART.geschenk}</span><span>Geschenkidee</span></span>
        <span class="anh-anlass">${esc(g.anlass)}</span>
      </div>
      <p class="anh-titel">${esc(g.titel)}</p>
      <div class="anh-idee-fuss">${standKnopf(g, 'faden')}${meta ? `<span class="anh-meta">${meta}</span>` : ''}</div>
    </li>`;
  }
  const name = a ? a.name : 'Art wählen';
  return `<li class="anhaenger seite-${seite}${e.art === 'zitat' ? ' ist-zitat' : ''}" data-eintrag="${e.id}" style="--dreh:${dreh}deg" tabindex="-1">
    <span class="loch" aria-hidden="true"></span>
    <div class="anh-kopf">
      <button class="art-knopf${a ? '' : ' ohne'}" type="button" data-aktion="art-menue" aria-expanded="false" aria-label="${a ? `${esc(name)}, Art ändern` : 'Art wählen'}">
        <span class="art-zeichen art-${a ? a.id : 'ohne'}">${artBild(a ? a.zeichnung : 'frei')}</span><span>${esc(name)}</span><span class="art-pfeil">${ICON.klein}</span>
      </button>
      <time datetime="${e.datum}">${tagMonat(e.datum)}</time>
    </div>
    <p class="anh-text">${esc(e.text)}</p>
  </li>`;
}

function fadenHtml(p) {
  const alle = fadenPosten(p);
  let liste = alle.filter((e) => zustand.filter === 'alle' || e.art === zustand.filter);
  liste = liste.map((e, i) => [e, i]).sort((x, y) => (x[0].datum < y[0].datum ? -1 : x[0].datum > y[0].datum ? 1 : x[1] - y[1])).map((x) => x[0]);
  if (zustand.reihenfolge === 'neu') liste.reverse();
  let jahr = null, n = 0, html = '';
  for (const e of liste) {
    const j = e.datum.slice(0, 4);
    if (j !== jahr) { html += `<li class="jahr"><span class="knoten">${j}</span></li>`; jahr = j; }
    html += anhaenger(e, n++ % 2 ? 'r' : 'l');
  }
  if (!liste.length) html = '<li class="leer">Hier hängt noch nichts.</li>';
  const zahl = (id) => (id === 'alle' ? alle.length : alle.filter((e) => e.art === id).length);
  const chips = [{ id: 'alle', name: 'alle' }, ...zustand.arten].map((a) => `<button class="chip" type="button" data-aktion="filter" data-filter="${a.id}" aria-pressed="${zustand.filter === a.id}">${a.zeichnung ? `<span class="art-zeichen art-${a.id}">${artBild(a.zeichnung)}</span>` : ''}<span>${esc(a.name)}</span><span class="chip-zahl">${zahl(a.id)}</span></button>`).join('');
  const neu = zustand.reihenfolge === 'neu';
  return `<div class="eintraege-kopf">
      <h2 class="abschnitt" id="ueber-titel">Über ${esc(ruf(p))}</h2>
      <button class="umschalter" type="button" data-aktion="reihenfolge" aria-label="${neu ? 'Neu zuerst' : 'Alt zuerst'}, Reihenfolge umkehren">${ICON.pfeile}<span>${neu ? 'neu → alt' : 'alt → neu'}</span></button>
    </div>
    <div class="filter" role="group" aria-label="Nach Art filtern">${chips}</div>
    <div class="faden" data-faden="${p.id}">
      <svg class="faden-hinten" aria-hidden="true"></svg>
      <ol class="faden-liste">${html}</ol>
      <svg class="faden-vorn" aria-hidden="true"></svg>
    </div>`;
}

function seitePerson(id) {
  const p = person(id);
  if (!p) { location.replace('#person/mia'); return ''; }
  if (zustand.filterFuer !== id) { zustand.filter = 'alle'; zustand.filterFuer = id; }
  if (!artVon(zustand.filter) && zustand.filter !== 'alle') zustand.filter = 'alle';
  if (!p.ist_ich) zustand.besucht = [id, ...zustand.besucht.filter((b) => b !== id)].slice(0, 3);
  return `<article class="seite seite-person">
    <svg class="faden-oben" aria-hidden="true"></svg>
    ${ausweis(p)}
    ${p.ist_ich ? wasIchBrauche() : geschenkideen(p)}
    <section class="eintraege" aria-labelledby="ueber-titel">${fadenHtml(p)}</section>
  </article>`;
}

/* Start: ein Blickfang, darunter „Bald“ und „Geschenk fehlt“. */
function anlaesse(p) {
  const out = [];
  const g = naechsterGeburtstag(p.geburtstag);
  if (p.beschenken?.includes('geburtstag') && g.tage <= 45) out.push({ name: 'Geburtstag', anlass: `Geburtstag ${g.datum.getFullYear()}`, tage: g.tage });
  const weih = Math.round((datum('2026-12-24') - datum(HEUTE)) / 864e5);
  if (p.beschenken?.includes('weihnachten') && weih <= 45) out.push({ name: 'Weihnachten', anlass: 'Weihnachten 2026', tage: weih });
  return out.map((a) => {
    const ideen = zustand.geschenke.filter((x) => x.person === p.id && x.anlass === a.anlass);
    return { ...a, ideen, fehlt: !ideen.some((x) => x.stand !== 'idee') };
  });
}

const haenger = (art, schnur, inhalt) => `<span class="haenger haenger-${art}" style="--schnur:${schnur}px">${inhalt}</span>`;
function seiteStart() {
  const nach = PERSONEN.map((p) => ({ p, g: naechsterGeburtstag(p.geburtstag) })).sort((a, b) => a.g.tage - b.g.tage);
  const { p, g } = nach[0];
  const geb = anlaesse(p).find((a) => a.name === 'Geburtstag');
  const idee = geb?.ideen.find((x) => x.stand === 'idee');
  const fehlt = PERSONEN.map((q) => ({ q, a: anlaesse(q).filter((x) => x.fehlt) })).filter((x) => x.a.length);
  const heute = datum(HEUTE).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
  return `<article class="seite seite-start">
    <h1 class="tag-titel" tabindex="-1">${heute}</h1>
    <section class="blickfang" aria-labelledby="blick-titel">
      <div class="blick-haenger" aria-hidden="true">
        ${haenger('schild', 46, mono(p, 0))}${haenger('kuchen', 100, SCHMUCK.kuchen)}${haenger('schleife', 196, SCHMUCK.schleife)}${haenger('stern', 28, SCHMUCK.stern)}
      </div>
      <div class="blick-kopf">
        <div>
          <p class="ueberzeile">Als Nächstes</p>
          <p class="blick-wann"><strong>${inTagen(g.tage)}</strong>${g.datum.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <span class="blick-kuchen" aria-hidden="true"><svg class="blick-faden" viewBox="0 0 20 60" preserveAspectRatio="none"><path d="M10,0 C14,16 6,30 11,44 C13,51 10,56 10,60" vector-effect="non-scaling-stroke"/></svg>${SCHMUCK.kuchen}</span>
      </div>
      <h2 class="blick-titel" id="blick-titel">${esc(p.rufname)} wird ${g.alter}</h2>
      ${geb?.fehlt ? `<p class="blick-geschenk"><span class="art-zeichen art-geschenkidee">${ART.geschenk}</span><span>Noch kein Geschenk${idee ? ` · Idee: ${esc(idee.titel)}` : ''}</span></p>` : ''}
      <div class="knopfreihe">
        <a class="knopf" href="#person/${p.id}">Zu ${esc(p.rufname)}</a>
        <button class="knopf-rand" type="button" data-aktion="festhalten" data-person="${p.id}">${ICON.plus}<span>Festhalten</span></button>
      </div>
    </section>
    <div class="start-spalten">
      <section class="start-gruppe" aria-labelledby="bald-titel">
        <h2 class="abschnitt" id="bald-titel">Bald</h2>
        <ul class="zeilen">${nach.slice(1, 5).map(({ p: q, g: h }) => `<li><a class="zeile" href="#person/${q.id}">${mono(q, 40)}<span class="zeile-haupt"><span class="zeile-name">${esc(q.rufname)}</span><span class="zeile-unter">wird ${h.alter}</span></span><span class="zeile-rechts"><span>${tagMonatKurz(h.datum)}</span><span class="zeile-unter">${inTagen(h.tage)}</span></span></a></li>`).join('')}</ul>
      </section>
      <section class="start-gruppe" aria-labelledby="fehlt-titel">
        <h2 class="abschnitt" id="fehlt-titel">Geschenk fehlt</h2>
        <ul class="zeilen">${fehlt.map(({ q, a }) => {
          const ideen = a.reduce((s, x) => s + x.ideen.length, 0);
          return `<li><a class="zeile" href="#person/${q.id}">${mono(q, 40)}<span class="zeile-haupt"><span class="zeile-name">${esc(q.rufname)}</span><span class="zeile-unter">${a.map((x) => x.name).join(' · ')}</span></span><span class="zeile-rechts"><span class="${ideen ? '' : 'terra'}">${ideen ? (ideen === 1 ? '1 Idee' : `${ideen} Ideen`) : 'keine Idee'}</span><span class="zeile-unter">${inTagen(Math.min(...a.map((x) => x.tage)))}</span></span></a></li>`;
        }).join('')}</ul>
      </section>
    </div>
  </article>`;
}

function seiteMenschen() {
  const zeile = (p) => {
    const g = naechsterGeburtstag(p.geburtstag);
    const erster = p.name.split(' ')[0];
    return `<li><a class="register-zeile" href="#person/${p.id}">${mono(p, 44)}
      <span class="register-haupt"><span class="register-name">${esc(p.name)}${p.rufname !== erster ? ` <span class="leise">· ${esc(p.rufname)}</span>` : ''}</span><span class="register-unter">${esc(p.kennen)}</span></span>
      <span class="register-punkte" aria-hidden="true"></span>
      <span class="register-tag">${tagMonatKurz(g.datum)}</span></a></li>`;
  };
  const alpha = [...PERSONEN].sort((a, b) => a.name.localeCompare(b.name, 'de'));
  const zuletzt = zustand.besucht.map(person).filter(Boolean);
  return `<article class="seite seite-menschen">
    <h1 class="seiten-titel" tabindex="-1">Menschen</h1>
    ${zuletzt.length ? `<section aria-labelledby="zuletzt-titel"><h2 class="abschnitt" id="zuletzt-titel">Zuletzt</h2><ul class="register">${zuletzt.map(zeile).join('')}</ul></section>` : ''}
    <section aria-labelledby="alle-titel"><h2 class="abschnitt" id="alle-titel">Alle</h2><ul class="register">${alpha.map(zeile).join('')}</ul></section>
  </article>`;
}

/* Suche über Namen, Steckbrief, Einträge, Geschenkideen und Wünsche; läuft im Gerät.
 * Weiche Trennzeichen zählen beim Vergleich nicht. */
function markieren(text, wort) {
  const t = esc(ohneTrenner(text));
  if (!wort) return t;
  const muster = new RegExp(esc(wort).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  return t.replace(muster, (m) => `<mark>${m}</mark>`);
}
function treffer(wort) {
  const w = ohneTrenner(wort).trim().toLowerCase();
  if (!w) return '';
  const hat = (t) => ohneTrenner(t).toLowerCase().includes(w);
  const alle = [...PERSONEN, ICH];
  const menschen = alle.map((p) => {
    const felder = [p.name, p.rufname, p.kennen, ...p.steckbrief.map((s) => `${s.bez} ${s.wert}`), ...p.familie.map((f) => `${f.name} (${f.art})`)];
    const fund = felder.find(hat);
    return fund ? { p, fund } : null;
  }).filter(Boolean);
  const eintraege = zustand.eintraege.filter((e) => hat(e.text));
  const ideen = zustand.geschenke.filter((g) => hat(g.titel) || hat(g.haendler) || hat(g.anlass));
  const wuensche = WUENSCHE.filter((x) => hat(x.titel) || hat(x.beschreibung) || hat(x.haendler));
  if (!menschen.length && !eintraege.length && !ideen.length && !wuensche.length) return `<p class="leer-zeile">Nichts zu „${esc(wort.trim())}“.</p>`;
  const gruppe = (titel, inhalt) => `<section class="treffer-gruppe"><h2 class="abschnitt">${titel}</h2><ul class="zeilen">${inhalt}</ul></section>`;
  let html = '';
  if (menschen.length) html += gruppe('Menschen', menschen.map(({ p, fund }) => `<li><a class="zeile" href="#person/${p.id}">${mono(p, 40)}<span class="zeile-haupt"><span class="zeile-name">${markieren(p.name, w)}</span>${fund !== p.name ? `<span class="zeile-unter">${markieren(fund, w)}</span>` : ''}</span></a></li>`).join(''));
  if (eintraege.length) html += gruppe('Einträge', eintraege.map((e) => {
    const a = e.art ? artVon(e.art) : null, p = person(e.person);
    return `<li><a class="zeile zeile-eintrag" href="#person/${p.id}" data-springe="${e.id}"><span class="art-zeichen gross art-${a ? a.id : 'ohne'}">${artBild(a ? a.zeichnung : 'frei')}</span><span class="zeile-haupt"><span class="zeile-text">${markieren(e.text, w)}</span><span class="zeile-unter">${esc(p.rufname)} · ${a ? esc(a.name) : 'ohne Art'} · ${tagMonatJahr(e.datum)}</span></span></a></li>`;
  }).join(''));
  if (ideen.length) html += gruppe('Geschenkideen', ideen.map((g) => {
    const p = person(g.person);
    return `<li><a class="zeile" href="#person/${p.id}"><span class="zeile-bild">${PRODUKT[g.zeichnung] || ART.geschenk}</span><span class="zeile-haupt"><span class="zeile-name">${markieren(g.titel, w)}</span><span class="zeile-unter">${esc(p.rufname)} · ${markieren(g.anlass, w)} · ${standName(g.stand)}</span></span></a></li>`;
  }).join(''));
  if (wuensche.length) html += gruppe('Meine Wünsche', wuensche.map((x) => `<li><a class="zeile" href="#liste/${(LISTEN.find((L) => L.wuensche.includes(x.id)) || LISTE).id}"><span class="zeile-bild" style="--fuell:var(--ton-${wunschTon(x)})">${PRODUKT[x.zeichnung] || ''}</span><span class="zeile-haupt"><span class="zeile-name">${markieren(x.titel, w)}</span><span class="zeile-unter">${euro(x.preis)} · ${markieren(x.haendler, w)}</span></span></a></li>`).join(''));
  return html;
}
function seiteSuche() {
  return `<article class="seite seite-suche">
    <h1 class="seiten-titel" tabindex="-1">Suche</h1>
    <div class="suchfeld">${ICON.suche}<label class="nur-leser" for="suchfeld">Suchen</label><input id="suchfeld" type="search" autocomplete="off" spellcheck="false" placeholder="Name, Satz, Geschenk"></div>
    <div id="treffer" class="treffer" aria-live="polite"></div>
  </article>`;
}

/* ---------- Wunschliste ---------- */
const shopAttr = (w) => `href="${esc(w.url)}" target="_blank" rel="noopener noreferrer"`;
const shopLink = (w) =>
  `<a class="shop" ${shopAttr(w)} aria-label="Zum Shop bei ${esc(w.haendler)}"><span>Zum Shop</span>${ICON.raus}</a>`;
const schild = (neu = false) =>
  `<span class="schild${neu ? ' schwingt' : ''}" aria-hidden="true"><span class="schild-schnur"></span><span class="schild-karte">${SCHMUCK.schleife}</span></span>`;

function wunschKarte(w, modus, L) {
  const g = zustand.gast[L.id], res = zustand.res[L.id], vollSet = zustand.voll[L.id];
  const dabei = res.filter((r) => r.wunsch === w.id && r.art === 'bin_dabei').map((r) => r.gast);
  const ichDabei = dabei.includes(g), andere = dabei.filter((n) => n !== g);
  const meinSchenk = res.some((r) => r.wunsch === w.id && r.gast === g && r.art === 'schenke_ich');
  const voll = vollSet.has(w.id);
  let zusammen = '';
  if (w.zusammenlegen && modus === 'ich') zusammen = `<p class="zusammen">${ICON.zusammen}<span>Zum Zusammenlegen</span></p>`;
  else if (w.zusammenlegen) {
    const wer = ichDabei ? (andere.length ? `du, ${undListe(andere)}` : 'du bist dabei') : andere.length ? `${undListe(andere)} ${andere.length > 1 ? 'sind' : 'ist'} dabei` : 'noch niemand dabei';
    zusammen = `<p class="zusammen">${ICON.zusammen}<span>Zusammenlegen · ${wer}</span></p>${ichDabei && voll ? '<p class="voll-zeile">Ist voll</p>' : ''}`;
  }
  let knoepfe = '';
  if (modus === 'ich') knoepfe = '';
  else if (meinSchenk) knoepfe = '<button class="knopf-rand" type="button" data-aktion="zuruecknehmen">Zurücknehmen</button>';
  else if (ichDabei) knoepfe = voll
    ? '<button class="knopf-rand" type="button" data-aktion="doch-nicht">Doch nicht</button>'
    : '<button class="knopf" type="button" data-aktion="voll">Ist voll</button><button class="knopf-rand" type="button" data-aktion="doch-nicht">Doch nicht</button>';
  else if (w.zusammenlegen) knoepfe = '<button class="knopf" type="button" data-aktion="dabei">Ich bin dabei</button>';
  else knoepfe = '<button class="knopf" type="button" data-aktion="schenke">Das schenke ich</button>';
  return `<li class="wunsch" data-wunsch="${w.id}">
    <a class="wunsch-bild" ${shopAttr(w)} tabindex="-1" aria-hidden="true" style="--fuell:var(--ton-${wunschTon(w)})">${PRODUKT[w.zeichnung] || ''}${modus === 'meins' ? schild() : ''}</a>
    <div class="wunsch-text">
      <h3 class="wunsch-titel"><a ${shopAttr(w)}>${esc(w.titel)}</a></h3>
      <p class="wunsch-besch">${esc(w.beschreibung)}</p>
      <p class="wunsch-meta"><span class="preis">${euro(w.preis)}</span><span class="leise">${standKurz(w.stand)}</span></p>
      <p class="haendler-zeile"><span class="haendler">${esc(w.haendler)}</span>${shopLink(w)}</p>
      ${zusammen}
    </div>
    ${knoepfe ? `<div class="wunsch-knoepfe">${knoepfe}</div>` : ''}
  </li>`;
}

function gastWuensche(L) {
  const g = zustand.gast[L.id], res = zustand.res[L.id];
  const von = (id) => res.filter((r) => r.wunsch === id);
  const meine = [], frei = [];
  for (const id of L.wuensche) {
    const w = WUENSCHE.find((x) => x.id === id), rs = von(id);
    if (rs.some((r) => r.gast === g)) meine.push(w);
    else if (rs.some((r) => r.art === 'schenke_ich')) continue;
    else if (zustand.voll[L.id].has(id)) continue;
    else frei.push(w);
  }
  return `${meine.length ? `<section class="von-dir" aria-labelledby="vondir-titel"><h2 class="abschnitt" id="vondir-titel">Von dir</h2><ol class="wunsch-liste">${meine.map((w) => wunschKarte(w, 'meins', L)).join('')}</ol></section>` : ''}
    <section aria-labelledby="frei-titel"><h2 class="abschnitt" id="frei-titel">${meine.length ? 'Noch zu haben' : 'Zum Aussuchen'}</h2>
    ${frei.length ? `<ol class="wunsch-liste">${frei.map((w) => wunschKarte(w, 'frei', L)).join('')}</ol>` : '<p class="leer-zeile">Alles ist vergeben.</p>'}</section>`;
}

const gastHref = (L) => (L.id === LISTE.id ? '#gast' : `#gast/${L.id}`);
function seiteGast(id) {
  const L = listeVon(id), g = zustand.gast[L.id];
  const kopf = `<header class="liste-kopf">
      <p class="ueberzeile">${esc(L.besitzer)} wünscht sich</p>
      <h1 class="liste-titel" tabindex="-1">${esc(L.titel)}</h1>`;
  if (!g) {
    return `<article class="seite seite-gast">
      ${kopf}</header>
      <section class="wer" aria-labelledby="wer-titel">
        <h2 class="wer-titel" id="wer-titel">Wer bist du?</h2>
        <ul class="wer-liste">${L.gaeste.map((n, i) => `<li><button class="wer-name" type="button" data-aktion="gast-waehlen" data-gast="${esc(n)}" style="--dreh:${(i % 2 ? 1 : -1) * (0.6 + (i % 3) * 0.3)}deg"><span class="wer-loch" aria-hidden="true"></span>${esc(n)}</button></li>`).join('')}</ul>
      </section>
      <p class="gast-fuss"><a class="knopf-text" href="#liste/${L.id}">Vorschau beenden</a></p>
    </article>`;
  }
  return `<article class="seite seite-gast">
    ${kopf}
      <p class="gast-hallo">Hallo ${esc(g)} <button class="knopf-text" type="button" data-aktion="gast-wechseln">Nicht ${esc(g)}?</button></p>
    </header>
    <div class="gast-wuensche">${gastWuensche(L)}</div>
    <p class="gast-fuss"><a class="knopf-text" href="#liste/${L.id}">Vorschau beenden</a></p>
  </article>`;
}

function seiteListe(id) {
  const L = listeVon(id);
  const zahl = (n) => zustand.res[L.id].filter((r) => r.gast === n).length;
  const anlass = datum(L.anlass).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
  return `<article class="seite seite-liste">
    <header class="liste-kopf">
      <nav class="listen-wechsel" aria-label="Meine Listen">${LISTEN.map((l) => `<a href="#liste/${l.id}" data-liste="${l.id}"${l.id === L.id ? ' aria-current="page"' : ''}>${esc(l.titel)}</a>`).join('')}</nav>
      <h1 class="liste-titel" tabindex="-1">${esc(L.titel)}</h1>
      <p class="liste-unter">${anlass} · ${L.wuensche.length} Wünsche</p>
    </header>
    <div class="liste-oben">
      <ul class="werkzeug">
        <li><button class="werkzeug-zeile" type="button" data-aktion="link-teilen">${ICON.link}<span>Link teilen</span><span class="leise">kopieren</span></button></li>
        <li><a class="werkzeug-zeile" href="${gastHref(L)}">${ICON.auge}<span>So sehen es deine Leute</span>${ICON.weiter}</a></li>
        <li><button class="werkzeug-zeile aus" type="button" disabled>${ICON.schloss}<span>Aufdecken ab ${datumKurz(L.aufdeckenAb).replace(/\.?$/, '.')}</span></button></li>
      </ul>
      <section class="gaeste" aria-labelledby="gaeste-titel">
        <h2 class="abschnitt" id="gaeste-titel">Gäste</h2>
        <ul class="gaeste-liste">${L.gaeste.map((n) => `<li><span>${esc(n)}</span><span class="gast-zahl" aria-label="${zahl(n)} ausgesucht">· ${zahl(n)}</span></li>`).join('')}</ul>
      </section>
    </div>
    <section aria-labelledby="wuensche-titel">
      <h2 class="abschnitt" id="wuensche-titel">Wünsche</h2>
      <ol class="wunsch-liste ich">${L.wuensche.map((wid) => wunschKarte(WUENSCHE.find((w) => w.id === wid), 'ich', L)).join('')}</ol>
    </section>
  </article>`;
}

/* ---------- Anzeigen ---------- */
const main = $('#inhalt');
function zeigen() {
  menueZu();
  const r = route();
  let html;
  switch (r.teil) {
    case 'start': html = seiteStart(); break;
    case 'menschen': html = seiteMenschen(); break;
    case 'suche': html = seiteSuche(); break;
    case 'person': html = seitePerson(r.id); break;
    case 'liste': html = seiteListe(r.id); break;
    case 'gast': html = seiteGast(r.id); break;
    default: location.replace('#person/mia'); return;
  }
  if (!html) return;
  document.body.dataset.seite = r.teil;
  main.innerHTML = html;
  const aktiv = r.teil === 'person' && r.id === 'ich' || r.teil === 'liste' ? 'ich' : r.teil;
  $$('.leiste [data-ziel]').forEach((a) => (a.dataset.ziel === aktiv ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  if (!zustand.neuId && !zustand.springeZu) window.scrollTo(0, 0);
  nachRender();
  if (!zustand.ersteAnzeige && !zustand.neuId) {
    const ziel = r.teil === 'suche' ? $('#suchfeld') : $('[tabindex="-1"]', main);
    ziel?.focus({ preventScroll: true });
  }
  zustand.ersteAnzeige = false;
}

function nachRender() {
  if ($('[data-faden]')) {
    fadenZeichnen();
    beobachter.disconnect();
    beobachter.observe($('[data-faden]'));
    if ($('.seite-person')) beobachter.observe($('.seite-person'));
  }
  if (zustand.neuId) anhaengerAnkommen();
  if (zustand.springeZu) {
    const li = $(`[data-eintrag="${zustand.springeZu}"]`);
    zustand.springeZu = null;
    if (li) { li.scrollIntoView({ block: 'center' }); li.focus({ preventScroll: true }); }
  }
}

/* Personenseite neu zeichnen, ohne dass Bildlauf und Filterreihe springen. */
function personNeu(fokus) {
  const y = scrollY, links = $('.filter')?.scrollLeft || 0;
  main.innerHTML = seitePerson(route().id);
  const f = $('.filter');
  if (f) f.scrollLeft = links;
  nachRender();
  window.scrollTo(0, y);
  if (fokus) $(fokus)?.focus({ preventScroll: true });
}

/* Der Faden: eine weiche, leicht wellige Linie, die genau durch die Jahresknoten läuft. */
let fadenRahmen = 0;
const beobachter = new ResizeObserver(() => { cancelAnimationFrame(fadenRahmen); fadenRahmen = requestAnimationFrame(fadenZeichnen); });
/* Am PC hängen die Anhänger abwechselnd links und rechts und greifen ineinander. Jeder Jahresknoten
 * bekommt eine eigene Zeile unter allem, was vorher hängt; die Anhänger seines Jahres folgen darunter. */
function anhaengerLegen(f) {
  const liste = $('.faden-liste', f);
  const kinder = $$(':scope > li', liste);
  if (!breit()) { liste.classList.remove('gelegt'); liste.style.height = ''; kinder.forEach((li) => (li.style.top = '')); return; }
  liste.classList.add('gelegt');
  const unten = { l: 0, r: 0 };
  let cursor = 0, vorigerOben = null;
  for (const li of kinder) {
    const h = li.offsetHeight;
    let oben;
    if (li.classList.contains('anhaenger')) {
      const seite = li.classList.contains('seite-l') ? 'l' : 'r';
      oben = Math.max(vorigerOben === null ? cursor : vorigerOben + 58, unten[seite] ? unten[seite] + 22 : 0, cursor);
      unten[seite] = oben + h;
      vorigerOben = oben;
    } else {
      const frei = Math.max(unten.l, unten.r);
      oben = frei ? frei + 18 : 0;
      cursor = oben + h + 4;
      vorigerOben = null;
    }
    li.style.top = `${oben}px`;
  }
  liste.style.height = `${Math.max(cursor, unten.l, unten.r)}px`;
}

const schnurPfad = (fx, hx, hy, neu = '') => {
  const mx = (fx + hx) / 2;
  return `<path class="faden-schnur${neu}" pathLength="1" d="M${z(fx)},${z(hy - 2)} Q${z(mx)},${z(hy + 9)} ${z(hx)},${z(hy)}"/><circle class="faden-punkt" cx="${z(fx)}" cy="${z(hy - 2)}" r="2.6"/>`;
};

function fadenZeichnen() {
  const f = $('[data-faden]');
  if (!f) return;
  anhaengerLegen(f);
  const box = f.getBoundingClientRect();
  const W = box.width, H = box.height;
  const schmal = !breit();
  const basis = schmal ? 26 : W / 2;
  const rnd = zufall(f.dataset.faden + (schmal ? 's' : 'b'));
  const A = schmal ? 3.5 : 6;
  const mitte = (el) => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2 - box.left, r.top + r.height / 2 - box.top]; };
  const knoten = $$('.knoten', f).map((k) => mitte(k)[1]);
  const pkt = [[basis + 1, 0]];
  for (let y = 60; y < H - 50; y += 70 + rnd() * 50) {
    if (knoten.some((k) => Math.abs(k - y) < 34)) continue;
    pkt.push([basis + (rnd() * 2 - 1) * A, y]);
  }
  knoten.forEach((k) => pkt.push([basis, k]));
  pkt.push([basis + (schmal ? 3 : -4), H - 18]);
  pkt.sort((a, b) => a[1] - b[1]);
  const seg = segmente(pkt), xBei = abtasten(seg);
  const [ex, ey] = pkt[pkt.length - 1];
  const ende = `M${z(ex)},${z(ey)} c1.5,6 -2,10 -7,11 c-4,1 -6,-2 -4,-4`;
  const hinten = $('.faden-hinten', f), vorn = $('.faden-vorn', f);
  for (const s of [hinten, vorn]) { s.setAttribute('viewBox', `0 0 ${z(W)} ${z(H)}`); s.setAttribute('width', z(W)); s.setAttribute('height', z(H)); }
  hinten.innerHTML = `<path class="faden-linie" d="${pfad(seg)}"/><path class="faden-linie" d="${ende}"/>`;
  vorn.innerHTML = $$('.anhaenger', f).map((li) => {
    const [hx, hy] = mitte($('.loch', li));
    return schnurPfad(xBei(hy), hx, hy, li.dataset.eintrag === zustand.neuId ? ' neu' : '');
  }).join('');
  fadenObenZeichnen(schmal);
}

/* Am Handy kommt der Faden schon aus dem Ausweis und läuft an den Geschenkideen vorbei nach unten. */
function fadenObenZeichnen(schmal) {
  const svg = $('.faden-oben'), seite = $('.seite-person'), oese = $('.ausweis-oese'), f = $('[data-faden]');
  if (!svg || !seite || !oese || !f) return;
  if (!schmal) { svg.innerHTML = ''; svg.setAttribute('height', '0'); return; }
  const sb = seite.getBoundingClientRect(), ob = oese.getBoundingClientRect(), fb = f.getBoundingClientRect();
  const x0 = ob.left + ob.width / 2 - sb.left, y0 = ob.top + ob.height / 2 - sb.top;
  const x1 = fb.left - sb.left + 27, y1 = fb.top - sb.top;
  const W = sb.width, H = y1 + 2;
  svg.setAttribute('viewBox', `0 0 ${z(W)} ${z(H)}`); svg.setAttribute('width', z(W)); svg.setAttribute('height', z(H));
  const rnd = zufall(f.dataset.faden + 'oben');
  const pkt = [[x0, y0], [x0 + 1.5, y0 + 26]];
  for (let y = y0 + 90; y < y1 - 50; y += 80 + rnd() * 40) pkt.push([x1 + (rnd() * 2 - 1) * 3.5, y]);
  pkt.push([x1, y1]);
  const seg = segmente(pkt), xBei = abtasten(seg);
  const schnuere = $$('.ideen .idee .loch', seite).map((l) => {
    const r = l.getBoundingClientRect(), hx = r.left + r.width / 2 - sb.left, hy = r.top + r.height / 2 - sb.top;
    return schnurPfad(xBei(hy), hx, hy);
  }).join('');
  svg.innerHTML = `<path class="faden-linie" d="${pfad(seg)}"/>${schnuere}`;
}

/* ---------- Festhalten ---------- */
const fhArtKnopf = (a, an = false) => `<button class="fh-art art-${a.id}" type="button" role="radio" aria-checked="${an}" data-aktion="fh-art" data-fh-art="${a.id}" aria-label="${esc(a.name)}" title="${esc(a.name)}"><span class="art-zeichen art-${a.id}">${artBild(a.zeichnung)}</span></button>`;
const fhArtNeuKnopf = '<button class="fh-art fh-art-neu" type="button" data-aktion="fh-art-neu" aria-label="Neue Art anlegen" title="Neue Art"><span aria-hidden="true">＋</span><span aria-hidden="true">Art</span></button>';

function festhaltenOeffnen(vorgabe) {
  if (zustand.blatt || route().teil === 'gast') return;
  menueZu();
  const r = route();
  const p = vorgabe || (r.teil === 'person' && person(r.id) ? r.id : null);
  zustand.blatt = { person: p, art: null, suche: '', zurueck: document.activeElement };
  $('#ueber-ort').innerHTML = `<div class="blatt-huelle" data-blatt-huelle>
    <div class="blatt" role="dialog" aria-modal="true" aria-labelledby="blatt-titel">
      <span class="blatt-griff" aria-hidden="true"></span>
      <h2 class="blatt-titel" id="blatt-titel">Festhalten</h2>
      <div class="fh-person"></div>
      <label class="nur-leser" for="fh-text">Ein Satz</label>
      <textarea id="fh-text" rows="3" enterkeyhint="done"></textarea>
      <div class="fh-arten-kopf"><span class="fh-art-name" aria-hidden="true">Art</span></div>
      <div class="fh-arten" role="radiogroup" aria-label="Art (freiwillig)">${zustand.arten.map((a) => fhArtKnopf(a)).join('')}${fhArtNeuKnopf}</div>
      <div class="blatt-fuss">
        <button class="knopf-text" type="button" data-aktion="blatt-zu">Abbrechen</button>
        <button class="knopf" type="button" data-aktion="speichern">Speichern</button>
      </div>
    </div>
  </div>`;
  document.body.classList.add('blatt-offen');
  personWahlZeigen();
  requestAnimationFrame(() => $('[data-blatt-huelle]')?.classList.add('offen'));
  (zustand.blatt.person ? $('#fh-text') : $('#fh-person'))?.focus();
}

function personWahlZeigen(fokus = false) {
  const b = zustand.blatt, ort = $('.fh-person');
  if (!b || !ort) return;
  $('[data-aktion="speichern"]').disabled = !b.person;
  if (b.person) {
    const p = person(b.person);
    ort.innerHTML = `<div class="fh-gewaehlt">${mono(p, 40)}<span class="fh-gewaehlt-name"><span class="leise">Über</span> ${esc(p.ist_ich ? 'mich' : p.rufname)}</span><button class="knopf-text" type="button" data-aktion="fh-person-aendern" aria-label="Person ändern">ändern</button></div>`;
    $('#fh-text').placeholder = p.ist_ich ? 'Ein Satz über mich' : `Ein Satz über ${p.rufname}`;
    if (fokus) $('#fh-text').focus();
  } else {
    ort.innerHTML = `<div class="fh-wahl"><label class="nur-leser" for="fh-person">Über wen?</label><input id="fh-person" type="text" autocomplete="off" enterkeyhint="next" placeholder="Über wen?" value="${esc(b.suche)}"><ul class="fh-vorschlaege" aria-label="Zuletzt"></ul></div>`;
    $('#fh-text').placeholder = 'Ein Satz';
    vorschlaegeZeigen();
    if (fokus) $('#fh-person').focus();
  }
}
function vorschlaege() {
  const s = (zustand.blatt?.suche || '').trim().toLowerCase();
  return zustand.zuletzt.map(person).filter((p) => !s || p.name.toLowerCase().includes(s) || p.rufname.toLowerCase().includes(s)).slice(0, 3);
}
function vorschlaegeZeigen() {
  const ul = $('.fh-vorschlaege');
  if (!ul) return;
  const v = vorschlaege();
  ul.innerHTML = v.length ? v.map((p) => `<li><button class="fh-vorschlag" type="button" data-aktion="fh-person" data-person="${p.id}">${mono(p, 30)}<span>${esc(p.ist_ich ? 'Ich' : p.rufname)}</span></button></li>`).join('') : '<li class="leer-zeile">Niemand gefunden.</li>';
}
function fhArtWaehlen(id) {
  const b = zustand.blatt;
  b.art = id;
  $$('.fh-art[data-fh-art]').forEach((k) => k.setAttribute('aria-checked', String(k.dataset.fhArt === b.art)));
  $('.fh-art-name').textContent = b.art ? artVon(b.art).name : 'Art';
  $('.fh-art-name').classList.toggle('gewaehlt', !!b.art);
}
function fhArtNeuOeffnen(knopf) {
  knopf.outerHTML = '<span class="neue-art-feld"><label class="nur-leser" for="fh-neue-art">Name der neuen Art</label><input id="fh-neue-art" class="neue-art" type="text" maxlength="24" autocomplete="off" enterkeyhint="done" placeholder="Name"></span>';
  const feld = $('#fh-neue-art');
  feld.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  feld.focus();
}
function fhArtNeuFertig(anlegen) {
  const feld = $('#fh-neue-art');
  if (!feld) return;
  const a = anlegen ? artAnlegen(feld.value) : null;
  const huelle = feld.closest('.neue-art-feld');
  if (a && !$(`.fh-art[data-fh-art="${a.id}"]`)) huelle.insertAdjacentHTML('beforebegin', fhArtKnopf(a));
  huelle.outerHTML = fhArtNeuKnopf;
  if (a) {
    fhArtWaehlen(a.id);
    const k = $(`.fh-art[data-fh-art="${a.id}"]`);
    k.scrollIntoView({ inline: 'nearest', block: 'nearest' });
    k.focus();
  } else $('.fh-art-neu')?.focus();
}

function blattZu(zurueck = true) {
  const b = zustand.blatt;
  if (!b) return;
  zustand.blatt = null;
  document.body.classList.remove('blatt-offen');
  const h = $('[data-blatt-huelle]');
  if (h) {
    h.classList.remove('offen');
    h.classList.add('zu');
    setTimeout(() => h.remove(), ruhig() ? 0 : 260);
  }
  if (zurueck && b.zurueck?.isConnected) b.zurueck.focus({ preventScroll: true });
}

function speichern() {
  const b = zustand.blatt;
  if (!b) return;
  const feld = $('#fh-text'), text = feld.value.trim();
  if (!b.person) { $('#fh-person')?.focus(); return; }
  if (!text) { feld.setAttribute('aria-invalid', 'true'); feld.focus(); return; }
  const r = feld.getBoundingClientRect();
  const p = person(b.person);
  let neu;
  if (b.art === 'geschenkidee' && !p.ist_ich) {
    neu = { id: `i${Date.now()}`, person: b.person, titel: text, haendler: '', preis: null, stand: 'idee', anlass: naechsterAnlass(p), zeichnung: null };
    zustand.geschenke.push(neu);
  } else {
    neu = { id: `n${Date.now()}`, person: b.person, art: b.art, datum: HEUTE, text };
    zustand.eintraege.push(neu);
  }
  zustand.zuletzt = [b.person, ...zustand.zuletzt.filter((x) => x !== b.person)];
  const art = b.art;
  const r2 = route();
  const hier = r2.teil === 'person' && r2.id === b.person;
  blattZu(!hier);
  if (hier) {
    if (zustand.filter !== 'alle' && zustand.filter !== art) zustand.filter = 'alle';
    zustand.flugVon = { left: r.left, top: r.top, width: r.width, height: r.height };
    zustand.neuId = neu.id;
    zeigen();
    hinweis(p.ist_ich ? 'Bei dir festgehalten' : `Bei ${esc(p.rufname)} festgehalten`);
  } else {
    hinweis(`Bei <a href="#person/${p.id}">${p.ist_ich ? 'dir' : esc(p.rufname)}</a> festgehalten`, true);
  }
}

function anhaengerAnkommen() {
  const li = $(`[data-eintrag="${zustand.neuId}"]`);
  const von = zustand.flugVon;
  zustand.flugVon = null;
  if (!li) { zustand.neuId = null; return; }
  const r0 = li.getBoundingClientRect();
  if (r0.top < 90 || r0.bottom > innerHeight - 110) window.scrollBy({ top: r0.top - innerHeight * 0.32, behavior: 'instant' });
  fadenZeichnen();
  const r = li.getBoundingClientRect();
  li.classList.add('ankommend');
  const fertig = () => { li.classList.remove('ankommend'); zustand.neuId = null; fadenZeichnen(); li.focus({ preventScroll: true }); };
  if (ruhig() || !von) { li.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240 }).finished.then(fertig, fertig); return; }
  const dx = von.left - r.left, dy = von.top - r.top, s = Math.max(0.7, Math.min(1.15, von.width / r.width));
  li.animate([
    { transform: `translate(${dx}px, ${dy}px) scale(${s})`, opacity: 0.35 },
    { transform: `translate(${dx * 0.18}px, ${dy * 0.1}px) rotate(-5deg)`, opacity: 1, offset: 0.58 },
    { transform: 'rotate(2.2deg)', offset: 0.8 },
    { transform: 'none' },
  ], { duration: 820, easing: 'cubic-bezier(.3,.65,.25,1)' }).finished.then(fertig, fertig);
}

/* Nur die Einträge neu zeichnen; die Filterreihe bleibt, wo sie war, und der aktive Chip im Bild. */
function eintraegeNeu(fokusWahl) {
  const p = person(route().id), sek = $('.eintraege');
  if (!p || !sek) return;
  const links = $('.filter', sek)?.scrollLeft || 0;
  sek.innerHTML = fadenHtml(p);
  const f = $('.filter', sek);
  if (f) f.scrollLeft = links;
  nachRender();
  $('.chip[aria-pressed="true"]', sek)?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  if (fokusWahl) $(fokusWahl)?.focus({ preventScroll: true });
}

/* ---------- Art eines Eintrags ändern: kleine Auswahl klappt im Eintrag selbst auf ---------- */
function artMenue(knopf) {
  const li = knopf.closest('[data-eintrag]');
  if (zustand.menue?.id === li.dataset.eintrag) { menueZu(true); return; }
  menueZu();
  const e = zustand.eintraege.find((x) => x.id === li.dataset.eintrag);
  const wahl = [...zustand.arten, { id: '', name: 'ohne Art', zeichnung: 'frei' }];
  $('.anh-kopf', li).insertAdjacentHTML('afterend', `<div class="art-menue" id="art-menue" role="group" aria-label="Art wählen">${wahl.map((a) => `<button class="art-wahl" type="button" data-aktion="art-setzen" data-art="${a.id}" aria-pressed="${(e.art || '') === a.id}"><span class="art-zeichen art-${a.id || 'ohne'}">${artBild(a.zeichnung)}</span><span>${esc(a.name)}</span></button>`).join('')}<button class="art-wahl art-wahl-neu" type="button" data-aktion="art-neu"><span class="art-plus" aria-hidden="true">＋</span><span>Art</span></button></div>`);
  const m = $('.art-menue', li);
  li.classList.add('menue-offen');
  li.closest('.faden')?.classList.add('menue-offen');
  zustand.menue = { id: e.id, knopf, li };
  knopf.setAttribute('aria-expanded', 'true');
  knopf.setAttribute('aria-controls', 'art-menue');
  fadenZeichnen();
  m.scrollIntoView({ block: 'nearest' });
  ($('[aria-pressed="true"]', m) || $('button', m)).focus({ preventScroll: true });
}
function menueZu(fokus = false) {
  if (!zustand.menue) return;
  const { knopf, li } = zustand.menue;
  zustand.menue = null;
  $('.art-menue')?.remove();
  li?.classList.remove('menue-offen');
  li?.closest('.faden')?.classList.remove('menue-offen');
  knopf.setAttribute('aria-expanded', 'false');
  knopf.removeAttribute('aria-controls');
  if (li?.isConnected) fadenZeichnen();
  if (fokus && knopf.isConnected) knopf.focus({ preventScroll: true });
}
function artSetzen(id) {
  const eid = zustand.menue?.id;
  const e = zustand.eintraege.find((x) => x.id === eid);
  if (!e) return;
  e.art = id || null;
  menueZu();
  eintraegeNeu(`[data-eintrag="${eid}"] [data-aktion="art-menue"]`);
  return e;
}

/* ---------- Wunschliste: Reservieren mit Anhänger und Gleiten ---------- */
function flip(aendern, bewegt) {
  const vorher = new Map($$('[data-wunsch]').map((el) => [el.dataset.wunsch, el.getBoundingClientRect()]));
  aendern();
  const karte = $(`[data-wunsch="${bewegt}"]`);
  if (karte) {
    const b = karte.getBoundingClientRect();
    if (b.top < 70 || b.bottom > innerHeight) window.scrollBy({ top: b.top - 96, behavior: 'instant' });
  }
  if (ruhig()) return Promise.resolve();
  const laeufe = [];
  for (const el of $$('[data-wunsch]')) {
    const a = vorher.get(el.dataset.wunsch), b = el.getBoundingClientRect();
    if (!a) { laeufe.push(el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: 'ease-out' }).finished); continue; }
    const dx = a.left - b.left, dy = a.top - b.top;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
    const sichtbar = (q) => q.bottom > 0 && q.top < innerHeight;
    if (!sichtbar(a) && !sichtbar(b) && el.dataset.wunsch !== bewegt) continue;
    if (el.dataset.wunsch === bewegt) el.classList.add('gleitet');
    laeufe.push(el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 440, easing: 'cubic-bezier(.3,.7,.2,1)' }).finished.finally(() => el.classList.remove('gleitet')));
  }
  return Promise.all(laeufe).catch(() => {});
}
function gastNeu(L, bewegt, fokus) {
  return flip(() => { $('.gast-wuensche').innerHTML = gastWuensche(L); }, bewegt).then(() => {
    const f = fokus && $(`[data-wunsch="${bewegt}"] ${fokus}`);
    (f || $(`[data-wunsch="${bewegt}"] button`) || $('.gast-wuensche button'))?.focus({ preventScroll: true });
  });
}
let beschaeftigt = false;
async function gastHandlung(aktion, karte) {
  if (beschaeftigt) return;
  const L = listeVon(route().id);
  const id = karte.dataset.wunsch, g = zustand.gast[L.id], w = WUENSCHE.find((x) => x.id === id);
  const raus = (artName) => { zustand.res[L.id] = zustand.res[L.id].filter((r) => !(r.wunsch === id && r.gast === g && (!artName || r.art === artName))); };
  const titel = ohneTrenner(w.titel);
  beschaeftigt = true;
  try {
    if (aktion === 'schenke' || aktion === 'dabei') {
      $$('button', karte).forEach((b) => (b.disabled = true));
      if (!ruhig()) {
        $('.wunsch-bild', karte).insertAdjacentHTML('beforeend', schild(true));
        await warte(460);
      }
      zustand.res[L.id].push({ wunsch: id, gast: g, art: aktion === 'schenke' ? 'schenke_ich' : 'bin_dabei' });
      await gastNeu(L, id, aktion === 'schenke' ? '[data-aktion="zuruecknehmen"]' : '[data-aktion="voll"]');
      hinweis(aktion === 'schenke' ? `${esc(titel)} · von dir` : `${esc(titel)} · du bist dabei`);
    } else if (aktion === 'zuruecknehmen') {
      raus('schenke_ich');
      await gastNeu(L, id, '[data-aktion="schenke"]');
      hinweis('Zurückgenommen');
    } else if (aktion === 'voll') {
      zustand.voll[L.id].add(id);
      await gastNeu(L, id, '[data-aktion="doch-nicht"]');
      hinweis('Ist voll');
    } else if (aktion === 'doch-nicht') {
      raus('bin_dabei');
      zustand.voll[L.id].delete(id);
      await gastNeu(L, id, '[data-aktion="dabei"]');
      hinweis('Du bist nicht mehr dabei');
    }
  } finally { beschaeftigt = false; }
}

/* ---------- Ruhige Bestätigung (Text ist schon maskiert; ein Link zur Person ist erlaubt) ---------- */
let hinweisZeit = 0;
function hinweis(html, mitLink = false) {
  const h = $('.hinweis');
  h.innerHTML = html;
  h.classList.toggle('mit-link', mitLink);
  h.classList.add('da');
  clearTimeout(hinweisZeit);
  hinweisZeit = setTimeout(() => h.classList.remove('da', 'mit-link'), mitLink ? 5200 : 2600);
}

/* ---------- Ereignisse ---------- */
document.addEventListener('click', (ev) => {
  if (zustand.menue && !ev.target.closest('.art-menue') && !ev.target.closest('[data-aktion="art-menue"]')) menueZu();
  if (ev.target.matches('[data-blatt-huelle]')) { blattZu(); return; }
  if (ev.target.closest('.hinweis a')) { $('.hinweis').classList.remove('da', 'mit-link'); return; }
  const springe = ev.target.closest('[data-springe]');
  if (springe) zustand.springeZu = springe.dataset.springe;
  const el = ev.target.closest('[data-aktion]');
  if (!el) return;
  const a = el.dataset.aktion;
  switch (a) {
    case 'festhalten': festhaltenOeffnen(el.dataset.person); break;
    case 'filter': zustand.filter = el.dataset.filter; eintraegeNeu(`[data-filter="${el.dataset.filter}"]`); break;
    case 'reihenfolge': zustand.reihenfolge = zustand.reihenfolge === 'neu' ? 'alt' : 'neu'; eintraegeNeu('[data-aktion="reihenfolge"]'); break;
    case 'art-menue': artMenue(el); break;
    case 'art-setzen': {
      const e = artSetzen(el.dataset.art);
      if (e) hinweis(`Art: ${e.art ? esc(artVon(e.art).name) : 'ohne'}`);
      break;
    }
    case 'art-neu': {
      el.outerHTML = '<span class="neue-art-feld im-menue"><label class="nur-leser" for="neue-art">Name der neuen Art</label><input id="neue-art" class="neue-art" type="text" maxlength="24" autocomplete="off" enterkeyhint="done" placeholder="Name der Art"></span>';
      $('#neue-art').focus();
      break;
    }
    case 'stand': {
      const g = zustand.geschenke.find((x) => x.id === el.dataset.idee);
      if (!g) break;
      const i = STAENDE.findIndex(([s]) => s === g.stand);
      g.stand = STAENDE[(i + 1) % STAENDE.length][0];
      personNeu(`[data-aktion="stand"][data-idee="${g.id}"][data-ort="${el.dataset.ort}"]`);
      hinweis(`${esc(g.titel)} · ${standName(g.stand)}`);
      break;
    }
    case 'blatt-zu': blattZu(); break;
    case 'speichern': speichern(); break;
    case 'fh-person': zustand.blatt.person = el.dataset.person; personWahlZeigen(true); break;
    case 'fh-person-aendern': zustand.blatt.person = null; zustand.blatt.suche = ''; personWahlZeigen(true); break;
    case 'fh-art': fhArtWaehlen(zustand.blatt.art === el.dataset.fhArt ? null : el.dataset.fhArt); break;
    case 'fh-art-neu': fhArtNeuOeffnen(el); break;
    case 'gast-waehlen': { const L = listeVon(route().id); zustand.gast[L.id] = el.dataset.gast; gastMerken(L, el.dataset.gast); zeigen(); break; }
    case 'gast-wechseln': { const L = listeVon(route().id); zustand.gast[L.id] = null; gastMerken(L, null); zeigen(); break; }
    case 'schenke': case 'dabei': case 'zuruecknehmen': case 'voll': case 'doch-nicht':
      gastHandlung(a, el.closest('[data-wunsch]')); break;
    case 'link-teilen': {
      const L = listeVon(route().id);
      const link = `https://freundebuch.example/#l/${L.id === 'l1' ? 't9Fq2Lw8xK' : 'm4Rz7Pc2bQ'}`;
      try { navigator.clipboard?.writeText(link).catch(() => {}); } catch { /* Zwischenablage gesperrt */ }
      hinweis(`Link zu ${esc(L.titel)} kopiert`);
      break;
    }
    default: break;
  }
});

document.addEventListener('input', (ev) => {
  if (ev.target.id === 'suchfeld') $('#treffer').innerHTML = treffer(ev.target.value);
  if (ev.target.id === 'fh-person') { zustand.blatt.suche = ev.target.value; vorschlaegeZeigen(); }
  if (ev.target.id === 'fh-text') ev.target.removeAttribute('aria-invalid');
});

document.addEventListener('keydown', (ev) => {
  /* Feld für eine neue Art: Enter legt an, Esc bricht ab. */
  if (ev.target.id === 'neue-art') {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      const neu = artAnlegen(ev.target.value);
      if (!neu) return;
      artSetzen(neu.id);
      hinweis(`Neue Art: ${esc(neu.name)}`);
      return;
    }
    if (ev.key === 'Escape') { ev.preventDefault(); menueZu(true); return; }
    if (ev.key === 'Tab') { menueZu(true); return; }
    return;
  }
  if (ev.target.id === 'fh-neue-art') {
    if (ev.key === 'Enter') { ev.preventDefault(); fhArtNeuFertig(true); return; }
    if (ev.key === 'Escape') { ev.preventDefault(); fhArtNeuFertig(false); return; }
  }
  if (ev.key === 'Escape') {
    if (zustand.menue) { ev.preventDefault(); menueZu(true); return; }
    if (zustand.blatt) { ev.preventDefault(); blattZu(); return; }
  }
  if (zustand.blatt) {
    if (ev.key === 'Enter' && !ev.shiftKey && ev.target.id === 'fh-text') { ev.preventDefault(); speichern(); return; }
    if (ev.key === 'Enter' && ev.target.id === 'fh-person') {
      ev.preventDefault();
      const v = vorschlaege();
      if (v[0]) { zustand.blatt.person = v[0].id; personWahlZeigen(true); }
      return;
    }
    if (ev.key === 'Tab') {
      const fokusbar = $$('.blatt button:not([disabled]), .blatt input, .blatt textarea');
      const [erstes, letztes] = [fokusbar[0], fokusbar[fokusbar.length - 1]];
      if (ev.shiftKey && document.activeElement === erstes) { ev.preventDefault(); letztes.focus(); }
      else if (!ev.shiftKey && document.activeElement === letztes) { ev.preventDefault(); erstes.focus(); }
    }
    return;
  }
  if (zustand.menue && (ev.key === 'ArrowDown' || ev.key === 'ArrowUp')) {
    const k = $$('.art-menue button'), i = k.indexOf(document.activeElement);
    ev.preventDefault();
    k[(i + (ev.key === 'ArrowDown' ? 1 : -1) + k.length) % k.length].focus();
    return;
  }
  if (zustand.menue && ev.key === 'Tab') { menueZu(true); return; }
  if (ev.target.closest('input, textarea, select, [contenteditable="true"]') || ev.metaKey || ev.ctrlKey || ev.altKey) return;
  if (route().teil === 'gast') return;
  if (ev.key === 'n' || ev.key === 'N') { ev.preventDefault(); festhaltenOeffnen(); }
  else if (ev.key === '/') {
    ev.preventDefault();
    if (route().teil === 'suche') $('#suchfeld')?.focus(); else location.hash = '#suche';
  }
});

addEventListener('hashchange', zeigen);
document.fonts?.ready.then(() => fadenZeichnen());
if (!location.hash) history.replaceState(null, '', '#person/mia');
zeigen();
