/* Entwurf „Kärtchen“: dicke, runde Karten in Pastell, jede Art mit eigener Farbe und großem Zeichen.
 * Klickbar, Zustand nur im Speicher (die Gast-Wahl merkt sich das Gerät in localStorage).
 * Alle Inhalte kommen aus ../gemeinsam/daten.js und sind erfunden. */
import {
  HEUTE, ARTEN, PERSONEN, ICH, EINTRAEGE, GESCHENKE, WUENSCHE, LISTEN, RESERVIERUNGEN,
  euro, datumKurz, datumLang, naechsterGeburtstag, person,
} from '../gemeinsam/daten.js';
import { PRODUKT, ART, SCHMUCK } from '../gemeinsam/zeichnungen.js';

/* ---------- kleine Helfer ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ruhig = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const ohneTrenn = (t) => String(t ?? '').replace(/­/g, '');
const norm = (t) => ohneTrenn(t).toLocaleLowerCase('de-DE');
const tagMonat = (iso) => new Date(iso + 'T12:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'long' });
const tagMonatKurz = (d) => d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
const wochentagLang = (d) => d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
const inTagen = (t) => (t === 0 ? 'heute' : t === 1 ? 'morgen' : `in ${t} Tagen`);
const anzeigeName = (p) => (p.ist_ich ? 'Ich' : p.rufname);
const schreibName = (p) => p.name;

/* Farben: jede Art hat ihre eigene, Personen tragen ihre aus den Daten. Eigene Arten sind kreidig mit Stern. */
const ART_FARBE = { mag: 'rose', magnicht: 'sand', interesse: 'salbei', geschichte: 'flieder', erlebnis: 'pfirsich', geschenkidee: 'butter', zitat: 'pistazie' };
const farbeVon = (artId) => ART_FARBE[artId] || 'kreide';
const WUNSCH_FARBEN = ['pfirsich', 'salbei', 'butter', 'rose', 'flieder', 'sand'];
const wunschFarbe = (w) => WUNSCH_FARBEN[WUENSCHE.indexOf(w) % WUNSCH_FARBEN.length];
const STAND = { idee: 'Idee', besorgt: 'besorgt', verschenkt: 'verschenkt' };
const STAND_NACH = { idee: 'besorgt', besorgt: 'verschenkt', verschenkt: 'idee' };
const ALLE_MENSCHEN = [...PERSONEN, ICH];
const LINKS = { l1: 'Qm7xK2pV9wLr4TzA', l2: 'Hb3nW8cZ5tYq2RmE' };
const listeVon = (id) => LISTEN.find((l) => l.id === id) || LISTEN[0];
const wunschVon = (id) => WUENSCHE.find((w) => w.id === id);

/* Weiche Blob-Formen für das Bild einer Person (Anfangsbuchstabe darauf). */
const BLOBS = [
  'M48 24C80 0 146 4 172 42s24 94-10 124-98 36-130 6S-4 102 8 70s18-32 40-46z',
  'M30 56C42 16 98-2 140 14s60 58 50 98-52 82-104 80S2 156 4 118s18-36 26-62z',
  'M112 8c44 6 84 42 80 88s-30 96-84 100S6 168 6 114 22 34 54 18s36-12 58-10z',
  'M96 4c34-2 54 22 76 40s30 60 12 94-58 60-98 56-72-34-80-70 6-64 34-90S70 6 96 4z',
];
function blob(p, groesse = 'm') {
  const n = [...p.id].reduce((a, c) => a + c.charCodeAt(0), 0) % BLOBS.length;
  const name = p.ist_ich ? p.name : p.rufname.replace(/^Oma\s+/, '');
  return `<span class="blob blob-${groesse} f-${p.farbe}" aria-hidden="true"><svg viewBox="0 0 200 200"><path d="${BLOBS[n]}"/></svg><b>${esc(name[0])}</b></span>`;
}
const PFEIL_RUNTER = '<svg class="pfeil" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6.5 8 10l4-3.5"/></svg>';
const PFEIL_RECHTS = '<svg class="pfeil" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5"/></svg>';
const PFEIL_RAUS = '<svg class="pfeil" viewBox="0 0 16 16" aria-hidden="true"><path d="M5.5 10.5 11 5M6.5 4.8H11v4.5"/></svg>';
const SCHLOSS = '<svg class="pfeil" viewBox="0 0 16 16" aria-hidden="true"><rect x="3.5" y="7" width="9" height="6.5" rx="1.8"/><path d="M5.5 7V5.2a2.5 2.5 0 0 1 5 0V7"/></svg>';

/* ---------- Zustand (nur im Speicher) ---------- */
const GAST_SCHLUESSEL = 'freundebuch-kaertchen-gast';
function gastLesen() { try { return localStorage.getItem(GAST_SCHLUESSEL); } catch { return null; } }
function gastMerken(name) {
  try { name ? localStorage.setItem(GAST_SCHLUESSEL, name) : localStorage.removeItem(GAST_SCHLUESSEL); } catch { /* privates Fenster */ }
}
const zustand = {
  eintraege: EINTRAEGE.map((e, i) => ({ ...e, nr: i })),
  arten: ARTEN.map((a) => ({ ...a })),
  geschenke: GESCHENKE.map((g) => ({ ...g })),
  filter: 'alle',
  reihe: 'neu', // neu → alt; „alt“ für die Rede
  aktPerson: null,
  zuletzt: ['mia', 'jonas', 'hilde', 'tom', 'sophie', 'ben', 'ich'],
  // Reservierungen je Liste: RESERVIERUNGEN gehören zu Weihnachten, die zweite Liste bringt ihre eigenen mit.
  reserv: LISTEN.flatMap((l) => (l.id === 'l1' ? RESERVIERUNGEN : l.reservierungen || []).map((r) => ({ ...r, liste: l.id }))),
  voll: new Set(), // Schlüssel „liste:wunsch“
  gast: gastLesen(),
  vorschau: false,
  suche: '',
  neuId: null,
  ziel: null,
  gewechselt: null,
};
const vorn = (id) => { zustand.zuletzt = [id, ...zustand.zuletzt.filter((x) => x !== id)]; };
const artVon = (id) => zustand.arten.find((a) => a.id === id);
const artZeichen = (a) => ART[a.zeichnung] || SCHMUCK[a.zeichnung] || ART.feder;

/* Eigene Art anlegen: gleicher Name (ohne Groß/klein) nimmt die vorhandene. */
function neueArt(roh) {
  const name = roh.trim().replace(/\s+/g, ' ');
  if (!name) return null;
  const da = zustand.arten.find((a) => norm(a.name) === norm(name));
  if (da) return da;
  const a = { id: `eigen${zustand.arten.length}`, name, zeichnung: 'stern', eigene: true };
  zustand.arten.push(a);
  return a;
}

/* Nächster Anlass einer Person (für neue Geschenkideen und „Geschenk fehlt“). */
function anlaesseVon(p) {
  const heute = new Date(HEUTE + 'T12:00');
  const aus = [];
  const b = p.beschenken || ['geburtstag'];
  if (b.includes('geburtstag')) {
    const g = naechsterGeburtstag(p.geburtstag);
    aus.push({ name: 'Geburtstag', jahr: g.datum.getFullYear(), tage: g.tage, datum: g.datum });
  }
  if (b.includes('weihnachten')) {
    let w = new Date(heute.getFullYear(), 11, 24, 12);
    if (w < heute) w = new Date(heute.getFullYear() + 1, 11, 24, 12);
    aus.push({ name: 'Weihnachten', jahr: w.getFullYear(), tage: Math.round((w - heute) / 864e5), datum: w });
  }
  return aus.sort((x, y) => x.tage - y.tage);
}
const naechsterAnlass = (p) => { const a = anlaesseVon(p)[0]; return `${a.name} ${a.jahr}`; };

