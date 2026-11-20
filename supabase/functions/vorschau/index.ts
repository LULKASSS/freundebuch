// Link-Vorschau: lädt eine Shop-Seite und liest Titel, Bild, Preis, Händler (Open Graph, JSON-LD, Amazon-Seitencode).
// Nur für angemeldete Konten. Das Bild wird in den eigenen Speicher (Ordner „wunschbilder“) übernommen,
// damit Karten auch dann ein Bild haben, wenn der Shop es später sperrt oder ändert.
// Gibt die Seite nichts her (Amazon sperrt Server-Abrufe zeitweise), kommt der Titel aus der Adresse.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const DIENST = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ERLAUBTE_HERKUNFT = ['https://lulkasss.github.io', 'http://localhost:5180', 'http://127.0.0.1:5180'];
const BROWSER = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';

const HAENDLER: Record<string, string> = {
  amazon: 'Amazon', decathlon: 'Decathlon', zalando: 'Zalando', otto: 'Otto', ikea: 'IKEA', thalia: 'Thalia',
  mediamarkt: 'MediaMarkt', saturn: 'Saturn', manufactum: 'Manufactum', etsy: 'Etsy', ebay: 'eBay',
  hugendubel: 'Hugendubel', galaxus: 'Galaxus', tchibo: 'Tchibo', dm: 'dm', rossmann: 'Rossmann',
  bergfreunde: 'Bergfreunde', globetrotter: 'Globetrotter', 'about-you': 'About You', aboutyou: 'About You',
  lego: 'LEGO', apple: 'Apple', hm: 'H&M', uniqlo: 'Uniqlo', avocadostore: 'Avocadostore', notebooksbilliger: 'notebooksbilliger',
};

function kopf(herkunft: string | null) {
  const h: Record<string, string> = {
    'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info',
    'access-control-allow-methods': 'POST, OPTIONS',
    'vary': 'origin',
  };
  if (herkunft && ERLAUBTE_HERKUNFT.includes(herkunft)) h['access-control-allow-origin'] = herkunft;
  return h;
}
const antwort = (daten: unknown, status: number, herkunft: string | null) =>
  new Response(JSON.stringify(daten), { status, headers: { ...kopf(herkunft), 'content-type': 'application/json' } });

// ---------- Schutz: nur öffentliche http(s)-Adressen ----------
function privateIp(ip: string) {
  if (ip.includes(':')) {
    const v = ip.toLowerCase();
    return v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80') || v.startsWith('::ffff:');
  }
  const [a, b] = ip.split('.').map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}
async function adressePruefen(roh: string): Promise<URL> {
  const u = new URL(roh);
  if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error('nur_http');
  if (u.username || u.password) throw new Error('adresse');
  if (u.port && !['80', '443'].includes(u.port)) throw new Error('adresse');
  const host = u.hostname.replace(/^\[|\]$/g, '');
  if (/^(localhost|.*\.local|.*\.internal|.*\.localhost)$/i.test(host)) throw new Error('adresse');
  if (/^[\d.]+$/.test(host) || host.includes(':')) {
    if (privateIp(host)) throw new Error('adresse');
    return u;
  }
  try {
    const ips = [...await Deno.resolveDns(host, 'A').catch(() => []), ...await Deno.resolveDns(host, 'AAAA').catch(() => [])];
    if (ips.some(privateIp)) throw new Error('adresse');
  } catch (e) {
    if ((e as Error).message === 'adresse') throw e;
  }
  return u;
}

// Folgt Weiterleitungen selbst, damit jede Zwischenadresse geprüft wird.
async function holen(adresse: string, art: 'seite' | 'bild') {
  let u = await adressePruefen(adresse);
  for (let i = 0; i < 5; i++) {
    const r = await fetch(u, {
      redirect: 'manual',
      signal: AbortSignal.timeout(8000),
      headers: {
        'user-agent': BROWSER,
        'accept-language': 'de-DE,de;q=0.9,en;q=0.6',
        accept: art === 'seite' ? 'text/html,application/xhtml+xml' : 'image/avif,image/webp,image/*,*/*;q=0.5',
      },
    });
    if (r.status >= 300 && r.status < 400 && r.headers.get('location')) {
      u = await adressePruefen(new URL(r.headers.get('location')!, u).href);
      continue;
    }
    return { r, url: u };
  }
  throw new Error('zu_viele_weiterleitungen');
}

