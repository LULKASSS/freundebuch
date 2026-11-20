/* Zugriff auf Supabase nur per fetch (REST, RPC, Auth). Der Schutz liegt in der Datenbank, nicht hier.
 * Der Schlüssel unten ist der öffentliche sb_publishable_…; er darf im Repo stehen. */

const speicher = {
  lesen(k) { try { return localStorage.getItem(k); } catch { return null; } },
  schreiben(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* ohne Speicher geht es auch */ } },
};
export { speicher };

/* Zum Prüfen im Gerät (nur auf localhost): Nachbildung von Supabase aus scripts/pruefserver.mjs. */
const ATTRAPPE = ['localhost', '127.0.0.1'].includes(location.hostname) && speicher.lesen('freundebuch.attrappe') === 'ja';
export const SUPABASE = ATTRAPPE ? `${location.origin}/attrappe` : 'https://khwjegrwmqgrwviciapg.supabase.co';
const SCHLUESSEL = 'sb_publishable_qjmR87-5kRjgzSQ6ua-74A_jRYoS5Xk';
const SITZUNG = 'freundebuch.sitzung';
const GERAET = 'freundebuch.geraet';

export const bildUrl = (pfad) => (pfad ? `${SUPABASE}/storage/v1/object/public/wunschbilder/${pfad}` : '');

/* ---------- Gerät: zufälliger Schlüssel, bleibt im Browser. Die Datenbank kennt nur seine Prüfsumme. ---------- */
let geraetImSpeicher = null;
export function geraet() {
  let g = speicher.lesen(GERAET) || geraetImSpeicher;
  if (!g || !/^[A-Za-z0-9_-]{32,128}$/.test(g)) {
    const b = crypto.getRandomValues(new Uint8Array(32));
    g = btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    speicher.schreiben(GERAET, g);
    geraetImSpeicher = g;
  }
  return g;
}

/* ---------- Sitzung ---------- */
let sitzung = null;
try { sitzung = JSON.parse(speicher.lesen(SITZUNG) || 'null'); } catch { sitzung = null; }
const merken = (s) => { sitzung = s; speicher.schreiben(SITZUNG, s ? JSON.stringify(s) : null); };

export const angemeldet = () => Boolean(sitzung?.refresh_token);
export const kontoId = () => sitzung?.konto || null;

