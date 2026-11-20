// Gerät koppeln: Wer schon angemeldet ist (z. B. in Safari nach dem Link aus der Mail), bekommt hier einen
// sechsstelligen Code für ein anderes Gerät oder die App auf dem Home-Bildschirm. Die hat auf dem iPhone ihren
// eigenen Speicher und bekommt den Link aus der Mail nie zu sehen.
// Der Code ist ein ganz normaler Einmal-Code von Supabase (wie beim Anmelden per Mail), nur ohne Mail:
// generate_link erzeugt ihn, verschickt aber nichts. Er gilt nur kurz, nur einmal und nur für das eigene Konto.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const DIENST = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ERLAUBTE_HERKUNFT = ['https://lulkasss.github.io', 'http://localhost:5180', 'http://127.0.0.1:5180'];

function kopf(herkunft: string | null) {
  const h: Record<string, string> = {
    'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info',
    'access-control-allow-methods': 'POST, OPTIONS',
    'vary': 'origin',
    'cache-control': 'no-store',
  };
  if (herkunft && ERLAUBTE_HERKUNFT.includes(herkunft)) h['access-control-allow-origin'] = herkunft;
  return h;
}
const antwort = (daten: unknown, status: number, herkunft: string | null) =>
  new Response(JSON.stringify(daten), { status, headers: { ...kopf(herkunft), 'content-type': 'application/json' } });

Deno.serve(async (req) => {
  const herkunft = req.headers.get('origin');
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: kopf(herkunft) });
  if (req.method !== 'POST') return antwort({ fehler: 'methode' }, 405, herkunft);

  // Nur für das eigene, angemeldete Konto.
  const wer = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { authorization: req.headers.get('authorization') ?? '', apikey: ANON },
  });
  if (!wer.ok) return antwort({ fehler: 'anmelden' }, 401, herkunft);
  const email = (await wer.json().catch(() => null))?.email as string | undefined;
  if (!email) return antwort({ fehler: 'anmelden' }, 401, herkunft);

  const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: { authorization: `Bearer ${DIENST}`, apikey: DIENST, 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'magiclink', email }),
  });
  if (!r.ok) return antwort({ fehler: 'code' }, 502, herkunft);
  const d = await r.json();
  const code = d.email_otp ?? d.properties?.email_otp;
  if (!code) return antwort({ fehler: 'code' }, 502, herkunft);
  return antwort({ code }, 200, herkunft);
});