async function textBis(r: Response, max: number) {
  const leser = r.body!.getReader();
  const teile: Uint8Array[] = [];
  let n = 0;
  while (n < max) {
    const { value, done } = await leser.read();
    if (done) break;
    teile.push(value);
    n += value.length;
  }
  leser.cancel().catch(() => {});
  const alles = new Uint8Array(n);
  let o = 0;
  for (const t of teile) { alles.set(t.subarray(0, Math.min(t.length, n - o)), o); o += t.length; if (o >= n) break; }
  return new TextDecoder('utf-8', { fatal: false }).decode(alles);
}

// ---------- Lesen ----------
const ENT: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', euro: '€' };
const entschluesseln = (s: string) =>
  s.replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, c: string) => {
    if (c[0] === '#') {
      const n = c[1].toLowerCase() === 'x' ? parseInt(c.slice(2), 16) : parseInt(c.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENT[c.toLowerCase()] ?? m;
  });
const sauber = (s?: string | null) => (s ? entschluesseln(s).replace(/\s+/g, ' ').trim() : '');

function meta(html: string, ...namen: string[]) {
  for (const name of namen) {
    const re = new RegExp(`<meta[^>]+(?:property|name|itemprop)=["']${name.replace(/[:.]/g, '\\$&')}["'][^>]*>`, 'i');
    const tag = html.match(re)?.[0];
    const inhalt = tag?.match(/content=["']([^"']*)["']/i)?.[1] ?? tag?.match(/content=([^\s>]+)/i)?.[1];
    if (inhalt) return sauber(inhalt);
  }
  return '';
}

function preisZahl(roh: unknown): number | null {
  if (roh == null) return null;
  let s = String(roh).replace(/[^\d.,]/g, '');
  if (!s) return null;
  if (s.includes(',') && s.includes('.')) s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else if (s.includes(',')) s = /,\d{1,2}$/.test(s) ? s.replace(',', '.') : s.replace(/,/g, '');
  const n = Number(s);
  return Number.isFinite(n) && n > 0 && n < 1_000_000 ? Math.round(n * 100) / 100 : null;
}

function jsonLd(html: string) {
  const gefunden: Record<string, unknown>[] = [];
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const daten = JSON.parse(m[1].trim());
      const stapel = Array.isArray(daten) ? [...daten] : [daten];
      while (stapel.length) {
        const d = stapel.shift();
        if (!d || typeof d !== 'object') continue;
        if (Array.isArray(d['@graph'])) stapel.push(...d['@graph']);
        const typ = ([] as string[]).concat(d['@type'] ?? []);
        if (typ.some((t) => /product/i.test(t))) gefunden.push(d);
      }
    } catch { /* kaputtes JSON-LD überspringen */ }
  }
  const p = gefunden[0];
  if (!p) return {};
  const bild = ([] as unknown[]).concat(p.image ?? [])[0];
  const angebot = ([] as Record<string, unknown>[]).concat((p.offers as Record<string, unknown>) ?? [])[0] ?? {};
  return {
    titel: sauber(p.name as string),
    beschreibung: sauber(p.description as string),
    bild: typeof bild === 'string' ? bild : (bild as Record<string, string>)?.url ?? '',
    preis: preisZahl(angebot.price ?? angebot.lowPrice ?? (angebot.priceSpecification as Record<string, unknown>)?.price),
  };
}

