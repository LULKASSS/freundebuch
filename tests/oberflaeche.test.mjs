/* Oberflächentest: klickt Etappe 1 gegen den Prüfserver (PGlite mit dem echten Schema) durch.
 * Zwei Gäste auf zwei Geräten, dazu ich angemeldet. Prüft auch an der Oberfläche,
 * dass meine Ansicht nicht verrät, welcher Wunsch vergeben ist. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { starten } from '../scripts/pruefserver.mjs';

const PORT = 5199;
const BASIS = `http://127.0.0.1:${PORT}`;
const LINK = `${BASIS}/#l/probeliste-weihnachten`;
const LISTE = `${BASIS}/#liste/aaaaaaaa-0000-4000-8000-000000000001`;
const W = (n) => `[data-wunsch="bbbbbbbb-0000-4000-8000-00000000000${n}"]`;
let server, browser;

before(async () => {
  server = await starten(PORT);
  // Playwrights eigener Browser, sonst das installierte Chrome (ohne etwas nachzuladen).
  browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
});
after(async () => { await browser?.close(); server?.close(); });

async function geraet({ angemeldet = false, ziel = LINK } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'de-DE', reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const fehler = [];
  page.on('pageerror', (e) => fehler.push(e.message));
  await page.goto(`${BASIS}/`);
  await page.evaluate(async (an) => {
    localStorage.setItem('freundebuch.attrappe', 'ja');
    if (an) localStorage.setItem('freundebuch.sitzung', JSON.stringify(await (await fetch('/attrappe/__sitzung')).json()));
  }, angemeldet);
  await page.goto(ziel);
  await page.reload();
  return { page, ctx, fehler };
}
const zuruecksetzen = () => fetch(`${BASIS}/attrappe/__zuruecksetzen`);

test('Gast reserviert, ein anderes Gerät sieht den Wunsch nicht mehr, Zurücknehmen gibt ihn frei', async () => {
  await zuruecksetzen();
  const a = await geraet(), b = await geraet();
  await a.page.click(`${W(2)} [data-aktion="schenke"]`);
  await a.page.waitForSelector(`.von-dir ${W(2)} [data-aktion="zuruecknehmen"]`);
  assert.equal(await a.page.evaluate(() => document.activeElement?.dataset.aktion), 'zuruecknehmen', 'Fokus bleibt bei der Karte');

  await b.page.reload();
  await b.page.waitForSelector('.gast-wuensche');
  assert.equal(await b.page.locator(W(2)).count(), 0, 'Gerät B sieht den reservierten Wunsch nicht');

  await a.page.click(`${W(2)} [data-aktion="zuruecknehmen"]`);
  await a.page.waitForSelector(`${W(2)} [data-aktion="schenke"]`);
  await b.page.reload();
  await b.page.waitForSelector(W(2));
  assert.deepEqual([...a.fehler, ...b.fehler], []);
  await a.ctx.close(); await b.ctx.close();
});

test('Zwei tippen gleichzeitig: nur einer bekommt den Wunsch, der andere einen freundlichen Hinweis', async () => {
  await zuruecksetzen();
  const a = await geraet(), b = await geraet();
  await Promise.all([a.page.click(`${W(1)} [data-aktion="schenke"]`), b.page.click(`${W(1)} [data-aktion="schenke"]`)]);
  await Promise.all([a.page, b.page].map((p) => p.waitForSelector('.hinweis.da')));
  await a.page.waitForTimeout(300);
  const gewonnen = [await a.page.locator(`.von-dir ${W(1)}`).count(), await b.page.locator(`.von-dir ${W(1)}`).count()];
  assert.deepEqual([...gewonnen].sort(), [0, 1], 'genau ein Gerät hat ihn');
  const verlierer = gewonnen[0] ? b.page : a.page;
  const texte = await Promise.all([a.page.textContent('.hinweis'), b.page.textContent('.hinweis')]);
  assert.ok(texte.some((t) => /schneller/.test(t)), `Hinweis fehlt: ${texte}`);
  await verlierer.waitForSelector(W(1), { state: 'detached', timeout: 3000 });
  await a.ctx.close(); await b.ctx.close();
});

test('Zusammenlegen: Vorname freiwillig, andere sehen ihn, „Ist voll“ nimmt den Wunsch für andere weg', async () => {
  await zuruecksetzen();
  const a = await geraet(), b = await geraet();
  await a.page.click(`${W(4)} [data-aktion="dabei-fragen"]`);
  await a.page.fill('#vorname-bbbbbbbb-0000-4000-8000-000000000004', 'Anna');
  await a.page.press('#vorname-bbbbbbbb-0000-4000-8000-000000000004', 'Enter');
  await a.page.waitForSelector(`.von-dir ${W(4)} [data-aktion="voll"]`);

  await b.page.reload();
  await b.page.waitForSelector(W(4));
  assert.match(await b.page.textContent(`${W(4)} .zusammen`), /Anna ist dabei/);
  await b.page.click(`${W(4)} [data-aktion="dabei-fragen"]`);
  await b.page.click(`${W(4)} [data-aktion="dabei"]`); // ohne Namen
  await b.page.waitForSelector(`.von-dir ${W(4)}`);
  assert.match(await b.page.textContent(`${W(4)} .zusammen`), /du und Anna/);

  await a.page.reload();
  await a.page.waitForSelector(`${W(4)} .zusammen`);
  assert.match(await a.page.textContent(`${W(4)} .zusammen`), /du und eine weitere Person/);
  await a.page.click(`${W(4)} [data-aktion="voll"]`);
  await a.page.waitForSelector(`${W(4)} .voll-zeile`);

  const c = await geraet();
  await c.page.waitForSelector('.gast-wuensche');
  assert.equal(await c.page.locator(W(4)).count(), 0, 'voller Wunsch ist für andere weg');
  await a.ctx.close(); await b.ctx.close(); await c.ctx.close();
});

test('Meine Ansicht verrät nicht, welcher Wunsch vergeben ist, nur die Zahl', async () => {
  await zuruecksetzen();
  const ich = await geraet({ angemeldet: true, ziel: LISTE });
  await ich.page.waitForSelector('.seite-liste');
  const vorher = await ich.page.innerHTML('.wunsch-liste.ich');
  assert.match(await ich.page.textContent('.stand-zahl'), /0\s*Wünsche vergeben/);

  const gast = await geraet();
  await gast.page.click(`${W(3)} [data-aktion="schenke"]`);
  await gast.page.waitForSelector(`.von-dir ${W(3)}`);

  await ich.page.reload();
  await ich.page.waitForSelector('.seite-liste');
  assert.equal(await ich.page.innerHTML('.wunsch-liste.ich'), vorher, 'Wunschkarten sind unverändert');
  assert.match(await ich.page.textContent('.stand-zahl'), /1\s*Wunsch vergeben/);

  /* Eigener Link angemeldet: Vorschau, alles frei, nichts auszusuchen */
  await ich.page.click('a[href^="#l/"]');
  await ich.page.waitForSelector('.vorschau-band');
  assert.equal(await ich.page.locator('.von-dir').count(), 0);
  assert.equal(await ich.page.locator(W(3)).count(), 1, 'reservierter Wunsch erscheint in der Vorschau ganz normal');
  await ich.page.click(`${W(3)} [data-aktion="schenke"]`);
  assert.match(await ich.page.textContent('.hinweis'), /Vorschau/);
  await ich.ctx.close(); await gast.ctx.close();
});

