/* Rundgang durch den Entwurf „Faden“: alle Pflichtabläufe aus AUFGABE.md und dem Nachbau-Auftrag. */
export default async (page, foto) => {
  await page.waitForSelector('.anhaenger');
  await foto('person');

  await page.click('[data-filter="geschichte"]');
  await foto('filter-geschichte');

  await page.click('[data-aktion="reihenfolge"]');
  await foto('alt-nach-neu');
  await page.click('[data-aktion="reihenfolge"]');
  await page.click('[data-filter="alle"]');

  await page.click('[data-eintrag="e11"] [data-aktion="art-menue"]');
  await page.waitForSelector('.art-menue');
  await foto('art-auswahl');
  await page.click('.art-menue [data-art="erlebnis"]');
  await foto('art-geaendert');

  /* Eigene Art am Eintrag anlegen */
  await page.click('[data-eintrag="e9"] [data-aktion="art-menue"]');
  await page.click('.art-menue [data-aktion="art-neu"]');
  await page.fill('#neue-art', 'Lieblingsort');
  await foto('art-neu-feld');
  await page.press('#neue-art', 'Enter');
  await foto('eigene-art');
  await page.click('.filter [data-filter="eigen-lieblingsort"]');
  await foto('filter-eigene-art');
  await page.click('[data-filter="alle"]');

  /* Festhalten auf Mias Seite: Mia ist gewählt */
  await page.click('.leiste [data-aktion="festhalten"]');
  await page.waitForSelector('#fh-text');
  await page.fill('#fh-text', 'Wünscht sich zum Geburtstag Zeit statt Zeug.');
  await page.click('[data-fh-art="mag"]');
  await foto('festhalten');
  await page.focus('#fh-text');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(900);
  await foto('festgehalten');

  await page.click('.leiste [data-ziel="start"]');
  await foto('start');

  /* Festhalten vom Start: niemand gewählt, Mia per Enter, Art Geschenkidee */
  await page.click('.leiste [data-aktion="festhalten"]');
  await page.waitForSelector('#fh-person');
  await foto('festhalten-von-start');
  await page.fill('#fh-person', 'Mi');
  await page.press('#fh-person', 'Enter');
  await page.fill('#fh-text', 'Kurs an der Töpferscheibe für Fortgeschrittene');
  await page.click('[data-fh-art="geschenkidee"]');
  await page.click('[data-aktion="speichern"]');
  await page.waitForTimeout(500);
  await foto('start-festgehalten');
  await page.click('.hinweis a');
  await page.waitForSelector('.anhaenger');
  await page.click('[data-filter="geschenkidee"]');
  await page.waitForTimeout(300);
  await foto('person-neue-idee');
  await page.click('.ideen [data-aktion="stand"][data-idee="g1"]');
  await foto('stand-weiter');
  await page.click('[data-filter="alle"]');

  await page.click('.leiste [data-ziel="menschen"]');
  await foto('menschen');

  await page.click('.leiste [data-ziel="suche"]');
  await page.fill('#suchfeld', 'Lakritz');
  await foto('suche-lakritz');
  await page.fill('#suchfeld', 'Geräuschunter');
  await foto('suche-trennzeichen');

  await page.click('.leiste [data-ziel="ich"]');
  await foto('ich');

  await page.click('a.geteilt');
  await foto('liste-ich');

  await page.click('[data-liste="l2"]');
  await foto('liste-l2');
  await page.click('[data-liste="l1"]');

  await page.click('a[href="#gast"]');
  await foto('gast-wer');

  await page.click('[data-gast="Tom"]');
  await foto('gast-liste');

  await page.click('[data-wunsch="w1"] [data-aktion="schenke"]');
  await page.waitForTimeout(1100);
  await foto('gast-reserviert');

  await page.click('[data-wunsch="w1"] [data-aktion="zuruecknehmen"]');
  await page.waitForTimeout(700);
  await foto('gast-zurueck');

  await page.click('[data-wunsch="w5"] [data-aktion="dabei"]');
  await page.waitForTimeout(1100);
  await foto('gast-dabei');
};