function amazon(html: string) {
  const titel = sauber(html.match(/<span[^>]+id=["']productTitle["'][^>]*>([\s\S]*?)<\/span>/i)?.[1]);
  let bild = html.match(/"hiRes":"(https:[^"]+)"/)?.[1] ?? html.match(/data-old-hires=["'](https:[^"']+)["']/)?.[1] ?? '';
  if (!bild) {
    const dyn = html.match(/data-a-dynamic-image=["']([^"']+)["']/)?.[1];
    if (dyn) try { bild = Object.keys(JSON.parse(entschluesseln(dyn)))[0] ?? ''; } catch { /* egal */ }
  }
  if (!bild) bild = html.match(/"landingImageUrl":"(https:[^"]+)"/)?.[1] ?? '';
  const preis = preisZahl(html.match(/class=["'][^"']*priceToPay[^"']*["'][\s\S]{0,400}?<span class=["']a-offscreen["']>([^<]+)</)?.[1]
    ?? html.match(/<span class=["']a-offscreen["']>([^<]*\d[^<]*)</)?.[1]);
  return { titel, bild, preis };
}

// Letzte Stufe: das erste Bild, das nach Produktfoto aussieht (groß angegeben oder als Haupt-/Produktbild benannt).
function grossesBild(html: string) {
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0];
    const src = tag.match(/\s(?:data-src|src)=["']([^"']+)["']/i)?.[1] ?? '';
    if (!src || src.startsWith('data:') || /logo|icon|sprite|pixel|avatar|badge|\.svg/i.test(src)) continue;
    const breite = +(tag.match(/\swidth=["']?(\d+)/i)?.[1] ?? 0);
    if (breite >= 300 || /(product|produkt|main|hero|gallery|zoom)/i.test(tag)) return src;
  }
  return '';
}

function haendlerAus(u: URL, seitenname: string) {
  const teile = u.hostname.toLowerCase().replace(/^www\d?\./, '').split('.');
  const kern = teile.length > 2 && ['co', 'com'].includes(teile[teile.length - 2]) ? teile[teile.length - 3] : teile[teile.length - 2] ?? teile[0];
  if (HAENDLER[kern]) return HAENDLER[kern];
  if (seitenname && seitenname.length <= 30) return seitenname;
  return kern ? kern[0].toUpperCase() + kern.slice(1) : '';
}

function titelAusAdresse(u: URL) {
  const stueck = decodeURIComponent(u.pathname).split('/').filter((s) => s && !/^(dp|gp|product|p|produkt|artikel|item)$/i.test(s) && !/^[A-Z0-9]{10}$/.test(s) && !/^\d+$/.test(s))
    .sort((a, b) => b.length - a.length)[0] ?? '';
  const t = stueck.replace(/\.(html?|php|aspx?)$/i, '').replace(/[-_+]+/g, ' ').replace(/\s+/g, ' ').trim();
  return t ? t[0].toUpperCase() + t.slice(1, 90) : '';
}

// Amazon-Links auf das Wesentliche kürzen (ohne Werbe- und Verfolgungsanhang).
function shopAdresse(u: URL) {
  const asin = u.pathname.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})/i)?.[1];
  if (/(^|\.)amazon\.[a-z.]+$/i.test(u.hostname) && asin) return `https://${u.hostname}/dp/${asin.toUpperCase()}`;
  const sauber = new URL(u.href);
  for (const k of [...sauber.searchParams.keys()]) if (/^(utm_|gclid|fbclid|ref|tag|srsltid|mc_)/i.test(k)) sauber.searchParams.delete(k);
  sauber.hash = '';
  return sauber.href;
}

const kuerzen = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s);

