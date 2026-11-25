/* Freundebuch: Wunschliste, Anmelden, Seitenwechsel. ES-Module ohne Build; das Personenbuch (buch.js) lädt erst,
 * wenn ich angemeldet bin.
 * Gäste kommen über #l/<Schlüssel> ohne Konto; ich melde mich per Link aus der Mail an.
 * Was reserviert ist, erfährt nur der Gast selbst (über sein Gerät); meine Ansicht bekommt nur die Zahl. */
import * as api from './api.js';
import { PRODUKT, SCHMUCK } from './zeichnungen.js';
import { zip } from './zip.js';
import {
  $, $$, esc, ruhig, warte, heute, datumLang, datumTagMonat, euro, undListe, zahlWort, gastLink,
  ICON, laden, zustand, VORNAME, hinweis, fehlerZeigen, blattOeffnen, blattInnen, blattZu, blattZuNach, app,
} from './basis.js';

/* ---------- Route ---------- */
function route() {
  const h = decodeURIComponent(location.hash.slice(1));
  const [teil, id] = h.split('/');
  if (teil === 'l' && id) return { teil: 'gast', id };
  if (teil === 'liste' && id) return { teil: 'liste', id };
  if (teil === 'person' && id) return { teil: 'person', id };
  if (['menschen', 'suche', 'ich', 'einstellungen'].includes(teil)) return { teil };
  return { teil: 'start' };
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

/* Eine Zeile unter dem Titel: Preis · Größe · wie oft (beim Gast: wie viele noch zu haben sind). */
function metaZeile(w, gast = false) {
  const teile = [];
  if (w.preis_ca != null) teile.push(`<span class="preis">${euro(w.preis_ca)}</span>`);
  if (w.groesse) teile.push(`<span>Größe ${esc(w.groesse)}</span>`);
  const menge = w.menge || 1;
  if (menge > 1) {
    const noch = w.noch ?? menge;
    teile.push(`<span class="menge">${!gast ? `${menge}×` : w.stand === 'von_dir' ? `1 von ${menge}` : `noch ${noch} zu haben`}</span>`);
  }
  if (!gast && w.zusammenlegen) teile.push(`<span class="menge">zusammen</span>`);
  if (gast && w.haendler) teile.push(`<span class="leise">${esc(w.haendler)}</span>`);
  return teile.join('');
}

function kartenText(w, zusatz = '') {
  /* Das Shop-Zeichen bleibt beim letzten Wort, statt allein in eine neue Zeile zu rutschen. */
  const worte = String(w.titel).split(' '), letztes = worte.pop();
  const titel = w.shop_url
    ? `<a ${shopAttr(w)}>${worte.length ? `${esc(worte.join(' '))} ` : ''}<span class="zusammenhalt">${esc(letztes)}${ICON.raus}</span><span class="nur-leser"> (zum Shop)</span></a>`
    : esc(w.titel);
  const meta = metaZeile(w, true);
  return `<div class="wunsch-text">
      <h3 class="wunsch-titel">${titel}</h3>
      ${meta ? `<p class="wunsch-meta">${meta}</p>` : ''}
      ${w.beschreibung ? `<p class="wunsch-besch">${esc(w.beschreibung)}</p>` : ''}
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

/* Meine Ansicht: jeder Wunsch eine kleine Pille. Antippen öffnet ihn zum Bearbeiten (oder nimmt ihn auf die Liste). */
function pille(w, aktion = 'wunsch-bearbeiten') {
  const meta = metaZeile(w);
  return `<li class="pille" data-wunsch="${w.id}">
    <button class="pille-knopf" type="button" data-aktion="${aktion}" data-wunsch-id="${w.id}">
      ${bild({ ...w, shop_url: '' })}
      <span class="pille-text"><span class="pille-titel">${esc(w.titel)}</span>${meta ? `<span class="pille-meta">${meta}</span>` : ''}</span>
      <span class="pille-zeichen">${aktion === 'dazunehmen' ? ICON.plus : ICON.stift}</span>
      <span class="nur-leser">${aktion === 'dazunehmen' ? ', auf diese Liste nehmen' : ', bearbeiten'}</span>
    </button>
  </li>`;
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

const vorschauZurueck = () => { const l = zustand.listen.find((x) => x.link_schluessel === zustand.gastSchluessel); return l ? `#liste/${l.id}` : '#ich'; };
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
    ${g.vorschau ? `<p class="vorschau-band"><strong>Vorschau</strong><span>So sehen es deine Leute. Was vergeben ist, siehst du hier nicht.</span><a class="knopf-text" href="${vorschauZurueck()}">Zurück</a></p>` : ''}
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
function codeForm(fehler) {
  return `<form class="anmelden-form" data-form="code" novalidate>
      <label class="feld"><span class="feld-name">Code</span><input id="code" class="code-feld" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]*" maxlength="10" required ${fehler ? 'aria-invalid="true"' : ''}></label>
      ${fehler ? `<p class="feld-fehler" role="alert">${esc(fehler)}</p>` : ''}
      <button class="knopf" type="submit">Anmelden</button>
    </form>`;
}

/* art: 'gesendet' (Link ist unterwegs) oder 'code' (Code von einem angemeldeten Gerät eingeben). */
function seiteAnmelden(adresse, fehler = '', art = 'gesendet') {
  const kopf = (titel) => `<div class="anmelden-schmuck" aria-hidden="true">${SCHMUCK.stern}</div><h1 class="seiten-titel" tabindex="-1">${titel}</h1>`;
  if (adresse && art === 'code') {
    return `<article class="seite seite-anmelden">${kopf('Code eingeben')}
      <p class="anmelden-text">Den Code zeigt dir das Freundebuch dort, wo du schon angemeldet bist (zum Beispiel in Safari nach dem Link aus der Mail): unten auf „Code für die App“.</p>
      ${codeForm(fehler)}
      <p style="margin-top:18px"><button class="knopf-text" type="button" data-aktion="anmelden-zurueck">Zurück</button></p>
    </article>`;
  }
  if (adresse) {
    return `<article class="seite seite-anmelden">${kopf('Schau in dein Postfach')}
      <p class="anmelden-text">Der Link ist unterwegs an ${esc(adresse)}. Tipp ihn an, dann bist du drin und bleibst es.</p>
      <section class="post">
        <h2>Du nutzt die App auf dem Home-Bildschirm?</h2>
        <p>Der Link öffnet Safari. Tipp dort unten auf „Code für die App“ und gib den Code hier ein.</p>
        ${codeForm(fehler)}
      </section>
      <p style="margin-top:18px"><button class="knopf-text" type="button" data-aktion="anmelden-zurueck">Andere Adresse</button></p>
    </article>`;
  }
  return `<article class="seite seite-anmelden">${kopf('Anmelden')}
    <p class="anmelden-text">Du bekommst einen Link per Mail. Kein Kennwort.</p>
    <form class="anmelden-form" data-form="anmelden" novalidate>
      <label class="feld"><span class="feld-name">E-Mail</span><input id="email" type="email" autocomplete="email" inputmode="email" required></label>
      ${zustand.anmeldeFehler ? `<p class="feld-fehler" role="alert">${esc(zustand.anmeldeFehler)}</p>` : ''}
      <button class="knopf" type="submit">Link schicken</button>
    </form>
    <p style="margin-top:14px"><button class="knopf-text" type="button" data-aktion="code-eingeben">Ich habe schon einen Code</button></p>
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
  const art = $('.seite-anmelden h1')?.textContent === 'Code eingeben' ? 'code' : 'gesendet';
  const nochmal = (text) => { main.innerHTML = seiteAnmelden(anmeldeAdresse, text, art); $('#code').focus(); };
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
    nochmal(e.code === 'netz' ? e.message : 'Der Code passt nicht oder ist abgelaufen. Hol dir einen neuen.');
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
async function ichLaden(versuch = 0, hintergrund = false) {
  const nr = api.schreibNr;
  const [konto, listen, wuensche, lw, buchDaten] = await Promise.all([
    api.lesen('konto', 'select=id,anzeigename'),
    api.lesen('liste', 'select=*&order=angelegt.asc'),
    api.lesen('wunsch', 'select=*&order=angelegt.asc'),
    api.lesen('liste_wunsch', 'select=*'),
    buch.holen(),
  ]);
  const staende = await Promise.all(listen.map((l) => api.rpc('mein_stand', { p_liste: l.id }).catch(() => null)));
  /* Wurde unterwegs etwas geschrieben, ist das Geholte womöglich älter als das im Gerät. */
  if (nr !== api.schreibNr && versuch < 3) return ichLaden(versuch + 1, hintergrund);
  /* Ein offenes Blatt arbeitet mit den jetzigen Zeilen; das Neueste kommt danach. */
  if (hintergrund && (zustand.blatt || zustand.menue || nr !== api.schreibNr)) { zustand.nachholen = true; return; }
  Object.assign(zustand, { konto: konto[0] || null, listen, wuensche, lw, stand: Object.fromEntries(listen.map((l, i) => [l.id, staende[i]])) });
  buch.uebernehmen(buchDaten);
  zustand.geladen = true;
  zustand.frisch = Date.now();
}
/* Das Personenbuch lädt nur, wer angemeldet ist. */
let buch = null;
const buchLaden = async () => { buch ??= await import('./buch.js'); };
/* Im Hintergrund nachsehen, was es Neues gibt (anderes Gerät); gezeichnet wird nur, wenn gerade nichts offen ist. */
let frischt = false;
async function auffrischen() {
  if (frischt || !api.angemeldet() || !buch || route().teil === 'gast') return;
  frischt = true;
  try {
    const vorher = JSON.stringify([zustand.konto, zustand.listen, zustand.wuensche, zustand.lw, zustand.stand, zustand.buch]);
    await buch.ausgangLeeren();
    await ichLaden(0, true);
    const tippt = document.activeElement?.matches('input, textarea, select');
    if (!zustand.blatt && !zustand.menue && !zustand.neuId && !tippt && route().teil !== 'gast'
      && vorher !== JSON.stringify([zustand.konto, zustand.listen, zustand.wuensche, zustand.lw, zustand.stand, zustand.buch])) zeigen({ still: true });
  } catch (e) {
    if (!api.angemeldet()) zeigen();
  } finally { frischt = false; }
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - (zustand.frisch || 0) > 30000) auffrischen(); });
app.nachBlatt = () => { if (zustand.nachholen) { zustand.nachholen = false; setTimeout(auffrischen, 900); } };
/* Nicht mehr angemeldet (abgelaufen, anderer Tab): nichts Privates zeigen oder behalten. Was noch nicht beim Server ist
 * (Ausgang, angefangener Satz), bleibt für dieses Konto liegen. */
function privatesWeg() {
  try { for (const k of Object.keys(localStorage)) if (/^freundebuch\.(buch|zuletzt)\./.test(k)) localStorage.removeItem(k); } catch { /* kein Speicher */ }
  Object.assign(zustand, { geladen: false, konto: null, listen: [], wuensche: [], lw: [], stand: {}, suchwort: '' });
  zustand.buch = { personen: [], steckbrief: [], beziehungen: [], arten: [], eintraege: [], geschenke: [], abo: null };
}
if (api.melden) api.melden.abgemeldet = () => { privatesWeg(); if (route().teil !== 'gast') zeigen(); };
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
      <span class="geteilt-zahl">${l.anlass_datum ? `${datumTagMonat(l.anlass_datum)} · ` : ''}${zahlWort(n, 'Wunsch', 'Wünsche')}${v ? `<strong>${vergebenText(v)}</strong>` : ''}</span></span>
    ${ICON.weiter}</a></li>`;
}

/* Nach dem Link aus der Mail öffnet das iPhone Safari; die App auf dem Home-Bildschirm braucht einen Code. */
const appHinweis = () => (zustand.perLink && iphoneSafari() ? '<div class="post app-hinweis"><h2>Du nutzt die App auf dem Home-Bildschirm?</h2><p>Dort bist du noch nicht angemeldet. Hol dir einen Code und gib ihn in der App ein.</p><p class="liste-handlung" style="margin-top:12px"><button class="knopf" type="button" data-aktion="code-holen">Code für die App</button></p></div>' : '');

/* ---------- Eine Liste ---------- */
function seiteListe(id) {
  const L = zustand.listen.find((l) => l.id === id);
  if (!L) {
    return `<article class="seite fehlerseite"><h1 class="seiten-titel" tabindex="-1">Liste nicht gefunden</h1><p><a class="knopf-text" href="#ich">Zu meiner Seite</a></p></article>`;
  }
  const ws = wuenscheVon(L.id);
  const andere = zustand.wuensche.filter((w) => !w.entfernt_am && !zustand.lw.some((x) => x.liste_id === L.id && x.wunsch_id === w.id));
  const v = zustand.stand[L.id] || 0;
  return `<article class="seite seite-liste">
    <header class="liste-kopf">
      <a class="zurueck" href="#ich">${ICON.weiter}<span>Meine Seite</span></a>
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
      ${ws.length ? `<ol class="wunsch-liste ich">${ws.map((w) => pille(w)).join('')}</ol>` : `<div class="leer-karte"><span>${PRODUKT.box}</span><h2>Noch leer</h2><p>Kopier den Link aus dem Shop und tipp auf „Wunsch hinzufügen“.</p></div>`}
      <p class="liste-handlung"><button class="knopf" type="button" data-aktion="wunsch-neu">${ICON.plus}<span>Wunsch hinzufügen</span></button></p>
    </section>
    ${andere.length ? `<section class="andere" aria-labelledby="andere-titel" style="margin-top:42px">
      <h2 class="abschnitt" id="andere-titel">Aus deinen anderen Wünschen</h2>
      <ol class="wunsch-liste ich">${andere.map((w) => pille(w, 'dazunehmen')).join('')}</ol>
    </section>` : ''}
  </article>`;
}

/* =====================================================================
 * Blatt: Liste, Name, Wunsch
 * ===================================================================== */
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
      blattZu(); zeigen({ still: true }); hinweis('Gespeichert');
    } else {
      const neu = await api.anlegen('liste', { titel, anlass_datum: datumWert });
      zustand.listen.push(neu);
      zustand.stand[neu.id] = 0;
      blattZuNach(`#liste/${neu.id}`);
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
/* Am Handy liest „Wunsch hinzufügen“ gleich die Zwischenablage (das Telefon fragt einmal „Einsetzen“).
 * Liegt dort ein neuer Link, geht es direkt zum Wunsch; sonst kommt dieses Feld. */
function wunschLinkBlatt(fehler = '') {
  return `<h2 class="blatt-titel" id="blatt-titel">Wunsch hinzufügen</h2>
    <form data-form="wunsch-link" novalidate>
      <label class="feld"><span class="feld-name">Link aus dem Shop</span>
        <input class="eingabe" id="wunsch-link" type="url" inputmode="url" autocomplete="off" placeholder="Hier einfügen" enterkeyhint="go" autofocus></label>
      ${fehler ? `<p class="feld-fehler" role="alert">${esc(fehler)}</p>` : ''}
      <p class="ohne-link"><button class="knopf-text" type="button" data-aktion="ohne-link">Ohne Link weiter</button></p>
      <div class="blatt-fuss">
        <button class="knopf-rand" type="button" data-aktion="blatt-zu">Abbrechen</button>
        <button class="knopf" type="submit">Weiter</button>
      </div>
    </form>`;
}

function wunschFormBlatt(w, neu) {
  const fehlt = neu && w.shop_url && !w.gefunden;
  const menge = w.zusammenlegen ? 1 : w.menge || 1;
  return `<h2 class="blatt-titel" id="blatt-titel">${neu ? 'Wunsch hinzufügen' : 'Wunsch bearbeiten'}</h2>
    <form data-form="wunsch" novalidate>
      ${fehlt ? '<p class="feld-unter" style="margin-top:-6px">Der Shop hat nichts verraten. Trag es selbst ein.</p>' : ''}
      <div class="blatt-bild">${bild({ ...w, shop_url: '' })}
        ${w.bild_pfad ? '<button class="knopf-text" type="button" data-aktion="bild-weg">Ohne Bild</button>' : ''}</div>
      <label class="feld feld-titel"><span class="feld-name">Titel</span><input id="w-titel" type="text" maxlength="120" required value="${esc(w.titel || '')}" autofocus></label>
      <div class="feld-reihe">
        <label class="feld"><span class="feld-name">Preis</span><span class="euro"><input id="w-preis" type="text" inputmode="decimal" value="${w.preis_ca != null ? esc(String(w.preis_ca).replace('.', ',')) : ''}"></span></label>
        <label class="feld"><span class="feld-name">Größe</span><input id="w-groesse" type="text" maxlength="20" autocomplete="off" placeholder="z. B. M" value="${esc(w.groesse || '')}"></label>
      </div>
      <div class="menge-zeile"><span class="feld-name" id="menge-name">Wie oft</span>
        <span class="zaehler" role="group" aria-labelledby="menge-name">
          <button class="zaehler-knopf" type="button" data-aktion="menge" data-schritt="-1" aria-label="Einmal weniger" ${menge <= 1 || w.zusammenlegen ? 'disabled' : ''}>−</button>
          <output id="w-menge" aria-live="polite">${menge}</output>
          <button class="zaehler-knopf" type="button" data-aktion="menge" data-schritt="1" aria-label="Einmal mehr" ${menge >= 9 || w.zusammenlegen ? 'disabled' : ''}>+</button>
        </span></div>
      <label class="feld"><span class="feld-name">Notiz (freiwillig)</span><input id="w-besch" type="text" maxlength="400" autocomplete="off" placeholder="z. B. Farbe" value="${esc(w.beschreibung || '')}"></label>
      <label class="feld"><span class="feld-name">Link zum Shop</span><input id="w-link" type="url" inputmode="url" autocomplete="off" value="${esc(w.shop_url || '')}" placeholder="https://…"></label>
      <label class="schalter"><input id="w-zusammen" type="checkbox" role="switch" ${w.zusammenlegen ? 'checked' : ''}>
        <span class="schalter-text"><strong>Zum Zusammenlegen</strong><span>Mehrere schenken es gemeinsam.</span></span></label>
      ${neu && zustand.blatt && !zustand.blatt.liste ? listenWahl() : ''}
      <p class="feld-fehler" id="w-fehler" role="alert" hidden></p>
      <div class="blatt-fuss">
        ${neu ? '' : '<span class="links"><button class="knopf-text warnung" type="button" data-aktion="wunsch-entfernen">Entfernen</button></span>'}
        <button class="knopf-rand" type="button" data-aktion="blatt-zu">Abbrechen</button>
        <button class="knopf" type="submit">${neu ? 'Hinzufügen' : 'Speichern'}</button>
      </div>
    </form>`;
}

/* Von meiner Seite aus: auf welche Listen kommt der Wunsch? Gibt es nur eine, ist sie vorgewählt. */
function listenWahl() {
  const offen = zustand.listen.filter((l) => !l.archiviert);
  if (!offen.length) return '';
  return `<fieldset class="feld-gruppe"><legend class="feld-name">Auf welche Liste</legend><div class="chips">${offen.map((l) => `<button class="chip" type="button" data-aktion="w-liste" data-liste-id="${l.id}" aria-pressed="${offen.length === 1}">${esc(l.titel)}</button>`).join('')}</div></fieldset>`;
}
const linkAus = (roh) => {
  const t = String(roh || '').trim();
  return t.match(/https?:\/\/\S+/)?.[0] || (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(t) ? `https://${t}` : '');
};
/* Derselbe Artikel? Amazon über die Artikelnummer, sonst Adresse ohne Anhang (Shopify-Variante zählt mit). */
const artikel = (u) => {
  try {
    const x = new URL(u);
    const asin = x.pathname.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})/i)?.[1];
    if (asin) return asin.toUpperCase();
    return `${x.hostname.replace(/^www\./, '')}${x.pathname.replace(/\/$/, '')}#${x.searchParams.get('variant') || ''}`;
  } catch { return ''; }
};
const LADEN_BLATT = `<h2 class="blatt-titel" id="blatt-titel">Wunsch hinzufügen</h2>${laden('Ich schaue im Shop nach …')}`;
const neuerWunsch = (w = {}) => ({ titel: '', beschreibung: '', preis_ca: null, haendler: '', shop_url: '', bild_pfad: null, menge: 1, groesse: '', ...w });