test('Wunsch per Link anlegen, mit der Tastatur; erscheint danach beim Gast', async () => {
  await zuruecksetzen();
  const ich = await geraet({ angemeldet: true, ziel: LISTE });
  await ich.page.waitForSelector('[data-aktion="wunsch-neu"]');
  await ich.page.focus('[data-aktion="wunsch-neu"]');
  await ich.page.keyboard.press('Enter');
  await ich.page.waitForSelector('#wunsch-link');
  await ich.page.waitForTimeout(100);
  assert.equal(await ich.page.evaluate(() => document.activeElement?.id), 'wunsch-link', 'Fokus im Linkfeld');
  await ich.page.keyboard.press('Escape');
  await ich.page.waitForSelector('.blatt-huelle', { state: 'detached' });
  assert.equal(await ich.page.evaluate(() => document.activeElement?.dataset.aktion), 'wunsch-neu', 'Fokus zurück am Knopf');

  await ich.page.keyboard.press('Enter');
  await ich.page.waitForSelector('#wunsch-link');
  await ich.page.fill('#wunsch-link', 'https://beispiel.invalid/produkt/blaue-thermoskanne');
  await ich.page.keyboard.press('Enter');
  await ich.page.waitForSelector('#w-titel', { timeout: 8000 });
  assert.equal(await ich.page.inputValue('#w-titel'), 'Blaue thermoskanne');
  await ich.page.fill('#w-preis', 'viel');
  await ich.page.click('.blatt button[type="submit"]');
  await ich.page.waitForSelector('#w-fehler:not([hidden])');
  await ich.page.fill('#w-preis', '29,90');
  await ich.page.click('.blatt button[type="submit"]');
  await ich.page.waitForSelector('.blatt-huelle', { state: 'detached' });
  assert.match(await ich.page.textContent('.wunsch-liste.ich'), /Blaue thermoskanne/);
  assert.match(await ich.page.textContent('.wunsch-liste.ich'), /ca\. 29,90 €/);

  const gast = await geraet();
  await gast.page.waitForSelector('.gast-wuensche');
  assert.match(await gast.page.textContent('.gast-wuensche'), /Blaue thermoskanne/);
  assert.deepEqual([...ich.fehler, ...gast.fehler], []);
  await ich.ctx.close(); await gast.ctx.close();
});

