/* Rundgang „Kärtchen“: klickt alle Pflichtabläufe aus entwuerfe/AUFGABE.md und dem Nachbau-Auftrag durch.
 * Das erste Bild „01-start-…“ benennt der Rundgang selbst: es ist der Zustand nach dem Laden, also die
 * Personenseite von Mia (Start beim Öffnen). Die Startseite heißt hier „startseite“. */
export default async (page, foto) => {
  const klick = (sel) => page.locator(sel).first().click();

  // Personenseite Mia: Filter Geschichte, dann alt → neu
  await klick('[data-filter="geschichte"]');
  await foto('person-filter-geschichte');
  await klick('[data-reihe]');
  await foto('person-alt-neu');

  // Art eines Eintrags ändern (Eintrag ohne Art zeigt „Art wählen“ und bekommt „Erlebnis“)
  await klick('[data-filter="alle"]');
  await klick('[data-reihe]');
  await klick('[data-art-wahl="e11"]');
  await page.waitForSelector('#art-wahl:popover-open');
  await foto('person-art-wahl');
  await klick('[data-setze-art="erlebnis"]');
  await foto('person-art-geaendert');

  // Eigene Art „Lieblingsort“ in der kleinen Auswahl anlegen: steht danach sofort als Filter da
  await klick('[data-art-wahl="e12"]');
  await page.waitForSelector('#art-wahl:popover-open');
  await klick('#art-wahl [data-neue-art]');
  await page.locator('#art-wahl .art-feld').fill('Lieblingsort');
  await foto('person-neue-art-feld');
  await page.locator('#art-wahl .art-feld').press('Enter');
  await page.waitForSelector('.filter [data-filter="eigen7"]');
  await foto('person-eigene-art');

  // Festhalten auf der Personenseite: Mia ist gewählt, Enter speichert, Eintrag steht sofort in der Zeitleiste
  await klick('.nav [data-festhalten]');
  await page.waitForSelector('#festhalten[open]');
  await page.locator('#fh-text').fill('Wünscht sich einen Abend ohne Ton am Telefon, nur mit Tee und Hörspiel.');
  await klick('[data-fh-art="mag"]');
  await foto('festhalten-mia');
  await page.locator('#fh-text').press('Enter');
  await page.waitForSelector('#festhalten:not([open])', { state: 'attached' });
  await foto('festgehalten-mia');

  // Startseite
  await klick('.nav [data-ziel="start"]');
  await foto('startseite');

  // Festhalten von der Startseite: niemand gewählt, Name tippen, Enter nimmt Mia, Art Geschenkidee
  await klick('.nav [data-festhalten]');
  await page.waitForSelector('#festhalten[open]');
  await foto('festhalten-ohne-person');
  await page.locator('#fh-suche').fill('Mi');
  await page.locator('#fh-suche').press('Enter');
  await page.locator('#fh-text').fill('Leinenschürze für die Töpferscheibe');
  await klick('[data-fh-art="geschenkidee"]');
  await foto('festhalten-geschenkidee');
  await page.locator('#fh-text').press('Enter');
  await page.waitForSelector('#festhalten:not([open])', { state: 'attached' });
  await foto('startseite-festgehalten');

  // Über den Link in der Bestätigung zu Mia: neue Idee im Abschnitt Geschenkideen, dann Filter Geschenkidee
  await klick('.meldung-link');
  await page.waitForSelector('#geschenke [data-geschenk^="g1"], #geschenke .geschenk');
  await foto('person-neue-idee');
  await klick('[data-filter="geschenkidee"]');
  await foto('person-filter-geschenkidee');
  await klick('#zeitleiste-bereich [data-stand]');
  await foto('person-stand-weiter');

  // Menschen
  await klick('.nav [data-ziel="menschen"]');
  await foto('menschen');

  // Suche „Lakritz“, dann ein Wort mit weichem Trennzeichen im Titel (w7)
  await klick('.nav [data-ziel="suche"]');
  await page.locator('#suchfeld').fill('Lakritz');
  await foto('suche-lakritz');
  await page.locator('#suchfeld').fill('unterdrückung');
  await foto('suche-trennzeichen');

  // Ich, Wunschliste Ich (Weihnachten), Wechsel zur zweiten Liste
  await klick('.nav [data-ziel="ich"]');
  await foto('ich');
  await klick('.geteilt-liste[data-liste="l1"]');
  await foto('liste-l1');
  await klick('.listen-wechsel [data-liste="l2"]');
  await foto('liste-l2');

  // Gast: Tom wählen, w1 reservieren, zurücknehmen, bei w5 „Ich bin dabei“
  await page.evaluate(() => { location.hash = '#gast'; });
  await page.waitForSelector('.wer-name');
  await foto('gast-wer');
  await klick('[data-gast="Tom"]');
  await foto('gast-liste');
  await klick('[data-schenke="w1"]');
  await page.waitForSelector('[data-zuruecknehmen="w1"]');
  await foto('gast-reserviert');
  await klick('[data-zuruecknehmen="w1"]');
  await foto('gast-zurueckgenommen');
  await klick('[data-dabei="w5"]');
  await page.waitForSelector('[data-voll="w5"]');
  await foto('gast-dabei');
};
