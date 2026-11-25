/* Personenbuch (Etappe 2). Wird nur geladen, wenn ich angemeldet bin; Gäste bekommen diese Datei nie.
 * Alles liegt auch im Gerät: Die App ist sofort da, Suchen geht ohne Warten, und ein festgehaltener Satz
 * ist gesichert, bevor er beim Server ankommt (Ausgang). */
import * as api from './api.js';
import { PRODUKT, ART, SCHMUCK } from './zeichnungen.js';
import { mono, artBild, zufall, fadenZeichnen, beobachter } from './faden.js';
import {
  $, $$, esc, ruhig, heute, datum, datumTagMonat, euro, zahlWort, ICON, laden, zustand, hinweis, fehlerZeigen,
  blattOeffnen, blattInnen, blattZu, blattZuNach, app,
} from './basis.js';

const B = () => zustand.buch;
const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const inTagen = (n) => (n === 0 ? 'heute' : n === 1 ? 'morgen' : `in ${n} Tagen`);
const tagMonatKurz = (d) => d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
const wochentag = (d) => d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
const neueId = () => crypto.randomUUID();
const nachName = (a, b) => a.name.localeCompare(b.name, 'de');

/* ---------- Arten ---------- */
const FESTE = [
  { id: 'mag', name: 'mag', zeichnung: 'herz' },
  { id: 'magnicht', name: 'mag nicht', zeichnung: 'nein' },
  { id: 'interesse', name: 'Interesse', zeichnung: 'spross' },
  { id: 'geschichte', name: 'Geschichte', zeichnung: 'blase' },
  { id: 'erlebnis', name: 'Erlebnis', zeichnung: 'berg' },
  { id: 'geschenkidee', name: 'Geschenkidee', zeichnung: 'geschenk' },
];
const arten = () => [...FESTE, ...B().arten.map((a) => ({ ...a, zeichnung: 'eigen', eigene: true }))];
const artenFuer = (p) => arten().filter((a) => !(p?.ist_ich && a.id === 'geschenkidee'));
const artVon = (id) => arten().find((a) => a.id === id) || null;
const artId = (e) => e.art || e.art_id || null;
const artFelder = (id) => (!id ? { art: null, art_id: null } : FESTE.some((a) => a.id === id) ? { art: id, art_id: null } : { art: null, art_id: id });
const artKlasse = (a) => (a?.eigene ? 'eigen' : a?.id || 'ohne');
async function artAnlegen(roh) {
  const name = roh.trim().replace(/\s+/g, ' ').slice(0, 24);
  if (!name) return null;
  const da = arten().find((a) => a.name.toLowerCase() === name.toLowerCase());
  if (da) return da;
  try {
    const neu = await api.anlegen('art', { name });
    B().arten.push(neu);
    merken();
    return artVon(neu.id);
  } catch (e) { fehlerZeigen(e); return null; }
}

/* ---------- Menschen ---------- */
const ich = () => B().personen.find((p) => p.ist_ich) || null;
const person = (id) => (id === 'ich' ? ich() : B().personen.find((p) => p.id === id)) || null;
const menschen = () => B().personen.filter((p) => !p.ist_ich);
const kurzname = (p) => p.rufname || p.name.trim().split(' ')[0];
/* Heißen zwei gleich, steht der ganze Name da. */
const rufname = (p) => (menschen().some((q) => q.id !== p.id && kurzname(q) === kurzname(p)) ? p.name : kurzname(p));
const ruf = (p) => (p.ist_ich ? 'mich' : rufname(p));
const href = (p) => (p.ist_ich ? '#ich' : `#person/${p.id}`);

/* Nächster Geburtstag. Am 29. Februar Geborene feiern in anderen Jahren am 28. */
function geburtstag(p) {
  if (!p?.geburtstag_tag) return null;
  const jetzt = datum(heute());
  const am = (jahr) => {
    const letzter = new Date(jahr, p.geburtstag_monat, 0).getDate();
    return new Date(jahr, p.geburtstag_monat - 1, Math.min(p.geburtstag_tag, letzter), 12);
  };
  let d = am(jetzt.getFullYear());
  if (d < jetzt) d = am(jetzt.getFullYear() + 1);
  return { datum: d, tage: Math.round((d - jetzt) / 864e5), alter: p.geburtsjahr ? d.getFullYear() - p.geburtsjahr : null, jahr: d.getFullYear() };
}
const geburtstagText = (p) => `${p.geburtstag_tag}. ${MONATE[p.geburtstag_monat - 1]}${p.geburtsjahr ? ` ${p.geburtsjahr}` : ''}`;
function weihnachten() {
  const jetzt = datum(heute());
  let d = new Date(jetzt.getFullYear(), 11, 24, 12);
  if (d < jetzt) d = new Date(jetzt.getFullYear() + 1, 11, 24, 12);
  return { datum: d, tage: Math.round((d - jetzt) / 864e5), jahr: d.getFullYear() };
}
/* Wofür ich dieser Person als Nächstes etwas schenke, der nächste Anlass zuerst. */
function anlaesse(p) {
  const out = [], g = geburtstag(p), w = weihnachten();
  if (g && p.schenke_geburtstag) out.push({ anlass: 'Geburtstag', jahr: g.jahr, tage: g.tage });
  if (p.schenke_weihnachten) out.push({ anlass: 'Weihnachten', jahr: w.jahr, tage: w.tage });
  return out.sort((a, b) => a.tage - b.tage);
}
const VORLAUF = 60; // Tage: so weit schaut „Geschenk fehlt“ voraus
const ideenVon = (pid) => B().geschenke.filter((g) => g.person_id === pid);
function anlaesseMitStand(p) {
  return anlaesse(p).filter((a) => a.tage <= VORLAUF).map((a) => {
    const ideen = ideenVon(p.id).filter((g) => g.anlass === a.anlass && (g.anlass_jahr == null || g.anlass_jahr === a.jahr));
    return { ...a, ideen, fehlt: !ideen.some((g) => g.stand !== 'idee') };
  });
}
const anlassText = (g) => [g.anlass, g.anlass_jahr].filter(Boolean).join(' ');
function anlassLesen(text) {
  const t = text.trim().replace(/\s+/g, ' ');
  const m = t.match(/^(.*?)\s*\b((?:19|20|21)\d{2})$/);
  return m ? { anlass: m[1].slice(0, 40), anlass_jahr: +m[2] } : { anlass: t.slice(0, 40), anlass_jahr: null };
}

/* ---------- Zuletzt besucht (bleibt im Gerät) ---------- */
const ZULETZT = () => `freundebuch.zuletzt.${api.kontoId()}`;
const zuletzt = () => { try { return JSON.parse(api.speicher.lesen(ZULETZT()) || '[]'); } catch { return []; } };
const besucht = (id) => api.speicher.schreiben(ZULETZT(), JSON.stringify([id, ...zuletzt().filter((x) => x !== id)].slice(0, 12)));

/* =====================================================================
 * Daten: laden, im Gerät behalten, schreiben
 * ===================================================================== */
const LAGER = () => `freundebuch.buch.${api.kontoId()}`;
const AUSGANG = () => `freundebuch.ausgang.${api.kontoId()}`;
const TABELLE = { person: 'personen', steckbrief: 'steckbrief', beziehung: 'beziehungen', art: 'arten', eintrag: 'eintraege', geschenk: 'geschenke' };

async function alles(tabelle, ordnung) {
  const zeilen = [];
  for (;;) {
    const teil = await api.lesen(tabelle, `select=*&order=${ordnung}&limit=1000&offset=${zeilen.length}`);
    zeilen.push(...teil);
    if (teil.length < 1000) return zeilen;
  }
}
export async function holen() {
  const [personen, steckbrief, beziehungen, eigene, eintraege, geschenke, abo] = await Promise.all([
    alles('person', 'angelegt.asc,id.asc'), alles('steckbrief', 'reihenfolge.asc,id.asc'), alles('beziehung', 'reihenfolge.asc,id.asc'),
    alles('art', 'angelegt.asc,id.asc'), alles('eintrag', 'angelegt.asc,id.asc'), alles('geschenk', 'angelegt.asc,id.asc'),
    api.lesen('kalender_abo', 'select=schluessel'),
  ]);
  return { personen, steckbrief, beziehungen, arten: eigene, eintraege, geschenke, abo: abo[0]?.schluessel || null };
}
/* Was noch im Ausgang liegt, gehört dazu, auch wenn der Server es noch nicht kennt. */
export function uebernehmen(daten) {
  for (const a of ausgang()) {
    const liste = daten[TABELLE[a.tabelle]], i = liste.findIndex((z) => z.id === a.zeile.id);
    if (a.weg) { if (i >= 0) liste.splice(i, 1); }
    else if (a.aendern) { if (i >= 0) Object.assign(liste[i], a.zeile); }
    else if (i < 0) liste.push({ ...a.zeile });
  }
  zustand.buch = daten;
  merken();
}
export function ausLager() {
  try {
    const d = JSON.parse(api.speicher.lesen(LAGER()) || 'null');
    if (!d?.buch?.personen) return false;
    Object.assign(zustand, d);
    return true;
  } catch { return false; }
}
export function merken() {
  if (!api.kontoId()) return;
  const { konto, listen, wuensche, lw, stand, buch } = zustand;
  api.speicher.schreiben(LAGER(), JSON.stringify({ konto, listen, wuensche, lw, stand, buch }));
}
/* Beim Abmelden bleibt nichts Privates im Gerät. */
export function vergessen() {
  try {
    for (const k of Object.keys(localStorage)) if (/^freundebuch\.(buch|ausgang|zuletzt|entwurf)\./.test(k)) localStorage.removeItem(k);
  } catch { /* ohne Speicher gibt es nichts zu vergessen */ }
  entwurf = { text: '', art: null };
}

/* Ausgang: was noch zum Server muss (Neues und Änderungen ohne Netz). Die id entsteht im Gerät, doppelt geht also nichts rein. */
function ausgang() { try { return JSON.parse(api.speicher.lesen(AUSGANG()) || '[]'); } catch { return []; } }
const ausgangMerken = (a) => api.speicher.schreiben(AUSGANG(), a.length ? JSON.stringify(a) : null);
const ausgangAendern = (id, neu) => ausgangMerken(ausgang().flatMap((a) => (a.zeile.id === id ? neu(a) || [] : a)));
const imAusgang = (id) => ausgang().some((a) => a.zeile.id === id && !a.weg);
export const offen = () => ausgang().filter((a) => !a.weg).length;
let laeuft = null, nochmal = false;
/* Immer nur ein Durchlauf. Kommt währenddessen etwas dazu, folgt gleich der nächste. */
export function ausgangLeeren() {
  if (laeuft) { nochmal = true; return laeuft; }
  laeuft = (async () => {
    try { do { nochmal = false; } while ((await durchlauf()) && nochmal); } finally { laeuft = null; }
  })();
  return laeuft;
}
/* false: kein Netz oder nicht mehr angemeldet, später weiter. */
async function durchlauf() {
  const versucht = new Set();
  for (;;) {
    const a = ausgang().find((x) => !versucht.has(x.zeile.id));
    if (!a || !api.kontoId()) return true;
    const id = a.zeile.id;
    versucht.add(id);
    if (a.weg && !a.unterwegs) { ausgangAendern(id, () => null); continue; }
    ausgangAendern(id, (x) => ({ ...x, unterwegs: true }));
    const werteVon = ({ id: _, angelegt: __, ist_ich: ___, ...w }) => w;
    try {
      if (a.aendern) await api.aendern(a.tabelle, `id=eq.${id}`, werteVon(a.zeile));
      else await api.anlegen(a.tabelle, a.zeile).catch((e) => { if (e.code !== '23505') throw e; });
      /* Inzwischen geändert oder gelöscht? Dann gleich hinterher. */
      const jetzt = ausgang().find((x) => x.zeile.id === id);
      ausgangAendern(id, () => null);
      if (jetzt?.weg) await api.loeschen(a.tabelle, `id=eq.${id}`);
      else if (jetzt && JSON.stringify(jetzt.zeile) !== JSON.stringify(a.zeile)) {
        ausgangMerken([...ausgang(), { tabelle: a.tabelle, zeile: { id, ...werteVon(jetzt.zeile) }, aendern: true }]);
        versucht.delete(id);
      }
      $(`[data-eintrag="${id}"] .wartet`)?.remove();
    } catch (e) {
      ausgangAendern(id, ({ unterwegs: _, ...x }) => x);
      if (e.code === 'netz' || !api.angemeldet()) return false;
      hinweis('Ein Eintrag ließ sich nicht sichern. Er liegt noch in diesem Gerät.');
    }
  }
}
addEventListener('online', () => { if (api.angemeldet()) ausgangLeeren(); });

