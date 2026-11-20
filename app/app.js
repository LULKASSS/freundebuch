/* Freundebuch, Etappe 1: die Wunschliste. Ein ES-Modul ohne Build.
 * Gäste kommen über #l/<Schlüssel> ohne Konto; ich melde mich per Link aus der Mail an.
 * Was reserviert ist, erfährt nur der Gast selbst (über sein Gerät); meine Ansicht bekommt nur die Zahl. */
import * as api from './api.js';
import { PRODUKT, SCHMUCK } from './zeichnungen.js';
import { zip } from './zip.js';

/* ---------- Kleine Hilfen ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ruhig = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const warte = (ms) => new Promise((r) => setTimeout(r, ms));
const heute = () => new Date().toLocaleDateString('sv-SE');
const datum = (iso) => new Date(String(iso).slice(0, 10) + 'T12:00');
const datumLang = (iso) => datum(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
const datumTagMonat = (iso) => datum(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'long' });
const standKurz = (iso) => (iso ? `Stand ${datum(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric' })}` : '');
const euro = (n) => (n == null || n === '' ? '' : `ca. ${Number(n).toLocaleString('de-DE', { minimumFractionDigits: Number(n) % 1 ? 2 : 0, maximumFractionDigits: 2 })} €`);
const undListe = (a) => (a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} und ${a[a.length - 1]}`);
const zahlWort = (n, eins, viele) => `${n} ${n === 1 ? eins : viele}`;
const gastLink = (schl) => `${location.origin}${location.pathname}#l/${schl}`;

/* Eigene kleine Zeichen, Strich wie von Hand (aus dem Entwurf Faden). */
const zeichen = (inhalt) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inhalt}</svg>`;
const ICON = {
  raus: zeichen('<path d="M10 5.5H6.2c-.6 0-1 .4-1 1v11.3c0 .6.4 1 1 1h11.3c.6 0 1-.4 1-1V14"/><path d="M13.6 5h5.4v5.4M19 5l-7.6 7.6"/>'),
  link: zeichen('<path d="M10.2 13.8a3.6 3.6 0 0 0 5.2.2l3-3a3.7 3.7 0 0 0-5.2-5.2l-1.2 1.1"/><path d="M13.8 10.2a3.6 3.6 0 0 0-5.2-.2l-3 3a3.7 3.7 0 0 0 5.2 5.2l1.1-1.1"/>'),
  auge: zeichen('<path d="M2.8 12.2C5 8 8.2 6.1 12 6.1s7 1.9 9.2 6.1C19 16.2 15.8 18 12 18s-7-1.8-9.2-5.8z"/><circle cx="12" cy="12.1" r="2.7"/>'),
  stift: zeichen('<path d="M5 19.2l1-4.1L15.8 5.3a2 2 0 0 1 2.9 0l.1.1a2 2 0 0 1 0 2.8L9 18l-4 1.2z"/><path d="M14 7.2l2.8 2.8"/>'),
  zusammen: zeichen('<path d="M9.2 7.4c2.6 0 4.6 2 4.6 4.6s-2 4.6-4.6 4.6-4.6-2-4.6-4.6 2-4.6 4.6-4.6z"/><path d="M14.8 7.4c2.6 0 4.6 2 4.6 4.6s-2 4.6-4.6 4.6"/>'),
  weiter: zeichen('<path d="M9.4 5.8 15.6 12l-6.2 6.2"/>'),
  plus: zeichen('<path d="M12.1 5.2c-.2 4.6-.1 9.1.1 13.6"/><path d="M5.3 12.2c4.5-.3 9-.2 13.5.1"/>'),
  einfuegen: zeichen('<rect x="6" y="5.2" width="12" height="15" rx="2"/><path d="M9.5 5.2c0-1 .8-1.8 1.8-1.8h1.4c1 0 1.8.8 1.8 1.8v.8h-5z"/>'),
};
const FADEN_LADEN = '<svg viewBox="0 0 54 20" aria-hidden="true"><path pathLength="100" d="M2 12C10 2 16 18 26 10s16 6 26-4"/></svg>';
const laden = (text = 'Einen Moment …') => `<p class="laden" role="status">${FADEN_LADEN}<span>${esc(text)}</span></p>`;

/* ---------- Zustand ---------- */
const zustand = {
  konto: null, listen: [], wuensche: [], lw: [], stand: {}, geladen: false,
  gast: null, gastSchluessel: null,
  blatt: null, ersteAnzeige: true, anmeldeFehler: null,
};
const VORNAME = 'freundebuch.vorname';

/* ---------- Ruhige Bestätigung ---------- */
let hinweisZeit = 0;
function hinweis(text) {
  const h = $('.hinweis');
  h.textContent = text;
  h.classList.add('da');
  clearTimeout(hinweisZeit);
  hinweisZeit = setTimeout(() => h.classList.remove('da'), 3200);
}
const fehlerZeigen = (e) => hinweis(e?.code === 'netz' ? e.message : 'Das hat nicht geklappt. Bitte noch einmal.');

/* ---------- Route ---------- */
function route() {
  const h = decodeURIComponent(location.hash.slice(1));
  const [teil, id] = h.split('/');
  if (teil === 'l' && id) return { teil: 'gast', id };
  if (teil === 'liste' && id) return { teil: 'liste', id };
  if (teil === 'anmelden') return { teil: 'anmelden' };
  return { teil: 'listen' };
}

/* =====================================================================
 * Wunschkarte (Gast und ich)
 * ===================================================================== */
const shopAttr = (w) => (w.shop_url ? `href="${esc(w.shop_url)}" target="_blank" rel="noopener noreferrer"` : '');
const schild = (neu = false) =>
  `<span class="schild${neu ? ' schwingt' : ''}" aria-hidden="true"><span class="schild-schnur"></span><span class="schild-karte">${SCHMUCK.schleife}</span></span>`;

function bild(w, mitSchild = false) {
  const tag = w.shop_url ? 'a' : 'span';
  const attr = w.shop_url ? `${shopAttr(w)} tabindex="-1" aria-hidden="true"` : 'aria-hidden="true"';
  const innen = w.bild_pfad
    ? `<img src="${esc(api.bildUrl(w.bild_pfad))}" alt="" loading="lazy" decoding="async">`
    : PRODUKT.box;
  return `<${tag} class="wunsch-bild${w.bild_pfad ? ' foto' : ''}" ${attr}>${innen}${mitSchild ? schild() : ''}</${tag}>`;
}

function kartenText(w, zusatz = '') {
  const titel = w.shop_url ? `<a ${shopAttr(w)}>${esc(w.titel)}</a>` : esc(w.titel);
  const meta = [w.preis_ca != null ? `<span class="preis">${euro(w.preis_ca)}</span>` : '', w.preis_ca != null && w.preis_stand ? `<span class="leise">${standKurz(w.preis_stand)}</span>` : ''].filter(Boolean).join('');
  const haendler = w.haendler || w.shop_url
    ? `<p class="haendler-zeile">${w.haendler ? `<span class="haendler">${esc(w.haendler)}</span>` : ''}${w.shop_url ? `<a class="shop" ${shopAttr(w)} aria-label="Zum Shop${w.haendler ? ` bei ${esc(w.haendler)}` : ''}"><span>Zum Shop</span>${ICON.raus}</a>` : ''}</p>`
    : '';
  return `<div class="wunsch-text">
      <h3 class="wunsch-titel">${titel}</h3>
      ${w.beschreibung ? `<p class="wunsch-besch">${esc(w.beschreibung)}</p>` : ''}
      ${meta ? `<p class="wunsch-meta">${meta}</p>` : ''}
      ${haendler}
      ${zusatz}
    </div>`;
}

/* Wer beim Zusammenlegen dabei ist: Vornamen, sonst nur die Zahl. */
function dabeiText(w) {
  const namen = w.vornamen || [];
  const ohne = Math.max(0, (w.beteiligte || 0) - namen.length);
  const teile = [...namen];
  if (ohne) teile.push(namen.length ? (ohne === 1 ? 'eine weitere Person' : `${ohne} weitere`) : '');
  if (w.stand === 'dabei') {
    if (!w.beteiligte) return 'du bist dabei';
    if (!namen.length) return `du und ${ohne === 1 ? 'eine weitere Person' : `${ohne} weitere`}`;
    return undListe(['du', ...teile.filter(Boolean)]);
  }
  if (!w.beteiligte) return 'noch niemand dabei';
  if (!namen.length) return ohne === 1 ? 'eine Person ist dabei' : `${ohne} sind dabei`;
  const liste = teile.filter(Boolean);
  return `${undListe(liste)} ${w.beteiligte === 1 ? 'ist' : 'sind'} dabei`;
}

function gastKarte(w, offenDabei) {
  let zusatz = '';
  if (w.zusammenlegen) zusatz += `<p class="zusammen">${ICON.zusammen}<span>Zusammenlegen · ${esc(dabeiText(w))}</span></p>`;
  if (w.stand === 'dabei' && w.voll) zusatz += '<p class="voll-zeile">Ist voll</p>';
  if (w.entfernt) zusatz += '<p class="entfernt-zeile">Von der Liste genommen</p>';
  let knoepfe = '';
  if (w.stand === 'von_dir') knoepfe = '<button class="knopf-rand" type="button" data-aktion="zuruecknehmen">Zurücknehmen</button>';
  else if (w.stand === 'dabei') knoepfe = w.voll || w.entfernt
    ? '<button class="knopf-rand" type="button" data-aktion="doch-nicht">Doch nicht</button>'
    : '<button class="knopf" type="button" data-aktion="voll">Ist voll</button><button class="knopf-rand" type="button" data-aktion="doch-nicht">Doch nicht</button>';
  else if (w.zusammenlegen) knoepfe = offenDabei ? '' : '<button class="knopf" type="button" data-aktion="dabei-fragen">Ich bin dabei</button>';
  else knoepfe = '<button class="knopf" type="button" data-aktion="schenke">Das schenke ich</button>';
  const dabeiFeld = offenDabei ? `<div class="dabei-feld">
      <label for="vorname-${w.id}">Dein Vorname, damit ihr euch absprechen könnt (freiwillig)</label>
      <input class="eingabe" id="vorname-${w.id}" type="text" maxlength="30" autocomplete="given-name" enterkeyhint="done" value="${esc(api.speicher.lesen(VORNAME) || '')}">
      <div class="knopfreihe"><button class="knopf-rand" type="button" data-aktion="dabei-abbrechen">Abbrechen</button><button class="knopf" type="button" data-aktion="dabei">Dabei sein</button></div>
    </div>` : '';
  const meins = w.stand !== 'frei';
  return `<li class="wunsch${w.bild_pfad ? ' foto-karte' : ''}" data-wunsch="${w.id}">
    ${bild(w, meins)}
    ${kartenText(w, zusatz)}
    ${knoepfe ? `<div class="wunsch-knoepfe">${knoepfe}</div>` : ''}
    ${dabeiFeld}
  </li>`;
}

function ichKarte(w) {
  const zusatz = (w.zusammenlegen ? `<p class="zusammen">${ICON.zusammen}<span>Zum Zusammenlegen</span></p>` : '') +
    `<button class="knopf-text wunsch-bearbeiten" type="button" data-aktion="wunsch-bearbeiten" data-wunsch-id="${w.id}">Bearbeiten</button>`;
  return `<li class="wunsch" data-wunsch="${w.id}">${bild(w)}${kartenText(w, zusatz)}</li>`;
}

/* =====================================================================
 * Gast
 * ===================================================================== */
let offenDabei = null;

function gastWuensche() {
  const g = zustand.gast;
  const meine = g.wuensche.filter((w) => w.stand !== 'frei');
  const frei = g.wuensche.filter((w) => w.stand === 'frei');
  return `${meine.length ? `<section class="von-dir" aria-labelledby="vondir-titel"><h2 class="abschnitt" id="vondir-titel" tabindex="-1">Von dir</h2><ol class="wunsch-liste">${meine.map((w) => gastKarte(w)).join('')}</ol></section>` : ''}
    <section aria-labelledby="frei-titel"><h2 class="abschnitt" id="frei-titel" tabindex="-1">${meine.length ? 'Noch zu haben' : 'Zum Aussuchen'}</h2>
    ${frei.length ? `<ol class="wunsch-liste">${frei.map((w) => gastKarte(w, offenDabei === w.id)).join('')}</ol>` : `<p class="leer-zeile">${g.wuensche.length ? 'Alles andere ist schon vergeben.' : 'Alles ist schon vergeben. Danke!'}</p>`}</section>`;
}

function seiteGast() {
  const g = zustand.gast;
  if (!g) {
    return `<article class="seite fehlerseite"><h1 class="seiten-titel" tabindex="-1">Diese Liste gibt es nicht</h1>
      <p>Vielleicht ist der Link nicht vollständig angekommen. Frag am besten bei der Person nach, die ihn dir geschickt hat.</p></article>`;
  }
  const kopf = `<header class="liste-kopf">
      <p class="ueberzeile">${esc(g.besitzer || 'Jemand')} wünscht sich</p>
      <h1 class="liste-titel" tabindex="-1">${esc(g.titel)}</h1>
      ${g.anlass_datum ? `<p class="gast-anlass">zum ${datumLang(g.anlass_datum)}</p>` : ''}`;
  if (g.archiviert) {
    return `<article class="seite seite-gast">${kopf}</header>
      <div class="leer-karte"><span>${SCHMUCK.schleife}</span><h2>Diese Liste ist abgeschlossen</h2><p>Hier gibt es nichts mehr auszusuchen. Danke fürs Vorbeischauen!</p></div></article>`;
  }
  return `<article class="seite seite-gast">
    ${g.vorschau ? `<p class="vorschau-band"><strong>Vorschau</strong><span>So sehen es deine Leute. Was vergeben ist, siehst du hier nicht.</span><a class="knopf-text" href="#">Zurück</a></p>` : ''}
    ${kopf}
      ${g.vorschau ? '' : '<p class="gast-erklaerung">Such dir etwas aus. Danach ist es für alle anderen weg, so schenkt niemand doppelt. Dieses Gerät merkt sich, was du ausgesucht hast.</p>'}
    </header>
    <div class="gast-wuensche">${gastWuensche()}</div>
  </article>`;
}

async function gastLaden(schl) {
  zustand.gastSchluessel = schl;
  zustand.gast = await api.rpc('gast_liste', { p_schluessel: schl, p_geraet: api.geraet() }, { gast: !api.angemeldet() });
}

/* Karten gleiten an ihren neuen Platz (FLIP), neue blenden sanft ein. */
function flip(aendern, bewegt) {
  const vorher = new Map($$('[data-wunsch]').map((el) => [el.dataset.wunsch, el.getBoundingClientRect()]));
  aendern();
  const karte = bewegt && $(`[data-wunsch="${bewegt}"]`);
  if (karte) {
    const b = karte.getBoundingClientRect();
    if (b.top < 20 || b.bottom > innerHeight) window.scrollBy({ top: b.top - 96, behavior: 'instant' });
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
function gastNeu(bewegt, fokus) {
  return flip(() => { $('.gast-wuensche').innerHTML = gastWuensche(); }, bewegt).then(() => {
    const f = fokus && $(`[data-wunsch="${bewegt}"] ${fokus}`);
    (f || $(`[data-wunsch="${bewegt}"] button`) || $('#frei-titel'))?.focus({ preventScroll: true });
  });
}

let beschaeftigt = false;
async function gastHandlung(aktion, karte) {
  if (beschaeftigt || !karte) return;
  const g = zustand.gast, id = karte.dataset.wunsch, w = g.wuensche.find((x) => x.id === id);
  if (g.vorschau) { hinweis('In der Vorschau kannst du nichts aussuchen.'); return; }
  if (aktion === 'dabei-fragen') {
    offenDabei = id;
    $('.gast-wuensche').innerHTML = gastWuensche();
    $(`#vorname-${id}`)?.focus();
    return;
  }
  if (aktion === 'dabei-abbrechen') {
    offenDabei = null;
    $('.gast-wuensche').innerHTML = gastWuensche();
    $(`[data-wunsch="${id}"] [data-aktion="dabei-fragen"]`)?.focus();
    return;
  }
  const p = { p_schluessel: zustand.gastSchluessel, p_wunsch: id, p_geraet: api.geraet() };
  const opt = { gast: !api.angemeldet() };
  beschaeftigt = true;
  $$('button', karte).forEach((b) => (b.disabled = true));
  try {
    if (aktion === 'schenke' || aktion === 'dabei') {
      let vorname = null;
      if (aktion === 'dabei') {
        vorname = ($(`#vorname-${id}`)?.value || '').trim() || null;
        api.speicher.schreiben(VORNAME, vorname);
      }
      const schwung = ruhig() ? Promise.resolve() : (($('.wunsch-bild', karte).insertAdjacentHTML('beforeend', schild(true))), warte(460));
      const [antwort] = await Promise.all([api.rpc('gast_reservieren', { ...p, p_vorname: vorname }, opt), schwung]);
      offenDabei = null;
      await gastLaden(zustand.gastSchluessel);
      if (!antwort?.ok) {
        await gastNeu(null);
        hinweis('Da war jemand schneller. Der Wunsch ist schon vergeben.');
        return;
      }
      await gastNeu(id, aktion === 'schenke' ? '[data-aktion="zuruecknehmen"]' : '[data-aktion="voll"]');
      hinweis(aktion === 'schenke' ? `${w.titel} · von dir` : `${w.titel} · du bist dabei`);
    } else if (aktion === 'zuruecknehmen' || aktion === 'doch-nicht') {
      await api.rpc('gast_zuruecknehmen', p, opt);
      await gastLaden(zustand.gastSchluessel);
      await gastNeu(id, aktion === 'zuruecknehmen' ? '[data-aktion="schenke"]' : '[data-aktion="dabei-fragen"]');
      hinweis(aktion === 'zuruecknehmen' ? 'Zurückgenommen' : 'Du bist nicht mehr dabei');
    } else if (aktion === 'voll') {
      await api.rpc('gast_voll', p, opt);
      await gastLaden(zustand.gastSchluessel);
      await gastNeu(id, '[data-aktion="doch-nicht"]');
      hinweis('Ist voll. Für alle anderen ist der Wunsch jetzt weg.');
    }
  } catch (e) {
    if (e.code === 'P0002') { zustand.gast = { ...zustand.gast, archiviert: true }; zeigen(); return; }
    fehlerZeigen(e);
    $$('button', karte).forEach((b) => (b.disabled = false));
  } finally { beschaeftigt = false; }
}

