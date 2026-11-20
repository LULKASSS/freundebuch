/* Rundgang für den Entwurf „Poesiealbum“: klickt alle Pflichtabläufe aus AUFGABE.md durch. */
export default async (page, foto) => {
  const klick = async (sel) => { await page.locator(sel).first().click(); };

  // Personenseite von Mia (Start beim Öffnen)
  await page.waitForSelector('.personenseite');
  await foto('person');

  // Filter Geschichte
  await klick('.chip[data-art="geschichte"]');
  await foto('filter-geschichte');

  // Umschalter alt → neu (für die Rede)
  await klick('.reihenfolge');
  await foto('alt-neu');

  // Zurück auf alle, Art eines Eintrags ändern (e11 hat noch keine Art)
  await klick('.chip[data-art="alle"]');
  await klick('.art-marke[data-id="e11"]');
  await foto('art-auswahl');
  await klick('.art-auswahl [data-art="erlebnis"]');
  await foto('art-geaendert');

  // Eigene Art anlegen: „+ Art“ in der kleinen Auswahl, Name tippen, Enter
  await klick('.art-marke[data-id="e11"]');
  await klick('.art-auswahl .art-neu');
  await page.fill('.neue-art-feld', 'Lieblingsort');
  await foto('art-neu-feld');
  await page.press('.neue-art-feld', 'Enter');
  await page.waitForSelector('.chip[data-art="eigen1"]');
  await klick('.chip[data-art="eigen1"]');
  await foto('eigene-art');
  await klick('.chip[data-art="alle"]');

  // Festhalten öffnen und speichern (Enter speichert)
  await klick('#leiste [data-aktion="festhalten"]');
  await page.fill('#fh-text', 'Wünscht sich für die Drehscheibe einen neuen Hocker.');
  await klick('.fh-art[data-art="geschenkidee"]');
  await foto('festhalten');
  await page.press('#fh-text', 'Enter');
  await foto('festgehalten');

  // Festhalten von woanders: Person per Tippen suchen
  await page.evaluate(() => { location.hash = '#start'; });
  await page.waitForSelector('.startseite');
  await foto('start');

  // Festhalten von Start: niemand vorgewählt, Name tippen, Enter nimmt den ersten Treffer, Art Geschenkidee
  await klick('#leiste [data-aktion="festhalten"]');
  await page.fill('#fh-suche', 'Mia');
  await page.press('#fh-suche', 'Enter');
  await page.fill('#fh-text', 'Schöne Schürze fürs Töpfern, mit großer Tasche.');
  await klick('.fh-art[data-art="geschenkidee"]');
  await foto('festhalten-start');
  await page.press('#fh-text', 'Enter');
  await page.waitForSelector('#meldung.an a');
  await foto('festgehalten-start');
  await klick('#meldung a');
  await page.waitForSelector('.personenseite');
  await foto('mia-neue-idee');
  await klick('.chip[data-art="geschenkidee"]');
  await foto('filter-geschenkidee');
  await klick('.chip[data-art="alle"]');

  await page.evaluate(() => { location.hash = '#menschen'; });
  await page.waitForSelector('.menschen');
  await foto('menschen');

  // Suche „Lakritz“
  await klick('#leiste [data-ziel="suche"]');
  await page.fill('#suchfeld', 'Lakritz');
  await foto('suche-lakritz');

  // Ich
  await klick('#leiste [data-ziel="ich"]');
  await page.waitForSelector('.brauche');
  await foto('ich');

  // Wunschliste Ich
  await klick('.geteilt');
  await page.waitForSelector('.liste-ich');
  await foto('liste-ich');

  // Zweite Liste über den leisen Wechsel
  await klick('.listen-wechsel a[data-liste="l2"]');
  await page.waitForSelector('.liste-ich');
  await foto('liste-l2');
  await klick('.listen-wechsel a[data-liste="l1"]');
  await page.waitForSelector('.liste-ich');

  // Gast: So sehen es deine Leute → Tom wählen
  await klick('.teilen a[href="#gast"]');
  await page.waitForSelector('.namen');
  await foto('gast-wer');
  await klick('.namensfeld[data-name="Tom"]');
  await foto('gast-liste');

  // w1 reservieren, zurücknehmen
  await klick('[data-aktion="schenke"][data-id="w1"]');
  await page.waitForSelector('[data-aktion="zuruecknehmen"][data-id="w1"]');
  await page.waitForTimeout(2200);
  await foto('reserviert');
  await klick('[data-aktion="zuruecknehmen"][data-id="w1"]');
  await page.waitForSelector('[data-aktion="schenke"][data-id="w1"]');
  await foto('zurueckgenommen');

  // w5: Ich bin dabei
  await klick('[data-aktion="dabei"][data-id="w5"]');
  await page.waitForSelector('[data-aktion="voll"][data-id="w5"]');
  await page.waitForTimeout(2200);
  await foto('dabei');
};