/* ---------- Wege ---------- */
function weg() {
  const [seite, id] = (location.hash.slice(1) || 'person/mia').split('/');
  return { seite, id };
}
const haupt = $('#haupt');
const gastListe = () => listeVon(weg().id);

function render({ neueSeite = false } = {}) {
  const w = weg();
  if (w.seite !== 'gast') zustand.vorschau = false;
  document.body.dataset.seite = w.seite;
  document.body.classList.toggle('ohne-nav', w.seite === 'gast');
  const aktiv = w.seite === 'person' ? (w.id === 'ich' ? 'ich' : 'menschen') : w.seite === 'liste' ? 'ich' : w.seite;
  $$('.nav [data-ziel]').forEach((a) => (a.dataset.ziel === aktiv ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));

  let titel = 'Freundebuch';
  if (w.seite === 'start') { haupt.innerHTML = startSeite(); titel = 'Start'; }
  else if (w.seite === 'menschen') { haupt.innerHTML = menschenSeite(); titel = 'Menschen'; }
  else if (w.seite === 'suche') { haupt.innerHTML = sucheSeite(); titel = 'Suche'; }
  else if (w.seite === 'liste') { const L = listeVon(w.id); haupt.innerHTML = listeSeite(L); titel = L.titel; }
  else if (w.seite === 'gast') { const L = gastListe(); haupt.innerHTML = gastSeite(); titel = `${L.besitzer} · ${L.titel}`; }
  else {
    const p = person(w.id) || person('mia');
    haupt.innerHTML = personSeite(p);
    titel = schreibName(p);
  }
  document.title = `${titel} · Freundebuch`;

  if (neueSeite) {
    window.scrollTo(0, 0);
    haupt.focus({ preventScroll: true });
  }
  if (w.seite === 'suche') {
    const f = $('#suchfeld');
    if (neueSeite || document.activeElement === document.body) f.focus();
  }
  filterRand();
  nachZeitleiste();
}

/* ---------- Personenseite ---------- */
function personSeite(p) {
  if (zustand.aktPerson !== p.id) { zustand.aktPerson = p.id; zustand.filter = 'alle'; vorn(p.id); }
  const gb = naechsterGeburtstag(p.geburtstag);
  const steck = p.steckbrief.map((s, i) => `<li class="sticker" style="--r:${[-2, 1.5, -1, 2][i % 4]}deg">${esc(s.bez)} <b>${esc(s.wert)}</b></li>`).join('');
  const familie = p.familie.map((f, i) => {
    const r = `style="--r:${[1.5, -2, 1][i % 3]}deg"`;
    return f.person
      ? `<li><a class="sticker sticker-link" ${r} href="#person/${f.person}">${esc(f.name)} <span>${esc(f.art)}</span>${PFEIL_RECHTS}</a></li>`
      : `<li class="sticker" ${r}>${esc(f.name)} <span>${esc(f.art)}</span></li>`;
  }).join('');
  const geschenke = zustand.geschenke.filter((g) => g.person === p.id);

  return `
  <div class="person${p.ist_ich ? ' ist-ich' : ''}">
    <div class="profil">
      <header class="profil-kopf">
        ${blob(p, 'xl')}
        <div class="profil-name">
          <h1>${esc(schreibName(p))}</h1>
          ${p.kennen ? `<p class="kennen"><span class="mini">kennen uns aus</span>${esc(p.kennen)}</p>` : ''}
        </div>
      </header>

      <div class="geb-karte f-butter">
        <span class="geb-zeichen" aria-hidden="true">${SCHMUCK.kuchen}</span>
        <p class="geb-datum"><span class="mini">Geburtstag</span><b>${tagMonat(p.geburtstag)}</b></p>
        <p class="geb-alter">wird ${gb.alter}</p>
        <p class="geb-bald">${inTagen(gb.tage)}</p>
      </div>

      ${steck ? `<h2 class="mini">Steckbrief</h2><ul class="sticker-wolke">${steck}</ul>` : ''}
      ${familie ? `<h2 class="mini">Familie</h2><ul class="sticker-wolke">${familie}</ul>` : ''}

      ${p.ist_ich ? ichBereich() : ''}
      ${geschenke.length ? `
        <section class="geschenke" id="geschenke" aria-labelledby="h-geschenke">
          <h2 id="h-geschenke" class="abschnitt">Geschenkideen <span class="zahl">${geschenke.length}</span></h2>
          <ul class="geschenk-liste">${geschenke.map(geschenkKarte).join('')}</ul>
        </section>` : ''}
    </div>

    <section class="eintraege" id="zeitleiste-bereich" aria-label="Einträge">${zeitleisteHtml(p)}</section>
  </div>`;
}

/* Eine Geschenkidee. Der Stand schaltet per Tipp weiter: Idee → besorgt → verschenkt → Idee. */
function geschenkKarte(g, i) {
  const unter = [g.haendler && esc(g.haendler), g.preis && `<span class="ganz">${euro(g.preis)}</span>`].filter(Boolean).join(' · ');
  return `<li class="geschenk f-butter stand-${g.stand}${g.id === zustand.neuId ? ' ist-neu' : ''}" data-geschenk="${g.id}" style="--dreh:${[-1, 0.8, -0.5][i % 3]}deg">
    <span class="teller">${PRODUKT[g.zeichnung] || ART.geschenk}</span>
    <div class="geschenk-text">
      <b>${esc(g.titel)}</b>
      ${unter ? `<span class="leise">${unter}</span>` : ''}
    </div>
    <div class="geschenk-fuss">
      <span class="anlass">${esc(g.anlass)}</span>
      <button type="button" class="stand-knopf" data-stand="${g.id}" aria-label="Stand: ${STAND[g.stand]}, weiterschalten"><span class="stempel">${STAND[g.stand]}</span></button>
    </div>
  </li>`;
}

function ichBereich() {
  return `
    <div class="geteilt-karte">
      <span class="geteilt-schleife" aria-hidden="true">${SCHMUCK.schleife}</span>
      <h2 class="mini">Geteilt als</h2>
      <ul class="geteilt-listen">${LISTEN.map((l) => `
        <li><a class="geteilt-liste" href="#liste/${l.id}" data-liste="${l.id}">
          <b>${esc(l.titel)}</b>
          <span class="geteilt-mehr">${l.wuensche.length} Wünsche ${PFEIL_RECHTS}</span>
        </a></li>`).join('')}
      </ul>
    </div>
    <section class="brauche" aria-labelledby="h-brauche">
      <h2 id="h-brauche" class="abschnitt">Was ich brauche</h2>
      <ul class="brauche-liste">${WUENSCHE.map((w) => `
        <li class="brauche-zeile f-${wunschFarbe(w)}">
          <span class="teller klein">${PRODUKT[w.zeichnung]}</span>
          <span class="brauche-text"><b>${esc(w.titel)}</b><span class="leise">${euro(w.preis)} · Stand ${datumKurz(w.stand)}</span></span>
        </li>`).join('')}
      </ul>
    </section>`;
}