function neueZeile(tabelle, zeile) {
  B()[TABELLE[tabelle]].push(zeile);
  ausgangMerken([...ausgang(), { tabelle, zeile: { ...zeile } }]);
  merken();
  ausgangLeeren();
}
/* Immer die jetzige Zeile: ein Nachladen kann die Objekte inzwischen ausgetauscht haben. */
const frisch = (tabelle, zeile) => B()[TABELLE[tabelle]].find((z) => z.id === zeile.id) || zeile;
async function aendereZeile(tabelle, alte, werte) {
  const zeile = frisch(tabelle, alte), id = zeile.id, vorher = { ...zeile };
  Object.assign(zeile, werte);
  merken();
  if (imAusgang(id)) {
    ausgangAendern(id, (a) => ({ ...a, zeile: { ...a.zeile, ...werte } }));
    ausgangLeeren();
    return true;
  }
  try { await api.aendern(tabelle, `id=eq.${id}`, werte); return true; } catch (e) {
    if (e.code === 'netz') { /* bleibt im Gerät und geht später raus */
      ausgangMerken([...ausgang(), { tabelle, zeile: { id, ...werte }, aendern: true }]);
      return 'spaeter';
    }
    Object.assign(frisch(tabelle, zeile), vorher);
    merken();
    fehlerZeigen(e);
    return false;
  }
}
const gespeichert = (ok) => hinweis(ok === 'spaeter' ? 'Im Gerät gesichert, geht raus, sobald du Netz hast' : 'Gespeichert');
async function loescheZeile(tabelle, zeile) {
  const id = zeile.id, wartend = ausgang().find((a) => a.zeile.id === id);
  if (wartend && !wartend.aendern) ausgangAendern(id, (a) => ({ ...a, weg: true }));
  else {
    try { await api.loeschen(tabelle, `id=eq.${id}`); } catch (e) { fehlerZeigen(e); return false; }
    ausgangAendern(id, () => null);
  }
  B()[TABELLE[tabelle]] = B()[TABELLE[tabelle]].filter((z) => z.id !== id);
  merken();
  ausgangLeeren();
  return true;
}

/* =====================================================================
 * Navigation: Handy unten, PC als Spalte
 * ===================================================================== */
