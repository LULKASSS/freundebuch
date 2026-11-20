/* Rundgang durch Etappe 1 (Wunschliste) gegen den Prüfserver (npm run pruefen, Port 5181).
 * Erst als Gast über den Link, dann als ich. Jeder Lauf setzt die Daten zurück. */
const LISTE = 'aaaaaaaa-0000-4000-8000-000000000001';
const W = (n) => `[data-wunsch="bbbbbbbb-0000-4000-8000-00000000000${n}"]`;

export default async (page, foto) => {
  const start = new URL(page.url()).origin;
  await page.evaluate(async () => {
    localStorage.clear();
    localStorage.setItem('freundebuch.attrappe', 'ja');
    await fetch('/attrappe/__zuruecksetzen');
  });

  /* ---------- Gast ---------- */
  await page.goto(`${start}/#l/probeliste-weihnachten`);
  await page.reload();
  await page.waitForSelector('.gast-wuensche');
  await foto('gast-liste');

  await page.click(`${W(2)} [data-aktion="schenke"]`);
  await page.waitForSelector(`.von-dir ${W(2)}`);
  await page.waitForTimeout(500);
  await foto('gast-von-dir');

  await page.click(`${W(4)} [data-aktion="dabei-fragen"]`);
  await page.fill(`#vorname-bbbbbbbb-0000-4000-8000-000000000004`, 'Anna');
  await foto('gast-dabei-feld');
  await page.click(`${W(4)} [data-aktion="dabei"]`);
  await page.waitForSelector(`.von-dir ${W(4)}`);
  await page.waitForTimeout(500);
  await foto('gast-dabei');

  /* Jemand anderes war schneller */
  await page.evaluate(() => fetch('/attrappe/rest/v1/rpc/gast_reservieren', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ p_schluessel: 'probeliste-weihnachten', p_wunsch: 'bbbbbbbb-0000-4000-8000-000000000001', p_geraet: 'anderes-geraet-' + 'y'.repeat(30) }),
  }));
  await page.click(`${W(1)} [data-aktion="schenke"]`);
  await page.waitForSelector('.hinweis.da');
  await page.waitForTimeout(500);
  await foto('gast-schneller');

  await page.click(`${W(2)} [data-aktion="zuruecknehmen"]`);
  await page.waitForTimeout(700);
  await foto('gast-zurueckgenommen');

  /* ---------- Anmelden ---------- */
  await page.goto(`${start}/`);
  await page.waitForSelector('#email');
  await foto('anmelden');
  await page.fill('#email', 'unbekannt@beispiel.invalid');
  await page.click('button[type="submit"]');
  await page.waitForSelector('.feld-fehler');
  await foto('anmelden-kein-konto');
  await page.fill('#email', 'lukas@beispiel.invalid');
  await page.click('button[type="submit"]');
  await page.waitForSelector('#code');
  await foto('anmelden-code');
  await page.fill('#code', '111111');
  await page.click('button[type="submit"]');
  await page.waitForSelector('.feld-fehler');
  await foto('anmelden-code-falsch');

  /* ---------- Ich ---------- */
  await page.evaluate(async () => {
    const s = await (await fetch('/attrappe/__sitzung')).json();
    localStorage.setItem('freundebuch.sitzung', JSON.stringify(s));
  });
  await page.goto(`${start}/#`);
  await page.reload();
  await page.waitForSelector('.seite-listen');
  await foto('meine-listen');

  await page.click('[data-aktion="name"]');
  await page.waitForSelector('#anzeigename');
  await foto('name-blatt');
  await page.keyboard.press('Escape');

  await page.click('[data-aktion="liste-neu"]');
  await page.waitForSelector('#liste-titel');
  await page.waitForTimeout(350);
  await foto('liste-neu');
  await page.keyboard.press('Escape');

  await page.click(`a[href="#liste/${LISTE}"]`);
  await page.waitForSelector('.seite-liste');
  await foto('liste');

  await page.click('[data-aktion="wunsch-neu"]');
  await page.waitForSelector('#wunsch-link');
  await page.waitForTimeout(350);
  await foto('wunsch-link');
  await page.fill('#wunsch-link', 'https://beispiel.invalid/produkt/stoffbeutel-mit-stickerei');
  await page.press('#wunsch-link', 'Enter');
  await page.waitForSelector('#w-titel', { timeout: 8000 });
  await foto('wunsch-form');
  await page.fill('#w-preis', 'zwanzig');
  await page.click('.blatt button[type="submit"]');
  await page.waitForSelector('#w-fehler:not([hidden])');
  await foto('wunsch-preis-falsch');
  await page.fill('#w-preis', '19,90');
  await page.click('.blatt button[type="submit"]');
  await page.waitForSelector('.blatt-huelle', { state: 'detached' });
  await page.waitForTimeout(400);
  await foto('liste-mit-neuem-wunsch');

  await page.click(`${W(1)} [data-aktion="wunsch-bearbeiten"]`);
  await page.waitForSelector('#w-titel');
  await page.waitForTimeout(350);
  await foto('wunsch-bearbeiten');
  await page.keyboard.press('Escape');

  await page.click('[data-aktion="liste-bearbeiten"]');
  await page.waitForSelector('#liste-titel');
  await page.waitForTimeout(350);
  await foto('liste-bearbeiten');
  await page.keyboard.press('Escape');

  /* Mein eigener Link: nur Vorschau ohne Stand */
  await page.click('a[href^="#l/"]');
  await page.waitForSelector('.vorschau-band');
  await foto('vorschau');
};
