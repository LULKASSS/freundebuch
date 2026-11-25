/* Gemeinsame Bausteine: kleine Hilfen, Zeichen, Zustand, Bestätigung, Blatt. Gäste laden nur dies und app.js. */

/* ---------- Kleine Hilfen ---------- */
export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];
export const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const ruhig = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const warte = (ms) => new Promise((r) => setTimeout(r, ms));
export const heute = () => new Date().toLocaleDateString('sv-SE');
export const datum = (iso) => new Date(String(iso).slice(0, 10) + 'T12:00');
export const datumLang = (iso) => datum(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
export const datumTagMonat = (iso) => datum(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'long' });
export const euro = (n) => (n == null || n === '' ? '' : `${Number(n).toLocaleString('de-DE', { minimumFractionDigits: Number(n) % 1 ? 2 : 0, maximumFractionDigits: 2 })} €`);
export const undListe = (a) => (a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} und ${a[a.length - 1]}`);
export const zahlWort = (n, eins, viele) => `${n} ${n === 1 ? eins : viele}`;
export const gastLink = (schl) => `${location.origin}${location.pathname}#l/${schl}`;

/* Eigene kleine Zeichen, Strich wie von Hand (aus dem Entwurf Faden). */
export const zeichen = (inhalt) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inhalt}</svg>`;
export const ICON = {
  raus: zeichen('<path d="M10 5.5H6.2c-.6 0-1 .4-1 1v11.3c0 .6.4 1 1 1h11.3c.6 0 1-.4 1-1V14"/><path d="M13.6 5h5.4v5.4M19 5l-7.6 7.6"/>'),
  link: zeichen('<path d="M10.2 13.8a3.6 3.6 0 0 0 5.2.2l3-3a3.7 3.7 0 0 0-5.2-5.2l-1.2 1.1"/><path d="M13.8 10.2a3.6 3.6 0 0 0-5.2-.2l-3 3a3.7 3.7 0 0 0 5.2 5.2l1.1-1.1"/>'),
  auge: zeichen('<path d="M2.8 12.2C5 8 8.2 6.1 12 6.1s7 1.9 9.2 6.1C19 16.2 15.8 18 12 18s-7-1.8-9.2-5.8z"/><circle cx="12" cy="12.1" r="2.7"/>'),
  stift: zeichen('<path d="M5 19.2l1-4.1L15.8 5.3a2 2 0 0 1 2.9 0l.1.1a2 2 0 0 1 0 2.8L9 18l-4 1.2z"/><path d="M14 7.2l2.8 2.8"/>'),
  zusammen: zeichen('<path d="M9.2 7.4c2.6 0 4.6 2 4.6 4.6s-2 4.6-4.6 4.6-4.6-2-4.6-4.6 2-4.6 4.6-4.6z"/><path d="M14.8 7.4c2.6 0 4.6 2 4.6 4.6s-2 4.6-4.6 4.6"/>'),
  weiter: zeichen('<path d="M9.4 5.8 15.6 12l-6.2 6.2"/>'),
  plus: zeichen('<path d="M12.1 5.2c-.2 4.6-.1 9.1.1 13.6"/><path d="M5.3 12.2c4.5-.3 9-.2 13.5.1"/>'),
  start: zeichen('<path d="M3.8 11.6 12 4.4l8.3 7.1"/><path d="M6.1 9.9c-.2 3.2-.1 6.2.1 9.4 3.9.2 7.7.2 11.6 0 .2-3.2.2-6.3 0-9.5"/><path d="M10 19.2c0-1.8-.1-3.4.1-5 1.3-.1 2.6-.1 3.8 0 .1 1.7.1 3.3 0 5"/>'),
  menschen: zeichen('<circle cx="9" cy="8.6" r="3.3"/><path d="M3.3 19.4c.5-3.6 2.8-5.6 5.7-5.6s5.3 2 5.8 5.6"/><path d="M15.4 5.6c1.9-.4 3.6.9 3.7 2.8.1 1.7-1.2 3.1-2.9 3.2"/><path d="M17.1 14.2c2 .5 3.3 2.2 3.6 4.9"/>'),
  suche: zeichen('<path d="M10.6 4.6c3.4-.1 6 2.5 6 5.8 0 3.4-2.6 6-5.9 6-3.4.1-6.1-2.5-6.1-5.9 0-3.3 2.6-5.8 6-5.9z"/><path d="m15.1 15.2 4.8 4.6"/>'),
  ich: zeichen('<path d="M12 4.3c2 0 3.5 1.5 3.5 3.6S14 11.6 12 11.6 8.4 10 8.4 7.9s1.6-3.6 3.6-3.6z"/><path d="M5.2 19.6c.6-3.9 3.3-6 6.8-6s6.3 2.1 6.9 6"/>'),
  pfeile: zeichen('<path d="M8 4.5v14.8M4.8 16.3 8 19.5l3.1-3.2"/><path d="M16 19.4V4.6M12.9 7.6 16 4.5l3.2 3.2"/>'),
  schloss: zeichen('<rect x="5.4" y="10.6" width="13.2" height="9.2" rx="2.2"/><path d="M8.4 10.4V8a3.6 3.6 0 0 1 7.2 0v2.4"/>'),
  klein: zeichen('<path d="m7.6 10 4.4 4.3 4.4-4.3"/>'),
  zahnrad: zeichen('<path d="M4.5 7.6h9M17.6 7.6h2M4.5 16.4h2.4M11 16.4h8.5"/><circle cx="15.5" cy="7.6" r="2.1"/><circle cx="8.9" cy="16.4" r="2.1"/>'),
  kopie: zeichen('<path d="M9 8.6c0-.6.4-1 1-1h8.2c.6 0 1 .4 1 1v9.7c0 .6-.4 1-1 1H10c-.6 0-1-.4-1-1z"/><path d="M5 15.4V5.7c0-.6.4-1 1-1h8.4"/>'),
  kalender: zeichen('<path d="M5 7.2c0-.6.4-1 1-1h12c.6 0 1 .4 1 1v11c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1z"/><path d="M5.1 10.4c4.6-.2 9.2-.2 13.8 0M8.8 4.4v3M15.2 4.4v3"/>'),
  weg: zeichen('<path d="m7 7.1 10 9.9M17 7 7.1 17"/>'),
  herunter: zeichen('<path d="M12 4.6v10.2M8.2 11.4 12 15.2l3.9-3.8M5 19.2c4.7.2 9.3.2 14 0"/>'),
};
export const FADEN_LADEN = '<svg viewBox="0 0 54 20" aria-hidden="true"><path pathLength="100" d="M2 12C10 2 16 18 26 10s16 6 26-4"/></svg>';
export const laden = (text = 'Einen Moment …') => `<p class="laden" role="status">${FADEN_LADEN}<span>${esc(text)}</span></p>`;

/* ---------- Zustand ---------- */
export const zustand = {
  konto: null, listen: [], wuensche: [], lw: [], stand: {}, geladen: false,
  gast: null, gastSchluessel: null,
  buch: { personen: [], steckbrief: [], beziehungen: [], arten: [], eintraege: [], geschenke: [], abo: null },
  blatt: null, ersteAnzeige: true, anmeldeFehler: null,
};
export const VORNAME = 'freundebuch.vorname';

/* Was app.js dem Personenbuch (buch.js) zur Verfügung stellt. */
export const app = {};

/* ---------- Ruhige Bestätigung ---------- */
let hinweisZeit = 0;
/* Text wird maskiert; mit link = { href, text, davor, danach } steht ein Verweis darin. */
export function hinweis(text, link) {
  const h = $('.hinweis');
  if (link) h.innerHTML = `${esc(link.davor)}<a href="${esc(link.href)}">${esc(link.text)}</a>${esc(link.danach)}`;
  else h.textContent = text;
  h.classList.toggle('mit-link', Boolean(link));
  h.classList.add('da');
  clearTimeout(hinweisZeit);
  hinweisZeit = setTimeout(() => h.classList.remove('da', 'mit-link'), link ? 5200 : 3200);
}
export const fehlerZeigen = (e) => hinweis(e?.code === 'netz' ? e.message : 'Das hat nicht geklappt. Bitte noch einmal.');

/* ---------- Blatt (von unten am Handy, mittig am PC) ---------- */
const ort = $('#ueber-ort');
export function blattOeffnen(art, daten, innen) {
  zustand.blatt = { art, ...daten, zurueck: document.activeElement };
  if (!history.state?.blatt) history.pushState({ blatt: true }, '');
  $('.hinweis').classList.remove('da', 'mit-link');
  ort.innerHTML = `<div class="blatt-huelle" data-blatt-huelle>
    <div class="blatt" role="dialog" aria-modal="true" aria-labelledby="blatt-titel"><span class="blatt-griff" aria-hidden="true"></span><div class="blatt-innen">${innen}</div></div></div>`;
  document.body.classList.add('blatt-offen');
  requestAnimationFrame(() => requestAnimationFrame(() => $('.blatt-huelle')?.classList.add('offen')));
  setTimeout(() => !$('.blatt')?.contains(document.activeElement) && ($('.blatt [autofocus]') || $('.blatt input, .blatt textarea, .blatt button'))?.focus({ preventScroll: true }), ruhig() ? 0 : 60);
}
/* Am Handy bleibt das Blatt über der Tastatur. */
function sichtAnpassen() {
  const v = visualViewport, h = $('.blatt-huelle');
  if (!h || !v || v.scale > 1.01) return;
  const verdeckt = innerHeight - v.height;
  h.style.top = verdeckt > 60 ? `${v.offsetTop}px` : '';
  h.style.height = verdeckt > 60 ? `${v.height}px` : '';
  h.style.bottom = verdeckt > 60 ? 'auto' : '';
}
visualViewport?.addEventListener('resize', sichtAnpassen);
visualViewport?.addEventListener('scroll', sichtAnpassen);
export function blattInnen(innen) {
  $('.blatt-innen').innerHTML = innen;
  ($('.blatt [autofocus]') || $('.blatt input, .blatt textarea, .blatt button'))?.focus({ preventScroll: true });
}
export function blattZu({ geschichte = true } = {}) {
  const h = $('.blatt-huelle');
  if (!h || !zustand.blatt) return;
  const zurueck = zustand.blatt?.zurueck;
  zustand.blatt?.beimSchliessen?.();
  zustand.blatt = null;
  h.classList.remove('offen');
  h.classList.add('zu');
  document.body.classList.remove('blatt-offen');
  setTimeout(() => { if (!zustand.blatt) ort.innerHTML = ''; }, ruhig() ? 0 : 300);
  if (zurueck?.isConnected) zurueck.focus({ preventScroll: true });
  if (geschichte && history.state?.blatt) history.back();
  app.nachBlatt?.();
}
/* Das offene Blatt ist ein Schritt in der Geschichte: „Zurück“ am Handy schließt das Blatt, statt die Seite zu verlassen. */
addEventListener('popstate', () => { if (zustand.blatt && !history.state?.blatt) blattZu({ geschichte: false }); });
/* Blatt schließen und auf eine andere Seite gehen, ohne den Schritt des Blatts zurückzulassen. */
export function blattZuNach(hash) {
  const schritt = history.state?.blatt;
  blattZu({ geschichte: false });
  if (schritt) location.replace(hash); else location.hash = hash;
}