/* =====================================================================
 * Anmelden
 * ===================================================================== */
/* Anmelden mit Code aus der Mail: Eine App auf dem Home-Bildschirm des iPhones hat ihren eigenen Speicher;
 * der Link aus der Mail öffnet aber Safari. Den Code tippt man direkt in der App ein. */
function seiteAnmelden(gesendetAn, fehler = '') {
  if (gesendetAn) {
    return `<article class="seite seite-anmelden">
      <div class="anmelden-schmuck" aria-hidden="true">${SCHMUCK.stern}</div>
      <h1 class="seiten-titel" tabindex="-1">Schau in dein Postfach</h1>
      <p class="anmelden-text">Der Code ist unterwegs an ${esc(gesendetAn)}. Gib ihn hier ein, dann bist du drin und bleibst es.</p>
      <form class="anmelden-form" data-form="code" novalidate>
        <label class="feld"><span class="feld-name">Code aus der Mail</span><input id="code" class="code-feld" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]*" maxlength="10" required ${fehler ? 'aria-invalid="true"' : ''}></label>
        ${fehler ? `<p class="feld-fehler" role="alert">${esc(fehler)}</p>` : ''}
        <button class="knopf" type="submit">Anmelden</button>
      </form>
      <p class="feld-unter" style="margin-top:18px">Im Browser geht auch der Link in der Mail.</p>
      <p><button class="knopf-text" type="button" data-aktion="anmelden-zurueck">Andere Adresse oder neuer Code</button></p>
    </article>`;
  }
  return `<article class="seite seite-anmelden">
    <div class="anmelden-schmuck" aria-hidden="true">${SCHMUCK.stern}</div>
    <h1 class="seiten-titel" tabindex="-1">Anmelden</h1>
    <p class="anmelden-text">Du bekommst einen Code per Mail. Kein Kennwort.</p>
    <form class="anmelden-form" data-form="anmelden" novalidate>
      <label class="feld"><span class="feld-name">E-Mail</span><input id="email" type="email" autocomplete="email" inputmode="email" required></label>
      ${zustand.anmeldeFehler ? `<p class="feld-fehler" role="alert">${esc(zustand.anmeldeFehler)}</p>` : ''}
      <button class="knopf" type="submit">Code schicken</button>
    </form>
  </article>`;
}