function ausToken(t) {
  let konto = null;
  try { konto = JSON.parse(atob(t.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).sub; } catch { /* egal */ }
  return {
    access_token: t.access_token,
    refresh_token: t.refresh_token,
    expires_at: t.expires_at ? +t.expires_at : Math.floor(Date.now() / 1000) + (+t.expires_in || 3600),
    konto,
  };
}

/* Nach dem Antippen des Links aus der Mail stehen die Schlüssel hinter # in der Adresse. */
export function sitzungAusAdresse() {
  const h = location.hash.slice(1);
  if (!/(^|&)(access_token|error)=/.test(h)) return null;
  const p = new URLSearchParams(h);
  history.replaceState(null, '', location.pathname + location.search);
  if (p.get('error')) return { fehler: p.get('error_description') || p.get('error') };
  merken(ausToken(Object.fromEntries(p)));
  return { ok: true };
}

let erneuern = null;
async function token() {
  if (!sitzung) return null;
  if (sitzung.expires_at - 60 > Date.now() / 1000) return sitzung.access_token;
  erneuern ??= (async () => {
    const r = await fetch(`${SUPABASE}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST', headers: { apikey: SCHLUESSEL, 'content-type': 'application/json' },
      body: JSON.stringify({ refresh_token: sitzung.refresh_token }),
    }).catch(() => null);
    if (r?.ok) merken(ausToken(await r.json()));
    else if (r && r.status >= 400 && r.status < 500) merken(null);
    erneuern = null;
  })();
  await erneuern;
  return sitzung?.access_token || null;
}

export class Fehler extends Error {
  constructor(text, status, code) { super(text); this.status = status; this.code = code; }
}

async function anfrage(pfad, { methode = 'GET', daten, kopf = {}, gast = false } = {}) {
  const t = gast ? null : await token();
  const r = await fetch(`${SUPABASE}${pfad}`, {
    method: methode,
    headers: {
      apikey: SCHLUESSEL,
      ...(t ? { authorization: `Bearer ${t}` } : {}),
      ...(daten !== undefined ? { 'content-type': 'application/json' } : {}),
      ...kopf,
    },
    body: daten !== undefined ? JSON.stringify(daten) : undefined,
  }).catch(() => { throw new Fehler('Keine Verbindung. Bitte gleich noch einmal.', 0, 'netz'); });
  const text = await r.text();
  let inhalt = null;
  try { inhalt = text ? JSON.parse(text) : null; } catch { inhalt = text; }
  if (!r.ok) {
    if (r.status === 401 && !gast && sitzung) merken(null);
    throw new Fehler(inhalt?.message || inhalt?.msg || inhalt?.error_description || `Fehler ${r.status}`, r.status, inhalt?.code || inhalt?.error_code);
  }
  return inhalt;
}

/* ---------- Tabellen (nur eigene Zeilen, der Zeilenschutz sorgt dafür) ---------- */
export const lesen = (tabelle, abfrage = '') => anfrage(`/rest/v1/${tabelle}?${abfrage}`);
export const anlegen = (tabelle, zeile) =>
  anfrage(`/rest/v1/${tabelle}`, { methode: 'POST', daten: zeile, kopf: { prefer: 'return=representation' } }).then((z) => z?.[0] ?? z);
export const aendern = (tabelle, filter, werte) =>
  anfrage(`/rest/v1/${tabelle}?${filter}`, { methode: 'PATCH', daten: werte, kopf: { prefer: 'return=representation' } }).then((z) => z?.[0] ?? z);
export const loeschen = (tabelle, filter) => anfrage(`/rest/v1/${tabelle}?${filter}`, { methode: 'DELETE' });
export const rpc = (name, werte, { gast = false } = {}) => anfrage(`/rest/v1/rpc/${name}`, { methode: 'POST', daten: werte, gast });

/* ---------- Anmelden per Link aus der Mail (kein Kennwort, kein Registrieren) ---------- */
export async function linkSchicken(email) {
  const zurueck = location.origin + location.pathname;
  try {
    await anfrage(`/auth/v1/otp?redirect_to=${encodeURIComponent(zurueck)}`, {
      methode: 'POST', gast: true, daten: { email, create_user: false },
    });
  } catch (e) {
    if (e.code === 'otp_disabled' || /signups not allowed|not allowed for otp|user not found/i.test(e.message)) {
      throw new Fehler('Für diese Adresse gibt es kein Konto. Das Freundebuch geht nur auf Einladung.', e.status, 'kein_konto');
    }
    if (e.status === 429 || e.code === 'over_email_send_rate_limit') {
      throw new Fehler('Gerade wurden zu viele Links verschickt. Bitte in ein paar Minuten noch einmal.', e.status, 'zu_oft');
    }
    throw e;
  }
}

export async function abmelden() {
  const t = sitzung?.access_token;
  merken(null);
  if (t) fetch(`${SUPABASE}/auth/v1/logout`, { method: 'POST', headers: { apikey: SCHLUESSEL, authorization: `Bearer ${t}` } }).catch(() => {});
}

/* ---------- Link-Vorschau (Edge Function) ---------- */
export async function vorschau(url) {
  const t = await token();
  const r = await fetch(`${SUPABASE}/functions/v1/vorschau`, {
    method: 'POST',
    headers: { apikey: SCHLUESSEL, authorization: `Bearer ${t}`, 'content-type': 'application/json' },
    body: JSON.stringify({ url }),
    signal: AbortSignal.timeout(25000),
  });
  if (!r.ok) throw new Fehler('vorschau', r.status);
  return r.json();
}