/* Zeitleiste: Filterreihe, Umschalter und der Stapel farbiger Karten, nach Jahren gruppiert. */
function zeitleisteHtml(p) {
  const alle = zustand.eintraege.filter((e) => e.person === p.id);
  const ideen = zustand.geschenke.filter((g) => g.person === p.id);
  const f = zustand.filter;
  // Geschenkideen sind Einträge der Art Geschenkidee: der Chip zählt die Ideen mit.
  const zahl = (id) => alle.filter((e) => e.art === id).length + (id === 'geschenkidee' ? ideen.length : 0);
  const chips = [`<button type="button" class="chip chip-alle" aria-pressed="${f === 'alle'}" data-filter="alle">alle<span class="zahl">${alle.length}</span></button>`]
    .concat(zustand.arten.map((a) => `<button type="button" class="chip f-${farbeVon(a.id)}" aria-pressed="${f === a.id}" data-filter="${a.id}"><span class="chip-zeichen">${artZeichen(a)}</span>${esc(a.name)}<span class="zahl">${zahl(a.id)}</span></button>`))
    .join('');

  const liste = (f === 'alle' ? alle : alle.filter((e) => e.art === f))
    .sort((a, b) => (a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : a.nr - b.nr));
  if (zustand.reihe === 'neu') liste.reverse();

  let stapel = '';
  if (f === 'geschenkidee' && ideen.length) {
    stapel += `<div class="jahr-gruppe"><h3 class="jahr jahr-wort">Ideen</h3><ul class="geschenk-liste in-zeitleiste">${ideen.map(geschenkKarte).join('')}</ul></div>`;
  }
  let jahr = null;
  liste.forEach((e, i) => {
    const j = e.datum.slice(0, 4);
    if (j !== jahr) {
      if (jahr) stapel += '</ol></div>';
      stapel += `<div class="jahr-gruppe"><h3 class="jahr">${j}</h3><ol class="stapel">`;
      jahr = j;
    }
    stapel += eintragKarte(e, i);
  });
  if (jahr) stapel += '</ol></div>';

  const reiheText = zustand.reihe === 'neu' ? 'neu → alt' : 'alt → neu';
  return `
    <div class="eintraege-kopf">
      <h2 class="abschnitt">Einträge</h2>
      <button type="button" class="leise-knopf" data-reihe aria-label="Reihenfolge: ${reiheText}, umschalten">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 3.5v13M3 13.5l3 3 3-3M14 16.5v-13M11 6.5l3-3 3 3"/></svg>${reiheText}
      </button>
    </div>
    <div class="filter" role="group" aria-label="Nach Art filtern">${chips}</div>
    ${stapel || '<p class="leer">Hier steht noch nichts.</p>'}`;
}

function eintragKarte(e, i) {
  const a = e.art ? artVon(e.art) : null;
  const klassen = ['eintrag', `f-${farbeVon(e.art)}`];
  if (!a) klassen.push('ohne-art');
  if (e.id === zustand.neuId) klassen.push('ist-neu');
  if (e.id === zustand.gewechselt) klassen.push('gewechselt');
  return `<li class="${klassen.join(' ')}" data-eintrag="${e.id}" style="--dreh:${[-0.7, 0.6, -0.3, 0.8][i % 4]}deg">
    ${a ? `<span class="eintrag-zeichen" aria-hidden="true">${artZeichen(a)}</span><span class="platz" aria-hidden="true"></span>` : ''}
    <button type="button" class="art-knopf" data-art-wahl="${e.id}" aria-haspopup="true" aria-label="${a ? `Art: ${esc(a.name)}, ändern` : 'Art wählen'}">
      <span>${a ? esc(a.name) : 'Art wählen'}</span>${PFEIL_RUNTER}
    </button>
    <p class="eintrag-text">${esc(e.text)}</p>
    <time datetime="${e.datum}">${datumLang(e.datum)}</time>
  </li>`;
}

/* Die Personenseite neu zeichnen, ohne dass die Filterreihe an den Anfang springt. */
function zeichnePerson(fokus) {
  const reiheAlt = $('.filter')?.scrollLeft ?? 0;
  const p = person(weg().id) || person('mia');
  haupt.innerHTML = personSeite(p);
  const reihe = $('.filter');
  if (reihe) reihe.scrollLeft = reiheAlt;
  if (fokus) ($(fokus) || $('.filter [aria-pressed="true"]'))?.focus({ preventScroll: true });
  $('.filter [aria-pressed="true"]')?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  filterRand();
  nachZeitleiste();
}

/* Filterreihe: weicher Rand an der Seite, an der noch Chips stehen. */
function filterRand() {
  const r = $('.filter');
  if (!r) return;
  r.classList.toggle('kann-links', r.scrollLeft > 2);
  r.classList.toggle('kann-rechts', r.scrollLeft + r.clientWidth < r.scrollWidth - 2);
}
document.addEventListener('scroll', (ev) => { if (ev.target.classList?.contains('filter')) filterRand(); }, { capture: true, passive: true });
addEventListener('resize', filterRand);

function nachZeitleiste() {
  const ziel = zustand.neuId || zustand.ziel;
  if (ziel) {
    const el = $(`[data-eintrag="${ziel}"]`) || $(`#geschenke [data-geschenk="${ziel}"]`);
    if (el) {
      el.scrollIntoView({ block: 'center', behavior: ruhig() ? 'auto' : 'smooth' });
      if (zustand.ziel) el.classList.add('blinkt');
    }
  }
  zustand.neuId = null;
  zustand.ziel = null;
  zustand.gewechselt = null;
}

/* ---------- Start ---------- */
/* Für wen fehlt noch ein Geschenk (Anlass in den nächsten 45 Tagen, nichts besorgt), je Person eine Zeile. */
function geschenkFehlt() {
  const aus = [];
  for (const p of PERSONEN) {
    const offen = anlaesseVon(p).filter((a) => a.tage <= 45).map((a) => {
      const gs = zustand.geschenke.filter((g) => g.person === p.id && g.anlass === `${a.name} ${a.jahr}`);
      return gs.some((g) => g.stand !== 'idee') ? null : { ...a, idee: gs.length > 0 };
    }).filter(Boolean);
    if (offen.length) aus.push({ p, offen, tage: offen[0].tage, idee: offen.some((a) => a.idee) });
  }
  return aus.sort((a, b) => a.tage - b.tage);
}