let anmeldeAdresse = '';
async function anmelden(form) {
  const feld = $('#email', form), email = feld.value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { feld.setAttribute('aria-invalid', 'true'); zustand.anmeldeFehler = 'Bitte eine E-Mail-Adresse eingeben.'; zeigenAnmelden(); return; }
  const knopf = $('button[type="submit"]', form);
  knopf.disabled = true;
  knopf.textContent = 'Wird geschickt …';
  try {
    await api.linkSchicken(email);
    zustand.anmeldeFehler = null;
    anmeldeAdresse = email;
    main.innerHTML = seiteAnmelden(email);
    $('#code').focus();
  } catch (e) {
    zustand.anmeldeFehler = e.code === 'kein_konto' || e.code === 'zu_oft' || e.code === 'netz' ? e.message : 'Das hat nicht geklappt. Bitte noch einmal.';
    zeigenAnmelden(email);
  }
}

async function codePruefen(form) {
  const code = $('#code', form).value.replace(/\D/g, '');
  const nochmal = (text) => { main.innerHTML = seiteAnmelden(anmeldeAdresse, text); $('#code').focus(); };
  if (code.length < 6) { nochmal('Der Code hat mindestens sechs Ziffern.'); return; }
  const knopf = $('button[type="submit"]', form);
  knopf.disabled = true;
  knopf.textContent = 'Einen Moment …';
  try {
    await api.codePruefen(anmeldeAdresse, code);
    zustand.geladen = false;
    location.hash = '';
    zeigen();
  } catch (e) {
    nochmal(e.code === 'netz' ? e.message : 'Der Code passt nicht oder ist abgelaufen. Schau, ob es der aus der neuesten Mail ist.');
  }
}
function zeigenAnmelden(email = '') {
  main.innerHTML = seiteAnmelden();
  const f = $('#email');
  f.value = email;
  f.focus();
}

