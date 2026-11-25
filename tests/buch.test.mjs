/* Oberflächentest fürs Personenbuch (Etappe 2) gegen den Prüfserver: festhalten, wiederfinden, Rede, Geschenke,
 * Steckbrief, ohne Netz, Export, Abmelden. Alle Inhalte sind erfunden. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { starten } from '../scripts/pruefserver.mjs';

const PORT = 5198;
const BASIS = `http://127.0.0.1:${PORT}`;
const P = (n) => `cccccccc-0000-4000-8000-00000000000${n}`;
const MIA = `${BASIS}/#person/${P(1)}`;
const ALTER = new Date(Date.now() + 5 * 864e5).getFullYear() - 1992;
let server, browser;

before(async () => {
  server = await starten(PORT);
  browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
});
after(async () => { await browser?.close(); server?.close(); });

async function ich(ziel = `${BASIS}/`, { breite = 390 } = {}) {
  const ctx = await browser.newContext({ viewport: { width: breite, height: 844 }, locale: 'de-DE', reducedMotion: 'reduce', acceptDownloads: true });
  const page = await ctx.newPage();
  const fehler = [];
  page.on('pageerror', (e) => fehler.push(e.message));
  await page.goto(`${BASIS}/`);
  await page.evaluate(async () => {
    localStorage.setItem('freundebuch.attrappe', 'ja');
    localStorage.setItem('freundebuch.sitzung', JSON.stringify(await (await fetch('/attrappe/__sitzung')).json()));
  });
  await page.goto(ziel);
  await page.reload();
  await page.waitForSelector('body.mit-leiste .seite');
  return { page, ctx, fehler };
}
const neuAnfang = () => fetch(`${BASIS}/attrappe/__zuruecksetzen`);
const fokus = (page) => page.evaluate(() => document.activeElement?.id || document.activeElement?.dataset.aktion || document.activeElement?.tagName);
const ohneAusgang = (page) => page.waitForFunction(() => !Object.keys(localStorage).some((k) => k.startsWith('freundebuch.ausgang.')));

test('Start: nächster Geburtstag als Blickfang, darunter wer bald dran ist und wem ein Geschenk fehlt', async () => {
  await neuAnfang();
  const { page, ctx, fehler } = await ich();
  assert.equal(await page.textContent('.blick-titel'), `Mia wird ${ALTER}`);
  assert.match(await page.textContent('.blick-wann'), /in 5 Tagen/);
  assert.match(await page.textContent('.blick-geschenk'), /Noch kein Geschenk · Idee: Glasur-Set/);
  const fehlt = await page.locator('section:has(#fehlt-titel) .zeile-name').allTextContents();
  assert.deepEqual(fehlt.slice(0, 2), ['Mia', 'Oma Hilde']);
  assert.ok(!fehlt.includes('Sophie'), 'Sophie hat erst im Frühjahr Geburtstag');
  assert.deepEqual(fehler, []);
  await ctx.close();
});

test('Festhalten: auf der Personenseite vorgewählt, mit der Tastatur in einem Schritt, bleibt nach Neuladen', async () => {
  await neuAnfang();
  const { page, ctx, fehler } = await ich(MIA);
  await page.keyboard.press('n');
  await page.waitForSelector('#fh-text');
  assert.equal(await fokus(page), 'fh-text', 'Mia ist vorgewählt, der Fokus steht im Satz');
  await page.keyboard.type('Singt beim Abwasch Opern.');
  await page.keyboard.press('Enter');
  await page.waitForSelector('.faden .anhaenger >> text=Singt beim Abwasch Opern.');
  await ohneAusgang(page);
  await page.reload();
  await page.waitForSelector('.faden .anhaenger >> text=Singt beim Abwasch Opern.');
  assert.deepEqual(fehler, []);
  await ctx.close();
});

test('Festhalten von überall: Person tippen, neue Person gleich mit anlegen, Art nachträglich ändern', async () => {
  await neuAnfang();
  const { page, ctx, fehler } = await ich();
  await page.click('.leiste [data-aktion="festhalten"]');
  await page.waitForSelector('#fh-person');
  assert.equal(await fokus(page), 'fh-person');
  await page.fill('#fh-person', 'Frieda');
  await page.click('[data-aktion="fh-person-neu"]');
  await page.waitForSelector('.fh-gewaehlt >> text=Frieda');
  await page.fill('#fh-text', 'Sammelt alte Postkarten.');
  await page.click('.blatt button[type="submit"]');
  await page.click('.hinweis a');
  await page.waitForSelector('.name >> text=Frieda');
  await page.click('.faden [data-aktion="art-menue"]');
  await page.click('.art-menue [data-art="interesse"]');
  await page.waitForSelector('.art-knopf-name >> text=Interesse');
  await page.reload();
  await page.waitForSelector('.art-knopf-name >> text=Interesse');
  assert.deepEqual(fehler, []);
  await ctx.close();
});

test('Rede: Filter auf Geschichte zeigt alle Geschichten von alt nach neu, eigenes Datum nur mit Jahr', async () => {
  await neuAnfang();
  const { page, ctx, fehler } = await ich(MIA);
  await page.keyboard.press('n');
  await page.fill('#fh-text', 'Hat den Bus verpasst und ist gelaufen.');
  await page.click('[data-fh-art="geschichte"]');
  await page.click('[data-aktion="fh-wann"]');
  await page.fill('#fh-tag', '');
  await page.selectOption('#fh-monat', '');
  await page.fill('#fh-jahr', '2016');
  await page.click('.blatt button[type="submit"]');
  await page.waitForSelector('.blatt-huelle', { state: 'detached' });
  await page.click('[data-filter="geschichte"]');
  const jahre = await page.locator('.knoten').allTextContents();
  assert.deepEqual(jahre, ['2014', '2016', '2019', '2021']);
  assert.equal(await page.locator('.faden .anhaenger').count(), 4);
  assert.deepEqual(fehler, []);
  await ctx.close();
});

test('Suche: findet Namen, Steckbrief, Einträge und Ideen sofort, Wörter in jeder Reihenfolge, Taste /', async () => {
  await neuAnfang();
  const { page, ctx, fehler } = await ich();
  await page.keyboard.press('/');
  await page.waitForSelector('#suchfeld');
  assert.equal(await fokus(page), 'suchfeld');
  await page.keyboard.type('lakritz');
  assert.match(await page.textContent('#treffer'), /Menschen|Einträge/);
  assert.ok(await page.locator('#treffer mark').count() >= 2, 'Wort ist hervorgehoben');
  await page.fill('#suchfeld', 'ruckert');
  assert.match(await page.textContent('#treffer'), /Hilde Rückert/, 'ohne Umlaut gefunden');
  await page.fill('#suchfeld', 'geschichte mia');
  assert.equal(await page.locator('#treffer .zeile-eintrag').count(), 3, 'alle Geschichten von Mia');
  await page.click('#treffer .zeile-eintrag >> nth=0');
  await page.waitForSelector('.ausweis');
  assert.ok(await page.evaluate(() => document.activeElement?.classList.contains('anhaenger')), 'Fokus steht auf dem Treffer');
  await page.goto(`${BASIS}/#suche`);
  await page.fill('#suchfeld', '<img src=x onerror=alert(1)>');
  assert.match(await page.textContent('#treffer'), /Nichts zu/);
  assert.deepEqual(fehler, []);
  await ctx.close();
});

test('Geschenkidee: Link einfügen, Anlass vorbelegt, Stand schaltet weiter und nimmt sie aus „Geschenk fehlt“', async () => {
  await neuAnfang();
  const { page, ctx, fehler } = await ich(`${BASIS}/#person/${P(6)}`);
  await page.click('[data-aktion="idee-neu"]');
  await page.fill('#idee-link', 'https://beispiel.invalid/produkt/rennrad-klingel');
  await page.keyboard.press('Enter');
  await page.waitForSelector('#g-titel', { timeout: 8000 });
  assert.equal(await page.inputValue('#g-titel'), 'Rennrad klingel');
  assert.match(await page.inputValue('#g-anlass'), /^Geburtstag \d{4}$/);
  await page.click('.blatt button[type="submit"]');
  await page.waitForSelector('.idee >> text=Rennrad klingel');
  await ohneAusgang(page);
  await page.click('.ideen .idee-stand');
  await page.waitForSelector('.ideen .stand.ist >> text=besorgt');
  await page.goto(`${BASIS}/#`);
  await page.waitForSelector('section:has(#fehlt-titel)');
  const ben = page.locator('section:has(#fehlt-titel) li', { hasText: 'Ben' });
  if (await ben.count()) assert.doesNotMatch(await ben.textContent(), /Geburtstag/, 'für Bens Geburtstag fehlt nichts mehr (Weihnachten darf noch fehlen)');
  assert.deepEqual(fehler, []);
  await ctx.close();
});

test('Aus einem Satz wird eine Geschenkidee und der Satz bleibt ganz erhalten', async () => {
  await neuAnfang();
  const { page, ctx, fehler } = await ich(MIA);
  const lang = `Hat erzählt, dass ${'sie gern einmal eine lange Wanderung machen würde, '.repeat(7)}am liebsten im Herbst.`;
  await page.keyboard.press('n');
  await page.fill('#fh-text', lang);
  await page.click('.blatt button[type="submit"]');
  await page.waitForSelector('.blatt-huelle', { state: 'detached' });
  await ohneAusgang(page);
  const li = page.locator('.anhaenger', { hasText: 'am liebsten im Herbst' });
  await li.locator('[data-aktion="art-menue"]').click();
  await page.click('.art-menue [data-art="geschenkidee"]');
  await page.waitForSelector('.ist-idee .anh-notiz >> text=am liebsten im Herbst');
  await ohneAusgang(page);
  await page.reload();
  await page.waitForSelector('.ist-idee .anh-notiz >> text=am liebsten im Herbst');
  assert.equal(await page.locator('.anh-text >> text=am liebsten im Herbst').count(), 0, 'der Satz steht nicht doppelt');
  assert.deepEqual(fehler, []);
  await ctx.close();
});

test('Steckbrief: Größe und Familie eintragen, Unsinn im Geburtstag wird abgefangen, Familie verlinkt in beide Richtungen', async () => {
  await neuAnfang();
  const { page, ctx, fehler } = await ich(`${BASIS}/#person/${P(5)}`);
  await page.click('.ausweis-stift');
  await page.fill('#p-tag', '31');
  await page.selectOption('#p-monat', '2');
  await page.click('.blatt button[type="submit"]');
  await page.waitForSelector('#p-fehler:not([hidden])');
  await page.fill('#p-tag', '29');
  await page.fill('#p-jahr', '');
  await page.click('[data-bez-vorschlag="Schuhe"]');
  await page.keyboard.type('38');
  await page.click('[data-aktion="fam-neu"]');
  await page.keyboard.type('Jonas');
  await page.click('.blatt button[type="submit"]');
  await page.waitForSelector('.blatt-huelle', { state: 'detached' });
  assert.match(await page.textContent('.steckbrief'), /Schuhe 38/);
  assert.match(await page.textContent('.geburtstag'), /29\. Februar/);
  await page.click('.steckbrief .verweis >> text=Jonas');
  await page.waitForSelector('.name >> text=Jonas Keller');
  await page.waitForSelector('.steckbrief .verweis >> text=Sophie');
  assert.deepEqual(fehler, []);
  await ctx.close();
});

test('Ohne Netz: der Satz ist im Gerät gesichert und kommt an, sobald das Netz wieder da ist', async () => {
  await neuAnfang();
  const { page, ctx, fehler } = await ich(MIA);
  await page.route('**/attrappe/rest/**', (r) => r.abort());
  await page.keyboard.press('n');
  await page.fill('#fh-text', 'Hat im Funkloch angerufen.');
  await page.click('.blatt button[type="submit"]');
  await page.waitForSelector('.faden .anhaenger >> text=Hat im Funkloch angerufen.');
  await page.waitForSelector('.wartet', { state: 'attached' });
  await page.reload();
  await page.waitForSelector('.faden .anhaenger >> text=Hat im Funkloch angerufen.');
  await page.unroute('**/attrappe/rest/**');
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await ohneAusgang(page);
  const zweites = await ich(MIA);
  await zweites.page.waitForSelector('.faden .anhaenger >> text=Hat im Funkloch angerufen.');
  assert.deepEqual([...fehler, ...zweites.fehler], []);
  await ctx.close(); await zweites.ctx.close();
});

test('Angefangener Satz geht nicht verloren, wenn das Blatt zugeht; leer speichern geht nicht', async () => {
  await neuAnfang();
  const { page, ctx, fehler } = await ich(MIA);
  await page.keyboard.press('n');
  await page.click('.blatt button[type="submit"]');
  assert.equal(await page.getAttribute('#fh-text', 'aria-invalid'), 'true');
  await page.fill('#fh-text', 'Halber Satz');
  await page.keyboard.press('Escape');
  await page.waitForSelector('.blatt-huelle', { state: 'detached' });
  await page.keyboard.press('n');
  assert.equal(await page.inputValue('#fh-text'), 'Halber Satz');
  assert.deepEqual(fehler, []);
  await ctx.close();
});

test('Eintrag ändern, verschieben und löschen; Person löschen nimmt alles mit', async () => {
  await neuAnfang();
  const { page, ctx, fehler } = await ich(MIA);
  await page.click('.anh-text .text-knopf >> text=Koriander');
  await page.fill('#e-text', 'Koriander, auch gemahlen.');
  await page.selectOption('#e-person', P(2));
  await page.click('.blatt button[type="submit"]');
  await page.waitForSelector('.blatt-huelle', { state: 'detached' });
  assert.equal(await page.locator('.anhaenger >> text=Koriander').count(), 0);
  await page.goto(`${BASIS}/#person/${P(2)}`);
  await page.click('.anh-text .text-knopf >> text=auch gemahlen');
  await page.click('[data-aktion="eintrag-loeschen"]');
  await page.waitForTimeout(700);
  await page.click('[data-aktion="eintrag-loeschen"]');
  await page.waitForSelector('.blatt-huelle', { state: 'detached' });
  assert.equal(await page.locator('.anhaenger >> text=Koriander').count(), 0);
  await page.click('.ausweis-stift');
  await page.click('[data-aktion="person-loeschen"]');
  assert.match(await page.textContent('[data-aktion="person-loeschen"]'), /Wirklich\?/);
  await page.click('[data-aktion="person-loeschen"]');
  assert.equal(await page.locator('.blatt-huelle').count(), 1, 'ein Doppeltipp löscht nicht');
  await page.waitForTimeout(700);
  await page.click('[data-aktion="person-loeschen"]');
  await page.waitForSelector('.seite-menschen');
  assert.doesNotMatch(await page.textContent('.seite-menschen'), /Jonas/);
  await page.reload();
  await page.waitForSelector('.seite-menschen .register');
  await page.waitForTimeout(600);
  assert.doesNotMatch(await page.textContent('.seite-menschen'), /Jonas/);
  assert.deepEqual(fehler, []);
  await ctx.close();
});

test('Meine Seite: Wünsche und geteilte Listen gehören dazu, Wunsch von hier aus landet auf der gewählten Liste', async () => {
  await neuAnfang();
  const { page, ctx, fehler } = await ich(`${BASIS}/#ich`);
  assert.equal(await page.textContent('.name'), 'Lukas');
  assert.equal(await page.locator('.geteilt').count(), 2);
  await page.click('[data-aktion="wunsch-neu"]');
  await page.click('[data-aktion="ohne-link"]');
  await page.fill('#w-titel', 'Gutes Brotmesser');
  await page.click('[data-aktion="w-liste"] >> text=Weihnachten');
  await page.click('.blatt button[type="submit"]');
  await page.waitForSelector('.pille >> text=Gutes Brotmesser');
  assert.match(await page.textContent('.geteilt >> nth=0'), /6 Wünsche/);
  assert.deepEqual(fehler, []);
  await ctx.close();
});

test('Kalender: Link entsteht erst auf Wunsch, liefert nur Namen und Tage, neuer Link macht den alten ungültig', async () => {
  await neuAnfang();
  const { page, ctx, fehler } = await ich(`${BASIS}/#einstellungen`);
  await page.click('[data-aktion="kalender-an"]');
  await page.waitForSelector('a[href^="webcal:"]');
  const link = (await page.getAttribute('a[href^="webcal:"]', 'href')).replace('webcal:', 'http:');
  const ics = await (await fetch(link)).text();
  assert.match(ics, new RegExp(`SUMMARY:Mia Brandt wird ${ALTER}`));
  assert.doesNotMatch(ics, /Koriander|Lakritz|Hebelstraße/);
  await page.click('[data-aktion="kalender-neu"]');
  await page.waitForTimeout(700);
  await page.click('[data-aktion="kalender-neu"]');
  await page.waitForFunction((alt) => !document.querySelector(`a[href="${alt}"]`) && document.querySelector('a[href^="webcal:"]'), link.replace('http:', 'webcal:'));
  assert.equal((await fetch(link)).status, 404);
  assert.deepEqual(fehler, []);
  await ctx.close();
});

test('Export enthält das ganze Personenbuch, keine Reservierung', async () => {
  await neuAnfang();
  const { page, ctx, fehler } = await ich(`${BASIS}/#einstellungen`);
  const [datei] = await Promise.all([page.waitForEvent('download'), page.click('[data-aktion="export"]')]);
  const { readFile } = await import('node:fs/promises');
  const inhalt = (await readFile(await datei.path())).toString('utf8');
  for (const wort of ['personen', 'steckbrief', 'beziehungen', 'eigene_arten', 'eintraege', 'geschenke', 'Koriander', 'Hebelstra']) assert.ok(inhalt.includes(wort), wort);
  assert.ok(!/geraet_hash|"reservierung"/.test(inhalt));
  assert.deepEqual(fehler, []);
  await ctx.close();
});

test('Abmelden lässt nichts Privates im Gerät; Gäste laden das Personenbuch nie', async () => {
  await neuAnfang();
  const { page, ctx, fehler } = await ich(`${BASIS}/#einstellungen`);
  await page.click('[data-aktion="abmelden"]');
  await page.waitForSelector('#email');
  const rest = await page.evaluate(() => JSON.stringify(localStorage));
  assert.doesNotMatch(rest, /Mia|Koriander|freundebuch\.buch/);
  assert.equal(await page.locator('body.mit-leiste').count(), 0);
  const geladen = [];
  page.on('request', (r) => geladen.push(r.url()));
  await page.goto(`${BASIS}/#l/probeliste-weihnachten`);
  await page.reload();
  await page.waitForSelector('.gast-wuensche');
  assert.ok(!geladen.some((u) => /buch\.js|rest\/v1\/(person|eintrag)/.test(u)), geladen.join('\n'));
  assert.equal(await page.locator('.leiste:visible').count(), 0);
  assert.deepEqual(fehler, []);
  await ctx.close();
});

test('Eigene Arten: anlegen, umbenennen, löschen; Einträge bleiben', async () => {
  await neuAnfang();
  const { page, ctx, fehler } = await ich(`${BASIS}/#einstellungen`);
  await page.click('[data-aktion="art-umbenennen"]');
  await page.fill('#art-name', 'Spruch');
  await page.keyboard.press('Enter');
  await page.waitForSelector('.art-zeile >> text=Spruch');
  await page.click('[data-aktion="art-loeschen"]');
  await page.waitForTimeout(700);
  await page.click('[data-aktion="art-loeschen"]');
  await page.waitForSelector('.art-zeile', { state: 'detached' });
  await page.goto(MIA);
  await page.waitForSelector('.anhaenger >> text=zählen doppelt');
  assert.deepEqual(fehler, []);
  await ctx.close();
});

test('Dunkel von Hand bleibt nach dem Neuladen', async () => {
  const { page, ctx } = await ich(`${BASIS}/#einstellungen`);
  await page.click('[data-thema-wahl="dunkel"]');
  await page.reload();
  await page.waitForSelector('.seite-einstellungen');
  assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(27, 20, 25)');
  await ctx.close();
});

test('Leeres Buch lädt ein, den ersten Menschen anzulegen', async () => {
  await neuAnfang();
  const { page, ctx, fehler } = await ich();
  await page.evaluate(async () => {
    const s = JSON.parse(localStorage.getItem('freundebuch.sitzung'));
    const kopf = { authorization: `Bearer ${s.access_token}` };
    const alle = await (await fetch('/attrappe/rest/v1/person', { headers: kopf })).json();
    for (const p of alle.filter((x) => !x.ist_ich)) await fetch(`/attrappe/rest/v1/person?id=eq.${p.id}`, { method: 'DELETE', headers: kopf });
    Object.keys(localStorage).filter((k) => k.startsWith('freundebuch.buch.')).forEach((k) => localStorage.removeItem(k));
  });
  await page.reload();
  await page.click('.blickfang [data-aktion="person-neu"]');
  await page.fill('#p-name', 'Emil Vogt');
  await page.keyboard.press('Enter');
  await page.waitForSelector('.name >> text=Emil Vogt');
  assert.deepEqual(fehler, []);
  await ctx.close();
});

test('Nachladen im Hintergrund, während ein Blatt offen ist: Ändern und Löschen treffen die richtige Zeile', async () => {
  await neuAnfang();
  const { page, ctx, fehler } = await ich(MIA);
  const vorher = await page.locator('.anh-text').count();
  await page.click('.anh-text .text-knopf >> text=Koriander');
  await page.evaluate(() => { const d = Date.now; Date.now = () => d() + 60000; document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(900);
  await page.fill('#e-text', 'Koriander schmeckt nach Seife.');
  await page.click('.blatt button[type="submit"]');
  await page.waitForSelector('.anh-text >> text=Koriander schmeckt nach Seife.');
  await page.waitForTimeout(1800);
  await page.waitForSelector('.anh-text >> text=Koriander schmeckt nach Seife.');
  await page.click('.anh-text .text-knopf >> text=Koriander');
  await page.evaluate(() => { const d = Date.now; Date.now = () => d() + 120000; document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(900);
  await page.click('[data-aktion="eintrag-loeschen"]');
  await page.waitForTimeout(700);
  await page.click('[data-aktion="eintrag-loeschen"]');
  await page.waitForSelector('.blatt-huelle', { state: 'detached' });
  assert.equal(await page.locator('.anh-text').count(), vorher - 1);
  assert.equal(await page.locator('.anh-text >> text=Koriander').count(), 0);
  await page.goto(`${BASIS}/#ich`);
  await page.waitForSelector('.anh-text >> text=Deko');
  assert.deepEqual(fehler, []);
  await ctx.close();
});

test('Ohne Netz: geänderter Text und ein neuer Mensch bleiben im Gerät und kommen später an', async () => {
  await neuAnfang();
  const { page, ctx, fehler } = await ich(MIA);
  await page.route('**/attrappe/rest/**', (r) => r.abort());
  await page.click('.anh-text .text-knopf >> text=Koriander');
  await page.fill('#e-text', 'Koriander, im Funkloch geändert.');
  await page.click('.blatt button[type="submit"]');
  await page.waitForSelector('.anh-text >> text=im Funkloch geändert');
  await page.waitForSelector('.blatt-huelle', { state: 'detached' });
  await page.keyboard.press('n');
  await page.click('[data-aktion="fh-person-aendern"]');
  await page.fill('#fh-person', 'Nina Neu');
  await page.click('[data-aktion="fh-person-neu"]');
  await page.fill('#fh-text', 'Im Zug kennengelernt.');
  await page.click('.blatt button[type="submit"]');
  await page.waitForSelector('.blatt-huelle', { state: 'detached' });
  await page.unroute('**/attrappe/rest/**');
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await ohneAusgang(page);
  const zweites = await ich(MIA);
  await zweites.page.waitForSelector('.anh-text >> text=im Funkloch geändert');
  await zweites.page.goto(`${BASIS}/#menschen`);
  await zweites.page.click('.register-zeile >> text=Nina Neu');
  await zweites.page.waitForSelector('.anh-text >> text=Im Zug kennengelernt.');
  assert.deepEqual([...fehler, ...zweites.fehler], []);
  await ctx.close(); await zweites.ctx.close();
});

test('Zurück schließt das Blatt und bleibt auf der Seite; der Entwurf überlebt auch ein Neuladen', async () => {
  await neuAnfang();
  const { page, ctx, fehler } = await ich(`${BASIS}/#menschen`);
  await page.click('.register-zeile >> text=Mia Brandt');
  await page.waitForSelector('.ausweis');
  await page.keyboard.press('n');
  await page.fill('#fh-text', 'Angefangen');
  await page.goBack();
  await page.waitForSelector('.blatt-huelle', { state: 'detached' });
  assert.match(page.url(), /#person/);
  await page.reload();
  await page.waitForSelector('.ausweis');
  await page.keyboard.press('n');
  assert.equal(await page.inputValue('#fh-text'), 'Angefangen');
  await page.keyboard.press('Enter');
  await page.waitForSelector('.faden .anhaenger >> text=Angefangen');
  await page.waitForTimeout(300);
  await page.goBack();
  await page.waitForSelector('.seite-menschen');
  assert.deepEqual(fehler, []);
  await ctx.close();
});

test('Rede: die Reihenfolge der Geschichten kippt nicht, wenn vorher umgeschaltet wurde', async () => {
  await neuAnfang();
  const { page, ctx } = await ich(MIA);
  await page.click('[data-aktion="reihenfolge"]');
  await page.click('[data-aktion="reihenfolge"]');
  await page.goto(`${BASIS}/#person/${P(2)}`);
  await page.waitForSelector('.name >> text=Jonas');
  await page.goto(MIA);
  await page.waitForSelector('.name >> text=Mia');
  await page.click('[data-filter="geschichte"]');
  assert.deepEqual(await page.locator('.knoten').allTextContents(), ['2014', '2019', '2021']);
  await ctx.close();
});

test('Sitzung endet (anderer Tab meldet sich ab): nichts Privates bleibt sichtbar oder im Gerät', async () => {
  await neuAnfang();
  const { page, ctx } = await ich(MIA);
  const tab = await ctx.newPage();
  await tab.goto(`${BASIS}/#einstellungen`);
  await tab.click('[data-aktion="abmelden"]');
  await tab.waitForSelector('#email');
  await page.waitForSelector('#email');
  assert.doesNotMatch(await page.textContent('body'), /Mia Brandt/);
  await page.keyboard.press('n');
  assert.doesNotMatch(await page.evaluate(() => JSON.stringify(localStorage)), /Koriander/);
  await ctx.close();
});

test('Gleiche Vornamen stehen mit vollem Namen da; Unsinn als Link und Geburtstag in der Zukunft werden abgefangen', async () => {
  await neuAnfang();
  const { page, ctx, fehler } = await ich(`${BASIS}/#menschen`);
  await page.click('[data-aktion="person-neu"]');
  await page.fill('#p-name', 'Mia Schulz');
  await page.fill('#p-tag', '31');
  await page.selectOption('#p-monat', '12');
  await page.fill('#p-jahr', String(new Date().getFullYear() + 1));
  await page.keyboard.press('Enter');
  await page.waitForSelector('#p-fehler:not([hidden])');
  await page.fill('#p-jahr', '1990');
  await page.keyboard.press('Enter');
  await page.waitForSelector('.name >> text=Mia Schulz');
  await page.click('.leiste [data-ziel="start"]');
  await page.waitForSelector('.seite-start');
  await page.click('.leiste [data-aktion="festhalten"]');
  await page.fill('#fh-person', 'schulz mia');
  assert.deepEqual(await page.locator('.fh-vorschlag').allTextContents().then((t) => t.map((x) => x.replace(/^M(?=Mia)/, '').trim())).then((t) => t.slice(0, 1)), ['Mia Schulz']);
  await page.keyboard.press('Escape');
  await page.waitForSelector('.blatt-huelle', { state: 'detached' });
  await page.goto(MIA);
  await page.click('.ideen [data-aktion="idee-bearbeiten"] >> nth=0');
  await page.fill('#g-link', 'im Laden um die Ecke');
  await page.click('.blatt button[type="submit"]');
  await page.waitForSelector('#g-fehler:not([hidden])');
  assert.deepEqual(fehler, []);
  await ctx.close();
});