async function wunschNeu(L) {
  if (matchMedia('(pointer: coarse)').matches && navigator.clipboard?.readText) {
    let url = '';
    try { url = linkAus(await navigator.clipboard.readText()); } catch { /* nicht erlaubt oder weggetippt */ }
    const schonDa = url && zustand.wuensche.some((w) => !w.entfernt_am && w.shop_url && artikel(w.shop_url) === artikel(url));
    if (url && !schonDa) {
      blattOeffnen('wunsch', { liste: L?.id }, LADEN_BLATT);
      linkPruefen(url);
      return;
    }
    if (schonDa) hinweis('Den kopierten Link hast du schon als Wunsch.');
  }
  blattOeffnen('wunsch', { liste: L?.id }, wunschLinkBlatt());
}

async function linkPruefen(roh) {
  const url = linkAus(roh);
  if (!url) { blattInnen(wunschLinkBlatt('Das sieht nicht wie ein Link aus.')); $('#wunsch-link').value = roh; return; }
  blattInnen(LADEN_BLATT);
  let v;
  try { v = await api.vorschau(url); } catch { v = { titel: '', shop_url: url, gefunden: false }; }
  if (!zustand.blatt) return;
  zustand.blatt.wunsch = neuerWunsch({ titel: v.titel === 'Wunsch' ? '' : v.titel, preis_ca: v.preis_ca ?? null, haendler: v.haendler || '', shop_url: v.shop_url || url, bild_pfad: v.bild_pfad || null, gefunden: v.gefunden && Boolean(v.titel) });
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

/* Händler bleibt, solange der Link beim selben Shop bleibt; bei einem neuen Shop der Name aus der Adresse. */
const wirt = (u) => { try { return new URL(u).hostname.replace(/^www\d?\./, ''); } catch { return ''; } };
function haendlerFuer(link, w) {
  if (!link) return '';
  if (w.haendler && wirt(link) === wirt(w.shop_url || '')) return w.haendler;
  const teile = wirt(link).split('.');
  const kern = teile.length > 2 && ['co', 'com'].includes(teile[teile.length - 2]) ? teile[teile.length - 3] : teile[teile.length - 2] || teile[0] || '';
  return kern ? (kern[0].toUpperCase() + kern.slice(1)).slice(0, 40) : '';
}

async function wunschSpeichern() {
  const b = zustand.blatt, w = b.wunsch, neu = !w.id;
  const titel = $('#w-titel').value.trim(), preis = preisLesen($('#w-preis').value);
  let link = $('#w-link').value.trim();
  if (link && !/^https?:\/\//i.test(link)) link = `https://${link}`;
  const fehler = $('#w-fehler');
  if (!titel) { $('#w-titel').setAttribute('aria-invalid', 'true'); fehler.hidden = false; fehler.textContent = 'Bitte einen Titel eintragen, damit man weiß, was es ist.'; $('#w-titel').focus(); return; }
  if (link && (/\s/.test(link) || !wirt(link).includes('.'))) { fehler.hidden = false; fehler.textContent = 'Das sieht nicht wie ein Link aus.'; $('#w-link').focus(); return; }
  if (Number.isNaN(preis)) { fehler.hidden = false; fehler.textContent = 'Den Preis bitte als Zahl, z. B. 39,90.'; $('#w-preis').focus(); return; }
  const zusammen = $('#w-zusammen').checked;
  const listen = b.liste ? [b.liste] : $$('[data-aktion="w-liste"][aria-pressed="true"]').map((k) => k.dataset.listeId);
  const werte = {
    titel, beschreibung: $('#w-besch').value.trim(), preis_ca: preis, haendler: haendlerFuer(link, w),
    groesse: $('#w-groesse').value.trim().slice(0, 20), menge: zusammen ? 1 : Math.min(9, Math.max(1, +$('#w-menge').textContent || 1)),
    shop_url: link || null, zusammenlegen: zusammen, bild_pfad: w.bild_pfad || null,
    preis_stand: preis == null ? null : preis === (w.preis_ca == null ? null : Number(w.preis_ca)) && w.preis_stand ? w.preis_stand : heute(),
  };
  const knopf = $('.blatt button[type="submit"]');
  knopf.disabled = true;
  try {
    if (neu) {
      const angelegt = await api.anlegen('wunsch', werte);
      zustand.wuensche.push(angelegt);
      for (const lid of listen) {
        const reihe = Math.max(0, ...zustand.lw.filter((x) => x.liste_id === lid).map((x) => x.reihenfolge)) + 1;
        zustand.lw.push(await api.anlegen('liste_wunsch', { liste_id: lid, wunsch_id: angelegt.id, reihenfolge: reihe }));
      }
      blattZu(); zeigen({ still: true }); hinweis(listen.length ? `${titel} · auf der Liste` : `${titel} · notiert`);
      $(`[data-wunsch="${angelegt.id}"]`)?.scrollIntoView({ block: 'center', behavior: ruhig() ? 'auto' : 'smooth' });
    } else {
      Object.assign(w, await api.aendern('wunsch', `id=eq.${w.id}`, werte));
      blattZu(); zeigen({ still: true }); hinweis('Gespeichert');
    }
  } catch (e) { knopf.disabled = false; fehlerZeigen(e); }
}

/* ---------- Code für ein anderes Gerät ---------- */
const iphoneSafari = () => /iPhone|iPad|iPod/.test(navigator.userAgent) && !navigator.standalone && !matchMedia('(display-mode: standalone)').matches;
async function codeZeigen() {
  blattOeffnen('code', {}, `<h2 class="blatt-titel" id="blatt-titel">Code für die App</h2>${laden('Code wird geholt …')}`);
  try {
    const code = await api.geraetCode();
    if (!zustand.blatt) return;
    blattInnen(`<h2 class="blatt-titel" id="blatt-titel">Code für die App</h2>
      <p class="code-gross" aria-label="Code ${esc(code.split('').join(' '))}">${esc(code)}</p>
      <ol class="code-schritte">
        <li>Öffne das Freundebuch auf dem Home-Bildschirm.</li>
        <li>Trag deine E-Mail-Adresse ein und tipp auf „Ich habe schon einen Code“.</li>
        <li>Gib diesen Code ein.</li>
      </ol>
      <p class="feld-unter">Gilt nur kurz und nur einmal.</p>
      <div class="blatt-fuss"><button class="knopf" type="button" data-aktion="blatt-zu">Fertig</button></div>`);
  } catch (e) {
    if (!zustand.blatt) return;
    blattInnen(`<h2 class="blatt-titel" id="blatt-titel">Code für die App</h2><p class="feld-fehler">${esc(e.code === 'netz' ? e.message : 'Das hat nicht geklappt. Bitte noch einmal.')}</p><div class="blatt-fuss"><button class="knopf" type="button" data-aktion="blatt-zu">Schließen</button></div>`);
  }
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
    await buch.ausgangLeeren();
    await ichLaden();
    const daten = {
      erstellt: new Date().toISOString(),
      hinweis: 'Freundebuch-Export. Reservierungen sind nicht enthalten: Was dir jemand schenkt, bleibt eine Überraschung.',
      konto: zustand.konto, listen: zustand.listen, wuensche: zustand.wuensche, liste_wunsch: zustand.lw,
      personen: zustand.buch.personen, steckbrief: zustand.buch.steckbrief, beziehungen: zustand.buch.beziehungen,
      eigene_arten: zustand.buch.arten, eintraege: zustand.buch.eintraege, geschenke: zustand.buch.geschenke,
    };
    const dateien = [{ name: 'freundebuch.json', daten: JSON.stringify(daten, null, 2) }];
    for (const w of [...zustand.wuensche, ...zustand.buch.geschenke].filter((x) => x.bild_pfad)) {
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
history.scrollRestoration = 'manual';
const stellen = new Map();
let seiteJetzt = null, vorwaerts = false;
addEventListener('scroll', () => { if (seiteJetzt !== null && seiteJetzt === location.hash) stellen.set(seiteJetzt, scrollY); }, { passive: true });
document.addEventListener('click', (ev) => { if (ev.target.closest('a[href^="#"]')) vorwaerts = true; }, true);
async function zeigen({ still = false } = {}) {
  const nr = ++anzeigeNr;
  const r = route();
  document.body.dataset.seite = r.teil;
  if (zustand.blatt) blattZu({ geschichte: false });
  buch?.menueZu();
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
      if (!buch || !zustand.geladen) {
        if (!main.firstElementChild) main.innerHTML = `<div class="seite">${laden()}</div>`;
        await buchLaden();
        if (!zustand.geladen) {
          /* Erst das, was im Gerät liegt, dann im Hintergrund das Neueste. */
          if (buch.ausLager()) { zustand.geladen = true; setTimeout(auffrischen, 0); } else await ichLaden();
        }
      }
      html = seiteAngemeldet(r);
    }
  } catch (e) {
    if (!api.angemeldet() && r.teil !== 'gast') { zustand.geladen = false; html = seiteAnmelden(); }
    else html = `<article class="seite fehlerseite"><h1 class="seiten-titel" tabindex="-1">Gerade nicht erreichbar</h1><p>${esc(e.code === 'netz' ? e.message : 'Bitte gleich noch einmal versuchen.')}</p><p><button class="knopf-rand" type="button" data-aktion="neu-laden">Noch einmal</button></p></article>`;
  }
  if (nr !== anzeigeNr) return;
  const y = scrollY, fokus = still && main.contains(document.activeElement) ? fokusMerken() : null;
  const zurueckZu = !vorwaerts && seiteJetzt !== location.hash ? stellen.get(location.hash) || 0 : 0;
  vorwaerts = false;
  seiteJetzt = null;
  const mitLeiste = r.teil !== 'gast' && api.angemeldet() && Boolean(buch);
  document.body.classList.toggle('mit-leiste', mitLeiste);
  main.innerHTML = html;
  if (mitLeiste) { buch.leiste(r); if (zustand.geladen) buch.merken(); }
  window.scrollTo(0, still ? y : zurueckZu);
  seiteJetzt = location.hash;
  const springt = mitLeiste && zustand.springeZu;
  if (mitLeiste) buch.nachRender();
  if (zurueckZu && !springt) window.scrollTo(0, zurueckZu);
  if (still) { if (fokus) $(fokus)?.focus({ preventScroll: true }); }
  else if (r.teil === 'suche' && mitLeiste) $('#suchfeld')?.focus({ preventScroll: true });
  else if (!zustand.ersteAnzeige && !springt) $('[tabindex="-1"]', main)?.focus({ preventScroll: true });
  zustand.ersteAnzeige = false;
}
function seiteAngemeldet(r) {
  const p = r.teil === 'person' ? zustand.buch.personen.find((x) => x.id === r.id) : null;
  const titel = { start: 'Start', menschen: 'Menschen', suche: 'Suche', einstellungen: 'Einstellungen', ich: 'Meine Seite', person: p?.name || 'Mensch', liste: zustand.listen.find((l) => l.id === r.id)?.titel || 'Liste' }[r.teil];
  document.title = `${titel} · Freundebuch`;
  switch (r.teil) {
    case 'liste': return seiteListe(r.id);
    case 'menschen': return buch.seiteMenschen();
    case 'suche': return buch.seiteSuche();
    case 'einstellungen': return buch.seiteEinstellungen();
    case 'ich': return buch.seitePerson('ich');
    case 'person': return buch.seitePerson(r.id);
    default: return buch.seiteStart();
  }
}
/* Beim stillen Neuzeichnen steht der Fokus danach wieder auf demselben Knopf. */
function fokusMerken() {
  const el = document.activeElement;
  if (el.id) return `#${CSS.escape(el.id)}`;
  if (el.dataset.aktion) return `[data-aktion="${el.dataset.aktion}"]${el.dataset.wunschId ? `[data-wunsch-id="${el.dataset.wunschId}"]` : ''}`;
  return el.getAttribute('href') ? `a[href="${CSS.escape(el.getAttribute('href'))}"]` : null;
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
    case 'neu-laden': main.innerHTML = ''; zustand.gast = null; zustand.geladen = false; zeigen(); break;
    case 'anmelden-zurueck': zeigenAnmelden(anmeldeAdresse); break;
    case 'code-eingeben': {
      const feld = $('#email'), email = feld?.value.trim() || '';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        zustand.anmeldeFehler = 'Erst deine E-Mail-Adresse eintragen, dann den Code.';
        zeigenAnmelden(email);
        break;
      }
      zustand.anmeldeFehler = null;
      anmeldeAdresse = email;
      main.innerHTML = seiteAnmelden(email, '', 'code');
      $('#code').focus();
      break;
    }
    case 'code-holen': codeZeigen(); break;
    case 'abmelden': {
      await buch.ausgangLeeren();
      const n = buch.offen();
      if (n && el.dataset.sicher !== 'ja') { el.dataset.sicher = 'ja'; el.textContent = `Trotzdem abmelden? ${n === 1 ? '1 Eintrag ist' : `${n} Einträge sind`} noch nicht gesichert.`; return; }
      await api.abmelden();
      buch.vergessen();
      privatesWeg();
      Object.assign(zustand, { gast: null, gastSchluessel: null });
      location.hash = '';
      zeigen();
      break;
    }
    case 'export': exportieren(); break;
    case 'name': blattOeffnen('name', {}, nameBlatt()); break;
    case 'liste-neu': blattOeffnen('liste', { liste: null }, listeBlatt(null)); break;
    case 'liste-vorschlag': $('#liste-titel').value = el.dataset.titel; if (el.dataset.datum) $('#liste-datum').value = el.dataset.datum; $('#liste-titel').focus(); break;
    case 'liste-bearbeiten': blattOeffnen('liste', { liste: L }, listeBlatt(L)); break;
    case 'liste-abschliessen': case 'liste-oeffnen': {
      const zuMachen = a === 'liste-abschliessen';
      if (zuMachen && !(Date.now() - el.dataset.sicher > 600)) { el.dataset.sicher ||= Date.now(); el.textContent = 'Wirklich abschließen?'; return; }
      try {
        Object.assign(zustand.blatt.liste, await api.aendern('liste', `id=eq.${zustand.blatt.liste.id}`, { archiviert: zuMachen }));
        blattZu(); zeigen({ still: true }); hinweis(zuMachen ? 'Abgeschlossen. Der Link zeigt jetzt nur noch „abgeschlossen“.' : 'Wieder offen');
      } catch (e) { fehlerZeigen(e); }
      break;
    }
    case 'liste-loeschen': {
      if (!(Date.now() - el.dataset.sicher > 600)) { el.dataset.sicher ||= Date.now(); el.textContent = 'Wirklich löschen? Der Link geht dann nicht mehr.'; return; }
      try {
        await api.loeschen('liste', `id=eq.${zustand.blatt.liste.id}`);
        const weg = zustand.blatt.liste.id; zustand.listen = zustand.listen.filter((l) => l.id !== weg); zustand.lw = zustand.lw.filter((x) => x.liste_id !== weg); blattZuNach('#ich'); hinweis('Liste gelöscht');
      } catch (e) { e.message?.includes('liste_vergeben') ? hinweis('Auf dieser Liste ist schon etwas vergeben. Schließ sie stattdessen ab.') : fehlerZeigen(e); }
      break;
    }
    case 'w-liste': el.setAttribute('aria-pressed', String(el.getAttribute('aria-pressed') !== 'true')); break;
    case 'teilen': if (L) teilen(L); break;
    case 'wunsch-neu': wunschNeu(L); break;
    case 'ohne-link': zustand.blatt.wunsch = neuerWunsch(); blattInnen(wunschFormBlatt(zustand.blatt.wunsch, true)); break;
    case 'bild-weg': zustand.blatt.wunsch.bild_pfad = null; $('.blatt-bild').innerHTML = bild({ ...zustand.blatt.wunsch, shop_url: '' }); $('#w-titel').focus(); break;
    case 'menge': mengeSetzen(+$('#w-menge').textContent + +el.dataset.schritt); break;
    case 'wunsch-bearbeiten': {
      const w = zustand.wuensche.find((x) => x.id === el.dataset.wunschId);
      blattOeffnen('wunsch', { liste: L?.id, wunsch: w }, wunschFormBlatt(w, false));
      break;
    }
    case 'wunsch-entfernen': {
      const w = zustand.blatt.wunsch;
      const mehr = zustand.lw.filter((x) => x.wunsch_id === w.id).length > 1;
      if (!(Date.now() - el.dataset.sicher > 600)) { el.dataset.sicher ||= Date.now(); el.textContent = mehr ? 'Von allen Listen entfernen?' : 'Wirklich entfernen?'; return; }
      try {
        Object.assign(w, await api.aendern('wunsch', `id=eq.${w.id}`, { entfernt_am: new Date().toISOString() }));
        blattZu(); zeigen({ still: true }); hinweis(`${w.titel} · entfernt`);
      } catch (e) { fehlerZeigen(e); }
      break;
    }
    case 'dazunehmen': {
      const reihe = Math.max(0, ...zustand.lw.filter((x) => x.liste_id === L.id).map((x) => x.reihenfolge)) + 1;
      try {
        zustand.lw.push(await api.anlegen('liste_wunsch', { liste_id: L.id, wunsch_id: el.dataset.wunschId, reihenfolge: reihe }));
        zeigen({ still: true }); hinweis('Auf der Liste');
      } catch (e) { fehlerZeigen(e); }
      break;
    }
    default: buch?.klick(a, el); break;
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
        blattZu(); zeigen({ still: true }); hinweis('Gespeichert');
      } catch (e) { fehlerZeigen(e); }
      break;
    }
    default: buch?.senden(f.dataset.form, f); break;
  }
});