/* =====================================================================
 * Ich: Daten
 * ===================================================================== */
async function ichLaden() {
  const [konto, listen, wuensche, lw] = await Promise.all([
    api.lesen('konto', 'select=id,anzeigename'),
    api.lesen('liste', 'select=*&order=angelegt.asc'),
    api.lesen('wunsch', 'select=*&order=angelegt.asc'),
    api.lesen('liste_wunsch', 'select=*'),
  ]);
  zustand.konto = konto[0] || null;
  zustand.listen = listen;
  zustand.wuensche = wuensche;
  zustand.lw = lw;
  const staende = await Promise.all(listen.map((l) => api.rpc('mein_stand', { p_liste: l.id }).catch(() => null)));
  zustand.stand = Object.fromEntries(listen.map((l, i) => [l.id, staende[i]]));
  zustand.geladen = true;
}
const wuenscheVon = (lid) => zustand.lw.filter((x) => x.liste_id === lid)
  .sort((a, b) => a.reihenfolge - b.reihenfolge)
  .map((x) => zustand.wuensche.find((w) => w.id === x.wunsch_id))
  .filter((w) => w && !w.entfernt_am);
const vergebenText = (n) => (n ? `${zahlWort(n, 'Wunsch', 'Wünsche')} vergeben` : 'noch nichts vergeben');

/* ---------- Meine Listen ---------- */
function listenKarte(l) {
  const n = wuenscheVon(l.id).length, v = zustand.stand[l.id] || 0;
  return `<li><a class="geteilt" href="#liste/${l.id}">
    <span class="geteilt-zeichen" aria-hidden="true">${l.archiviert ? SCHMUCK.schleife : PRODUKT.box}</span>
    <span class="geteilt-text"><span class="geteilt-titel">${esc(l.titel)}</span>
      <span class="geteilt-zahl">${l.anlass_datum ? `${datumTagMonat(l.anlass_datum)} · ` : ''}${zahlWort(n, 'Wunsch', 'Wünsche')}${v ? ` · <strong style="white-space:nowrap">${vergebenText(v)}</strong>` : ''}</span></span>
    ${ICON.weiter}</a></li>`;
}

function seiteListen() {
  const offen = zustand.listen.filter((l) => !l.archiviert), zu = zustand.listen.filter((l) => l.archiviert);
  const name = zustand.konto?.anzeigename || '';
  return `<article class="seite seite-listen">
    <header class="liste-kopf">
      <p class="ueberzeile">${name ? `Hallo ${esc(name)}` : 'Hallo'}</p>
      <h1 class="liste-titel" tabindex="-1">Meine Wunschlisten</h1>
      <p class="name-zeile liste-unter"><span>Deine Leute lesen: „<strong>${esc(name || '…')}</strong> wünscht sich“</span><button class="knopf-text" type="button" data-aktion="name">Ändern</button></p>
    </header>
    ${offen.length ? `<ul class="geteilt-liste">${offen.map(listenKarte).join('')}</ul>` : `<div class="leer-karte"><span>${SCHMUCK.schleife}</span><h2>Noch keine Liste</h2><p>Leg eine Liste für einen Anlass an, zum Beispiel Weihnachten. Den Link schickst du dann an deine Leute.</p></div>`}
    <p class="liste-handlung"><button class="knopf" type="button" data-aktion="liste-neu">${ICON.plus}<span>Neue Liste</span></button></p>
    ${zu.length ? `<details class="abgeschlossen"><summary>Abgeschlossen (${zu.length})</summary><ul class="geteilt-liste">${zu.map(listenKarte).join('')}</ul></details>` : ''}
    <footer class="listen-fuss">
      <button class="knopf-text" type="button" data-aktion="export">Alles als Datei sichern</button>
      <button class="knopf-text" type="button" data-aktion="abmelden">Abmelden</button>
    </footer>
  </article>`;
}