// ---------- Bild in den eigenen Speicher ----------
const ENDUNG: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif' };
async function bildUebernehmen(adresse: string): Promise<string | null> {
  try {
    const { r } = await holen(adresse, 'bild');
    const typ = (r.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
    if (!r.ok || !ENDUNG[typ]) return null;
    if (+(r.headers.get('content-length') ?? 0) > 3_000_000) return null;
    // Beim Laden mitzählen und abbrechen, sobald es zu groß wird.
    const teile: Uint8Array[] = [];
    let n = 0;
    const leser = r.body!.getReader();
    for (;;) {
      const { value, done } = await leser.read();
      if (done) break;
      n += value.length;
      if (n > 3_000_000) { leser.cancel().catch(() => {}); return null; }
      teile.push(value);
    }
    if (n < 600) return null; // Platzhalter-Pixel (z. B. Amazon ohne Bild)
    const daten = new Uint8Array(n);
    let o = 0;
    for (const t of teile) { daten.set(t, o); o += t.length; }
    // Zufälliger Ordner statt Konto-ID: Gäste sehen den Pfad in der Bildadresse.
    const zufall = () => crypto.randomUUID().replace(/-/g, '');
    const pfad = `${zufall().slice(0, 16)}/${zufall()}.${ENDUNG[typ]}`;
    const hoch = await fetch(`${SUPABASE_URL}/storage/v1/object/wunschbilder/${pfad}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${DIENST}`, apikey: DIENST, 'content-type': typ, 'cache-control': 'max-age=31536000' },
      body: daten,
    });
    return hoch.ok ? pfad : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  const herkunft = req.headers.get('origin');
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: kopf(herkunft) });
  if (req.method !== 'POST') return antwort({ fehler: 'methode' }, 405, herkunft);

  // Nur angemeldete Konten.
  const token = req.headers.get('authorization') ?? '';
  const wer = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { authorization: token, apikey: ANON } });
  if (!wer.ok) return antwort({ fehler: 'anmelden' }, 401, herkunft);
  if (!(await wer.json().catch(() => null))?.id) return antwort({ fehler: 'anmelden' }, 401, herkunft);

  let roh = '';
  try { roh = String((await req.json()).url ?? '').trim(); } catch { /* leer */ }
  if (!roh || roh.length > 2000) return antwort({ fehler: 'adresse' }, 400, herkunft);
  if (!/^https?:\/\//i.test(roh)) roh = 'https://' + roh;

  let start: URL;
  try { start = await adressePruefen(roh); } catch { return antwort({ fehler: 'adresse' }, 400, herkunft); }

  let html = '', ziel = start;
  try {
    const { r, url } = await holen(start.href, 'seite');
    ziel = url;
    if (r.ok && /html/i.test(r.headers.get('content-type') ?? 'text/html')) html = await textBis(r, 2_500_000);
  } catch { /* Seite gibt nichts her */ }

  const ld = jsonLd(html);
  const amz = /amazon\./i.test(ziel.hostname) ? amazon(html) : { titel: '', bild: '', preis: null };
  const seitenname = meta(html, 'og:site_name');
  const titelRoh = amz.titel || ld.titel || meta(html, 'og:title', 'twitter:title') ||
    sauber(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]) || titelAusAdresse(ziel);
  const titel = kuerzen(titelRoh.replace(new RegExp(`\\s*[|–-]\\s*${seitenname || '§§'}.*$`, 'i'), '').replace(/\s*[|]\s*[^|]{2,30}$/, ''), 120);
  const beschreibung = kuerzen(ld.beschreibung || meta(html, 'og:description', 'description', 'twitter:description'), 160);
  const preis = amz.preis ?? ld.preis ?? preisZahl(meta(html, 'product:price:amount', 'og:price:amount', 'price'));
  let bild = amz.bild || ld.bild || meta(html, 'og:image', 'og:image:url', 'twitter:image', 'image') || grossesBild(html);
  if (bild) try { bild = new URL(entschluesseln(bild), ziel).href; } catch { bild = ''; }

  let bild_pfad = bild ? await bildUebernehmen(bild) : null;
  // Amazon ohne Bild im Seitencode (Server-Abrufe werden dort oft gesperrt): Bild über die ASIN.
  const asin = ziel.pathname.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})/i)?.[1];
  if (!bild_pfad && asin && /amazon\./i.test(ziel.hostname)) {
    bild_pfad = await bildUebernehmen(`https://images-na.ssl-images-amazon.com/images/P/${asin.toUpperCase()}.01.LZZZZZZZ.jpg`);
  }

  return antwort({
    titel: titel || 'Wunsch',
    beschreibung,
    preis_ca: preis,
    haendler: haendlerAus(ziel, seitenname),
    shop_url: shopAdresse(ziel),
    bild_pfad,
    gefunden: Boolean(html),
  }, 200, herkunft);
});
