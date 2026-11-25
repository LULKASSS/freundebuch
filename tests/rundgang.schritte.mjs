/* Rundgang durch Wunschliste und Personenbuch gegen den Prüfserver (npm run pruefen, Port 5181).
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
  await page.waitForSelector('.seite-start');
  await page.waitForTimeout(400);
  await foto('start');
  await page.click('.leiste [data-ziel="menschen"]');
  await page.waitForSelector('.seite-menschen');
  await foto('menschen');
  await page.click('[data-aktion="person-neu"]');
  await page.waitForSelector('#p-name');
  await page.waitForTimeout(350);
  await foto('person-neu');
  await page.keyboard.press('Escape');
  await page.waitForSelector('.blatt-huelle', { state: 'detached' });

  /* Personenseite */
  await page.click('.register-zeile:has-text("Mia Brandt")');
  await page.waitForSelector('.ausweis');
  await page.waitForTimeout(400);
  await foto('person');
  await page.click('.leiste [data-aktion="festhalten"]');
  await page.waitForSelector('#fh-text');
  await page.fill('#fh-text', 'Hat heute im Regen laut gesungen.');
  await page.click('[data-fh-art="erlebnis"]');
  await page.click('[data-aktion="fh-wann"]');
  await page.waitForTimeout(350);
  await foto('festhalten');
  await page.press('#fh-text', 'Enter');
  await page.waitForTimeout(1300);
  await foto('festgehalten');
  await page.click('.faden [data-aktion="art-menue"]');
  await page.waitForSelector('.art-menue');
  await foto('art-menue');
  await page.keyboard.press('Escape');
  await page.click('[data-filter="geschichte"]');
  await page.waitForTimeout(200);
  await foto('geschichten');
  await page.click('.anh-text .text-knopf >> nth=0');
  await page.waitForSelector('#e-text');
  await page.waitForTimeout(350);
  await foto('eintrag');
  await page.keyboard.press('Escape');
  await page.waitForSelector('.blatt-huelle', { state: 'detached' });
  await page.click('.ausweis-stift');
  await page.waitForSelector('#p-name');
  await page.waitForTimeout(350);
  await foto('steckbrief');
  await page.keyboard.press('Escape');
  await page.waitForSelector('.blatt-huelle', { state: 'detached' });
  await page.click('[data-aktion="idee-neu"]');
  await page.waitForSelector('#idee-link');
  await page.fill('#idee-link', 'https://beispiel.invalid/produkt/toepferwerkzeug');
  await page.press('#idee-link', 'Enter');
  await page.waitForSelector('#g-titel', { timeout: 8000 });
  await page.waitForTimeout(350);
  await foto('idee');
  await page.click('.blatt button[type="submit"]');
  await page.waitForSelector('.blatt-huelle', { state: 'detached' });
  await page.waitForTimeout(300);
  await foto('person-mit-idee');
  await page.click('.verschenkt summary');
  await page.waitForTimeout(200);
  await foto('verschenkt');

  /* Festhalten von überall: erst die Person */
  await page.click('.leiste [data-ziel="start"]');
  await page.waitForSelector('.seite-start');
  await page.click('.leiste [data-aktion="festhalten"]');
  await page.waitForSelector('#fh-person');
  await page.waitForTimeout(350);
  await foto('festhalten-wen');
  await page.fill('#fh-person', 'Frieda');
  await foto('festhalten-neu');
  await page.keyboard.press('Escape');
  await page.waitForSelector('.blatt-huelle', { state: 'detached' });

  await page.click('.leiste [data-ziel="suche"]');
  await page.waitForSelector('#suchfeld');
  await foto('suche-leer');
  await page.fill('#suchfeld', 'lakritz');
  await foto('suche');
  await page.fill('#suchfeld', 'xyzxyz');
  await foto('suche-nichts');

  /* Meine Seite und Einstellungen */
  await page.click('.leiste [data-ziel="ich"]');
  await page.waitForSelector('.brauche');
  await page.waitForTimeout(400);
  await foto('ich');
  await page.click('.einstellungen-verweis a');
  await page.waitForSelector('.seite-einstellungen');
  await page.click('[data-aktion="kalender-an"]');
  await page.waitForSelector('a[href^="webcal:"]');
  await foto('einstellungen');

  await page.click('.listen-fuss [data-aktion="code-holen"]');
  await page.waitForSelector('.code-gross');
  await page.waitForTimeout(350);
  await foto('code-fuer-die-app');
  await page.keyboard.press('Escape');

  await page.click('[data-aktion="name"]');
  await page.waitForSelector('#anzeigename');
  await page.waitForTimeout(350);
  await foto('name-blatt');
  await page.keyboard.press('Escape');
  await page.waitForSelector('.blatt-huelle', { state: 'detached' });

  await page.goto(`${start}/#ich`);
  await page.waitForSelector('.brauche');
  await page.click('[data-aktion="liste-neu"]');
  await page.waitForSelector('#liste-titel');
  await page.waitForTimeout(350);
  await foto('liste-neu');
  await page.keyboard.press('Escape');
  await page.waitForSelector('.blatt-huelle', { state: 'detached' });

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
