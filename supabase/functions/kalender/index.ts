// Geburtstage als abonnierbarer Kalender: GET …/kalender?s=<Schlüssel>.
// Kalender-Apps können sich nicht anmelden; der Schutz ist der nicht erratbare, neu erzeugbare Schlüssel.
// Die Datenbankfunktion gibt nur Name und Tag heraus und ist nur für den Dienst-Schlüssel erreichbar.
import { kalender } from './ical.js';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const DIENST = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return new Response(null, { status: 405 });
  const s = new URL(req.url).searchParams.get('s') ?? '';
  if (!/^[A-Za-z0-9_-]{22}$/.test(s)) return new Response('Diesen Kalender gibt es nicht.', { status: 404 });
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/kalender_daten`, {
    method: 'POST',
    headers: { authorization: `Bearer ${DIENST}`, apikey: DIENST, 'content-type': 'application/json' },
    body: JSON.stringify({ p_schluessel: s }),
  });
  if (!r.ok) return new Response('Gerade nicht erreichbar.', { status: 502 });
  const personen = await r.json();
  if (!personen) return new Response('Diesen Kalender gibt es nicht.', { status: 404 });
  return new Response(kalender(personen), {
    headers: { 'content-type': 'text/calendar; charset=utf-8', 'cache-control': 'private, max-age=3600', 'x-robots-tag': 'noindex' },
  });
});