/* ---------- Eine Liste ---------- */
function seiteListe(id) {
  const L = zustand.listen.find((l) => l.id === id);
  if (!L) {
    return `<article class="seite fehlerseite"><h1 class="seiten-titel" tabindex="-1">Liste nicht gefunden</h1><p><a class="knopf-text" href="#">Zu meinen Listen</a></p></article>`;
  }
  const ws = wuenscheVon(L.id);
  const andere = zustand.wuensche.filter((w) => !w.entfernt_am && !zustand.lw.some((x) => x.liste_id === L.id && x.wunsch_id === w.id));
  const v = zustand.stand[L.id] || 0;
  return `<article class="seite seite-liste">
    <header class="liste-kopf">
      <a class="zurueck" href="#">${ICON.weiter}<span>Meine Listen</span></a>
      <h1 class="liste-titel" tabindex="-1">${esc(L.titel)}</h1>
      <p class="liste-unter">${L.anlass_datum ? `${datumLang(L.anlass_datum)} · ` : ''}${zahlWort(ws.length, 'Wunsch', 'Wünsche')}${L.archiviert ? ' · abgeschlossen' : ''}</p>
    </header>
    <div class="liste-oben">
      <ul class="werkzeug">
        ${L.archiviert ? '' : `<li><button class="werkzeug-zeile" type="button" data-aktion="teilen">${ICON.link}<span>Link teilen</span><span class="leise">an deine Leute</span></button></li>
        <li><a class="werkzeug-zeile" href="#l/${esc(L.link_schluessel)}">${ICON.auge}<span>So sehen es deine Leute</span>${ICON.weiter}</a></li>`}
        <li><button class="werkzeug-zeile" type="button" data-aktion="liste-bearbeiten">${ICON.stift}<span>Liste bearbeiten</span>${ICON.weiter}</button></li>
      </ul>
      <section aria-labelledby="stand-titel">
        <h2 class="nur-leser" id="stand-titel">Stand</h2>
        <p class="stand-zahl"><strong>${v}</strong><span>${v === 1 ? 'Wunsch vergeben' : 'Wünsche vergeben'}</span></p>
        <p class="stand-hinweis">Welche, siehst du nicht. So bleibt es eine Überraschung.</p>
      </section>
    </div>
    <section aria-labelledby="wuensche-titel">
      <h2 class="abschnitt" id="wuensche-titel">Wünsche</h2>
      ${ws.length ? `<ol class="wunsch-liste ich">${ws.map(ichKarte).join('')}</ol>` : `<div class="leer-karte"><span>${PRODUKT.box}</span><h2>Noch leer</h2><p>Kopier einen Link aus einem Shop und füg ihn ein. Bild, Titel und Preis holt das Freundebuch selbst.</p></div>`}
      <p class="liste-handlung"><button class="knopf" type="button" data-aktion="wunsch-neu">${ICON.plus}<span>Wunsch hinzufügen</span></button></p>
    </section>
    ${andere.length ? `<section class="andere" aria-labelledby="andere-titel" style="margin-top:42px">
      <h2 class="abschnitt" id="andere-titel">Aus deinen anderen Wünschen</h2>
      <ol class="wunsch-liste ich">${andere.map((w) => `<li class="wunsch" data-wunsch="${w.id}">${bild(w)}${kartenText(w, `<button class="knopf-text wunsch-bearbeiten" type="button" data-aktion="dazunehmen" data-wunsch-id="${w.id}">Auf diese Liste</button>`)}</li>`).join('')}</ol>
    </section>` : ''}
  </article>`;
}

/* =====================================================================
 * Blatt: Liste, Name, Wunsch
 * ===================================================================== */
const ort = $('#ueber-ort');
function blattOeffnen(art, daten, innen) {
  zustand.blatt = { art, ...daten, zurueck: document.activeElement };
  ort.innerHTML = `<div class="blatt-huelle" data-blatt-huelle>
    <div class="blatt" role="dialog" aria-modal="true" aria-labelledby="blatt-titel"><span class="blatt-griff" aria-hidden="true"></span><div class="blatt-innen">${innen}</div></div></div>`;
  document.body.classList.add('blatt-offen');
  requestAnimationFrame(() => requestAnimationFrame(() => $('.blatt-huelle')?.classList.add('offen')));
  setTimeout(() => ($('.blatt [autofocus]') || $('.blatt input, .blatt button'))?.focus({ preventScroll: true }), ruhig() ? 0 : 60);
}
function blattInnen(innen) {
  $('.blatt-innen').innerHTML = innen;
  ($('.blatt [autofocus]') || $('.blatt input, .blatt button'))?.focus({ preventScroll: true });
}
function blattZu() {
  const h = $('.blatt-huelle');
  if (!h) return;
  const zurueck = zustand.blatt?.zurueck;
  zustand.blatt = null;
  h.classList.remove('offen');
  h.classList.add('zu');
  document.body.classList.remove('blatt-offen');
  setTimeout(() => { if (!zustand.blatt) ort.innerHTML = ''; }, ruhig() ? 0 : 300);
  if (zurueck?.isConnected) zurueck.focus({ preventScroll: true });
}

/* ---------- Liste anlegen / bearbeiten ---------- */
function listeBlatt(L) {
  const jahr = new Date().getFullYear(), monat = new Date().getMonth();
  const vorschlaege = L ? [] : [[`Weihnachten ${monat === 11 && new Date().getDate() > 26 ? jahr + 1 : jahr}`, `${monat === 11 && new Date().getDate() > 26 ? jahr + 1 : jahr}-12-24`], [`Geburtstag ${jahr + 1}`, '']];
  return `<h2 class="blatt-titel" id="blatt-titel">${L ? 'Liste bearbeiten' : 'Neue Liste'}</h2>
    <form data-form="liste" novalidate>
      <label class="feld feld-titel"><span class="feld-name">Anlass</span><input id="liste-titel" type="text" maxlength="60" required value="${esc(L?.titel || '')}" placeholder="z. B. Weihnachten" autofocus></label>
      ${vorschlaege.length ? `<div class="chips">${vorschlaege.map(([t, d]) => `<button class="chip" type="button" data-aktion="liste-vorschlag" data-titel="${esc(t)}" data-datum="${d}">${esc(t)}</button>`).join('')}</div>` : ''}
      <label class="feld"><span class="feld-name">Datum (freiwillig)</span><input id="liste-datum" type="date" value="${esc(L?.anlass_datum || '')}"></label>
      <p class="feld-fehler" id="liste-fehler" role="alert" hidden></p>
      <div class="blatt-fuss">
        ${L ? `<span class="links">${L.archiviert ? '<button class="knopf-text" type="button" data-aktion="liste-oeffnen">Wieder öffnen</button>' : '<button class="knopf-text" type="button" data-aktion="liste-abschliessen">Abschließen</button>'}${zustand.stand[L.id] ? '' : '<button class="knopf-text warnung" type="button" data-aktion="liste-loeschen">Löschen</button>'}</span>` : ''}
      ${L && zustand.stand[L.id] ? '<p class="feld-unter">Auf dieser Liste ist schon etwas vergeben. Löschen geht deshalb nicht mehr, abschließen schon.</p>' : ''}
        <button class="knopf-rand" type="button" data-aktion="blatt-zu">Abbrechen</button>
        <button class="knopf" type="submit">${L ? 'Speichern' : 'Anlegen'}</button>
      </div>
    </form>`;
}

async function listeSpeichern() {
  const titel = $('#liste-titel').value.trim(), datumWert = $('#liste-datum').value || null;
  if (!titel) {
    $('#liste-titel').setAttribute('aria-invalid', 'true');
    Object.assign($('#liste-fehler'), { hidden: false, textContent: 'Bitte gib der Liste einen Namen, z. B. Weihnachten.' });
    $('#liste-titel').focus();
    return;
  }
  const L = zustand.blatt.liste;
  try {
    if (L) {
      Object.assign(L, await api.aendern('liste', `id=eq.${L.id}`, { titel, anlass_datum: datumWert }));
      blattZu(); zeigen(); hinweis('Gespeichert');
    } else {
      const neu = await api.anlegen('liste', { titel, anlass_datum: datumWert });
      zustand.listen.push(neu);
      zustand.stand[neu.id] = 0;
      blattZu();
      location.hash = `#liste/${neu.id}`;
    }
  } catch (e) { fehlerZeigen(e); }
}