const ZIELE = [
  { id: 'start', href: '#start', name: 'Start', icon: ICON.start },
  { id: 'menschen', href: '#menschen', name: 'Menschen', icon: ICON.menschen },
  { id: 'festhalten', name: 'Festhalten', icon: ICON.plus, taste: 'N' },
  { id: 'suche', href: '#suche', name: 'Suche', icon: ICON.suche, taste: '/' },
  { id: 'ich', href: '#ich', name: 'Ich', icon: ICON.ich },
];
$('.leiste').innerHTML = ZIELE.map((x) => {
  const innen = `<span class="ziel-zeichen">${x.icon}</span><span class="ziel-name">${x.name}</span>${x.taste ? `<kbd aria-hidden="true">${x.taste}</kbd>` : ''}`;
  return x.href
    ? `<a class="ziel" href="${x.href}" data-ziel="${x.id}"${x.taste ? ` aria-keyshortcuts="${x.taste}"` : ''}>${innen}</a>`
    : `<button class="ziel ziel-festhalten" type="button" data-aktion="festhalten" aria-keyshortcuts="N">${innen}</button>`;
}).join('');
export function leiste(r) {
  const aktiv = ['ich', 'liste', 'einstellungen'].includes(r.teil) ? 'ich' : r.teil === 'person' ? 'menschen' : r.teil;
  $$('.leiste [data-ziel]').forEach((a) => (a.dataset.ziel === aktiv ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
}

/* =====================================================================
 * Start
 * ===================================================================== */
const haenger = (art, schnur, inhalt) => `<span class="haenger haenger-${art}" style="--schnur:${schnur}px">${inhalt}</span>`;
const wird = (p, g) => (g.alter != null ? `wird ${g.alter}` : 'hat Geburtstag');

function blickfang(p, g) {
  const a = anlaesseMitStand(p).find((x) => x.anlass === 'Geburtstag');
  const idee = a?.ideen.find((x) => x.stand === 'idee'), da = a?.ideen.find((x) => x.stand !== 'idee');
  const zeile = !a ? '' : a.fehlt ? `Noch kein Geschenk${idee ? ` · Idee: ${esc(idee.titel)}` : ''}` : `Geschenk: ${esc(da.titel)}`;
  return `<section class="blickfang" aria-labelledby="blick-titel">
    <div class="blick-haenger" aria-hidden="true">
      ${haenger('schild', 46, mono(p, 0))}${haenger('kuchen', 100, SCHMUCK.kuchen)}${haenger('schleife', 196, SCHMUCK.schleife)}${haenger('stern', 28, SCHMUCK.stern)}
    </div>
    <div class="blick-kopf">
      <div>
        <p class="ueberzeile">Als Nächstes</p>
        <p class="blick-wann"><strong>${inTagen(g.tage)}</strong>${wochentag(g.datum)}</p>
      </div>
      <span class="blick-kuchen" aria-hidden="true"><svg class="blick-faden" viewBox="0 0 20 60" preserveAspectRatio="none"><path d="M10,0 C14,16 6,30 11,44 C13,51 10,56 10,60" vector-effect="non-scaling-stroke"/></svg>${SCHMUCK.kuchen}</span>
    </div>
    <h2 class="blick-titel" id="blick-titel">${esc(rufname(p))} ${wird(p, g)}</h2>
    ${zeile ? `<p class="blick-geschenk"><span class="art-zeichen art-geschenkidee">${ART.geschenk}</span><span>${zeile}</span></p>` : ''}
    <div class="knopfreihe">
      <a class="knopf" href="${href(p)}">Zu ${esc(rufname(p))}</a>
      <button class="knopf-rand" type="button" data-aktion="festhalten" data-person="${p.id}">${ICON.plus}<span>Festhalten</span></button>
    </div>
  </section>`;
}
function blickfangLeer(niemand) {
  return `<section class="blickfang" aria-labelledby="blick-titel">
    <div class="blick-haenger" aria-hidden="true">${haenger('schleife', 120, SCHMUCK.schleife)}${haenger('kuchen', 60, SCHMUCK.kuchen)}${haenger('stern', 150, SCHMUCK.stern)}</div>
    <div class="blick-kopf"><div><p class="ueberzeile">${niemand ? 'Dein Freundebuch' : 'Als Nächstes'}</p></div>
      <span class="blick-kuchen" aria-hidden="true"><svg class="blick-faden" viewBox="0 0 20 60" preserveAspectRatio="none"><path d="M10,0 C14,16 6,30 11,44 C13,51 10,56 10,60" vector-effect="non-scaling-stroke"/></svg>${SCHMUCK.kuchen}</span></div>
    <h2 class="blick-titel klein" id="blick-titel">${niemand ? 'Wer gehört hinein?' : 'Wer hat wann Geburtstag?'}</h2>
    <p class="blick-text">${niemand ? 'Leg den ersten Menschen an. Ein Name genügt, alles andere wächst mit der Zeit.' : 'Trag bei deinen Menschen den Geburtstag ein, dann siehst du hier, wer als Nächstes dran ist.'}</p>
    <div class="knopfreihe">${niemand ? `<button class="knopf" type="button" data-aktion="person-neu">${ICON.plus}<span>Mensch anlegen</span></button>` : '<a class="knopf" href="#menschen">Zu deinen Menschen</a>'}</div>
  </section>`;
}
export function seiteStart() {
  const alle = menschen();
  const nach = alle.map((p) => ({ p, g: geburtstag(p) })).filter((x) => x.g).sort((a, b) => a.g.tage - b.g.tage || nachName(a.p, b.p));
  const fehlt = alle.map((q) => ({ q, a: anlaesseMitStand(q).filter((x) => x.fehlt) })).filter((x) => x.a.length)
    .sort((x, y) => Math.min(...x.a.map((b) => b.tage)) - Math.min(...y.a.map((b) => b.tage)) || nachName(x.q, y.q));
  const bald = nach.slice(1, 5);
  return `<article class="seite seite-start">
    <h1 class="tag-titel" tabindex="-1">${wochentag(datum(heute()))}</h1>
    ${app.appHinweis?.() || ''}
    ${nach.length ? blickfang(nach[0].p, nach[0].g) : blickfangLeer(!alle.length)}
    <div class="start-spalten">
      ${bald.length ? `<section class="start-gruppe" aria-labelledby="bald-titel">
        <h2 class="abschnitt" id="bald-titel">Bald</h2>
        <ul class="zeilen">${bald.map(({ p: q, g: h }) => `<li><a class="zeile" href="${href(q)}">${mono(q, 40)}<span class="zeile-haupt"><span class="zeile-name">${esc(rufname(q))}</span><span class="zeile-unter">${wird(q, h)}</span></span><span class="zeile-rechts"><span>${tagMonatKurz(h.datum)}</span><span class="zeile-unter">${inTagen(h.tage)}</span></span></a></li>`).join('')}</ul>
      </section>` : ''}
      ${alle.length ? `<section class="start-gruppe" aria-labelledby="fehlt-titel">
        <h2 class="abschnitt" id="fehlt-titel">Geschenk fehlt</h2>
        ${fehlt.length ? `<ul class="zeilen">${fehlt.map(({ q, a }) => {
          const ideen = a.reduce((s, x) => s + x.ideen.length, 0);
          return `<li><a class="zeile" href="${href(q)}" data-springe-ideen>${mono(q, 40)}<span class="zeile-haupt"><span class="zeile-name">${esc(rufname(q))}</span><span class="zeile-unter">${a.map((x) => x.anlass).join(' · ')}</span></span><span class="zeile-rechts"><span class="${ideen ? '' : 'terra'}">${ideen ? zahlWort(ideen, 'Idee', 'Ideen') : 'keine Idee'}</span><span class="zeile-unter">${inTagen(Math.min(...a.map((x) => x.tage)))}</span></span></a></li>`;
        }).join('')}</ul>` : `<p class="leer-zeile">Für die nächsten ${VORLAUF} Tage ist alles da.</p>`}
      </section>` : ''}
    </div>
  </article>`;
}

/* =====================================================================
 * Menschen
 * ===================================================================== */
export function seiteMenschen() {
  const zeile = (p) => {
    const g = geburtstag(p), erster = p.name.trim().split(' ')[0];
    const unter = [p.rufname !== erster && p.rufname !== p.name && p.rufname, p.kennen_woher].filter(Boolean).join(' · ');
    return `<li><a class="register-zeile" href="${href(p)}">${mono(p, 44)}
      <span class="register-haupt"><span class="register-name">${esc(p.name)}</span>${unter ? `<span class="register-unter">${esc(unter)}</span>` : ''}</span>
      <span class="register-punkte" aria-hidden="true"></span>
      ${g ? `<span class="register-tag">${tagMonatKurz(g.datum)}</span>` : ''}</a></li>`;
  };
  const alpha = [...menschen()].sort(nachName);
  const zul = alpha.length > 6 ? zuletzt().map(person).filter((p) => p && !p.ist_ich).slice(0, 3) : [];
  return `<article class="seite seite-menschen">
    <header class="seiten-kopf"><h1 class="seiten-titel" tabindex="-1">Menschen</h1>${alpha.length ? `<button class="knopf-rand" type="button" data-aktion="person-neu">${ICON.plus}<span>Neu</span></button>` : ''}</header>
    ${alpha.length ? '' : `<div class="leer-karte"><span>${SCHMUCK.stern}</span><h2>Noch niemand da</h2><p>Leg den ersten Menschen an. Ein Name genügt.</p><button class="knopf" type="button" data-aktion="person-neu">${ICON.plus}<span>Mensch anlegen</span></button></div>`}
    ${zul.length ? `<section aria-labelledby="zuletzt-titel"><h2 class="abschnitt" id="zuletzt-titel">Zuletzt</h2><ul class="register">${zul.map(zeile).join('')}</ul></section>` : ''}
    ${alpha.length ? `<section aria-labelledby="alle-titel">${zul.length ? '<h2 class="abschnitt" id="alle-titel">Alle</h2>' : '<h2 class="nur-leser" id="alle-titel">Alle</h2>'}<ul class="register">${alpha.map(zeile).join('')}</ul></section>` : ''}
  </article>`;
}

/* =====================================================================
 * Personenseite
 * ===================================================================== */
const GROESSEN = ['kleidung', 'kleidergröße', 'schuhe', 'schuhgröße', 'ring', 'ringgröße', 'hose', 'hosengröße', 'hemd', 'hemdgröße', 'handschuhe', 'hut'];
const steckbriefVon = (pid) => B().steckbrief.filter((s) => s.person_id === pid).sort((a, b) => a.reihenfolge - b.reihenfolge);
const familieVon = (pid) => B().beziehungen.filter((s) => s.person_id === pid).sort((a, b) => a.reihenfolge - b.reihenfolge);
/* Steht jemand bei einer anderen Person als Familie, erscheint der Name auch hier (nur als Verweis). */
function familieMitRueck(p) {
  const eigene = familieVon(p.id).map((f) => ({ name: f.name, art: f.art, person: person(f.andere_person_id) }));
  const da = new Set(eigene.map((f) => f.person?.id));
  for (const f of B().beziehungen) {
    if (f.andere_person_id !== p.id || da.has(f.person_id)) continue;
    const q = person(f.person_id);
    if (q) { eigene.push({ name: rufname(q), art: '', person: q }); da.add(q.id); }
  }
  return eigene;
}

function ausweis(p) {
  const steck = steckbriefVon(p.id), g = geburtstag(p);
  const groessen = steck.filter((s) => GROESSEN.includes(s.bezeichnung.trim().toLowerCase()));
  const andere = steck.filter((s) => !groessen.includes(s)), familie = familieMitRueck(p);
  const zeilen = [];
  if (p.kennen_woher) zeilen.push(['Kennen uns', esc(p.kennen_woher)]);
  if (groessen.length) zeilen.push(['Größen', groessen.map((s) => `<span class="paar"><span class="paar-bez">${esc(s.bezeichnung)}</span> ${esc(s.wert)}</span>`).join('')]);
  for (const s of andere) zeilen.push([esc(s.bezeichnung), esc(s.wert)]);
  if (familie.length) zeilen.push(['Familie', familie.map((f) => `<span class="glied">${f.person
    ? `<a class="verweis" href="${href(f.person)}">${esc(f.name)}</a>` : `<span>${esc(f.name)}</span>`}${f.art ? ` <span class="leise">${esc(f.art)}</span>` : ''}</span>`).join(' ')]);
  const erster = p.name.trim().split(' ')[0];
  const genannt = !p.ist_ich && p.rufname && p.rufname !== erster && p.rufname !== p.name ? `<p class="genannt">genannt ${esc(p.rufname)}</p>` : '';
  const gebZeile = g
    ? `${geburtstagText(p)}${g.alter != null ? ` · wird ${g.alter}` : ''} · <strong>${inTagen(g.tage)}</strong>`
    : `<button class="knopf-text" type="button" data-aktion="person-bearbeiten" data-feld="geburtstag">Geburtstag eintragen</button>`;
  return `<header class="ausweis">
    <span class="ausweis-schlitz" aria-hidden="true"></span>
    <button class="ausweis-stift" type="button" data-aktion="person-bearbeiten" aria-label="Steckbrief bearbeiten" title="Steckbrief bearbeiten">${ICON.stift}</button>
    <div class="ausweis-kopf">
      ${mono(p, 0)}
      <div class="ausweis-name">
        ${p.ist_ich ? '<p class="ueberzeile">Meine Seite</p>' : ''}
        <h1 class="name${p.name.length > 26 ? ' lang' : ''}" tabindex="-1">${esc(p.name)}</h1>
        ${genannt}
        <p class="geburtstag">${gebZeile}</p>
      </div>
    </div>
    ${zeilen.length ? `<dl class="steckbrief">${zeilen.map(([dt, dd]) => `<div><dt>${dt}</dt><dd>${dd}</dd></div>`).join('')}</dl>`
      : '<p class="steckbrief-leer"><button class="knopf-text" type="button" data-aktion="person-bearbeiten" data-feld="steckbrief">Größen, Familie und mehr eintragen</button></p>'}
    <span class="ausweis-oese" aria-hidden="true"></span>
  </header>`;
}

/* ---------- Geschenkideen ---------- */
const STAENDE = [['idee', 'Idee'], ['besorgt', 'besorgt'], ['verschenkt', 'verschenkt']];
const standName = (id) => (STAENDE.find(([s]) => s === id) || STAENDE[0])[1];
const standKnopf = (g, wo) => `<button class="idee-stand" type="button" data-aktion="stand" data-idee="${g.id}" data-ort="${wo}" aria-label="Stand: ${standName(g.stand)}. Tippen schaltet weiter">${STAENDE.map(([id, n]) => `<span class="stand${id === g.stand ? ' ist' : ''}">${n}</span>`).join('<span class="stand-strich" aria-hidden="true"></span>')}</button>`;
const ideeMeta = (g) => [g.haendler && esc(g.haendler), g.preis_ca != null ? euro(g.preis_ca) : ''].filter(Boolean).join(' · ');
const shop = (g) => (g.shop_url ? `<a class="idee-shop" href="${esc(g.shop_url)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(g.titel)} im Shop ansehen">${ICON.raus}</a>` : '');
const ideeBild = (g) => (g.bild_pfad ? `<img src="${esc(api.bildUrl(g.bild_pfad))}" alt="" loading="lazy" decoding="async">` : ART.geschenk);
/* Der Tag des Anlasses, damit eine Idee an der richtigen Stelle am Faden hängt. */
function ideeDatum(g) {
  const p = person(g.person_id), zwei = (n) => String(n).padStart(2, '0');
  if (!g.anlass_jahr) return String(g.angelegt).slice(0, 10);
  if (/geburtstag/i.test(g.anlass) && p?.geburtstag_tag) return `${g.anlass_jahr}-${zwei(p.geburtstag_monat)}-${zwei(p.geburtstag_tag)}`;
  if (/weihnacht/i.test(g.anlass)) return `${g.anlass_jahr}-12-24`;
  return `${g.anlass_jahr}-12-31`;
}
function geschenkideen(p) {
  if (p.ist_ich) return '';
  const rang = { idee: 0, besorgt: 0, verschenkt: 1 };
  const liste = [...ideenVon(p.id)].sort((a, b) => rang[a.stand] - rang[b.stand] || ideeDatum(a).localeCompare(ideeDatum(b)));
  const vorn = liste.filter((g) => g.stand !== 'verschenkt'), weg = liste.filter((g) => g.stand === 'verschenkt');
  const karte = (g) => `
      <li class="idee" data-idee-karte="${g.id}">
        <span class="idee-schnur" aria-hidden="true"></span>
        <span class="loch" aria-hidden="true"></span>
        <span class="idee-bild${g.bild_pfad ? ' foto' : ''}" aria-hidden="true">${ideeBild(g)}</span>
        <div class="idee-text">
          <h3 class="idee-titel"><button class="text-knopf" type="button" data-aktion="idee-bearbeiten" data-idee="${g.id}">${esc(g.titel)}<span class="nur-leser">, bearbeiten</span></button>${shop(g)}</h3>
          ${anlassText(g) ? `<p class="idee-anlass">${esc(anlassText(g))}</p>` : ''}
          ${standKnopf(g, 'ideen')}
          ${ideeMeta(g) ? `<p class="idee-meta">${ideeMeta(g)}</p>` : ''}
        </div>
      </li>`;
  return `<section class="ideen" aria-labelledby="ideen-titel">
    <div class="ideen-kopf"><h2 class="abschnitt" id="ideen-titel">Geschenkideen</h2><button class="knopf-text" type="button" data-aktion="idee-neu">Idee hinzufügen</button></div>
    ${vorn.length ? `<svg class="leine" viewBox="0 0 600 24" preserveAspectRatio="none" aria-hidden="true"><path d="M0,4 Q300,26 600,4" vector-effect="non-scaling-stroke"/></svg>
    <ul class="ideen-liste">${vorn.map(karte).join('')}</ul>` : `<p class="leer-zeile">${weg.length ? 'Gerade keine offene Idee.' : 'Noch keine Idee.'}</p>`}
    ${weg.length ? `<details class="verschenkt"${zustand.verschenktOffen === p.id ? ' open' : ''}><summary>Schon verschenkt (${weg.length})</summary><ul class="ideen-liste">${weg.map(karte).join('')}</ul></details>` : ''}
  </section>`;
}

/* ---------- Meine Seite: was ich brauche, und was ich davon teile ---------- */
function wasIchBrauche() {
  const ws = zustand.wuensche.filter((w) => !w.entfernt_am);
  const offene = zustand.listen.filter((l) => !l.archiviert), zu = zustand.listen.filter((l) => l.archiviert);
  const kurz = zustand.alleWuensche ? ws : ws.slice(-4);
  return `<section class="brauche" aria-labelledby="brauche-titel">
    <div class="ideen-kopf"><h2 class="abschnitt" id="brauche-titel">Was ich brauche</h2><button class="knopf-text" type="button" data-aktion="wunsch-neu" aria-label="Wunsch hinzufügen">Hinzufügen</button></div>
    ${ws.length ? `<ol class="wunsch-liste ich">${kurz.map((w) => app.pille(w)).join('')}</ol>` : '<p class="leer-zeile">Noch kein Wunsch. Kopier einen Link aus dem Shop und füg ihn hinzu.</p>'}
    ${ws.length > kurz.length ? `<p><button class="knopf-text" type="button" data-aktion="alle-wuensche">Alle ${ws.length} Wünsche zeigen</button></p>` : ''}
    <h3 class="geteilt-kopf">Geteilt als</h3>
    ${offene.length ? `<ul class="geteilt-liste">${offene.map(app.listenKarte).join('')}</ul>` : '<p class="leer-zeile">Noch keine Liste. Leg eine für einen Anlass an, den Link schickst du dann an deine Leute.</p>'}
    <p class="liste-handlung"><button class="knopf-rand" type="button" data-aktion="liste-neu">${ICON.plus}<span>Neue Liste</span></button></p>
    ${zu.length ? `<details class="abgeschlossen"><summary>Abgeschlossen (${zu.length})</summary><ul class="geteilt-liste">${zu.map(app.listenKarte).join('')}</ul></details>` : ''}
  </section>`;
}

/* ---------- Einträge am Faden ---------- */
function posten(p) {
  const eintraege = B().eintraege.filter((e) => e.person_id === p.id).map((e) => ({ id: e.id, artId: artId(e), datum: e.datum, angelegt: e.angelegt, e }));
  const ideen = p.ist_ich ? [] : ideenVon(p.id).map((g) => ({ id: g.id, artId: 'geschenkidee', datum: ideeDatum(g), angelegt: g.angelegt, idee: g }));
  return [...eintraege, ...ideen];
}
const datumZeile = (e) => (e.genau === 'jahr' ? '' : e.genau === 'monat' ? MONATE[+e.datum.slice(5, 7) - 1] : datumTagMonat(e.datum));
const datumVoll = (e) => [datumZeile(e), e.datum.slice(0, 4)].filter(Boolean).join(' ');
const wartet = (id) => (imAusgang(id) ? '<span class="wartet" role="img" aria-label="wartet auf Verbindung" title="Im Gerät gesichert, wartet auf Verbindung"></span>' : '');

function anhaenger(x, seite) {
  const dreh = ((zufall(x.id)() * 2 - 1) * 0.8).toFixed(2);
  if (x.idee) {
    const g = x.idee, meta = ideeMeta(g);
    return `<li class="anhaenger ist-idee seite-${seite}" data-eintrag="${g.id}" style="--dreh:${dreh}deg" tabindex="-1">
      <span class="loch" aria-hidden="true"></span>
      <div class="anh-kopf">
        <span class="art-marke"><span class="art-zeichen art-geschenkidee">${ART.geschenk}</span><span>Geschenkidee</span></span>
        ${wartet(g.id)}<span class="anh-anlass">${esc(anlassText(g))}</span>
      </div>
      <p class="anh-titel"><button class="text-knopf" type="button" data-aktion="idee-bearbeiten" data-idee="${g.id}">${esc(g.titel)}<span class="nur-leser">, bearbeiten</span></button>${shop(g)}</p>
      ${g.notiz ? `<p class="anh-notiz">${esc(g.notiz)}</p>` : ''}
      <div class="anh-idee-fuss">${standKnopf(g, 'faden')}${meta ? `<span class="anh-meta">${meta}</span>` : ''}</div>
    </li>`;
  }
  const e = x.e, a = artVon(x.artId), name = a ? a.name : 'Art wählen';
  return `<li class="anhaenger seite-${seite}" data-eintrag="${e.id}" style="--dreh:${dreh}deg" tabindex="-1">
    <span class="loch" aria-hidden="true"></span>
    <div class="anh-kopf">
      <button class="art-knopf${a ? '' : ' ohne'}" type="button" data-aktion="art-menue" aria-expanded="false" aria-label="${a ? `${esc(name)}, Art ändern` : 'Art wählen'}">
        <span class="art-zeichen art-${artKlasse(a)}">${artBild(a ? a.zeichnung : 'frei', a?.name)}</span><span class="art-knopf-name">${esc(name)}</span><span class="art-pfeil">${ICON.klein}</span>
      </button>
      ${wartet(e.id)}<time datetime="${e.datum}">${datumZeile(e)}</time>
    </div>
    <p class="anh-text"><button class="text-knopf" type="button" data-aktion="eintrag-bearbeiten">${esc(e.text)}<span class="nur-leser">, bearbeiten</span></button></p>
  </li>`;
}

function gefiltert(p) {
  return posten(p).filter((x) => zustand.filter === 'alle' || x.artId === zustand.filter)
    .sort((a, b) => a.datum.localeCompare(b.datum) || String(a.angelegt).localeCompare(String(b.angelegt)));
}
function fadenHtml(p) {
  const alle = posten(p), liste = gefiltert(p), neu = zustand.reihenfolge === 'neu';
  if (neu) liste.reverse();
  let jahr = null, n = 0, html = '';
  for (const x of liste) {
    const j = x.datum.slice(0, 4);
    if (j !== jahr) { html += `<li class="jahr"><span class="knoten">${j}</span></li>`; jahr = j; }
    html += anhaenger(x, n++ % 2 ? 'r' : 'l');
  }
  if (!liste.length) html = `<li class="leer">${alle.length ? 'Hier hängt noch nichts.' : p.ist_ich ? 'Hier hängt noch nichts. Halte einen Satz über dich fest.' : `Hier hängt noch nichts. Was fällt dir zu ${esc(rufname(p))} ein?`}<br><button class="knopf-rand" type="button" data-aktion="festhalten" data-person="${p.id}">${ICON.plus}<span>Festhalten</span></button></li>`;
  const zahl = (id) => (id === 'alle' ? alle.length : alle.filter((x) => x.artId === id).length);
  const chips = [{ id: 'alle', name: 'alle' }, ...artenFuer(p)].map((a) => `<button class="chip" type="button" data-aktion="filter" data-filter="${a.id}" aria-pressed="${zustand.filter === a.id}">${a.zeichnung ? `<span class="art-zeichen art-${artKlasse(a)}">${artBild(a.zeichnung, a.name)}</span>` : ''}<span>${esc(a.name)}</span><span class="chip-zahl">${zahl(a.id)}</span></button>`).join('');
  return `<div class="eintraege-kopf">
      <h2 class="abschnitt" id="ueber-titel">Über ${esc(ruf(p))}</h2>
      ${liste.length > 1 ? `<span class="eintraege-werkzeug">${zustand.filter !== 'alle' ? `<button class="umschalter" type="button" data-aktion="kopieren" aria-label="Diese Einträge als Text kopieren">${ICON.kopie}<span>kopieren</span></button>` : ''}
      <button class="umschalter" type="button" data-aktion="reihenfolge" aria-label="${neu ? 'Neu zuerst' : 'Alt zuerst'}, Reihenfolge umkehren">${ICON.pfeile}<span>${neu ? 'neu → alt' : 'alt → neu'}</span></button></span>` : ''}
    </div>
    ${alle.length ? `<div class="filter" role="group" aria-label="Nach Art filtern">${chips}</div>` : ''}
    <div class="faden" data-faden="${p.id}">
      <svg class="faden-hinten" aria-hidden="true"></svg>
      <ol class="faden-liste">${html}</ol>
      <svg class="faden-vorn" aria-hidden="true"></svg>
    </div>`;
}

export function seitePerson(id) {
  const p = person(id);
  if (!p) return '<article class="seite fehlerseite"><h1 class="seiten-titel" tabindex="-1">Niemand gefunden</h1><p><a class="knopf-text" href="#menschen">Zu deinen Menschen</a></p></article>';
  if (zustand.filterFuer !== p.id) Object.assign(zustand, { filter: 'alle', filterFuer: p.id, reihenfolge: 'neu', reihenfolgeVonHand: false });
  if (zustand.filter !== 'alle' && !artVon(zustand.filter)) zustand.filter = 'alle';
  if (!p.ist_ich) besucht(p.id);
  return `<article class="seite seite-person">
    <svg class="faden-oben" aria-hidden="true"></svg>
    ${p.ist_ich ? app.appHinweis?.() || '' : ''}
    ${ausweis(p)}
    ${p.ist_ich ? wasIchBrauche() : geschenkideen(p)}
    <section class="eintraege" aria-labelledby="ueber-titel">${fadenHtml(p)}</section>
    ${p.ist_ich ? `<p class="einstellungen-verweis"><a class="knopf-rand" href="#einstellungen">${ICON.zahnrad}<span>Einstellungen</span></a></p>` : ''}
  </article>`;
}

/* =====================================================================
 * Suche: über alles, läuft im Gerät
 * ===================================================================== */
const ohneTrenner = (t) => String(t ?? '').replace(/­/g, '');
const glatt = (t) => ohneTrenner(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss');
/* Markiert die Wörter auch dann, wenn sie mit anderen Akzenten getippt sind. */
function markieren(text, worte) {
  const roh = ohneTrenner(text), zeichenListe = [...roh], karte = [];
  let g = '';
  zeichenListe.forEach((z, i) => { const s = glatt(z); for (let k = 0; k < s.length; k++) karte.push(i); g += s; });
  const an = new Set();
  for (const w of worte) for (let i = g.indexOf(w); i >= 0; i = g.indexOf(w, i + w.length)) for (let k = i; k < i + w.length; k++) an.add(karte[k]);
  let html = '', offenMark = false;
  zeichenListe.forEach((z, i) => {
    if (an.has(i) !== offenMark) { html += offenMark ? '</mark>' : '<mark>'; offenMark = !offenMark; }
    html += esc(z);
  });
  return html + (offenMark ? '</mark>' : '');
}
function treffer(eingabe) {
  const worte = glatt(eingabe).trim().split(/\s+/).filter(Boolean);
  if (!worte.length) return '';
  const hat = (t) => { const g = glatt(t); return worte.every((w) => g.includes(w)); };
  const eins = (t) => { const g = glatt(t); return worte.some((w) => g.includes(w)); };
  const leute = B().personen.map((p) => {
    const felder = [p.name, p.rufname, p.kennen_woher, ...steckbriefVon(p.id).map((s) => `${s.bezeichnung} ${s.wert}`), ...familieVon(p.id).map((f) => `${f.name}${f.art ? ` (${f.art})` : ''}`), p.geburtstag_tag ? geburtstagText(p) : ''];
    if (!hat(felder.join(' · '))) return null;
    return { p, fund: felder.slice(1).find(eins), rang: hat(p.name) || hat(p.rufname) ? 0 : 1 };
  }).filter(Boolean).sort((a, b) => a.rang - b.rang || nachName(a.p, b.p));
  /* Name der Person und der Art zählen mit, „mia geschichte“ findet also Mias Geschichten. Das Wort muss aber auch im
   * Eintrag oder seiner Art stecken, sonst brächte jeder Name alle seine Einträge mit. */
  const mitPerson = (pid, eigenes) => { const p = person(pid); return p && eins(eigenes) && hat(`${eigenes} ${p.name} ${p.rufname} ${p.ist_ich ? 'ich' : ''}`); };
  const eintraege = B().eintraege.filter((e) => mitPerson(e.person_id, `${e.text} ${artVon(artId(e))?.name || ''}`)).sort((a, b) => b.datum.localeCompare(a.datum));
  const ideen = B().geschenke.filter((g) => mitPerson(g.person_id, `${g.titel} ${g.notiz} ${g.haendler} ${anlassText(g)} ${standName(g.stand)}`));
  const wuensche = zustand.wuensche.filter((w) => !w.entfernt_am && hat(`${w.titel} ${w.beschreibung} ${w.haendler}`));
  if (!leute.length && !eintraege.length && !ideen.length && !wuensche.length) return `<p class="leer-zeile">Nichts zu „${esc(eingabe.trim())}“.</p>`;
  const gruppe = (titel, zeilen) => {
    const viele = zeilen.length > 40;
    return `<section class="treffer-gruppe"><h2 class="abschnitt">${titel}</h2><ul class="zeilen">${zeilen.slice(0, 40).join('')}</ul>${viele ? `<p class="leer-zeile">und ${zeilen.length - 40} weitere</p>` : ''}</section>`;
  };
  let html = '';
  if (leute.length) html += gruppe('Menschen', leute.map(({ p, fund, rang }) => `<li><a class="zeile" href="${href(p)}">${mono(p, 40)}<span class="zeile-haupt"><span class="zeile-name">${markieren(p.name, worte)}${p.ist_ich ? ' <span class="leise">· ich</span>' : ''}</span>${fund && rang ? `<span class="zeile-unter">${markieren(fund, worte)}</span>` : ''}</span></a></li>`));
  if (eintraege.length) html += gruppe('Einträge', eintraege.map((e) => {
    const a = artVon(artId(e)), p = person(e.person_id);
    return `<li><a class="zeile zeile-eintrag" href="${href(p)}" data-springe="${e.id}"><span class="art-zeichen gross art-${artKlasse(a)}">${artBild(a ? a.zeichnung : 'frei', a?.name)}</span><span class="zeile-haupt"><span class="zeile-text">${markieren(e.text, worte)}</span><span class="zeile-unter">${esc(p.ist_ich ? 'Ich' : rufname(p))} · ${a ? markieren(a.name, worte) : 'ohne Art'} · ${datumVoll(e)}</span></span></a></li>`;
  }));
  if (ideen.length) html += gruppe('Geschenkideen', ideen.map((g) => `<li><a class="zeile" href="${href(person(g.person_id))}" data-springe="${g.id}"><span class="zeile-bild">${ART.geschenk}</span><span class="zeile-haupt"><span class="zeile-name">${markieren(g.titel, worte)}</span><span class="zeile-unter">${[esc(rufname(person(g.person_id))), markieren(anlassText(g), worte), standName(g.stand)].filter(Boolean).join(' · ')}</span></span></a></li>`));
  if (wuensche.length) html += gruppe('Meine Wünsche', wuensche.map((w) => {
    const l = zustand.lw.find((x) => x.wunsch_id === w.id);
    return `<li><a class="zeile" href="${l ? `#liste/${l.liste_id}` : '#ich'}"><span class="zeile-bild">${PRODUKT.box}</span><span class="zeile-haupt"><span class="zeile-name">${markieren(w.titel, worte)}</span><span class="zeile-unter">${[w.preis_ca != null ? euro(w.preis_ca) : '', markieren(w.haendler, worte)].filter(Boolean).join(' · ')}</span></span></a></li>`;
  }));
  return html;
}
export function seiteSuche() {
  return `<article class="seite seite-suche">
    <h1 class="seiten-titel" tabindex="-1">Suche</h1>
    <div class="suchfeld">${ICON.suche}<label class="nur-leser" for="suchfeld">Suchen</label><input id="suchfeld" type="search" autocomplete="off" autocapitalize="none" spellcheck="false" enterkeyhint="search" placeholder="Name, Satz, Geschenk" value="${esc(zustand.suchwort || '')}"></div>
    <div id="treffer" class="treffer" aria-live="polite">${treffer(zustand.suchwort || '')}</div>
  </article>`;
}

/* =====================================================================
 * Einstellungen
 * ===================================================================== */
const THEMA = 'freundebuch.thema';
export function themaSetzen(t) {
  if (t === 'hell' || t === 'dunkel') document.documentElement.dataset.thema = t;
  else delete document.documentElement.dataset.thema;
}
const kalenderLink = () => `${api.SUPABASE}/functions/v1/kalender?s=${B().abo}`;
export function seiteEinstellungen() {
  const t = api.speicher.lesen(THEMA) || 'geraet', name = zustand.konto?.anzeigename || '';
  return `<article class="seite seite-einstellungen">
    <a class="zurueck" href="#ich">${ICON.weiter}<span>Meine Seite</span></a>
    <h1 class="seiten-titel" tabindex="-1">Einstellungen</h1>
    <section aria-labelledby="e-kal"><h2 class="abschnitt" id="e-kal">Geburtstage im Kalender</h2>
      ${B().abo ? `<p class="leise">Wer dazukommt, erscheint von selbst. Drin stehen nur Name und Tag.</p>
        <p class="liste-handlung"><a class="knopf" href="${esc(kalenderLink().replace(/^https?:/, 'webcal:'))}">${ICON.kalender}<span>Hier abonnieren</span></a><button class="knopf-rand" type="button" data-aktion="kalender-kopieren">${ICON.link}<span>Link kopieren</span></button></p>
        <details class="erklaer"><summary>Wie geht das bei Google?</summary><p>Link kopieren, am Computer calendar.google.com öffnen, links bei „Weitere Kalender“ auf + und „Per URL“ gehen und den Link einfügen.</p></details>
        <p><button class="knopf-text" type="button" data-aktion="kalender-neu">Neuen Link erzeugen</button> <button class="knopf-text warnung" type="button" data-aktion="kalender-aus">Kalender ausschalten</button></p>`
      : '<p class="leise">Dein Handy zeigt dir die Geburtstage im eigenen Kalender. Drin stehen nur Name und Tag.</p><p class="liste-handlung"><button class="knopf-rand" type="button" data-aktion="kalender-an">Kalender-Link erstellen</button></p>'}
    </section>
    <section aria-labelledby="e-arten"><h2 class="abschnitt" id="e-arten">Eigene Arten</h2>
      ${B().arten.length ? `<ul class="zeilen">${B().arten.map((a) => `<li class="zeile art-zeile" data-art-zeile="${a.id}"><span class="art-zeichen gross art-eigen">${artBild('eigen', a.name)}</span><span class="zeile-haupt"><span class="zeile-name">${esc(a.name)}</span><span class="zeile-unter">${zahlWort(B().eintraege.filter((e) => e.art_id === a.id).length, 'Eintrag', 'Einträge')}</span></span><button class="knopf-text" type="button" data-aktion="art-umbenennen">Umbenennen</button><button class="knopf-text warnung" type="button" data-aktion="art-loeschen">Löschen</button></li>`).join('')}</ul>` : '<p class="leise">Neben mag, mag nicht, Interesse, Geschichte und Erlebnis kannst du eigene Arten anlegen, zum Beispiel Zitat.</p>'}
      <form class="kurz-form" data-form="art-neu" novalidate><label class="nur-leser" for="e-art">Name der neuen Art</label><input class="eingabe" id="e-art" type="text" maxlength="24" autocomplete="off" enterkeyhint="done" placeholder="Neue Art"><button class="knopf-rand" type="submit">Anlegen</button></form>
    </section>
    <section aria-labelledby="e-aus"><h2 class="abschnitt" id="e-aus">Aussehen</h2>
      <div class="wahl" role="radiogroup" aria-labelledby="e-aus">${[['geraet', 'Wie das Gerät'], ['hell', 'Hell'], ['dunkel', 'Dunkel']].map(([id, n]) => `<button class="chip" type="button" role="radio" aria-checked="${t === id}" aria-pressed="${t === id}" data-aktion="thema" data-thema-wahl="${id}">${n}</button>`).join('')}</div>
    </section>
    <section aria-labelledby="e-konto"><h2 class="abschnitt" id="e-konto">Konto</h2>
      <p class="name-zeile"><span>Auf deinen Listen steht: „<strong>${esc(name || '…')}</strong> wünscht sich“</span><button class="knopf-text" type="button" data-aktion="name">Ändern</button></p>
      <p class="listen-fuss"><button class="knopf-text" type="button" data-aktion="code-holen">Code für die App</button>
      <button class="knopf-text" type="button" data-aktion="export">Alles als Datei sichern</button>
      <button class="knopf-text" type="button" data-aktion="abmelden">Abmelden</button></p>
    </section>
  </article>`;
}

/* =====================================================================
 * Anzeigen: nach dem Zeichnen, neu zeichnen ohne Springen
 * ===================================================================== */
const main = $('#inhalt');
export function nachRender() {
  if ($('[data-faden]')) {
    fadenZeichnen();
    beobachter.disconnect();
    beobachter.observe($('[data-faden]'));
    if ($('.seite-person')) beobachter.observe($('.seite-person'));
  } else beobachter.disconnect();
  if (zustand.neuId) anhaengerAnkommen();
  if (zustand.springeZu) {
    const ziel = zustand.springeZu === 'ideen' ? $('.ideen') : $(`[data-eintrag="${zustand.springeZu}"]`);
    zustand.springeZu = null;
    if (ziel) { ziel.scrollIntoView({ block: 'center' }); ziel.focus?.({ preventScroll: true }); }
  }
}
const aktuelle = () => { const r = app.route(); return r.teil === 'ich' ? ich() : r.teil === 'person' ? person(r.id) : null; };
export function seiteNeu(fokus) {
  const p = aktuelle();
  if (!p) { app.zeigen({ still: true }); return; }
  const y = scrollY, links = $('.filter')?.scrollLeft || 0;
  main.innerHTML = seitePerson(p.id);
  if ($('.filter')) $('.filter').scrollLeft = links;
  nachRender();
  if (!zustand.neuId) window.scrollTo(0, y);
  if (fokus) $(fokus)?.focus({ preventScroll: true });
}
function eintraegeNeu(fokus) {
  const p = aktuelle(), sek = $('.eintraege');
  if (!p || !sek) return;
  const links = $('.filter', sek)?.scrollLeft || 0;
  sek.innerHTML = fadenHtml(p);
  if ($('.filter', sek)) $('.filter', sek).scrollLeft = links;
  nachRender();
  $('.chip[aria-pressed="true"]', sek)?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  if (fokus) $(fokus)?.focus({ preventScroll: true });
}
document.fonts?.ready.then(() => fadenZeichnen());

/* =====================================================================
 * Festhalten: von überall, ein Schritt
 * ===================================================================== */
/* Der angefangene Satz bleibt im Gerät, auch wenn das Handy die App zwischendurch wegwirft. */
const ENTWURF = () => `freundebuch.entwurf.${api.kontoId()}`;
let entwurf = { text: '', art: null };
try { entwurf = { text: '', art: null, ...JSON.parse(api.speicher.lesen(ENTWURF()) || '{}') }; } catch { /* kein Entwurf */ }
function entwurfMerken(e) { entwurf = e; api.speicher.schreiben(ENTWURF(), e.text || e.art ? JSON.stringify(e) : null); }
const fhArtKnopf = (a) => `<button class="fh-art art-${artKlasse(a)}" type="button" role="radio" aria-checked="false" data-aktion="fh-art" data-fh-art="${a.id}" aria-label="${esc(a.name)}" title="${esc(a.name)}"><span class="art-zeichen art-${artKlasse(a)}">${artBild(a.zeichnung, a.name)}</span></button>`;
const FH_NEU = '<button class="fh-art fh-art-neu" type="button" data-aktion="fh-art-neu" aria-label="Neue Art anlegen" title="Neue Art"><span aria-hidden="true">＋</span><span aria-hidden="true">Art</span></button>';

export function festhalten(vorgabe) {
  if (zustand.blatt) return;
  const p = vorgabe ? person(vorgabe) : aktuelle();
  blattOeffnen('festhalten', {
    person: p?.id || null, artId: entwurf.art, suche: '',
    beimSchliessen: () => { const f = $('#fh-text'); if (f && !zustand.fhFertig) entwurfMerken({ text: f.value, art: f.value.trim() ? zustand.blatt?.artId ?? entwurf.art : null }); },
  }, `<h2 class="blatt-titel" id="blatt-titel">Festhalten</h2>
    <form data-form="festhalten" novalidate>
      <div class="fh-person"></div>
      <label class="nur-leser" for="fh-text">Ein Satz</label>
      <textarea id="fh-text" rows="3" maxlength="4000" enterkeyhint="done">${esc(entwurf.text)}</textarea>
      <div class="fh-arten-kopf"><span class="fh-art-name" aria-hidden="true">Art</span><button class="fh-wann" type="button" data-aktion="fh-wann" aria-expanded="false">heute</button></div>
      <div class="fh-arten" role="radiogroup" aria-label="Art (freiwillig)"></div>
      <div class="fh-datum" hidden>${datumFelder('fh', { genau: 'tag', datum: heute() })}</div>
      <p class="feld-fehler" id="fh-fehler" role="alert" hidden></p>
      <div class="blatt-fuss">
        <button class="knopf-rand" type="button" data-aktion="blatt-zu">Abbrechen</button>
        <button class="knopf" type="submit">Speichern</button>
      </div>
    </form>`);
  personWahl();
  /* Sofort (im Antippen), damit am iPhone die Tastatur aufgeht. */
  (zustand.blatt.person ? $('#fh-text') : $('#fh-person')).focus({ preventScroll: true });
}
function personWahl(fokus = false) {
  const b = zustand.blatt, wo = $('.fh-person');
  if (!b || !wo) return;
  const p = b.person && person(b.person);
  $('.blatt button[type="submit"]').disabled = !p;
  if (p) {
    wo.innerHTML = `<div class="fh-gewaehlt">${mono(p, 40)}<span class="fh-gewaehlt-name"><span class="leise">Über</span> ${esc(p.ist_ich ? 'mich' : rufname(p))}</span><button class="knopf-text" type="button" data-aktion="fh-person-aendern" aria-label="Person ändern">ändern</button></div>`;
    $('#fh-text').placeholder = p.ist_ich ? 'Ein Satz über mich' : `Ein Satz über ${rufname(p)}`;
    if (fokus) $('#fh-text').focus();
  } else {
    wo.innerHTML = `<div class="fh-wahl"><label class="nur-leser" for="fh-person">Über wen?</label><input id="fh-person" type="text" maxlength="80" autocomplete="off" autocapitalize="words" enterkeyhint="next" placeholder="Über wen?" value="${esc(b.suche)}"><ul class="fh-vorschlaege" aria-label="Vorschläge"></ul></div>`;
    $('#fh-text').placeholder = 'Ein Satz';
    vorschlaegeZeigen();
    if (fokus) $('#fh-person').focus();
  }
  fhArten(p);
}
function fhArten(p) {
  if (p?.ist_ich && zustand.blatt.artId === 'geschenkidee') zustand.blatt.artId = null;
  $('.fh-arten').innerHTML = artenFuer(p).map(fhArtKnopf).join('') + FH_NEU;
  fhArtWaehlen(zustand.blatt.artId);
}
function vorschlaege() {
  const s = glatt(zustand.blatt?.suche || '').trim();
  const reihe = [...zuletzt().map(person).filter((p) => p && !p.ist_ich)];
  for (const p of [...menschen()].sort(nachName)) if (!reihe.includes(p)) reihe.push(p);
  if (ich()) reihe.push(ich());
  const worte = s.split(/\s+/).filter(Boolean);
  return reihe.filter((p) => { const g = glatt(`${p.name} ${p.rufname} ${p.ist_ich ? 'ich' : ''}`); return worte.every((w) => g.includes(w)); }).slice(0, s ? 6 : 5);
}
function vorschlaegeZeigen() {
  const ul = $('.fh-vorschlaege');
  if (!ul) return;
  const v = vorschlaege(), s = zustand.blatt.suche.trim();
  const gibt = s && menschen().some((p) => [p.name, p.rufname, kurzname(p)].some((n) => glatt(n) === glatt(s)));
  ul.innerHTML = v.map((p) => `<li><button class="fh-vorschlag" type="button" data-aktion="fh-person" data-person="${p.id}">${mono(p, 30)}<span>${esc(p.ist_ich ? 'Ich' : rufname(p))}</span></button></li>`).join('')
    + (s && !gibt ? `<li><button class="fh-vorschlag neu" type="button" data-aktion="fh-person-neu">${ICON.plus}<span>„${esc(s)}“ anlegen</span></button></li>` : '');
}
function fhArtWaehlen(id) {
  zustand.blatt.artId = id;
  entwurf.art = id;
  const a = id ? artVon(id) : null;
  if (id && !a) { fhArtWaehlen(null); return; }
  $$('.fh-art[data-fh-art]').forEach((k) => k.setAttribute('aria-checked', String(k.dataset.fhArt === id)));
  $('.fh-art-name').textContent = a ? a.name : 'Art';
  $('.fh-art-name').classList.toggle('gewaehlt', !!a);
}
function fhArtNeuOeffnen(knopf) {
  knopf.outerHTML = '<span class="neue-art-feld"><label class="nur-leser" for="fh-neue-art">Name der neuen Art</label><input id="fh-neue-art" class="neue-art" type="text" maxlength="24" autocomplete="off" enterkeyhint="done" placeholder="Name"></span>';
  const feld = $('#fh-neue-art');
  feld.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  feld.focus();
}
async function fhArtNeuFertig(anlegen) {
  const a = anlegen ? await artAnlegen($('#fh-neue-art').value) : null;
  if (!zustand.blatt) return;
  if (a) zustand.blatt.artId = a.id;
  fhArten(zustand.blatt.person && person(zustand.blatt.person));
  (a ? $(`.fh-art[data-fh-art="${a.id}"]`) : $('.fh-art-neu'))?.focus();
}

const linkIn = (t) => t.match(/https?:\/\/\S+/)?.[0] || '';
function festhaltenSpeichern() {
  const b = zustand.blatt, feld = $('#fh-text'), text = feld.value.trim();
  if (!b.person) { $('#fh-person')?.focus(); return; }
  if (!text) { feld.setAttribute('aria-invalid', 'true'); feld.focus(); return; }
  const tag = $('.fh-datum').hidden ? { datum: heute(), genau: 'tag' } : datumAus('fh');
  if (!tag) { Object.assign($('#fh-fehler'), { hidden: false, textContent: 'Dieses Datum gibt es nicht.' }); return; }
  const r = feld.getBoundingClientRect(), p = person(b.person), art = b.artId, id = neueId(), angelegt = new Date().toISOString();
  if (art === 'geschenkidee' && !p.ist_ich) neueIdee(p, text, id, angelegt);
  else neueZeile('eintrag', { id, person_id: p.id, ...artFelder(art), text, ...tag, angelegt });
  besucht(p.id);
  zustand.fhFertig = true;
  blattZu();
  zustand.fhFertig = false;
  entwurfMerken({ text: '', art: null });
  if (aktuelle()?.id === p.id) {
    if (zustand.filter !== 'alle' && zustand.filter !== art) zustand.filter = 'alle';
    zustand.flugVon = { left: r.left, top: r.top, width: r.width, height: r.height };
    zustand.neuId = id;
    seiteNeu();
    hinweis(p.ist_ich ? 'Bei dir festgehalten' : `Bei ${rufname(p)} festgehalten`);
  } else {
    if (['start', 'menschen'].includes(app.route().teil)) seiteNeu();
    hinweis('', { davor: 'Bei ', text: p.ist_ich ? 'dir' : rufname(p), danach: ' festgehalten', href: href(p) });
  }
}
/* Geschenkidee aus dem Festhalten: nächster Anlass vorbelegt; steckt ein Link drin, schaut die App danach im Shop nach. */
function neueIdee(p, text, id, angelegt) {
  const url = linkIn(text), rest = text.replace(url, '').replace(/\s+/g, ' ').trim(), naechster = anlaesse(p)[0];
  let wirt = '';
  try { wirt = url ? new URL(url).hostname.replace(/^www\./, '') : ''; } catch { /* kein Link */ }
  const zeile = {
    id, person_id: p.id, titel: (rest || wirt || text).slice(0, 200), notiz: rest.length > 200 ? rest : '',
    shop_url: /^https?:\/\//i.test(url) ? url.slice(0, 2000) : null, haendler: '', bild_pfad: null, preis_ca: null, stand: 'idee',
    anlass: naechster?.anlass || '', anlass_jahr: naechster?.jahr || null, angelegt,
  };
  neueZeile('geschenk', zeile);
  if (!zeile.shop_url) return;
  api.vorschau(zeile.shop_url).then(async (v) => {
    const g = B().geschenke.find((x) => x.id === id);
    if (!g || !v?.gefunden) return;
    await ausgangLeeren();
    const ok = await aendereZeile('geschenk', g, {
      titel: !rest && v.titel ? v.titel.slice(0, 200) : g.titel, shop_url: v.shop_url || g.shop_url, haendler: (v.haendler || '').slice(0, 40),
      bild_pfad: v.bild_pfad || null, preis_ca: v.preis_ca ?? null, preis_stand: v.preis_ca != null ? heute() : null,
    });
    if (ok && !zustand.blatt && !zustand.neuId && aktuelle()?.id === p.id) seiteNeu();
  }).catch(() => { /* ohne Vorschau bleibt der Link */ });
}

/* Der neue Eintrag fliegt aus dem Blatt an den Faden. */
function anhaengerAnkommen() {
  const id = zustand.neuId, li = $(`.faden [data-eintrag="${id}"]`), von = zustand.flugVon;
  zustand.flugVon = null;
  if (!li) { zustand.neuId = null; return; }
  const r0 = li.getBoundingClientRect();
  if (r0.top < 90 || r0.bottom > innerHeight - 110) window.scrollBy({ top: r0.top - innerHeight * 0.32, behavior: 'instant' });
  fadenZeichnen();
  const r = li.getBoundingClientRect();
  li.classList.add('ankommend');
  const fertig = () => { li.classList.remove('ankommend'); if (zustand.neuId === id) zustand.neuId = null; fadenZeichnen(); if (li.isConnected && !zustand.blatt) li.focus({ preventScroll: true }); };
  if (ruhig() || !von) { li.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240 }).finished.then(fertig, fertig); return; }
  const dx = von.left - r.left, dy = von.top - r.top, s = Math.max(0.7, Math.min(1.15, von.width / r.width));
  li.animate([
    { transform: `translate(${dx}px, ${dy}px) scale(${s})`, opacity: 0.35 },
    { transform: `translate(${dx * 0.18}px, ${dy * 0.1}px) rotate(-5deg)`, opacity: 1, offset: 0.58 },
    { transform: 'rotate(2.2deg)', offset: 0.8 },
    { transform: 'none' },
  ], { duration: 820, easing: 'cubic-bezier(.3,.65,.25,1)' }).finished.then(fertig, fertig);
}

/* =====================================================================
 * Datum: Tag und Monat dürfen fehlen („2014“ reicht)
 * ===================================================================== */
function datumFelder(vor, { datum: d, genau }, name = 'Wann') {
  const [j, m, t] = d ? d.split('-').map(Number) : ['', '', ''];
  return `<div class="datum-felder" role="group" aria-label="${name}">
    <label class="feld"><span class="feld-name">Tag</span><input id="${vor}-tag" type="text" inputmode="numeric" maxlength="2" autocomplete="off" value="${genau === 'tag' ? t : ''}" placeholder="–"></label>
    <label class="feld"><span class="feld-name">Monat</span><select id="${vor}-monat"><option value="">–</option>${MONATE.map((n, i) => `<option value="${i + 1}"${genau !== 'jahr' && m === i + 1 ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
    <label class="feld"><span class="feld-name">Jahr</span><input id="${vor}-jahr" type="text" inputmode="numeric" maxlength="4" autocomplete="off" value="${j}" placeholder="–"></label>
  </div>`;
}
function datumAus(vor) {
  const t = $(`#${vor}-tag`).value.trim(), m = +$(`#${vor}-monat`).value, j = $(`#${vor}-jahr`).value.trim();
  if (!/^(19|20|21)\d{2}$/.test(j) || (t && !m) || (t && !/^\d{1,2}$/.test(t))) return null;
  if (t && (+t < 1 || +t > new Date(+j, m, 0).getDate())) return null;
  const zwei = (n) => String(n).padStart(2, '0');
  return { datum: `${j}-${zwei(m || 1)}-${zwei(+t || 1)}`, genau: t ? 'tag' : m ? 'monat' : 'jahr' };
}

/* ---------- Eintrag bearbeiten ---------- */
function eintragBlatt(e) {
  const p = person(e.person_id), wahl = [...artenFuer(p).filter((a) => a.id !== 'geschenkidee'), { id: '', name: 'ohne' }];
  return `<h2 class="blatt-titel" id="blatt-titel">Eintrag</h2>
    <form data-form="eintrag" novalidate>
      <label class="nur-leser" for="e-text">Text</label>
      <textarea id="e-text" rows="4" maxlength="4000">${esc(e.text)}</textarea>
      <div class="chips arten-wahl" role="radiogroup" aria-label="Art">${wahl.map((a) => `<button class="chip" type="button" role="radio" aria-checked="${(artId(e) || '') === a.id}" aria-pressed="${(artId(e) || '') === a.id}" data-aktion="e-art" data-e-art="${a.id}">${esc(a.name)}</button>`).join('')}</div>
      ${datumFelder('e', e)}
      <label class="feld"><span class="feld-name">Über</span><select id="e-person">${[...menschen()].sort(nachName).concat(ich() || []).map((q) => `<option value="${q.id}"${q.id === e.person_id ? ' selected' : ''}>${esc(q.ist_ich ? 'mich' : q.name)}</option>`).join('')}</select></label>
      <p class="feld-fehler" id="e-fehler" role="alert" hidden></p>
      <div class="blatt-fuss"><span class="links"><button class="knopf-text warnung" type="button" data-aktion="eintrag-loeschen">Löschen</button></span>
        <button class="knopf-rand" type="button" data-aktion="blatt-zu">Abbrechen</button><button class="knopf" type="submit">Speichern</button></div>
    </form>`;
}
async function eintragSpeichern() {
  const e = zustand.blatt.eintrag, text = $('#e-text').value.trim(), tag = datumAus('e');
  const fehler = (t, f) => { Object.assign($('#e-fehler'), { hidden: false, textContent: t }); $(f).focus(); };
  if (!text) { fehler('Der Eintrag ist leer. Zum Entfernen tipp auf Löschen.', '#e-text'); return; }
  if (!tag) { fehler('Dieses Datum gibt es nicht. Das Jahr allein genügt.', '#e-jahr'); return; }
  const pid = $('#e-person').value;
  const ok = aendereZeile('eintrag', e, { text, ...tag, ...artFelder(zustand.blatt.artId), person_id: pid, geaendert: new Date().toISOString() });
  blattZu();
  seiteNeu(`[data-eintrag="${e.id}"] .text-knopf`);
  const gut = await ok;
  if (gut) gespeichert(gut); else seiteNeu();
}

/* ---------- Art eines Eintrags ändern: klappt im Eintrag auf ---------- */
function artMenue(knopf) {
  const li = knopf.closest('[data-eintrag]');
  if (zustand.menue?.id === li.dataset.eintrag) { menueZu(true); return; }
  menueZu();
  const e = B().eintraege.find((x) => x.id === li.dataset.eintrag);
  if (!e) return;
  const wahl = [...artenFuer(person(e.person_id)), { id: '', name: 'ohne Art', zeichnung: 'frei' }];
  $('.anh-kopf', li).insertAdjacentHTML('afterend', `<div class="art-menue" id="art-menue" role="group" aria-label="Art wählen">${wahl.map((a) => `<button class="art-wahl" type="button" data-aktion="art-setzen" data-art="${a.id}" aria-pressed="${(artId(e) || '') === a.id}"><span class="art-zeichen art-${a.id ? artKlasse(a) : 'ohne'}">${artBild(a.zeichnung, a.name)}</span><span>${esc(a.name)}</span></button>`).join('')}<button class="art-wahl art-wahl-neu" type="button" data-aktion="art-neu"><span class="art-plus" aria-hidden="true">＋</span><span>Art</span></button></div>`);
  const m = $('.art-menue', li);
  li.classList.add('menue-offen');
  zustand.menue = { id: e.id, knopf, li };
  knopf.setAttribute('aria-expanded', 'true');
  knopf.setAttribute('aria-controls', 'art-menue');
  fadenZeichnen();
  m.scrollIntoView({ block: 'nearest' });
  ($('[aria-pressed="true"]', m) || $('button', m)).focus({ preventScroll: true });
}
export function menueZu(fokus = false) {
  if (!zustand.menue) return;
  const { knopf, li } = zustand.menue;
  zustand.menue = null;
  $('.art-menue')?.remove();
  li?.classList.remove('menue-offen');
  knopf.setAttribute('aria-expanded', 'false');
  knopf.removeAttribute('aria-controls');
  if (li?.isConnected) fadenZeichnen();
  if (fokus && knopf.isConnected) knopf.focus({ preventScroll: true });
}
async function artSetzen(id) {
  const e = B().eintraege.find((x) => x.id === zustand.menue?.id);
  if (!e) return;
  menueZu();
  if (id === 'geschenkidee') {
    /* Aus dem Satz wird eine Geschenkidee mit Stand und Anlass. Erst die Idee, dann der Satz weg: so geht nichts verloren. */
    const p = person(e.person_id), gid = neueId();
    neueIdee(p, e.text, gid, e.angelegt);
    await loescheZeile('eintrag', e);
    seiteNeu(`.faden [data-eintrag="${gid}"] .text-knopf`);
    hinweis('Jetzt eine Geschenkidee');
    return;
  }
  const ok = aendereZeile('eintrag', e, artFelder(id));
  eintraegeNeu(`[data-eintrag="${e.id}"] [data-aktion="art-menue"]`);
  hinweis(`Art: ${id ? artVon(id).name : 'ohne'}`);
  if (!(await ok)) eintraegeNeu();
}

/* =====================================================================
 * Person anlegen und Steckbrief bearbeiten
 * ===================================================================== */
const FARBEN = ['flieder', 'pfirsich', 'salbei', 'sand', 'rose'];
function naechsteFarbe() {
  const zahl = (f) => menschen().filter((p) => p.farbe === f).length;
  return [...FARBEN].sort((a, b) => zahl(a) - zahl(b))[0];
}
const VORSCHLAEGE = ['Kleidung', 'Schuhe', 'Ring', 'Allergie', 'Lieblingsblume', 'Kaffee', 'Adresse', 'Beruf'];
const steckZeile = (s = {}) => `<li class="steck-zeile" data-steck="${s.id || ''}"><input class="eingabe" type="text" maxlength="40" aria-label="Was" placeholder="z. B. Schuhe" list="steck-vorschlag" autocomplete="off" data-bez value="${esc(s.bezeichnung || '')}"><input class="eingabe" type="text" maxlength="200" aria-label="Wert" placeholder="42" autocomplete="off" data-wert value="${esc(s.wert || '')}"><button class="zeile-weg" type="button" data-aktion="zeile-weg" aria-label="Zeile entfernen">${ICON.weg}</button></li>`;
const famZeile = (f = {}) => `<li class="steck-zeile" data-fam="${f.id || ''}"><input class="eingabe" type="text" maxlength="80" aria-label="Name" placeholder="Name" list="fam-vorschlag" autocomplete="off" data-bez value="${esc(f.name || '')}"><input class="eingabe" type="text" maxlength="40" aria-label="Wie verwandt" placeholder="z. B. Tochter" autocomplete="off" data-wert value="${esc(f.art || '')}"><button class="zeile-weg" type="button" data-aktion="zeile-weg" aria-label="Zeile entfernen">${ICON.weg}</button></li>`;

function personBlatt(p) {
  const neu = !p.id;
  const steck = neu ? [] : steckbriefVon(p.id), fam = neu ? [] : familieVon(p.id);
  return `<h2 class="blatt-titel" id="blatt-titel">${neu ? 'Wer ist es?' : p.ist_ich ? 'Meine Seite' : 'Steckbrief'}</h2>
    <form data-form="person" novalidate>
      <label class="feld feld-titel"><span class="feld-name">Name</span><input id="p-name" type="text" maxlength="80" autocomplete="off" autocapitalize="words" value="${esc(p.name || '')}" ${zustand.blattFeld ? '' : 'autofocus'}></label>
      ${p.ist_ich ? '' : `<label class="feld"><span class="feld-name">Wie ich sie oder ihn nenne (freiwillig)</span><input id="p-ruf" type="text" maxlength="40" autocomplete="off" autocapitalize="words" value="${esc(p.rufname || '')}" placeholder="z. B. Oma Hilde"></label>`}
      <fieldset class="feld-gruppe"><legend class="feld-name">Geburtstag (das Jahr darf fehlen)</legend>${geburtstagFelder(p)}</fieldset>
      ${p.ist_ich ? '' : `<label class="feld"><span class="feld-name">Woher wir uns kennen</span><input id="p-kennen" type="text" maxlength="200" autocomplete="off" value="${esc(p.kennen_woher || '')}"></label>
      <fieldset class="feld-gruppe"><legend class="feld-name">Ich schenke etwas zum</legend><div class="chips">${[['geburtstag', 'Geburtstag', p.schenke_geburtstag], ['weihnachten', 'Weihnachten', p.schenke_weihnachten]].map(([id, n, an]) => `<button class="chip" type="button" aria-pressed="${Boolean(an)}" data-aktion="p-schenke" data-schenke="${id}">${n}</button>`).join('')}</div></fieldset>`}
      ${neu ? '' : `<fieldset class="feld-gruppe" id="p-steckbrief"><legend class="feld-name">Größen und was sonst zählt</legend>
        <ul class="steck-zeilen" data-art="steck">${steck.map(steckZeile).join('')}</ul>
        <div class="chips">${VORSCHLAEGE.filter((v) => !steck.some((s) => s.bezeichnung.toLowerCase() === v.toLowerCase())).slice(0, 4).map((v) => `<button class="chip" type="button" data-aktion="steck-neu" data-bez-vorschlag="${v}">${v}</button>`).join('')}<button class="chip" type="button" data-aktion="steck-neu" data-bez-vorschlag="" aria-label="Eigene Zeile">＋</button></div></fieldset>
      <fieldset class="feld-gruppe"><legend class="feld-name">Familie</legend>
        <ul class="steck-zeilen" data-art="fam">${fam.map(famZeile).join('')}</ul>
        <div class="chips"><button class="chip" type="button" data-aktion="fam-neu">${'＋ Person'}</button></div></fieldset>
      <datalist id="steck-vorschlag">${VORSCHLAEGE.map((v) => `<option value="${v}">`).join('')}</datalist>
      <datalist id="fam-vorschlag">${menschen().filter((q) => q.id !== p.id).map((q) => `<option value="${esc(q.name)}">`).join('')}</datalist>`}
      <p class="feld-fehler" id="p-fehler" role="alert" hidden></p>
      <div class="blatt-fuss">${neu || p.ist_ich ? '' : '<span class="links"><button class="knopf-text warnung" type="button" data-aktion="person-loeschen">Löschen</button></span>'}
        <button class="knopf-rand" type="button" data-aktion="blatt-zu">Abbrechen</button><button class="knopf" type="submit">${neu ? 'Anlegen' : 'Speichern'}</button></div>
    </form>`;
}
const geburtstagFelder = (p) => `<div class="datum-felder">
    <label class="feld"><span class="nur-leser">Tag</span><input id="p-tag" type="text" inputmode="numeric" maxlength="2" autocomplete="off" placeholder="Tag" value="${p.geburtstag_tag || ''}"></label>
    <label class="feld"><span class="nur-leser">Monat</span><select id="p-monat"><option value="">Monat</option>${MONATE.map((n, i) => `<option value="${i + 1}"${p.geburtstag_monat === i + 1 ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
    <label class="feld"><span class="nur-leser">Jahr</span><input id="p-jahr" type="text" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="Jahr" value="${p.geburtsjahr || ''}"></label>
  </div>`;
function geburtstagAus() {
  const t = $('#p-tag').value.trim(), m = +$('#p-monat').value, j = $('#p-jahr').value.trim();
  if (!t && !m && !j) return { geburtstag_tag: null, geburtstag_monat: null, geburtsjahr: null };
  if (!/^\d{1,2}$/.test(t) || !m || (j && (!/^\d{4}$/.test(j) || +j < 1850 || +j > new Date().getFullYear()))) return null;
  if (+t < 1 || +t > new Date(j ? +j : 2000, m, 0).getDate()) return null;
  if (j && new Date(+j, m - 1, +t) > new Date()) return null;
  return { geburtstag_tag: +t, geburtstag_monat: m, geburtsjahr: j ? +j : null };
}
function personOeffnen(p, feld) {
  zustand.blattFeld = feld || null;
  blattOeffnen('person', { person: p }, personBlatt(p));
  zustand.blattFeld = null;
  if (feld) setTimeout(() => { const f = feld === 'geburtstag' ? $('#p-tag') : $('#p-steckbrief .chip'); f?.scrollIntoView({ block: 'center' }); f?.focus({ preventScroll: true }); }, ruhig() ? 20 : 120);
}
function personAnlegen(werte) {
  const neu = {
    id: neueId(), ist_ich: false, rufname: '', geburtstag_tag: null, geburtstag_monat: null, geburtsjahr: null, kennen_woher: '',
    schenke_geburtstag: true, schenke_weihnachten: false, farbe: naechsteFarbe(), angelegt: new Date().toISOString(), ...werte,
  };
  neueZeile('person', neu);
  return neu;
}
async function personSpeichern() {
  const p = zustand.blatt.person, neu = !p.id;
  const fehler = (t, f) => { Object.assign($('#p-fehler'), { hidden: false, textContent: t }); $(f).focus(); };
  const name = $('#p-name').value.trim().replace(/\s+/g, ' '), geb = geburtstagAus();
  if (!name) { fehler('Wie heißt der Mensch?', '#p-name'); return; }
  if (!geb) { fehler('Den Geburtstag bitte mit Tag und Monat, das Jahr darf fehlen.', '#p-tag'); return; }
  const an = (id) => $(`[data-schenke="${id}"]`)?.getAttribute('aria-pressed') === 'true';
  const werte = { name, ...geb };
  if (!p.ist_ich) Object.assign(werte, { rufname: $('#p-ruf').value.trim(), kennen_woher: $('#p-kennen').value.trim(), schenke_geburtstag: an('geburtstag'), schenke_weihnachten: an('weihnachten') });
  for (const li of $$('[data-art="steck"] > li')) {
    const bez = $('[data-bez]', li), wert = $('[data-wert]', li);
    if (wert.value.trim() && !bez.value.trim()) { bez.setAttribute('aria-invalid', 'true'); fehler(`Wofür steht „${wert.value.trim()}“?`, `[data-art="steck"] > li:nth-child(${[...li.parentNode.children].indexOf(li) + 1}) [data-bez]`); return; }
    if (li.dataset.steck && bez.value.trim() && !wert.value.trim()) { fehler(`Bei „${bez.value.trim()}“ fehlt der Wert. Zum Entfernen tipp auf das Kreuz.`, `[data-art="steck"] > li:nth-child(${[...li.parentNode.children].indexOf(li) + 1}) [data-wert]`); return; }
  }
  const knopf = $('.blatt button[type="submit"]');
  knopf.disabled = true;
  try {
    if (neu) {
      blattZuNach(href(personAnlegen(werte)));
      return;
    }
    await ausgangLeeren();
    await zeilenSpeichern(p);
    const ok = aendereZeile('person', p, werte);
    blattZu();
    seiteNeu('.ausweis-stift');
    const gut = await ok;
    if (gut) gespeichert(gut); else seiteNeu();
  } catch (e) { knopf.disabled = false; merken(); fehlerZeigen(e); }
}
/* Steckbrief- und Familienzeilen: leere fallen weg, neue kommen dazu, geänderte werden geändert. */
async function zeilenSpeichern(p) {
  const abgleich = async (art, tabelle, vorhanden, lesen) => {
    const liste = B()[TABELLE[tabelle]], bleibt = new Set();
    let reihe = 0;
    for (const li of $$(`[data-art="${art}"] > li`)) {
      const bez = $('[data-bez]', li).value.trim(), wert = $('[data-wert]', li).value.trim();
      const werte = lesen(bez, wert);
      if (!werte) continue;
      werte.reihenfolge = reihe++;
      const alt = vorhanden.find((x) => x.id === li.dataset[art]);
      if (!alt) {
        const z = await api.anlegen(tabelle, { person_id: p.id, ...werte });
        liste.push(z);
        li.dataset[art] = z.id;
        bleibt.add(z.id);
      } else {
        bleibt.add(alt.id);
        if (Object.keys(werte).some((k) => alt[k] !== werte[k])) Object.assign(alt, await api.aendern(tabelle, `id=eq.${alt.id}`, werte));
      }
    }
    for (const alt of vorhanden) if (!bleibt.has(alt.id)) { await api.loeschen(tabelle, `id=eq.${alt.id}`); if (liste.includes(alt)) liste.splice(liste.indexOf(alt), 1); }
  };
  await abgleich('steck', 'steckbrief', steckbriefVon(p.id), (b, w) => (b && w ? { bezeichnung: b, wert: w } : null));
  await abgleich('fam', 'beziehung', familieVon(p.id), (n, a) => {
    if (!n) return null;
    const q = menschen().find((x) => x.id !== p.id && [x.name, x.rufname].some((y) => y && glatt(y) === glatt(n)))
      || menschen().find((x) => x.id !== p.id && glatt(kurzname(x)) === glatt(n) && menschen().filter((y) => glatt(kurzname(y)) === glatt(n)).length === 1);
    return { name: n, art: a, andere_person_id: q?.id || null };
  });
}

/* =====================================================================
 * Geschenkidee: Link einfügen wie bei der Wunschliste
 * ===================================================================== */
function ideeLinkBlatt(p, fehler = '') {
  return `<h2 class="blatt-titel" id="blatt-titel">Idee für ${esc(rufname(p))}</h2>
    <form data-form="idee-link" novalidate>
      <label class="feld"><span class="feld-name">Was, oder der Link aus dem Shop</span><input class="eingabe" id="idee-link" type="text" autocomplete="off" maxlength="2000" enterkeyhint="go" placeholder="z. B. Töpferkurs oder https://…" autofocus></label>
      ${fehler ? `<p class="feld-fehler" role="alert">${esc(fehler)}</p>` : ''}
      <div class="blatt-fuss"><button class="knopf-rand" type="button" data-aktion="blatt-zu">Abbrechen</button><button class="knopf" type="submit">Weiter</button></div>
    </form>`;
}
function ideeBlatt(g, p) {
  const neu = !g.id, chips = anlaesse(p).map((a) => `${a.anlass} ${a.jahr}`);
  return `<h2 class="blatt-titel" id="blatt-titel">${neu ? `Idee für ${esc(rufname(p))}` : 'Geschenkidee'}</h2>
    <form data-form="idee" novalidate>
      ${g.bild_pfad ? `<div class="blatt-bild">${app.bild({ ...g, shop_url: '' })}<button class="knopf-text" type="button" data-aktion="idee-bild-weg">Ohne Bild</button></div>` : ''}
      <label class="feld feld-titel"><span class="feld-name">Was</span><input id="g-titel" type="text" maxlength="200" value="${esc(g.titel || '')}" ${neu ? 'autofocus' : ''}></label>
      <div class="chips stand-wahl" role="radiogroup" aria-label="Stand">${STAENDE.map(([id, n]) => `<button class="chip" type="button" role="radio" aria-checked="${g.stand === id}" aria-pressed="${g.stand === id}" data-aktion="g-stand" data-g-stand="${id}">${n}</button>`).join('')}</div>
      <label class="feld"><span class="feld-name">Für welchen Anlass</span><input id="g-anlass" type="text" maxlength="46" autocomplete="off" placeholder="z. B. Hochzeit 2027" value="${esc(anlassText(g))}"></label>
      ${chips.length ? `<div class="chips">${chips.map((c) => `<button class="chip" type="button" data-aktion="g-anlass" data-anlass="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : ''}
      <div class="feld-reihe">
        <label class="feld"><span class="feld-name">Preis</span><span class="euro"><input id="g-preis" type="text" inputmode="decimal" autocomplete="off" value="${g.preis_ca != null ? esc(String(g.preis_ca).replace('.', ',')) : ''}"></span></label>
        <label class="feld"><span class="feld-name">Link</span><input id="g-link" type="url" inputmode="url" autocomplete="off" placeholder="https://…" value="${esc(g.shop_url || '')}"></label>
      </div>
      <label class="feld"><span class="feld-name">Notiz (freiwillig)</span><textarea id="g-notiz" rows="2" maxlength="4000">${esc(g.notiz || '')}</textarea></label>
      <p class="feld-fehler" id="g-fehler" role="alert" hidden></p>
      <div class="blatt-fuss">${neu ? '' : '<span class="links"><button class="knopf-text warnung" type="button" data-aktion="idee-loeschen">Löschen</button></span>'}
        <button class="knopf-rand" type="button" data-aktion="blatt-zu">Abbrechen</button><button class="knopf" type="submit">${neu ? 'Hinzufügen' : 'Speichern'}</button></div>
    </form>`;
}
const leereIdee = (p, w = {}) => {
  const a = anlaesse(p)[0];
  return { person_id: p.id, titel: '', notiz: '', bild_pfad: null, shop_url: null, haendler: '', preis_ca: null, preis_stand: null, stand: 'idee', anlass: a?.anlass || '', anlass_jahr: a?.jahr || null, ...w };
};
async function ideePruefen(roh) {
  const p = person(zustand.blatt.person.id), url = app.linkAus(roh);
  if (!roh.trim()) { $('#idee-link').focus(); return; }
  if (!url) { zustand.blatt.idee = leereIdee(p, { titel: roh.trim().slice(0, 200) }); blattInnen(ideeBlatt(zustand.blatt.idee, p)); return; }
  const b = zustand.blatt;
  blattInnen(`<h2 class="blatt-titel" id="blatt-titel">Idee für ${esc(rufname(p))}</h2>${laden('Ich schaue im Shop nach …')}`);
  let v;
  try { v = await api.vorschau(url); } catch { v = { titel: '', shop_url: url }; }
  if (zustand.blatt !== b) return;
  b.idee = leereIdee(p, { titel: v.titel === 'Wunsch' ? '' : (v.titel || '').slice(0, 200), preis_ca: v.preis_ca ?? null, preis_stand: v.preis_ca != null ? heute() : null, haendler: (v.haendler || '').slice(0, 40), shop_url: v.shop_url || url, bild_pfad: v.bild_pfad || null });
  blattInnen(ideeBlatt(b.idee, p));
}
function echterLink(t) { try { const u = new URL(t); return /\s/.test(t) ? false : u.hostname.includes('.') && !u.hostname.includes('%'); } catch { return false; } }
async function ideeSpeichern() {
  const b = zustand.blatt, g = b.idee, neu = !g.id, titel = $('#g-titel').value.trim(), preis = app.preisLesen($('#g-preis').value);
  const fehler = (t, f) => { Object.assign($('#g-fehler'), { hidden: false, textContent: t }); $(f).focus(); };
  let link = $('#g-link').value.trim();
  if (link && !/^https?:\/\//i.test(link)) link = `https://${link}`;
  if (!titel) { fehler('Was ist die Idee?', '#g-titel'); return; }
  if (link && !echterLink(link)) { fehler('Das sieht nicht wie ein Link aus. Ein Ort oder Laden passt in die Notiz.', '#g-link'); return; }
  if (Number.isNaN(preis)) { fehler('Den Preis bitte als Zahl, z. B. 39,90.', '#g-preis'); return; }
  const werte = {
    titel, notiz: $('#g-notiz').value.trim(), ...anlassLesen($('#g-anlass').value), stand: g.stand, preis_ca: preis,
    preis_stand: preis == null ? null : preis === g.preis_ca && g.preis_stand ? g.preis_stand : heute(),
    shop_url: link || null, haendler: app.haendlerFuer(link, g), bild_pfad: g.bild_pfad || null,
  };
  const fokus = b.idee.id ? `[data-idee="${b.idee.id}"]` : '[data-aktion="idee-neu"]';
  if (neu) {
    neueZeile('geschenk', { id: neueId(), person_id: g.person_id, ...werte, angelegt: new Date().toISOString() });
    blattZu(); seiteNeu(fokus); hinweis(`${titel} · notiert`);
    return;
  }
  const ok = aendereZeile('geschenk', B().geschenke.find((x) => x.id === g.id), werte);
  blattZu(); seiteNeu(fokus);
  const gut = await ok;
  if (gut) gespeichert(gut); else seiteNeu();
}

/* ---------- Kopieren: die gefilterten Einträge als Text, für eine Rede ---------- */
async function kopieren() {
  const p = aktuelle(), liste = gefiltert(p);
  if (zustand.reihenfolge === 'neu') liste.reverse();
  const text = liste.map((x) => (x.idee ? `${x.idee.titel}${anlassText(x.idee) ? ` (${anlassText(x.idee)})` : ''}` : `${datumVoll(x.e)}: ${x.e.text}`)).join('\n\n');
  try { await navigator.clipboard.writeText(text); hinweis(`${zahlWort(liste.length, 'Eintrag', 'Einträge')} kopiert`); }
  catch { hinweis('Kopieren geht hier nicht.'); }
}

/* =====================================================================
 * Ereignisse
 * ===================================================================== */
const radio = (el, feld) => $$(`[data-aktion="${el.dataset.aktion}"]`).forEach((k) => ['aria-checked', 'aria-pressed'].forEach((x) => k.setAttribute(x, String(k.dataset[feld] === el.dataset[feld]))));
/* Zweimal tippen statt Nachfrage-Fenster. */
function sicher(el, text) {
  if (el.dataset.sicher) return Date.now() - +el.dataset.sicher > 600; // ein Doppeltipp zählt nicht als Bestätigung
  el.dataset.sicher = Date.now();
  el.textContent = text;
  return false;
}

export async function klick(a, el) {
  const b = zustand.blatt;
  switch (a) {
    case 'festhalten': festhalten(el.dataset.person); return;
    case 'fh-person': b.person = el.dataset.person; personWahl(true); return;
    case 'fh-person-aendern': b.person = null; b.suche = ''; personWahl(true); return;
    case 'fh-person-neu': {
      b.person = personAnlegen({ name: b.suche.trim().replace(/\s+/g, ' ') }).id;
      personWahl(true);
      return;
    }
    case 'fh-art': fhArtWaehlen(b.artId === el.dataset.fhArt ? null : el.dataset.fhArt); return;
    case 'fh-art-neu': fhArtNeuOeffnen(el); return;
    case 'fh-wann': {
      const d = $('.fh-datum');
      d.hidden = !d.hidden;
      el.setAttribute('aria-expanded', String(!d.hidden));
      if (!d.hidden) { $('#fh-jahr').focus(); $('#fh-jahr').select(); d.scrollIntoView({ block: 'nearest' }); }
      return;
    }
    case 'filter': {
      zustand.filter = el.dataset.filter;
      /* Geschichten liest man von vorn. */
      if (!zustand.reihenfolgeVonHand) zustand.reihenfolge = zustand.filter === 'geschichte' ? 'alt' : 'neu';
      eintraegeNeu(`[data-filter="${el.dataset.filter}"]`);
      return;
    }
    case 'reihenfolge': zustand.reihenfolge = zustand.reihenfolge === 'neu' ? 'alt' : 'neu'; zustand.reihenfolgeVonHand = true; eintraegeNeu('[data-aktion="reihenfolge"]'); return;
    case 'kopieren': kopieren(); return;
    case 'art-menue': artMenue(el); return;
    case 'art-setzen': artSetzen(el.dataset.art); return;
    case 'art-neu':
      el.outerHTML = '<span class="neue-art-feld im-menue"><label class="nur-leser" for="neue-art">Name der neuen Art</label><input id="neue-art" class="neue-art" type="text" maxlength="24" autocomplete="off" enterkeyhint="done" placeholder="Name der Art"></span>';
      $('#neue-art').focus();
      return;
    case 'eintrag-bearbeiten': {
      const e = B().eintraege.find((x) => x.id === el.closest('[data-eintrag]').dataset.eintrag);
      menueZu();
      if (e) blattOeffnen('eintrag', { eintrag: e, artId: artId(e) }, eintragBlatt(e));
      return;
    }
    case 'e-art': b.artId = el.dataset.eArt || null; radio(el, 'eArt'); return;
    case 'eintrag-loeschen':
      if (!sicher(el, 'Wirklich löschen?')) return;
      if (await loescheZeile('eintrag', b.eintrag)) { blattZu(); seiteNeu(); hinweis('Gelöscht'); }
      return;
    case 'stand': {
      const g = B().geschenke.find((x) => x.id === el.dataset.idee);
      if (!g) return;
      const i = STAENDE.findIndex(([s]) => s === g.stand), ok = aendereZeile('geschenk', g, { stand: STAENDE[(i + 1) % STAENDE.length][0] });
      if (g.stand === 'verschenkt') zustand.verschenktOffen = g.person_id;
      seiteNeu(`[data-aktion="stand"][data-idee="${g.id}"][data-ort="${el.dataset.ort}"]`);
      hinweis(`${g.titel} · ${standName(g.stand)}`);
      if (!(await ok)) seiteNeu();
      return;
    }
    case 'idee-neu': { const p = aktuelle(); if (p) blattOeffnen('idee', { person: p }, ideeLinkBlatt(p)); return; }
    case 'idee-bearbeiten': {
      const g = B().geschenke.find((x) => x.id === el.dataset.idee);
      if (g) blattOeffnen('idee', { person: person(g.person_id), idee: { ...g } }, ideeBlatt(g, person(g.person_id)));
      return;
    }
    case 'idee-bild-weg': b.idee.bild_pfad = null; $('.blatt-bild').remove(); $('#g-titel').focus(); return;
    case 'g-stand': b.idee.stand = el.dataset.gStand; radio(el, 'gStand'); return;
    case 'g-anlass': $('#g-anlass').value = el.dataset.anlass; return;
    case 'idee-loeschen':
      if (!sicher(el, 'Wirklich löschen?')) return;
      if (await loescheZeile('geschenk', B().geschenke.find((x) => x.id === b.idee.id))) { blattZu(); seiteNeu(); hinweis('Gelöscht'); }
      return;
    case 'person-neu': personOeffnen({ schenke_geburtstag: true, schenke_weihnachten: false }); return;
    case 'person-bearbeiten': { const p = aktuelle(); if (p) personOeffnen(p, el.dataset.feld); return; }
    case 'p-schenke': el.setAttribute('aria-pressed', String(el.getAttribute('aria-pressed') !== 'true')); return;
    case 'steck-neu': {
      const ul = $('[data-art="steck"]');
      ul.insertAdjacentHTML('beforeend', steckZeile({ bezeichnung: el.dataset.bezVorschlag }));
      $(el.dataset.bezVorschlag ? '[data-wert]' : '[data-bez]', ul.lastElementChild).focus();
      if (el.dataset.bezVorschlag) el.remove();
      return;
    }
    case 'fam-neu': { const ul = $('[data-art="fam"]'); ul.insertAdjacentHTML('beforeend', famZeile()); $('[data-bez]', ul.lastElementChild).focus(); return; }
    case 'zeile-weg': { const feld = el.closest('fieldset'); el.closest('li').remove(); ($('.zeile-weg', feld) || $('.chip', feld))?.focus(); return; }
    case 'person-loeschen': {
      const p = b.person, n = B().eintraege.filter((e) => e.person_id === p.id).length + ideenVon(p.id).length;
      if (!sicher(el, n ? `Wirklich? ${zahlWort(n, 'Eintrag geht', 'Einträge gehen')} mit.` : 'Wirklich löschen?')) return;
      if (await loescheZeile('person', p)) {
        for (const t of ['steckbrief', 'beziehungen', 'eintraege', 'geschenke']) B()[t] = B()[t].filter((x) => x.person_id !== p.id);
        B().beziehungen.forEach((f) => { if (f.andere_person_id === p.id) f.andere_person_id = null; });
        ausgangMerken(ausgang().filter((x) => x.zeile.person_id !== p.id));
        merken();
        blattZuNach('#menschen');
        hinweis(`${p.name} gelöscht`);
      }
      return;
    }
    case 'alle-wuensche': zustand.alleWuensche = true; seiteNeu('.pille-knopf'); return;
    case 'thema': api.speicher.schreiben(THEMA, el.dataset.themaWahl === 'geraet' ? null : el.dataset.themaWahl); themaSetzen(el.dataset.themaWahl); radio(el, 'themaWahl'); return;
    case 'kalender-an': case 'kalender-neu': case 'kalender-aus': {
      if (a === 'kalender-neu' && !sicher(el, 'Wirklich? Der alte Link geht dann nicht mehr.')) return;
      if (a === 'kalender-aus' && !sicher(el, 'Wirklich ausschalten?')) return;
      el.disabled = true;
      try {
        if (B().abo) { await api.loeschen('kalender_abo', `konto_id=eq.${api.kontoId()}`); B().abo = null; }
        if (a !== 'kalender-aus') B().abo = (await api.anlegen('kalender_abo', { konto_id: api.kontoId() })).schluessel;
      } catch (e) { fehlerZeigen(e); }
      merken();
      app.zeigen({ still: true });
      return;
    }
    case 'kalender-kopieren':
      try { await navigator.clipboard.writeText(kalenderLink()); hinweis('Link kopiert'); } catch { prompt('Link zum Kopieren:', kalenderLink()); }
      return;
    case 'art-umbenennen': {
      const li = el.closest('[data-art-zeile]'), x = B().arten.find((y) => y.id === li.dataset.artZeile);
      li.innerHTML = `<form class="kurz-form" data-form="art-name" novalidate><label class="nur-leser" for="art-name">Name der Art</label><input class="eingabe" id="art-name" type="text" maxlength="24" autocomplete="off" value="${esc(x.name)}"><button class="knopf-rand" type="submit">Speichern</button></form>`;
      $('#art-name').focus();
      return;
    }
    case 'art-loeschen': {
      const id = el.closest('[data-art-zeile]').dataset.artZeile, x = B().arten.find((y) => y.id === id);
      if (!sicher(el, 'Wirklich löschen?')) return;
      if (await loescheZeile('art', x)) { B().eintraege.forEach((e) => { if (e.art_id === id) e.art_id = null; }); merken(); app.zeigen({ still: true }); hinweis('Art gelöscht, die Einträge bleiben.'); }
      return;
    }
    default: return;
  }
}

export async function senden(name, f) {
  switch (name) {
    case 'festhalten': festhaltenSpeichern(); return;
    case 'eintrag': eintragSpeichern(); return;
    case 'person': personSpeichern(); return;
    case 'idee-link': ideePruefen($('#idee-link').value); return;
    case 'idee': ideeSpeichern(); return;
    case 'art-neu': { const x = await artAnlegen($('#e-art').value); if (x) { app.zeigen({ still: true }); $('#e-art')?.focus(); } return; }
    case 'art-name': {
      const x = B().arten.find((y) => y.id === f.closest('[data-art-zeile]').dataset.artZeile), n = $('#art-name').value.trim().replace(/\s+/g, ' ');
      if (n && n !== x.name) {
        if (arten().some((y) => y.id !== x.id && y.name.toLowerCase() === n.toLowerCase())) { hinweis('Diese Art gibt es schon.'); return; }
        await aendereZeile('art', x, { name: n });
      }
      app.zeigen({ still: true });
      return;
    }
    default: return;
  }
}

document.addEventListener('input', (ev) => {
  if (ev.target.id === 'suchfeld') { zustand.suchwort = ev.target.value; $('#treffer').innerHTML = treffer(ev.target.value); }
  if (ev.target.id === 'fh-person') { zustand.blatt.suche = ev.target.value; vorschlaegeZeigen(); }
  if (ev.target.id === 'fh-text') {
    ev.target.removeAttribute('aria-invalid');
    entwurfMerken({ ...entwurf, text: ev.target.value });
    /* Ein Link ist fast immer eine Geschenkidee. */
    if (!zustand.blatt.artId && /https?:\/\/\S+\.\S+/.test(ev.target.value) && !person(zustand.blatt.person)?.ist_ich) fhArtWaehlen('geschenkidee');
  }
  if (ev.target.id?.startsWith('fh-') && ['fh-tag', 'fh-monat', 'fh-jahr'].includes(ev.target.id)) {
    const d = datumAus('fh');
    $('.fh-wann').textContent = !d ? 'wann?' : d.genau === 'tag' && d.datum === heute() ? 'heute' : datumVoll(d);
  }
});
document.addEventListener('click', (ev) => {
  if (zustand.menue && !ev.target.closest('.art-menue') && !ev.target.closest('[data-aktion="art-menue"]')) menueZu();
  if (ev.target.closest('.hinweis a')) $('.hinweis').classList.remove('da', 'mit-link');
  const springe = ev.target.closest('[data-springe]');
  if (springe) zustand.springeZu = springe.dataset.springe;
  if (ev.target.closest('[data-springe-ideen]')) zustand.springeZu = 'ideen';
}, true);

/* Gibt true zurück, wenn die Taste hier erledigt ist. */
export function taste(ev) {
  if (ev.target.id === 'neue-art') {
    if (ev.key === 'Enter') { ev.preventDefault(); artAnlegen(ev.target.value).then((x) => x && artSetzen(x.id)); return true; }
    if (ev.key === 'Escape' || ev.key === 'Tab') { ev.preventDefault(); menueZu(true); return true; }
    return true;
  }
  if (ev.target.id === 'fh-neue-art') {
    if (ev.key === 'Enter') { ev.preventDefault(); fhArtNeuFertig(true); return true; }
    if (ev.key === 'Escape') { ev.preventDefault(); fhArtNeuFertig(false); return true; }
  }
  if (ev.key === 'Escape' && zustand.menue) { ev.preventDefault(); menueZu(true); return true; }
  if (zustand.blatt) {
    if (ev.key === 'Enter' && !ev.shiftKey && !ev.isComposing && ev.target.id === 'fh-text') { ev.preventDefault(); festhaltenSpeichern(); return true; }
    if (ev.key === 'Enter' && ev.target.id === 'fh-person') {
      ev.preventDefault();
      const v = vorschlaege();
      if (v[0] && zustand.blatt.suche.trim()) { zustand.blatt.person = v[0].id; personWahl(true); } else $('[data-aktion="fh-person-neu"], .fh-vorschlag')?.focus();
      return true;
    }
    return false;
  }
  if (zustand.menue) {
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
      const k = $$('.art-menue button'), i = k.indexOf(document.activeElement);
      ev.preventDefault();
      k[(i + (ev.key === 'ArrowDown' ? 1 : -1) + k.length) % k.length].focus();
      return true;
    }
    if (ev.key === 'Tab') { menueZu(true); return true; }
  }
  if (ev.target.closest('input, textarea, select, [contenteditable="true"]') || ev.metaKey || ev.ctrlKey || ev.altKey) return false;
  if (ev.key === 'n' || ev.key === 'N') { ev.preventDefault(); festhalten(); return true; }
  if (ev.key === '/') {
    ev.preventDefault();
    if (app.route().teil === 'suche') $('#suchfeld')?.focus(); else location.hash = '#suche';
    return true;
  }
  return false;
}