function startSeite() {
  const reihe = PERSONEN.map((p) => ({ p, ...naechsterGeburtstag(p.geburtstag) })).sort((a, b) => a.tage - b.tage);
  const [erster, ...rest] = reihe;
  const fehlt = geschenkFehlt();
  const ersterOffen = fehlt.find((f) => f.p.id === erster.p.id)?.offen.find((a) => a.name === 'Geburtstag');
  const ersterIdee = ersterOffen && zustand.geschenke.find((g) => g.person === erster.p.id && g.anlass === `Geburtstag ${ersterOffen.jahr}`);
  const heute = new Date(HEUTE + 'T12:00');

  return `
  <div class="start">
    <p class="heute">${wochentagLang(heute)}</p>
    <h1 class="vh">Start</h1>
    <a class="blickfang f-${erster.p.farbe}" href="#person/${erster.p.id}">
      <span class="blickfang-zeichen" aria-hidden="true">${SCHMUCK.kuchen}</span>
      ${blob(erster.p, 'xl')}
      <span class="blickfang-text">
        <span class="blickfang-gross">${esc(erster.p.rufname)} wird ${erster.alter}</span>
        <span class="blickfang-wann"><b>${inTagen(erster.tage)}</b><span>${wochentagLang(erster.datum)}</span></span>
        ${ersterOffen ? `<span class="blickfang-fehlt"><span class="sticker klein">noch kein Geschenk</span>${ersterIdee ? `<span class="blickfang-idee">Idee: ${esc(ersterIdee.titel)}</span>` : ''}</span>` : ''}
      </span>
    </a>

    <div class="start-spalten">
      <section aria-labelledby="h-bald">
        <h2 id="h-bald" class="abschnitt">Bald</h2>
        <ul class="ruhig-liste">${rest.slice(0, 3).map((r) => `
          <li><a class="ruhig-zeile" href="#person/${r.p.id}">
            ${blob(r.p, 'm')}
            <span class="ruhig-text"><b>${esc(r.p.rufname)}</b><span>${tagMonat(r.p.geburtstag)} · wird ${r.alter}</span></span>
            <span class="ruhig-wert">${inTagen(r.tage)}</span>
          </a></li>`).join('')}
        </ul>
      </section>
      <section aria-labelledby="h-fehlt">
        <h2 id="h-fehlt" class="abschnitt">Geschenk fehlt</h2>
        <ul class="ruhig-liste">${fehlt.map((f) => `
          <li><a class="ruhig-zeile" href="#person/${f.p.id}">
            ${blob(f.p, 'm')}
            <span class="ruhig-text"><b>${esc(f.p.rufname)}</b><span>${f.offen.length > 1 ? f.offen.map((a) => a.name).join(' · ') : `${f.offen[0].name} ${tagMonatKurz(f.offen[0].datum)}`}</span></span>
            <span class="ruhig-wert${f.idee ? ' hat-idee' : ' offen'}">${f.idee ? 'Idee da' : 'offen'}</span>
          </a></li>`).join('')}
        </ul>
      </section>
    </div>
  </div>`;
}

/* ---------- Menschen ---------- */
function menschenSeite() {
  const liste = [...PERSONEN].sort((a, b) => a.rufname.localeCompare(b.rufname, 'de'));
  return `
  <div class="menschen">
    <h1 class="seiten-titel">Menschen</h1>
    <ul class="menschen-liste">${liste.map((p, i) => {
      const g = naechsterGeburtstag(p.geburtstag);
      return `<li><a class="mensch f-${p.farbe}" href="#person/${p.id}" style="--dreh:${[-1, 0.8, -0.5, 1.1][i % 4]}deg">
        ${blob(p, 'l')}
        <span class="mensch-text"><b>${esc(p.rufname)}</b><span>${tagMonat(p.geburtstag)} · ${inTagen(g.tage)}</span></span>
        ${PFEIL_RECHTS}
      </a></li>`;
    }).join('')}
    </ul>
  </div>`;
}

