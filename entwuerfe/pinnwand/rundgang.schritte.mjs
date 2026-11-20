/* Rundgang durch den Entwurf „Pinnwand“: alle Pflichtabläufe aus entwuerfe/AUFGABE.md und dem Nachbau-Auftrag. */
export default async (page, foto) => {
  const klick = async (sel) => { await page.locator(sel).first().click(); };

  // Personenseite (Start beim Öffnen: #person/mia)
  await page.waitForSelector('.personenseite');
  await foto('person-mia');

  // Filter Geschichte, dann Umschalter alt → neu
  await klick('[data-filter="geschichte"]');
  await foto('filter-geschichte');
  await klick('[data-richtung]');
  await foto('alt-neu');

  // Art eines Eintrags ändern: der Zettel ohne Art (e11, „Art wählen“) wird Erlebnis
  await klick('[data-filter="alle"]');
  await klick('[data-richtung]');
  await klick('[data-art-fuer="e11"]');
  await foto('art-auswahl');
  await klick('#artwahl [data-setze-art="erlebnis"]');
  await foto('art-geaendert');

  // Eigene Art „Lieblingsort“ anlegen (am Interrail-Zettel), dann danach filtern
  await klick('[data-art-fuer="e2"]');
  await klick('#artwahl [data-art-neu]');
  await page.fill('#artwahl-neu', 'Lieblingsort');
  await foto('eigene-art-feld');
  await page.keyboard.press('Enter');
  await page.waitForSelector('#artwahl', { state: 'hidden' });
  await foto('eigene-art');
  await klick('.filter .chip:has-text("Lieblingsort")');
  await foto('filter-lieblingsort');
  await klick('[data-filter="alle"]');

  // Festhalten auf Mias Seite: Mia ist gewählt, Satz, Art, mit Enter speichern → Zettel in der Zeitleiste
  await klick('[data-festhalten]');
  await page.waitForSelector('#festhalten[open]');
  await page.fill('#fh-text', 'Hat Ella zum ersten Mal an die Drehscheibe gelassen.');
  await klick('[data-fh-art="erlebnis"]');
  await page.focus('#fh-text');
  await foto('festhalten');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => !document.getElementById('festhalten').open);
  await foto('festgehalten');

  // Start
  await klick('.leiste a[href="#start"]');
  await page.waitForSelector('.startseite');
  await foto('start');

  // Festhalten von Start: niemand vorgewählt, Name tippen, Enter nimmt Mia, Art Geschenkidee
  await klick('.leiste [data-festhalten]');
  await page.waitForSelector('#festhalten[open]');
  await foto('festhalten-start');
  await page.fill('#fh-suche', 'mi');
  await page.keyboard.press('Enter');
  await page.waitForSelector('[data-fh-person="mia"].an');
  await page.fill('#fh-text', 'Kleine Waage für Glasuren, auf das Gramm genau.');
  await klick('[data-fh-art="geschenkidee"]');
  await page.focus('#fh-text');
  await foto('festhalten-start-mia');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => !document.getElementById('festhalten').open);
  await page.waitForSelector('.startseite');
  await foto('start-festgehalten');

  // Über die Bestätigung zu Mia: neue Idee bei den Geschenkideen, dann Filter Geschenkidee
  await klick('.hinweis a');
  await page.waitForSelector('.personenseite');
  await foto('mia-neue-idee');
  await klick('[data-filter="geschenkidee"]');
  await foto('filter-geschenkidee');
  await klick('.wandbereich [data-stand]');
  await foto('stand-weiter');

  // Menschen
  await klick('.leiste a[href="#menschen"]');
  await foto('menschen');

  // Suche „Lakritz“
  await klick('.leiste a[href="#suche"]');
  await page.fill('#suche-feld', 'Lakritz');
  await foto('suche-lakritz');

  // Ich
  await klick('.leiste a[href="#person/ich"]');
  await page.waitForSelector('.personenseite');
  await foto('ich');

  // Wunschliste Ich, dann die zweite Liste
  await klick('.umschlag');
  await page.waitForSelector('.listenseite');
  await foto('liste-ich');
  await klick('.listen-wechsel a[href="#liste/l2"]');
  await page.waitForSelector('.listen-wechsel a[href="#liste/l2"][aria-current="page"]');
  await foto('liste-l2');
  await klick('.listen-wechsel a[href="#liste/l1"]');
  await page.waitForSelector('.listen-wechsel a[href="#liste/l1"][aria-current="page"]');

  // Gast: Vorschau, Tom wählen, w1 reservieren, zurücknehmen, bei w5 „Ich bin dabei“
  await klick('a[href="#gast"]');
  await page.waitForSelector('.namensschild');
  await foto('gast-wer');
  await klick('[data-gast="Tom"]');
  await page.waitForSelector('[data-wunsch="w1"]');
  await foto('gast-liste');
  await klick('[data-wunsch="w1"] [data-schenken]');
  await page.waitForSelector('.von-dir [data-wunsch="w1"]');
  await foto('gast-reserviert');
  await klick('[data-wunsch="w1"] [data-zuruecknehmen]');
  await page.waitForSelector('.von-dir', { state: 'detached' });
  await foto('gast-zurueck');
  await klick('[data-wunsch="w5"] [data-dabei]');
  await page.waitForSelector('.von-dir [data-wunsch="w5"]');
  await foto('gast-dabei');
};