/* ---------- Name ---------- */
function nameBlatt() {
  return `<h2 class="blatt-titel" id="blatt-titel">Dein Name auf den Listen</h2>
    <form data-form="name" novalidate>
      <label class="feld feld-titel"><span class="feld-name">So steht es oben: „… wünscht sich“</span><input id="anzeigename" type="text" maxlength="40" autocomplete="given-name" value="${esc(zustand.konto?.anzeigename || '')}" autofocus></label>
      <div class="blatt-fuss"><button class="knopf-rand" type="button" data-aktion="blatt-zu">Abbrechen</button><button class="knopf" type="submit">Speichern</button></div>
    </form>`;
}

/* ---------- Wunsch ---------- */
function wunschLinkBlatt(fehler = '') {
  const handy = matchMedia('(pointer: coarse)').matches && navigator.clipboard?.readText;
  return `<h2 class="blatt-titel" id="blatt-titel">Wunsch hinzufügen</h2>
    <form data-form="wunsch-link" novalidate>
      <label class="feld"><span class="feld-name">Link aus dem Shop</span>
        <span class="link-feld"><input class="eingabe" id="wunsch-link" type="url" inputmode="url" autocomplete="off" placeholder="https://…" enterkeyhint="go" ${handy ? '' : 'autofocus'}>
        ${handy ? `<button class="knopf-rand" type="button" data-aktion="einfuegen">${ICON.einfuegen}<span>Einfügen</span></button>` : ''}</span></label>
      ${fehler ? `<p class="feld-fehler" role="alert">${esc(fehler)}</p>` : ''}
      <p class="feld-unter">Bild, Titel und Preis holt das Freundebuch selbst. Alles lässt sich danach ändern.</p>
      <p class="ohne-link"><button class="knopf-text" type="button" data-aktion="ohne-link">Ohne Link weiter</button></p>
      <div class="blatt-fuss">
        <button class="knopf-rand" type="button" data-aktion="blatt-zu">Abbrechen</button>
        <button class="knopf" type="submit">Weiter</button>
      </div>
    </form>`;
}

function wunschFormBlatt(w, neu) {
  const fehlt = neu && w.shop_url && !w.gefunden;
  return `<h2 class="blatt-titel" id="blatt-titel">${neu ? 'Wunsch hinzufügen' : 'Wunsch bearbeiten'}</h2>
    <form data-form="wunsch" novalidate>
      ${fehlt ? '<p class="feld-unter" style="margin-top:-6px">Der Shop hat nichts verraten. Trag ein, was du weißt; ein Bild ist kein Muss.</p>' : ''}
      <div class="blatt-bild">${bild({ ...w, shop_url: '' })}
        ${w.bild_pfad ? '<button class="knopf-text" type="button" data-aktion="bild-weg">Ohne Bild</button>' : '<span class="feld-unter">Kein Bild. Auf der Karte steht eine kleine Zeichnung.</span>'}</div>
      <label class="feld feld-titel"><span class="feld-name">Titel</span><input id="w-titel" type="text" maxlength="120" required value="${esc(w.titel || '')}" autofocus></label>
      <label class="feld"><span class="feld-name">Kurz dazu (freiwillig)</span><textarea id="w-besch" maxlength="400" rows="2" placeholder="Farbe, Größe, was dir wichtig ist">${esc(w.beschreibung || '')}</textarea></label>
      <div class="feld-reihe">
        <label class="feld"><span class="feld-name">Preis</span><span class="euro"><input id="w-preis" type="text" inputmode="decimal" value="${w.preis_ca != null ? esc(String(w.preis_ca).replace('.', ',')) : ''}"></span></label>
        <label class="feld"><span class="feld-name">Händler</span><input id="w-haendler" type="text" maxlength="40" value="${esc(w.haendler || '')}"></label>
      </div>
      <label class="feld"><span class="feld-name">Link zum Shop</span><input id="w-link" type="url" inputmode="url" autocomplete="off" value="${esc(w.shop_url || '')}" placeholder="https://…"></label>
      <label class="schalter"><input id="w-zusammen" type="checkbox" role="switch" ${w.zusammenlegen ? 'checked' : ''}>
        <span class="schalter-text"><strong>Zum Zusammenlegen</strong><span>Für Teures: Mehrere können sich beteiligen, statt dass einer es allein schenkt.</span></span></label>
      <p class="feld-fehler" id="w-fehler" role="alert" hidden></p>
      <div class="blatt-fuss">
        ${neu ? '' : '<span class="links"><button class="knopf-text warnung" type="button" data-aktion="wunsch-entfernen">Entfernen</button></span>'}
        <button class="knopf-rand" type="button" data-aktion="blatt-zu">Abbrechen</button>
        <button class="knopf" type="submit">${neu ? 'Hinzufügen' : 'Speichern'}</button>
      </div>
    </form>`;
}

async function linkPruefen(roh) {
  const url = roh.trim().match(/https?:\/\/\S+/)?.[0] || (/^[\w-]+(\.[\w-]+)+\/?\S*$/.test(roh.trim()) ? `https://${roh.trim()}` : '');
  if (!url) { blattInnen(wunschLinkBlatt('Das sieht nicht wie ein Link aus.')); $('#wunsch-link').value = roh; return; }
  blattInnen(`<h2 class="blatt-titel" id="blatt-titel">Wunsch hinzufügen</h2>${laden('Ich schaue im Shop nach …')}`);
  let v;
  try { v = await api.vorschau(url); } catch { v = { titel: '', shop_url: url, gefunden: false }; }
  if (!zustand.blatt) return;
  zustand.blatt.wunsch = { titel: v.titel === 'Wunsch' ? '' : v.titel, beschreibung: v.beschreibung || '', preis_ca: v.preis_ca ?? null, haendler: v.haendler || '', shop_url: v.shop_url || url, bild_pfad: v.bild_pfad || null, gefunden: v.gefunden && Boolean(v.titel) };
  blattInnen(wunschFormBlatt(zustand.blatt.wunsch, true));
}

function preisLesen(t) {
  if (!t.trim()) return null;
  if (/[^\d,.\s€]/.test(t.replace(/ca\.?/i, ''))) return NaN;
  let s = t.replace(/[^\d,.]/g, '');
  if (!s) return NaN;
  /* Deutsch: Punkt trennt Tausender (1.299), Komma die Cent (39,90). „39.90“ geht auch. */
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const n = Number(s);
  return Number.isFinite(n) && n < 1e8 ? Math.round(n * 100) / 100 : NaN;
}