/* ---------- Suche ---------- */
/* Hebt den Suchbegriff hervor; weiche Trennzeichen fallen vorher weg, damit „Geräuschunterdrückung“ gefunden wird. */
function markiere(roh, q) {
  const text = ohneTrenn(roh);
  if (!q) return esc(text);
  const re = new RegExp(ohneTrenn(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  let aus = '';
  let i = 0;
  for (const m of text.matchAll(re)) {
    aus += esc(text.slice(i, m.index)) + '<mark>' + esc(m[0]) + '</mark>';
    i = m.index + m[0].length;
  }
  return aus + esc(text.slice(i));
}

function sucheSeite() {
  return `
  <div class="suche">
    <h1 class="vh">Suche</h1>
    <div class="suchfeld">
      <svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="14" cy="14" r="8"/><path d="m20 20 6.5 6.5"/></svg>
      <label class="vh" for="suchfeld">Suchen</label>
      <input id="suchfeld" type="search" value="${esc(zustand.suche)}" placeholder="Name, Satz, Geschenk" autocomplete="off" spellcheck="false" enterkeyhint="search">
    </div>
    <div id="treffer" class="treffer" aria-live="polite">${trefferHtml(zustand.suche)}</div>
  </div>`;
}

function trefferHtml(roh) {
  const q = ohneTrenn(roh).trim();
  if (!q) return '';
  const n = norm(q);
  const hat = (t) => !!t && norm(t).includes(n);

  const menschen = ALLE_MENSCHEN.map((p) => {
    const felder = [
      [p.name, ''], [p.kennen, 'kennen uns aus'],
      ...p.steckbrief.map((s) => [`${s.bez} ${s.wert}`, 'Steckbrief']),
      ...p.familie.map((f) => [`${f.name} · ${f.art}`, 'Familie']),
    ];
    const fund = felder.find(([t]) => hat(t));
    return fund ? { p, fund } : null;
  }).filter(Boolean);
  const eintraege = zustand.eintraege.filter((e) => hat(e.text));
  const geschenke = zustand.geschenke.filter((g) => hat(g.titel) || hat(g.haendler) || hat(g.anlass));
  const wuensche = WUENSCHE.filter((w) => hat(w.titel) || hat(w.beschreibung) || hat(w.haendler));

  if (!menschen.length && !eintraege.length && !geschenke.length && !wuensche.length) return `<p class="leer">Nichts zu „${esc(q)}“.</p>`;

  let html = '';
  if (menschen.length) {
    html += `<section><h2 class="abschnitt">Menschen <span class="zahl">${menschen.length}</span></h2><ul class="treffer-liste">${menschen.map(({ p, fund }) => `
      <li><a class="treffer-mensch f-${p.farbe}" href="#person/${p.id}">${blob(p, 's')}
        <span><b>${markiere(schreibName(p), q)}</b>${fund[1] ? `<span class="leise">${fund[1]}: ${markiere(fund[0], q)}</span>` : ''}</span></a></li>`).join('')}</ul></section>`;
  }
  if (eintraege.length) {
    html += `<section><h2 class="abschnitt">Einträge <span class="zahl">${eintraege.length}</span></h2><ul class="treffer-liste">${eintraege.map((e) => {
      const p = person(e.person);
      const a = e.art ? artVon(e.art) : null;
      return `<li><a class="treffer-eintrag f-${farbeVon(e.art)}" href="#person/${p.id}" data-zum-eintrag="${e.id}">
        <span class="treffer-kopf"><b>${esc(anzeigeName(p))}</b><span>${a ? esc(a.name) : 'ohne Art'} · ${datumLang(e.datum)}</span></span>
        <span class="treffer-text">${markiere(e.text, q)}</span></a></li>`;
    }).join('')}</ul></section>`;
  }
  if (geschenke.length) {
    html += `<section><h2 class="abschnitt">Geschenkideen <span class="zahl">${geschenke.length}</span></h2><ul class="treffer-liste">${geschenke.map((g) => {
      const p = person(g.person);
      return `<li><a class="treffer-geschenk f-butter" href="#person/${p.id}">
        <span class="teller klein">${PRODUKT[g.zeichnung] || ART.geschenk}</span>
        <span><b>${markiere(g.titel, q)}</b><span class="leise">${esc(anzeigeName(p))} · ${markiere(g.anlass, q)} · ${STAND[g.stand]}</span></span></a></li>`;
    }).join('')}</ul></section>`;
  }
  if (wuensche.length) {
    html += `<section><h2 class="abschnitt">Meine Wünsche <span class="zahl">${wuensche.length}</span></h2><ul class="treffer-liste">${wuensche.map((w) => `
      <li><a class="treffer-geschenk f-${wunschFarbe(w)}" href="#liste">
        <span class="teller klein">${PRODUKT[w.zeichnung]}</span>
        <span><b>${markiere(w.titel, q)}</b><span class="leise">${markiere(w.haendler, q)} · ${euro(w.preis)}</span></span></a></li>`).join('')}</ul></section>`;
  }
  return html;
}

/* ---------- Wunschliste: meine Ansicht (ohne jeden Reservierungsstand) ---------- */
function listeSeite(L) {
  const zaehl = L.gaeste.map((g) => [g, zustand.reserv.filter((r) => r.liste === L.id && r.gast === g).length]);
  const wuensche = L.wuensche.map(wunschVon);
  return `
  <div class="liste-ich">
    <div class="liste-seite">
      <header class="liste-kopf">
        <a class="zurueck-link" href="#person/ich">${PFEIL_RECHTS}<span>Meine Seite</span></a>
        <h1>${esc(L.titel)}</h1>
        <p class="leise">${wuensche.length} Wünsche · ${datumLang(L.anlass)}</p>
        <nav class="listen-wechsel" aria-label="Meine Listen">${LISTEN.map((l) => `<a href="#liste/${l.id}" data-liste="${l.id}"${l.id === L.id ? ' aria-current="page"' : ''}>${esc(l.titel)}</a>`).join('')}</nav>
      </header>
      <div class="teilen-karte">
        <span class="teilen-schleife" aria-hidden="true">${SCHMUCK.schleife}</span>
        <button type="button" class="knopf haupt" data-link-kopieren="${L.id}">
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8.5 11.5a3.2 3.2 0 0 0 4.6 0l2.6-2.6a3.2 3.2 0 0 0-4.6-4.6l-.9.9"/><path d="M11.5 8.5a3.2 3.2 0 0 0-4.6 0l-2.6 2.6a3.2 3.2 0 0 0 4.6 4.6l.9-.9"/></svg>
          <span>Link teilen</span>
        </button>
        <h2 class="mini">Gäste</h2>
        <ul class="sticker-wolke gaeste">${zaehl.map(([g, z], i) => `<li class="sticker${z ? '' : ' null'}" style="--r:${[-1.5, 1, -0.5, 1.8, -1.2, 0.6][i % 6]}deg">${esc(g)} · <b>${z}</b></li>`).join('')}</ul>
        <a class="zeilen-knopf" href="#gast${L.id === 'l1' ? '' : '/' + L.id}" data-vorschau>So sehen es deine Leute ${PFEIL_RECHTS}</a>
        <button type="button" class="zeilen-knopf aus" disabled>${SCHLOSS} Aufdecken ab ${datumKurz(L.aufdeckenAb)}</button>
      </div>
    </div>
    <ul class="wunsch-liste ich-liste">${wuensche.map((w) => wunschKarte(w, 'ich', L)).join('')}</ul>
  </div>`;
}

/* ---------- Wunschliste: Gast ---------- */
const reservVon = (L, w) => zustand.reserv.filter((r) => r.liste === L.id && r.wunsch === w.id);
const vollSchluessel = (L, id) => `${L.id}:${id}`;
function gastStand(w, L) {
  const rs = reservVon(L, w);
  const mein = rs.find((r) => r.gast === zustand.gast);
  if (mein) return mein.art === 'schenke_ich' ? 'mein' : 'dabei';
  if (rs.some((r) => r.art === 'schenke_ich')) return 'weg';
  if (zustand.voll.has(vollSchluessel(L, w.id))) return 'weg';
  return 'frei';
}
const andereDabei = (w, L) => reservVon(L, w).filter((r) => r.art === 'bin_dabei' && r.gast !== zustand.gast).map((r) => r.gast);
function namenReihe(namen) {
  if (namen.length <= 1) return namen.join('');
  return namen.slice(0, -1).join(', ') + ' und ' + namen.at(-1);
}

function werBistDu(L) {
  return `
  <div class="wer">
    <p class="fuer"><span class="mini">Wunschliste</span>${esc(L.besitzer)} · ${esc(L.titel)}</p>
    <h1>Wer bist du?</h1>
    <ul class="wer-namen">${L.gaeste.map((g, i) => `
      <li><button type="button" class="wer-name f-${WUNSCH_FARBEN[i % WUNSCH_FARBEN.length]}" data-gast="${esc(g)}" style="--dreh:${[-1.5, 1.2, 0.8, -1, 1.4, -0.6][i % 6]}deg">
        ${blob({ id: g, rufname: g, farbe: WUNSCH_FARBEN[i % WUNSCH_FARBEN.length] }, 'm')}<span>${esc(g)}</span>
      </button></li>`).join('')}
    </ul>
  </div>`;
}

function gastSeite() {
  const L = gastListe();
  if (!zustand.gast || !L.gaeste.includes(zustand.gast)) return werBistDu(L) + vorschauKnopf(L);
  const wuensche = L.wuensche.map(wunschVon);
  const vonDir = wuensche.filter((w) => ['mein', 'dabei'].includes(gastStand(w, L)));
  const frei = wuensche.filter((w) => gastStand(w, L) === 'frei');
  const g = zustand.gast;
  return `
  <div class="gast">
    <header class="gast-kopf">
      <p class="fuer">${esc(L.besitzer)} wünscht sich</p>
      <h1>${esc(L.titel)}</h1>
      <p class="hallo">${blob({ id: g, rufname: g, farbe: 'flieder' }, 's')}<span>Hallo ${esc(g)}</span>
        <button type="button" class="text-knopf" data-gast-wechsel>Nicht ${esc(g)}?</button></p>
    </header>
    ${vonDir.length ? `
    <section class="von-dir" aria-labelledby="h-von-dir">
      <h2 id="h-von-dir" class="abschnitt">Von dir <span class="zahl">${vonDir.length}</span></h2>
      <ul class="wunsch-liste">${vonDir.map((w) => wunschKarte(w, gastStand(w, L), L)).join('')}</ul>
    </section>` : ''}
    <section aria-labelledby="h-frei">
      <h2 id="h-frei" class="abschnitt">Noch frei <span class="zahl">${frei.length}</span></h2>
      ${frei.length ? `<ul class="wunsch-liste">${frei.map((w) => wunschKarte(w, 'frei', L)).join('')}</ul>` : '<p class="leer">Alles vergeben.</p>'}
    </section>
  </div>${vorschauKnopf(L)}`;
}
const vorschauKnopf = (L) => (zustand.vorschau ? `<a class="vorschau-knopf" href="#liste/${L.id}">${PFEIL_RECHTS}<span>Zurück zu meiner Liste</span></a>` : '');

/* Eine Wunschkarte. modus: 'ich' (meine Ansicht), 'frei', 'mein' (von dir), 'dabei' (zusammenlegen, ich bin dabei).
 * Bild und Titel führen mit einem Klick zum Shop. */
function wunschKarte(w, modus, L) {
  const zumShop = `href="${esc(w.url)}" target="_blank" rel="noopener noreferrer"`;
  const shop = `<a class="knopf zweit shop" ${zumShop} aria-label="Zum Shop: ${esc(w.haendler)}">Shop ${PFEIL_RAUS}</a>`;
  const andere = andereDabei(w, L);
  const voll = zustand.voll.has(vollSchluessel(L, w.id));
  let zusammen = '';
  if (w.zusammenlegen && modus !== 'ich') {
    const wer = modus === 'dabei' ? `${namenReihe([...andere, 'du'])} ${andere.length ? 'seid' : 'bist'} dabei`
      : andere.length ? `${namenReihe(andere)} ${andere.length > 1 ? 'sind' : 'ist'} dabei` : 'noch niemand dabei';
    zusammen = `<p class="zusammen"><span class="zusammen-zeichen" aria-hidden="true">${ART.herz}</span><span><b>Zusammenlegen</b> · ${wer}</span></p>`;
  } else if (w.zusammenlegen) {
    zusammen = `<p class="zusammen"><span class="zusammen-zeichen" aria-hidden="true">${ART.herz}</span><span><b>Zusammenlegen</b></span></p>`;
  }

  let knoepfe = '';
  if (modus === 'frei') {
    knoepfe = w.zusammenlegen
      ? `${shop}<button type="button" class="knopf haupt" data-dabei="${w.id}">Ich bin dabei</button>`
      : `${shop}<button type="button" class="knopf haupt" data-schenke="${w.id}">Das schenke ich</button>`;
  } else if (modus === 'mein') {
    knoepfe = `${shop}<button type="button" class="knopf zweit" data-zuruecknehmen="${w.id}">Zurücknehmen</button>`;
  } else if (modus === 'dabei') {
    knoepfe = `${shop}<button type="button" class="knopf zweit${voll ? ' ist-voll' : ''}" data-voll="${w.id}" aria-pressed="${voll}">Ist voll</button><button type="button" class="knopf zweit" data-doch-nicht="${w.id}">Doch nicht</button>`;
  }

  const vonDir = modus === 'mein' || modus === 'dabei';
  return `<li class="wunsch f-${wunschFarbe(w)}${vonDir ? ' ist-von-dir' : ''}" data-wunsch="${w.id}">
    <div class="wende">
      <div class="vorn">
        ${vonDir ? `<span class="von-dir-marke"><span aria-hidden="true">${SCHMUCK.schleife}</span>${modus === 'dabei' && voll ? 'voll' : 'Von dir'}</span>` : ''}
        <a class="teller" ${zumShop} tabindex="-1" aria-hidden="true"><span class="produkt">${PRODUKT[w.zeichnung]}</span></a>
        <div class="wunsch-text">
          <h3><a class="titel-link" ${zumShop}>${esc(w.titel)}</a></h3>
          <p class="beschr">${esc(w.beschreibung)}</p>
          <p class="preis"><b>${euro(w.preis)}</b> · Stand ${datumKurz(w.stand)}</p>
          ${modus === 'ich'
            ? `<a class="haendler haendler-link" ${zumShop} aria-label="Zum Shop: ${esc(w.haendler)}">${esc(w.haendler)} ${PFEIL_RAUS}</a>`
            : `<p class="haendler">${esc(w.haendler)}</p>`}
        </div>
        ${zusammen}
        ${knoepfe ? `<div class="knoepfe">${knoepfe}</div>` : ''}
      </div>
    </div>
  </li>`;
}

/* ---------- Reservieren: Karte dreht sich, zeigt „Von dir“ und rutscht nach oben ---------- */
const lage = () => new Map($$('[data-wunsch]').map((el) => [el.dataset.wunsch, el.getBoundingClientRect()]));
function gleiten(vorher, hauptId) {
  const el = $(`[data-wunsch="${hauptId}"]`);
  if (ruhig()) { el?.scrollIntoView({ block: 'nearest' }); return; }
  // Ziel der Hauptkarte vor den Animationen bestimmen (ohne Transform).
  let scrollZiel = null;
  if (el) {
    const r = el.getBoundingClientRect();
    if (r.top < 16 || r.bottom > innerHeight - 16) scrollZiel = Math.max(0, scrollY + r.top - 96);
  }
  for (const li of $$('[data-wunsch]')) {
    const alt = vorher.get(li.dataset.wunsch);
    if (!alt) { li.animate([{ opacity: 0, transform: 'scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: 'ease-out' }); continue; }
    const neu = li.getBoundingClientRect();
    const dx = alt.left - neu.left;
    const dy = alt.top - neu.top;
    if (Math.abs(dx) + Math.abs(dy) < 1) continue;
    const istHaupt = li.dataset.wunsch === hauptId;
    li.animate(
      istHaupt
        ? [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: `translate(${dx * 0.4}px, ${dy * 0.4}px) scale(1.02)`, offset: 0.55 }, { transform: 'none' }]
        : [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
      { duration: istHaupt ? 420 : 360, easing: 'cubic-bezier(.3,.75,.25,1)' },
    );
  }
  if (scrollZiel !== null) window.scrollTo({ top: scrollZiel, behavior: 'smooth' });
}

async function schenke(id) {
  const L = gastListe();
  const w = wunschVon(id);
  const li = $(`[data-wunsch="${id}"]`);
  if (!li || li.classList.contains('dreht')) return;
  if (!ruhig()) {
    const wende = $('.wende', li);
    wende.insertAdjacentHTML('beforeend', `<div class="rueck" aria-hidden="true"><span class="rueck-schleife">${SCHMUCK.schleife}</span><b>Von dir</b><span>${esc(ohneTrenn(w.titel))}</span></div>`);
    li.classList.add('dreht');
    await wende.animate(
      [{ transform: 'rotateY(0)' }, { transform: 'rotateY(100deg) scale(1.03)', offset: 0.5 }, { transform: 'rotateY(180deg)' }],
      { duration: 460, easing: 'cubic-bezier(.4,.1,.25,1)', fill: 'forwards' },
    ).finished;
  }
  const vorher = lage();
  zustand.reserv.push({ liste: L.id, wunsch: id, gast: zustand.gast, art: 'schenke_ich' });
  haupt.innerHTML = gastSeite();
  gleiten(vorher, id);
  $(`[data-zuruecknehmen="${id}"]`)?.focus({ preventScroll: true });
  melde(`${ohneTrenn(w.titel)} · von dir`);
}

function gastAendern(id, aenderung, fokus) {
  const vorher = lage();
  aenderung(gastListe());
  haupt.innerHTML = gastSeite();
  gleiten(vorher, id);
  ($(fokus) || $(`[data-wunsch="${id}"] .knopf.haupt`) || $(`[data-wunsch="${id}"] .knopf`))?.focus({ preventScroll: true });
}
const ohneMich = (L, id) => { zustand.reserv = zustand.reserv.filter((r) => !(r.liste === L.id && r.wunsch === id && r.gast === zustand.gast)); };

/* ---------- Festhalten ---------- */
const dlg = $('#festhalten');
const fh = { person: null, art: null, suche: '' };

function fhPersonenZeichnen() {
  const box = $('#fh-personen');
  let kandidaten;
  if (fh.suche.trim()) {
    const n = norm(fh.suche.trim());
    kandidaten = ALLE_MENSCHEN.filter((p) => norm(`${p.rufname} ${p.name}`).includes(n)).slice(0, 3);
  } else {
    kandidaten = zustand.zuletzt.map(person).slice(0, 3);
    if (fh.person && !kandidaten.some((p) => p.id === fh.person)) kandidaten = [person(fh.person), ...kandidaten.slice(0, 2)];
  }
  const chips = kandidaten.map((p) => `<button type="button" class="fh-person f-${p.farbe}" aria-pressed="${fh.person === p.id}" data-fh-person="${p.id}">${blob(p, 's')}<span>${esc(anzeigeName(p))}</span></button>`).join('');
  const feld = $('#fh-suche');
  if (feld) {
    $$('.fh-person, .fh-leer', box).forEach((b) => b.remove());
    feld.insertAdjacentHTML('beforebegin', chips || '<span class="fh-leer">niemand</span>');
  } else {
    box.innerHTML = `${chips}<input id="fh-suche" class="fh-suche" type="search" placeholder="Name …" aria-label="Über wen" autocomplete="off" spellcheck="false" enterkeyhint="next">`;
  }
  $('#fh-speichern').setAttribute('aria-disabled', String(!fh.person));
}

function fhArtenZeichnen() {
  $('#fh-arten').innerHTML = zustand.arten.map((a) => `<button type="button" class="fh-art f-${farbeVon(a.id)}" aria-pressed="${fh.art === a.id}" data-fh-art="${a.id}"><span class="fh-art-zeichen">${artZeichen(a)}</span><span>${esc(a.name)}</span></button>`).join('')
    + '<button type="button" class="fh-art fh-art-neu" data-neue-art="fh"><span class="plus" aria-hidden="true">＋</span><span>Art</span></button>';
}

/* „＋ Art“ wird zu einem kleinen Feld: Name tippen, Enter legt an. */
function artFeldZeigen(knopf, wo) {
  const feld = document.createElement('input');
  feld.type = 'text';
  feld.className = `art-feld art-feld-${wo}`;
  feld.placeholder = 'Neue Art';
  feld.setAttribute('aria-label', 'Neue Art, Enter legt an');
  feld.autocomplete = 'off';
  feld.enterKeyHint = 'done';
  feld.maxLength = 24;
  feld.dataset.artFeld = wo;
  knopf.replaceWith(feld);
  feld.focus();
}

function festhaltenOeffnen() {
  if (dlg.open) return;
  const w = weg();
  // Auf einer Personenseite (auch „Ich“) ist die Person gewählt, sonst niemand.
  fh.person = w.seite === 'person' ? (person(w.id) || person('mia')).id : null;
  fh.art = null;
  fh.suche = '';
  $('#fh-personen').innerHTML = '';
  fhPersonenZeichnen();
  fhArtenZeichnen();
  const text = $('#fh-text');
  text.value = '';
  text.removeAttribute('aria-invalid');
  dlg.showModal();
  (fh.person ? text : $('#fh-suche')).focus();
}

function wackeln(el) {
  if (!el || ruhig()) return;
  el.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(-3px)' }, { transform: 'none' }], { duration: 320 });
}

function fhPersonWaehlen(id) {
  fh.person = id;
  fh.suche = '';
  const s = $('#fh-suche');
  if (s) s.value = '';
  fhPersonenZeichnen();
  $('#fh-text').focus();
}

function speichern() {
  const text = $('#fh-text');
  const satz = text.value.trim();
  if (!fh.person) { wackeln($('.fh-wer')); $('#fh-suche')?.focus(); return; }
  if (!satz) { text.setAttribute('aria-invalid', 'true'); wackeln(text); text.focus(); return; }
  const p = person(fh.person);
  let neu;
  if (fh.art === 'geschenkidee') {
    // Geschenkidee: neue Idee mit Stand „Idee“ für den nächsten Anlass der Person.
    neu = { id: `g${Date.now()}`, person: p.id, titel: satz, haendler: '', preis: null, stand: 'idee', anlass: naechsterAnlass(p), zeichnung: null };
    zustand.geschenke.push(neu);
  } else {
    neu = { id: `n${Date.now()}`, person: p.id, art: fh.art, datum: HEUTE, text: satz, nr: zustand.eintraege.length };
    zustand.eintraege.push(neu);
  }
  vorn(p.id);
  dlg.close();

  // Du bleibst, wo du warst. Auf der Seite der Person steht der Eintrag sofort in der Zeitleiste.
  const w = weg();
  const hier = w.seite === 'person' && (person(w.id) || person('mia')).id === p.id;
  if (hier) {
    zustand.neuId = neu.id;
    const passt = fh.art === 'geschenkidee' ? ['alle', 'geschenkidee'] : ['alle', fh.art];
    if (!passt.includes(zustand.filter)) zustand.filter = 'alle';
    zeichnePerson();
  } else if (w.seite !== 'suche') {
    const y = scrollY;
    render();
    window.scrollTo(0, y);
  }
  const name = p.ist_ich ? 'dir' : anzeigeName(p);
  melde(`Bei ${name} festgehalten`, hier ? null : { href: `#person/${p.id}`, text: p.ist_ich ? 'Meine Seite' : `Zu ${anzeigeName(p)}` });
}

/* ---------- Art eines Eintrags ändern (kleine Auswahl) ---------- */
const pop = $('#art-wahl');
let popAusloeser = null;
function artWahlOeffnen(knopf) {
  const e = zustand.eintraege.find((x) => x.id === knopf.dataset.artWahl);
  popAusloeser = knopf;
  pop.dataset.fuer = e.id;
  pop.innerHTML = zustand.arten.map((a) => `<button type="button" class="art-option f-${farbeVon(a.id)}" data-setze-art="${a.id}" aria-pressed="${e.art === a.id}"><span class="chip-zeichen">${artZeichen(a)}</span>${esc(a.name)}</button>`).join('')
    + `<button type="button" class="art-option f-kreide ohne" data-setze-art="" aria-pressed="${!e.art}">ohne Art</button>`
    + '<button type="button" class="art-option art-neu" data-neue-art="pop"><span class="plus" aria-hidden="true">＋</span>Art</button>';
  pop.showPopover();
  popLegen();
  knopf.setAttribute('aria-expanded', 'true');
  ($('[aria-pressed="true"]', pop) || $('button', pop)).focus({ preventScroll: true });
}
function artSetzen(artId) {
  const e = zustand.eintraege.find((x) => x.id === pop.dataset.fuer);
  e.art = artId || null;
  zustand.gewechselt = e.id;
  popAusloeser = null;
  pop.hidePopover();
  zeichnePerson(`[data-art-wahl="${e.id}"]`);
}
pop.addEventListener('toggle', (ev) => {
  if (ev.newState === 'closed') {
    popAusloeser?.setAttribute('aria-expanded', 'false');
    if (!document.activeElement || document.activeElement === document.body || pop.contains(document.activeElement)) popAusloeser?.focus({ preventScroll: true });
  }
});
/* Tastatur in der Auswahl: Pfeile wandern, Tab bleibt in der Auswahl. Im Namensfeld bleiben links/rechts beim Text. */
pop.addEventListener('keydown', (ev) => {
  const knoepfe = [...pop.querySelectorAll('button, input')];
  const i = knoepfe.indexOf(document.activeElement);
  const imFeld = document.activeElement?.tagName === 'INPUT';
  let n = null;
  if (ev.key === 'ArrowDown' || (!imFeld && ev.key === 'ArrowRight') || (ev.key === 'Tab' && !ev.shiftKey)) n = (i + 1) % knoepfe.length;
  if (ev.key === 'ArrowUp' || (!imFeld && ev.key === 'ArrowLeft') || (ev.key === 'Tab' && ev.shiftKey)) n = (i - 1 + knoepfe.length) % knoepfe.length;
  if (n !== null) { ev.preventDefault(); knoepfe[n].focus(); }
});

/* Die Auswahl hängt am Knopf: beim Scrollen wandert sie mit. */
function popLegen() {
  if (!popAusloeser || !pop.matches(':popover-open')) return;
  const r = popAusloeser.getBoundingClientRect();
  const b = pop.offsetWidth;
  const h = pop.offsetHeight;
  let top = r.bottom + 8;
  if (top + h > innerHeight - 12) top = Math.max(12, r.top - h - 8);
  pop.style.top = `${top}px`;
  pop.style.left = `${Math.min(Math.max(12, r.left), innerWidth - b - 12)}px`;
}
addEventListener('scroll', popLegen, { passive: true });
addEventListener('resize', popLegen);

/* ---------- Bestätigung (ruhig, unten; mit Link zur Person, wenn du woanders bist) ---------- */
let meldeZeit;
function melde(text, link) {
  const m = $('#meldung');
  m.innerHTML = `<span>${esc(text)}</span>${link ? `<a class="meldung-link" href="${link.href}">${esc(link.text)}${PFEIL_RECHTS}</a>` : ''}`;
  m.classList.add('da');
  m.classList.toggle('mit-link', !!link);
  clearTimeout(meldeZeit);
  meldeZeit = setTimeout(() => m.classList.remove('da'), link ? 6000 : 2800);
}

/* ---------- Ereignisse ---------- */
document.addEventListener('click', async (ev) => {
  const t = ev.target.closest('button, a');
  if (!t) return;
  const d = t.dataset;
  if (t.classList.contains('meldung-link')) $('#meldung').classList.remove('da');
  if ('festhalten' in d) return festhaltenOeffnen();
  if ('schliessen' in d) return dlg.close();
  if (d.filter) { zustand.filter = d.filter; return zeichnePerson(`[data-filter="${d.filter}"]`); }
  if ('reihe' in d) { zustand.reihe = zustand.reihe === 'neu' ? 'alt' : 'neu'; return zeichnePerson('[data-reihe]'); }
  if (d.artWahl) return artWahlOeffnen(t);
  if ('setzeArt' in d) return artSetzen(d.setzeArt);
  if (d.neueArt) return artFeldZeigen(t, d.neueArt);
  if (d.stand) {
    const g = zustand.geschenke.find((x) => x.id === d.stand);
    g.stand = STAND_NACH[g.stand];
    const sel = `[data-stand="${g.id}"]`;
    const imAbschnitt = !!t.closest('#geschenke');
    zeichnePerson();
    $(`${imAbschnitt ? '#geschenke' : '#zeitleiste-bereich'} ${sel}`)?.focus({ preventScroll: true });
    if (!ruhig()) $$(`${sel} .stempel`).forEach((s) => s.animate([{ transform: 'rotate(-3deg) scale(1.25)' }, { transform: 'rotate(-3deg)' }], { duration: 260, easing: 'ease-out' }));
    return melde(`${g.titel}: ${STAND[g.stand]}`);
  }
  if (d.zumEintrag) { zustand.ziel = d.zumEintrag; zustand.filter = 'alle'; }
  if ('vorschau' in d) zustand.vorschau = true;
  if (d.fhPerson) return fhPersonWaehlen(d.fhPerson);
  if (d.fhArt) { fh.art = fh.art === d.fhArt ? null : d.fhArt; $$('[data-fh-art]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.fhArt === fh.art))); return; }
  if (d.gast) { zustand.gast = d.gast; gastMerken(d.gast); haupt.innerHTML = gastSeite(); window.scrollTo(0, 0); $('.gast-kopf h1')?.setAttribute('tabindex', '-1'); $('.gast-kopf h1')?.focus({ preventScroll: true }); return; }
  if ('gastWechsel' in d) { zustand.gast = null; gastMerken(null); haupt.innerHTML = gastSeite(); window.scrollTo(0, 0); $('.wer-name')?.focus(); return; }
  if (d.schenke) return schenke(d.schenke);
  if (d.zuruecknehmen) return gastAendern(d.zuruecknehmen, (L) => ohneMich(L, d.zuruecknehmen));
  if (d.dabei) return gastAendern(d.dabei, (L) => zustand.reserv.push({ liste: L.id, wunsch: d.dabei, gast: zustand.gast, art: 'bin_dabei' }), `[data-voll="${d.dabei}"]`);
  if (d.dochNicht) return gastAendern(d.dochNicht, (L) => { ohneMich(L, d.dochNicht); zustand.voll.delete(vollSchluessel(L, d.dochNicht)); });
  if (d.voll) {
    const k = vollSchluessel(gastListe(), d.voll);
    zustand.voll.has(k) ? zustand.voll.delete(k) : zustand.voll.add(k);
    haupt.innerHTML = gastSeite();
    $(`[data-voll="${d.voll}"]`)?.focus({ preventScroll: true });
    return melde(zustand.voll.has(k) ? 'Für alle anderen weg' : 'Wieder offen');
  }
  if (d.linkKopieren) {
    const link = `https://lulkasss.github.io/freundebuch/#l/${LINKS[d.linkKopieren]}`;
    try { await navigator.clipboard.writeText(link); } catch { /* ohne Zwischenablage */ }
    const span = $('span', t);
    span.textContent = 'Kopiert';
    setTimeout(() => { span.textContent = 'Link teilen'; }, 2000);
    return melde(`Link zu ${listeVon(d.linkKopieren).titel} kopiert`);
  }
});

document.addEventListener('input', (ev) => {
  if (ev.target.id === 'suchfeld') { zustand.suche = ev.target.value; $('#treffer').innerHTML = trefferHtml(zustand.suche); }
  if (ev.target.id === 'fh-suche') { fh.suche = ev.target.value; fhPersonenZeichnen(); }
  if (ev.target.id === 'fh-text') ev.target.removeAttribute('aria-invalid');
});

$('#fh-form').addEventListener('submit', (ev) => { ev.preventDefault(); speichern(); });
document.addEventListener('keydown', (ev) => {
  const t = ev.target;
  // Feld für eine neue Art: Enter legt an, Esc bricht nur das Feld ab.
  if (t.dataset?.artFeld) {
    if (ev.key === 'Enter' && !ev.isComposing) {
      ev.preventDefault();
      const a = neueArt(t.value);
      if (!a) { wackeln(t); return; }
      if (t.dataset.artFeld === 'pop') return artSetzen(a.id);
      fh.art = a.id;
      fhArtenZeichnen();
      $(`[data-fh-art="${a.id}"]`)?.focus();
      return;
    }
    if (ev.key === 'Escape' && t.dataset.artFeld === 'fh') {
      ev.preventDefault();
      fhArtenZeichnen();
      $('[data-neue-art="fh"]')?.focus();
      return;
    }
    return;
  }
  if (t.id === 'fh-text' && ev.key === 'Enter' && !ev.shiftKey && !ev.isComposing) { ev.preventDefault(); speichern(); return; }
  if (t.id === 'fh-suche' && ev.key === 'Enter') {
    ev.preventDefault();
    const erster = fh.suche.trim() ? $('.fh-person') : null;
    if (erster) fhPersonWaehlen(erster.dataset.fhPerson);
    else wackeln(t);
    return;
  }
  // Tastenkürzel am PC: N = Festhalten, / = Suche (nicht beim Tippen, nicht in der Gastansicht).
  if (ev.metaKey || ev.ctrlKey || ev.altKey || ev.defaultPrevented) return;
  if (t.closest?.('input, textarea, select, [contenteditable]') || dlg.open || weg().seite === 'gast') return;
  if (ev.key === 'n' || ev.key === 'N') { ev.preventDefault(); festhaltenOeffnen(); }
  else if (ev.key === '/') {
    ev.preventDefault();
    if (weg().seite === 'suche') $('#suchfeld')?.focus();
    else location.hash = '#suche';
  }
});

/* Klick neben das Blatt schließt es. */
dlg.addEventListener('click', (ev) => { if (ev.target === dlg) dlg.close(); });

addEventListener('hashchange', () => render({ neueSeite: true }));
if (!location.hash) history.replaceState(null, '', '#person/mia');
render();