test('Anmelden: unbekannte Adresse bekommt „nur auf Einladung“, mit dem Code aus der Mail bin ich drin', async () => {
  const { page, ctx } = await geraet({ ziel: `${BASIS}/` });
  await page.fill('#email', 'jemand@beispiel.invalid');
  await page.click('button[type="submit"]');
  await page.waitForSelector('.feld-fehler');
  assert.match(await page.textContent('.feld-fehler'), /nur auf Einladung/);
  await page.fill('#email', 'lukas@beispiel.invalid');
  await page.click('button[type="submit"]');
  await page.waitForSelector('#code');
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'code', 'Fokus im Codefeld');
  await page.fill('#code', '654321');
  await page.click('button[type="submit"]');
  await page.waitForSelector('.feld-fehler');
  assert.match(await page.textContent('.feld-fehler'), /passt nicht/);
  await page.fill('#code', '123 456');
  await page.press('#code', 'Enter');
  await page.waitForSelector('.seite-listen');
  assert.match(await page.textContent('h1'), /Meine Wunschlisten/);
  await ctx.close();
});

test('Preise: Tausenderpunkt und Komma werden richtig gelesen, leerer Titel bekommt eine Meldung', async () => {
  await zuruecksetzen();
  const ich = await geraet({ angemeldet: true, ziel: LISTE });
  await ich.page.click('[data-aktion="wunsch-neu"]');
  await ich.page.click('[data-aktion="ohne-link"]');
  await ich.page.waitForSelector('#w-titel');
  await ich.page.click('.blatt button[type="submit"]');
  assert.match(await ich.page.textContent('#w-fehler'), /Titel/);
  await ich.page.fill('#w-titel', 'E-Bike');
  await ich.page.fill('#w-preis', '1.299');
  await ich.page.click('.blatt button[type="submit"]');
  await ich.page.waitForSelector('.blatt-huelle', { state: 'detached' });
  assert.match(await ich.page.textContent('.wunsch-liste.ich'), /ca\. 1\.299 €/);
  await ich.ctx.close();
});

test('Home-Bildschirm-App: Code auf dem angemeldeten Gerät holen und im anderen eingeben', async () => {
  await zuruecksetzen();
  const safari = await geraet({ angemeldet: true, ziel: `${BASIS}/#` });
  await safari.page.waitForSelector('.seite-listen');
  await safari.page.click('.listen-fuss [data-aktion="code-holen"]');
  await safari.page.waitForSelector('.code-gross');
  const code = (await safari.page.textContent('.code-gross')).trim();
  assert.match(code, /^\d{6,10}$/);

  const app = await geraet({ ziel: `${BASIS}/` });
  await app.page.click('[data-aktion="code-eingeben"]');
  assert.match(await app.page.textContent('.feld-fehler'), /E-Mail-Adresse/, 'ohne Adresse erst ein Hinweis');
  await app.page.fill('#email', 'lukas@beispiel.invalid');
  await app.page.click('[data-aktion="code-eingeben"]');
  await app.page.waitForSelector('#code');
  await app.page.fill('#code', code);
  await app.page.press('#code', 'Enter');
  await app.page.waitForSelector('.seite-listen');
  assert.deepEqual([...safari.fehler, ...app.fehler], []);
  await safari.ctx.close(); await app.ctx.close();
});