async function wunschSpeichern() {
  const b = zustand.blatt, w = b.wunsch, neu = !w.id;
  const titel = $('#w-titel').value.trim(), preis = preisLesen($('#w-preis').value);
  let link = $('#w-link').value.trim();
  if (link && !/^https?:\/\//i.test(link)) link = `https://${link}`;
  const fehler = $('#w-fehler');
  if (!titel) { $('#w-titel').setAttribute('aria-invalid', 'true'); fehler.hidden = false; fehler.textContent = 'Bitte einen Titel eintragen, damit man weiß, was es ist.'; $('#w-titel').focus(); return; }
  if (Number.isNaN(preis)) { fehler.hidden = false; fehler.textContent = 'Den Preis bitte als Zahl, z. B. 39,90.'; $('#w-preis').focus(); return; }
  const werte = {
    titel, beschreibung: $('#w-besch').value.trim(), preis_ca: preis, haendler: $('#w-haendler').value.trim(),
    shop_url: link || null, zusammenlegen: $('#w-zusammen').checked, bild_pfad: w.bild_pfad || null,
    preis_stand: preis == null ? null : preis === (w.preis_ca == null ? null : Number(w.preis_ca)) && w.preis_stand ? w.preis_stand : heute(),
  };
  const knopf = $('.blatt button[type="submit"]');
  knopf.disabled = true;
  try {
    if (neu) {
      const angelegt = await api.anlegen('wunsch', werte);
      const reihe = Math.max(0, ...zustand.lw.filter((x) => x.liste_id === b.liste).map((x) => x.reihenfolge)) + 1;
      zustand.lw.push(await api.anlegen('liste_wunsch', { liste_id: b.liste, wunsch_id: angelegt.id, reihenfolge: reihe }));
      zustand.wuensche.push(angelegt);
      blattZu(); zeigen(); hinweis(`${titel} · auf der Liste`);
      $(`[data-wunsch="${angelegt.id}"]`)?.scrollIntoView({ block: 'center', behavior: ruhig() ? 'auto' : 'smooth' });
    } else {
      Object.assign(w, await api.aendern('wunsch', `id=eq.${w.id}`, werte));
      blattZu(); zeigen(); hinweis('Gespeichert');
    }
  } catch (e) { knopf.disabled = false; fehlerZeigen(e); }
}

/* ---------- Teilen, Export ---------- */
async function teilen(L) {
  const link = gastLink(L.link_schluessel);
  const text = `Meine Wunschliste: ${L.titel}. Such dir etwas aus, dann schenkt niemand doppelt.`;
  if (navigator.share && matchMedia('(pointer: coarse)').matches) {
    try { await navigator.share({ title: L.titel, text, url: link }); return; } catch (e) { if (e?.name === 'AbortError') return; }
  }
  try { await navigator.clipboard.writeText(link); hinweis('Link kopiert'); }
  catch { prompt('Link zum Kopieren:', link); }
}

async function exportieren() {
  hinweis('Datei wird gepackt …');
  try {
    await ichLaden();
    const daten = {
      erstellt: new Date().toISOString(),
      hinweis: 'Freundebuch-Export. Reservierungen sind nicht enthalten: Was dir jemand schenkt, bleibt eine Überraschung.',
      konto: zustand.konto, listen: zustand.listen, wuensche: zustand.wuensche, liste_wunsch: zustand.lw,
    };
    const dateien = [{ name: 'freundebuch.json', daten: JSON.stringify(daten, null, 2) }];
    for (const w of zustand.wuensche.filter((x) => x.bild_pfad)) {
      try {
        const r = await fetch(api.bildUrl(w.bild_pfad));
        if (r.ok) dateien.push({ name: `bilder/${w.bild_pfad}`, daten: new Uint8Array(await r.arrayBuffer()) });
      } catch { /* Bild fehlt, Rest geht trotzdem */ }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(zip(dateien));
    a.download = `freundebuch-${heute()}.zip`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    hinweis('Datei gesichert');
  } catch (e) { fehlerZeigen(e); }
}

/* =====================================================================
 * Anzeigen
 * ===================================================================== */
const main = $('#inhalt');
let anzeigeNr = 0;
async function zeigen() {
  const nr = ++anzeigeNr;
  const r = route();
  document.body.dataset.seite = r.teil;
  if (zustand.blatt) blattZu();
  let html;
  try {
    if (r.teil === 'gast') {
      if (zustand.gastSchluessel !== r.id || !zustand.gast) {
        main.innerHTML = `<div class="seite">${laden()}</div>`;
        offenDabei = null;
        await gastLaden(r.id);
      }
      html = seiteGast();
      document.title = zustand.gast ? `${zustand.gast.besitzer} wünscht sich · ${zustand.gast.titel}` : 'Freundebuch';
    } else if (!api.angemeldet()) {
      html = seiteAnmelden();
      document.title = 'Anmelden · Freundebuch';
    } else {
      if (!zustand.geladen) {
        main.innerHTML = `<div class="seite">${laden()}</div>`;
        await ichLaden();
      }
      if (r.teil === 'liste') {
        html = seiteListe(r.id);
        document.title = `${zustand.listen.find((l) => l.id === r.id)?.titel || 'Liste'} · Freundebuch`;
      } else {
        html = seiteListen();
        document.title = 'Meine Wunschlisten · Freundebuch';
      }
    }
  } catch (e) {
    if (!api.angemeldet() && r.teil !== 'gast') { zustand.geladen = false; html = seiteAnmelden(); }
    else html = `<article class="seite fehlerseite"><h1 class="seiten-titel" tabindex="-1">Gerade nicht erreichbar</h1><p>${esc(e.code === 'netz' ? e.message : 'Bitte gleich noch einmal versuchen.')}</p><p><button class="knopf-rand" type="button" data-aktion="neu-laden">Noch einmal</button></p></article>`;
  }
  if (nr !== anzeigeNr) return;
  main.innerHTML = html;
  window.scrollTo(0, 0);
  if (!zustand.ersteAnzeige) $('[tabindex="-1"]', main)?.focus({ preventScroll: true });
  zustand.ersteAnzeige = false;
}

/* ---------- Ereignisse ---------- */
document.addEventListener('click', async (ev) => {
  if (ev.target.matches('[data-blatt-huelle]')) { blattZu(); return; }
  const el = ev.target.closest('[data-aktion]');
  if (!el) return;
  const a = el.dataset.aktion;
  const L = zustand.listen.find((l) => l.id === route().id);
  switch (a) {
    case 'schenke': case 'dabei': case 'dabei-fragen': case 'dabei-abbrechen': case 'zuruecknehmen': case 'voll': case 'doch-nicht':
      gastHandlung(a, el.closest('[data-wunsch]')); break;
    case 'blatt-zu': blattZu(); break;
    case 'neu-laden': zustand.gast = null; zustand.geladen = false; zeigen(); break;
    case 'anmelden-zurueck': zeigenAnmelden(anmeldeAdresse); break;
    case 'abmelden': await api.abmelden(); Object.assign(zustand, { geladen: false, konto: null, listen: [], wuensche: [], lw: [] }); location.hash = ''; zeigen(); break;
    case 'export': exportieren(); break;
    case 'name': blattOeffnen('name', {}, nameBlatt()); break;
    case 'liste-neu': blattOeffnen('liste', { liste: null }, listeBlatt(null)); break;
    case 'liste-vorschlag': $('#liste-titel').value = el.dataset.titel; if (el.dataset.datum) $('#liste-datum').value = el.dataset.datum; $('#liste-titel').focus(); break;
    case 'liste-bearbeiten': blattOeffnen('liste', { liste: L }, listeBlatt(L)); break;
    case 'liste-abschliessen': case 'liste-oeffnen': {
      const zuMachen = a === 'liste-abschliessen';
      if (zuMachen && el.dataset.sicher !== 'ja') { el.dataset.sicher = 'ja'; el.textContent = 'Wirklich abschließen?'; return; }
      try {
        Object.assign(zustand.blatt.liste, await api.aendern('liste', `id=eq.${zustand.blatt.liste.id}`, { archiviert: zuMachen }));
        blattZu(); zeigen(); hinweis(zuMachen ? 'Abgeschlossen. Der Link zeigt jetzt nur noch „abgeschlossen“.' : 'Wieder offen');
      } catch (e) { fehlerZeigen(e); }
      break;
    }
    case 'liste-loeschen': {
      if (el.dataset.sicher !== 'ja') { el.dataset.sicher = 'ja'; el.textContent = 'Wirklich löschen? Der Link geht dann nicht mehr.'; return; }
      try {
        await api.loeschen('liste', `id=eq.${zustand.blatt.liste.id}`);
        zustand.geladen = false; blattZu(); location.hash = ''; hinweis('Liste gelöscht');
      } catch (e) { e.message?.includes('liste_vergeben') ? hinweis('Auf dieser Liste ist schon etwas vergeben. Schließ sie stattdessen ab.') : fehlerZeigen(e); }
      break;
    }
    case 'teilen': if (L) teilen(L); break;
    case 'wunsch-neu': blattOeffnen('wunsch', { liste: L.id }, wunschLinkBlatt()); break;
    case 'einfuegen': {
      try { const t = await navigator.clipboard.readText(); $('#wunsch-link').value = t; if (t.trim()) linkPruefen(t); } catch { $('#wunsch-link').focus(); }
      break;
    }
    case 'ohne-link': zustand.blatt.wunsch = { titel: '', beschreibung: '', preis_ca: null, haendler: '', shop_url: '', bild_pfad: null }; blattInnen(wunschFormBlatt(zustand.blatt.wunsch, true)); break;
    case 'bild-weg': zustand.blatt.wunsch.bild_pfad = null; $('.blatt-bild').innerHTML = `${bild({ ...zustand.blatt.wunsch, shop_url: '' })}<span class="feld-unter">Kein Bild. Auf der Karte steht eine kleine Zeichnung.</span>`; break;
    case 'wunsch-bearbeiten': {
      const w = zustand.wuensche.find((x) => x.id === el.dataset.wunschId);
      blattOeffnen('wunsch', { liste: L?.id, wunsch: w }, wunschFormBlatt(w, false));
      break;
    }
    case 'wunsch-entfernen': {
      const w = zustand.blatt.wunsch;
      const mehr = zustand.lw.filter((x) => x.wunsch_id === w.id).length > 1;
      if (el.dataset.sicher !== 'ja') { el.dataset.sicher = 'ja'; el.textContent = mehr ? 'Von allen Listen entfernen?' : 'Wirklich entfernen?'; return; }
      try {
        Object.assign(w, await api.aendern('wunsch', `id=eq.${w.id}`, { entfernt_am: new Date().toISOString() }));
        blattZu(); zeigen(); hinweis(`${w.titel} · entfernt`);
      } catch (e) { fehlerZeigen(e); }
      break;
    }
    case 'dazunehmen': {
      const reihe = Math.max(0, ...zustand.lw.filter((x) => x.liste_id === L.id).map((x) => x.reihenfolge)) + 1;
      try {
        zustand.lw.push(await api.anlegen('liste_wunsch', { liste_id: L.id, wunsch_id: el.dataset.wunschId, reihenfolge: reihe }));
        zeigen(); hinweis('Auf der Liste');
      } catch (e) { fehlerZeigen(e); }
      break;
    }
    default: break;
  }
});

document.addEventListener('submit', async (ev) => {
  const f = ev.target.closest('[data-form]');
  if (!f) return;
  ev.preventDefault();
  switch (f.dataset.form) {
    case 'anmelden': anmelden(f); break;
    case 'code': codePruefen(f); break;
    case 'liste': listeSpeichern(); break;
    case 'wunsch-link': linkPruefen($('#wunsch-link').value); break;
    case 'wunsch': wunschSpeichern(); break;
    case 'name': {
      const name = $('#anzeigename').value.trim().slice(0, 40);
      try {
        zustand.konto = await api.aendern('konto', `id=eq.${zustand.konto.id}`, { anzeigename: name });
        blattZu(); zeigen(); hinweis('Gespeichert');
      } catch (e) { fehlerZeigen(e); }
      break;
    }
    default: break;
  }
});

/* Eingefügter Link wird sofort geprüft. */
document.addEventListener('paste', (ev) => {
  if (ev.target.id !== 'wunsch-link') return;
  const t = ev.clipboardData?.getData('text') || '';
  if (/https?:\/\//.test(t)) { ev.preventDefault(); ev.target.value = t; linkPruefen(t); }
});

document.addEventListener('keydown', (ev) => {
  if (ev.target.id?.startsWith('vorname-') && ev.key === 'Enter') {
    ev.preventDefault();
    gastHandlung('dabei', ev.target.closest('[data-wunsch]'));
    return;
  }
  if (!zustand.blatt) return;
  if (ev.key === 'Escape') { ev.preventDefault(); blattZu(); return; }
  if (ev.key === 'Tab') {
    const fokusbar = $$('.blatt button:not([disabled]), .blatt input, .blatt textarea, .blatt a[href]');
    const [erstes, letztes] = [fokusbar[0], fokusbar[fokusbar.length - 1]];
    if (ev.shiftKey && document.activeElement === erstes) { ev.preventDefault(); letztes.focus(); }
    else if (!ev.shiftKey && document.activeElement === letztes) { ev.preventDefault(); erstes.focus(); }
  }
});

addEventListener('hashchange', zeigen);

/* Start: Kommt jemand über den Link aus der Mail, steht die Sitzung in der Adresse. */
const angekommen = api.sitzungAusAdresse();
if (angekommen?.fehler) zustand.anmeldeFehler = 'Der Link ist abgelaufen oder wurde schon benutzt. Lass dir einen neuen schicken.';
zeigen();