/* Wie oft: 1 bis 9. Zum Zusammenlegen immer einmal. */
function mengeSetzen(n) {
  const zusammen = $('#w-zusammen')?.checked;
  const m = zusammen ? 1 : Math.min(9, Math.max(1, n || 1));
  $('#w-menge').textContent = m;
  const [weniger, mehr] = $$('.zaehler-knopf');
  const aus = [zusammen || m <= 1, zusammen || m >= 9];
  if (aus[0] && document.activeElement === weniger) (aus[1] ? $('#w-zusammen') : mehr).focus();
  if (aus[1] && document.activeElement === mehr) (aus[0] ? $('#w-zusammen') : weniger).focus();
  weniger.disabled = aus[0];
  mehr.disabled = aus[1];
}
document.addEventListener('change', (ev) => {
  if (ev.target.id === 'w-zusammen') mengeSetzen(+$('#w-menge').textContent);
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
  if (route().teil !== 'gast' && api.angemeldet() && buch?.taste(ev)) return;
  if (!zustand.blatt) return;
  if (ev.key === 'Escape') { ev.preventDefault(); blattZu(); return; }
  if (ev.key === 'Tab') {
    const fokusbar = $$('.blatt button:not([disabled]), .blatt input, .blatt textarea, .blatt select, .blatt a[href]').filter((x) => x.offsetParent !== null);
    const [erstes, letztes] = [fokusbar[0], fokusbar[fokusbar.length - 1]];
    if (ev.shiftKey && document.activeElement === erstes) { ev.preventDefault(); letztes.focus(); }
    else if (!ev.shiftKey && document.activeElement === letztes) { ev.preventDefault(); erstes.focus(); }
  }
});

addEventListener('hashchange', () => zeigen());

Object.assign(app, { zeigen, route, pille, bild, listenKarte, linkAus, preisLesen, haendlerFuer, appHinweis });

/* Start: Kommt jemand über den Link aus der Mail, steht die Sitzung in der Adresse. */
const angekommen = api.sitzungAusAdresse();
if (angekommen?.ok) zustand.perLink = true;
if (angekommen?.fehler) zustand.anmeldeFehler = 'Der Link ist abgelaufen oder wurde schon benutzt. Lass dir einen neuen schicken.';
zeigen();
