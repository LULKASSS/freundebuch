/* Prüfserver: liefert die App aus und bildet Supabase im Gerät nach (unter /attrappe).
 * Datenbank ist PGlite mit denselben Migrationen und dem Nachbau aus tests/supabase-nachbau.sql,
 * also derselbe Zeilenschutz und dieselben Gast-Funktionen wie im echten Projekt.
 * Nur zum Prüfen: http://localhost:5181 (Port über PORT). Die App nutzt die Attrappe nur, wenn
 * localStorage „freundebuch.attrappe“ = „ja“ ist und die Seite auf localhost läuft.
 * Alle Beispielinhalte sind erfunden. */
import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const wurzel = fileURLToPath(new URL('..', import.meta.url));
const port = +(process.env.PORT || 5181);
const TYPEN = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml' };
const lies = (p) => readFile(join(wurzel, p), 'utf8');

export const ICH = '11111111-1111-4111-8111-111111111111';
export const FREMD = '22222222-2222-4222-8222-222222222222';
export const SCHLUESSEL_WEIHNACHTEN = 'probeliste-weihnachten';

/* ---------- Beispielfotos (gezeichnet, als Ersatz für Produktfotos) ---------- */
const FOTO = {
  muehle: '<rect x="70" y="70" width="60" height="80" rx="6" fill="#b07a4a"/><rect x="62" y="56" width="76" height="16" rx="4" fill="#8a5a33"/><path d="M100 56V30h34" stroke="#555" stroke-width="5" fill="none"/><circle cx="138" cy="30" r="8" fill="#333"/>',
  rucksack: '<rect x="58" y="44" width="84" height="120" rx="30" fill="#3f7a5a"/><rect x="74" y="98" width="52" height="44" rx="10" fill="#2f5f45"/><path d="M80 44c0-18 40-18 40 0" stroke="#2f5f45" stroke-width="8" fill="none"/>',
  anhaenger: '<rect x="40" y="70" width="110" height="60" rx="12" fill="#e2b33b"/><circle cx="70" cy="140" r="22" fill="none" stroke="#333" stroke-width="7"/><circle cx="120" cy="140" r="22" fill="none" stroke="#333" stroke-width="7"/><path d="M150 100h30" stroke="#333" stroke-width="6"/>',
  lampe: '<path d="M70 60h60l18 50H52z" fill="#e9d9b8"/><rect x="96" y="110" width="8" height="50" fill="#777"/><rect x="72" y="158" width="56" height="10" rx="5" fill="#555"/>',
};
const foto = (name) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="#ffffff"/>${FOTO[name] || FOTO.lampe}</svg>`;

/* ---------- Datenbank ---------- */
let db;
export async function aufsetzen() {
  // Datum und Zeit als Text wie bei PostgREST, Zahlen (numeric) als Zahl.
  db = new PGlite({ parsers: { 1082: (v) => v, 1184: (v) => v, 1114: (v) => v, 1700: (v) => Number(v) } });
  await db.exec(await lies('tests/supabase-nachbau.sql'));
  for (const d of (await readdir(join(wurzel, 'supabase/migrations'))).filter((x) => x.endsWith('.sql')).sort()) {
    await db.exec(await lies(`supabase/migrations/${d}`));
  }
  await db.exec(`
    insert into auth.users (id, email) values ('${ICH}', 'lukas@beispiel.invalid'), ('${FREMD}', 'fremd@beispiel.invalid');
    update public.konto set anzeigename = 'Lukas' where id = '${ICH}';
    insert into public.liste (id, konto_id, titel, anlass_datum, link_schluessel) values
      ('aaaaaaaa-0000-4000-8000-000000000001', '${ICH}', 'Weihnachten 2026', '2026-12-24', '${SCHLUESSEL_WEIHNACHTEN}'),
      ('aaaaaaaa-0000-4000-8000-000000000002', '${ICH}', 'Geburtstag 2027', '2027-03-14', 'probeliste-geburtstag');
    insert into public.wunsch (id, konto_id, titel, beschreibung, bild_pfad, shop_url, haendler, preis_ca, preis_stand, zusammenlegen, angelegt) values
      ('bbbbbbbb-0000-4000-8000-000000000001', '${ICH}', 'Kaffeemühle aus Buchenholz', 'Mit Kurbel, für Bohnen am Morgen.', '${ICH}/muehle.png', 'https://beispiel.invalid/muehle', 'Manufactum', 89, '2026-11-18', false, now() - interval '5 min'),
      ('bbbbbbbb-0000-4000-8000-000000000002', '${ICH}', 'Wanderrucksack 30 Liter', 'Grün oder grau, mit Regenhülle.', '${ICH}/rucksack.png', 'https://beispiel.invalid/rucksack', 'Decathlon', 59.99, '2026-11-18', false, now() - interval '4 min'),
      ('bbbbbbbb-0000-4000-8000-000000000003', '${ICH}', 'Ein gutes Kochbuch für Gemüse', '', null, 'https://beispiel.invalid/kochbuch', 'Thalia', 32, '2026-11-19', false, now() - interval '3 min'),
      ('bbbbbbbb-0000-4000-8000-000000000004', '${ICH}', 'Fahrradanhänger für Einkäufe', 'Der große, mit Deichsel für jedes Rad.', '${ICH}/anhaenger.png', 'https://beispiel.invalid/anhaenger', 'Bergfreunde', 420, '2026-11-17', true, now() - interval '2 min'),
      ('bbbbbbbb-0000-4000-8000-000000000005', '${ICH}', 'Dicke Wollsocken', 'Gern gestrickt', null, null, '', 18, '2026-11-20', false, now() - interval '1 min'),
      ('bbbbbbbb-0000-4000-8000-000000000006', '${ICH}', 'Leselampe mit Klemme', '', '${ICH}/lampe.png', 'https://beispiel.invalid/lampe', 'IKEA', 25, '2026-11-20', false, now());
    insert into public.liste_wunsch (liste_id, wunsch_id, konto_id, reihenfolge) values
      ('aaaaaaaa-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001', '${ICH}', 1),
      ('aaaaaaaa-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000002', '${ICH}', 2),
      ('aaaaaaaa-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000003', '${ICH}', 3),
      ('aaaaaaaa-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000004', '${ICH}', 4),
      ('aaaaaaaa-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000005', '${ICH}', 5),
      ('aaaaaaaa-0000-4000-8000-000000000002', 'bbbbbbbb-0000-4000-8000-000000000006', '${ICH}', 1);
    update public.wunsch set menge = 2, groesse = '43' where id = 'bbbbbbbb-0000-4000-8000-000000000005';
    update public.wunsch set groesse = 'M' where id = 'bbbbbbbb-0000-4000-8000-000000000002';
  `);
}

/* ---------- Kleiner PostgREST-Nachbau ---------- */
const name = (s) => { if (!/^[a-z_][a-z0-9_]*$/.test(s)) throw Object.assign(new Error('name'), { code: 'PGRST100' }); return s; };
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
export const token = (sub) => `attrappe.${b64({ sub, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}.x`;
const wer = (req) => {
  const t = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  try { return JSON.parse(Buffer.from(t.split('.')[1], 'base64url').toString()).sub || null; } catch { return null; }
};

let kette = Promise.resolve();
function alsRolle(sub, arbeit) {
  const lauf = kette.then(() => db.transaction(async (tx) => {
    await tx.query(`select set_config('role', $1, true), set_config('request.jwt.claims', $2, true)`,
      [sub ? 'authenticated' : 'anon', JSON.stringify(sub ? { sub, role: 'authenticated' } : { role: 'anon' })]);
    return arbeit(tx);
  }));
  kette = lauf.catch(() => {});
  return lauf;
}

function filter(params, werte) {
  const teile = [];
  for (const [k, v] of params) {
    if (k === 'select' || k === 'order') continue;
    const m = v.match(/^eq\.(.*)$/);
    if (!m) continue;
    werte.push(m[1]);
    teile.push(`${name(k)} = $${werte.length}`);
  }
  return teile.length ? ` where ${teile.join(' and ')}` : '';
}

async function rest(req, url, koerper) {
  const sub = wer(req);
  const teile = url.pathname.replace('/attrappe/rest/v1/', '').split('/');
  if (teile[0] === 'rpc') {
    const fn = name(teile[1]);
    const args = Object.entries(koerper || {});
    const sql = `select to_jsonb(public.${fn}(${args.map(([k], i) => `${name(k)} => $${i + 1}`).join(', ')})) as r`;
    return alsRolle(sub, async (tx) => (await tx.query(sql, args.map(([, v]) => v))).rows[0].r);
  }
  const t = name(teile[0]);
  const werte = [];
  if (req.method === 'GET') {
    const ord = url.searchParams.get('order');
    const ordnung = ord ? ` order by ${ord.split(',').map((o) => { const [c, r] = o.split('.'); return `${name(c)} ${r === 'desc' ? 'desc' : 'asc'}`; }).join(', ')}` : '';
    const sql = `select * from public.${t}${filter(url.searchParams, werte)}${ordnung}`;
    return alsRolle(sub, async (tx) => (await tx.query(sql, werte)).rows);
  }
  if (req.method === 'POST') {
    const zeilen = Array.isArray(koerper) ? koerper : [koerper];
    return alsRolle(sub, async (tx) => {
      const aus = [];
      for (const z of zeilen) {
        const k = Object.keys(z).map(name);
        const sql = `insert into public.${t} (${k.join(', ')}) values (${k.map((_, i) => `$${i + 1}`).join(', ')}) returning *`;
        aus.push(...(await tx.query(sql, k.map((x) => z[x]))).rows);
      }
      return aus;
    });
  }
  if (req.method === 'PATCH') {
    const k = Object.keys(koerper).map(name);
    k.forEach((x) => werte.push(koerper[x]));
    const sql = `update public.${t} set ${k.map((x, i) => `${x} = $${i + 1}`).join(', ')}${filter(url.searchParams, werte)} returning *`;
    return alsRolle(sub, async (tx) => (await tx.query(sql, werte)).rows);
  }
  if (req.method === 'DELETE') {
    const sql = `delete from public.${t}${filter(url.searchParams, werte)}`;
    await alsRolle(sub, (tx) => tx.query(sql, werte));
    return null;
  }
  throw Object.assign(new Error('methode'), { code: 'PGRST' });
}

/* Link-Vorschau: aus der Adresse ein plausibles Ergebnis, „nichts“ für Links mit „leer“. */
function vorschau(url) {
  const u = new URL(url);
  if (/leer|amazon/.test(u.href)) return { titel: '', preis_ca: null, haendler: u.hostname.includes('amazon') ? 'Amazon' : '', shop_url: u.href, bild_pfad: null, gefunden: false };
  const stueck = u.pathname.split('/').filter(Boolean).pop() || 'wunsch';
  const titel = stueck.replace(/[-_]+/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
  return { titel, preis_ca: 24.95, haendler: 'Beispielshop', shop_url: u.href, bild_pfad: `${ICH}/lampe.png`, gefunden: true };
}

function antworten(res, status, daten, typ = 'application/json') {
  res.writeHead(status, { 'content-type': typ, 'cache-control': 'no-store' });
  res.end(daten == null ? '' : typ === 'application/json' ? JSON.stringify(daten) : daten);
}

async function attrappe(req, res, url) {
  let koerper = null;
  if (req.method !== 'GET') {
    const roh = await new Promise((ok) => { let d = ''; req.on('data', (c) => (d += c)); req.on('end', () => ok(d)); });
    try { koerper = roh ? JSON.parse(roh) : null; } catch { koerper = null; }
  }
  const p = url.pathname;
  try {
    if (p.startsWith('/attrappe/rest/v1/')) return antworten(res, 200, await rest(req, url, koerper));
    if (p === '/attrappe/auth/v1/otp') {
      if (koerper?.email === 'lukas@beispiel.invalid') return antworten(res, 200, {});
      return antworten(res, 422, { code: 'otp_disabled', msg: 'Signups not allowed for otp' });
    }
    if (p === '/attrappe/auth/v1/verify') {
      if (koerper?.email === 'lukas@beispiel.invalid' && koerper?.token === '123456') return antworten(res, 200, { access_token: token(ICH), refresh_token: 'attrappe', expires_in: 3600 });
      return antworten(res, 403, { code: 'otp_expired', msg: 'Token has expired or is invalid' });
    }
    if (p === '/attrappe/auth/v1/logout') return antworten(res, 204, null);
    if (p === '/attrappe/auth/v1/token') return antworten(res, 200, { access_token: token(ICH), refresh_token: 'attrappe', expires_in: 3600 });
    if (p === '/attrappe/functions/v1/vorschau') {
      await new Promise((r) => setTimeout(r, 700));
      return antworten(res, 200, vorschau(koerper.url));
    }
    if (p === '/attrappe/functions/v1/koppeln') {
      return wer(req) ? antworten(res, 200, { code: '123456' }) : antworten(res, 401, { fehler: 'anmelden' });
    }
    if (p.startsWith('/attrappe/storage/v1/object/public/wunschbilder/')) {
      const datei = p.split('/').pop().replace(/\.\w+$/, '');
      return antworten(res, 200, foto(datei), 'image/svg+xml');
    }
    if (p === '/attrappe/__sitzung') return antworten(res, 200, { access_token: token(ICH), refresh_token: 'attrappe', expires_at: Math.floor(Date.now() / 1000) + 3600, konto: ICH });
    if (p === '/attrappe/__zuruecksetzen') { await aufsetzen(); return antworten(res, 200, { ok: true }); }
    return antworten(res, 404, { message: 'nicht gefunden' });
  } catch (e) {
    const code = e.code || '';
    const status = code === '42501' ? 403 : code.startsWith('PGRST') ? 400 : 400;
    return antworten(res, status, { code, message: e.message });
  }
}

export async function starten(p = port) {
  await aufsetzen();
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname.startsWith('/attrappe/')) return attrappe(req, res, url);
    let pfad = decodeURIComponent(url.pathname);
    if (pfad.endsWith('/')) pfad += 'index.html';
    const datei = normalize(join(wurzel, pfad));
    if (!datei.startsWith(wurzel) || datei.includes('node_modules') || datei.includes('/.git')) return res.writeHead(403).end();
    try {
      const inhalt = await readFile(datei);
      res.writeHead(200, { 'content-type': TYPEN[extname(datei)] || 'application/octet-stream', 'cache-control': 'no-store' }).end(inhalt);
    } catch { res.writeHead(404).end('nicht gefunden'); }
  });
  await new Promise((ok) => server.listen(p, '127.0.0.1', ok));
  return server;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await starten();
  console.log(`Prüfserver läuft auf http://localhost:${port}/ (Attrappe unter /attrappe)`);
}
