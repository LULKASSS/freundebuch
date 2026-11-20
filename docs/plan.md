# Plan Freundebuch (20.11.2026, wartet auf Go)

Grundlage: `docs/auftrag.md`. Zielkarte: `CLAUDE.md`. Annahmen sind als **Annahme** markiert; am Ende stehen die
Punkte, bei denen dein Wort fehlt.

## 1. Technik

| Teil | Wahl | Warum |
| --- | --- | --- |
| Oberfläche | Reines HTML/CSS/JS als ES-Module, kein Build-Schritt (wie Wattbuch) | Pages liefert 1:1 aus; die Gästeseite lädt klein und schnell |
| Daten | Eigenes Supabase-Projekt „Freundebuch“, Region Frankfurt (eu-central-1) | Auftrag; Platz ist da (im Konto ist nur „Klar App“ aktiv) |
| Zugriff | Nur REST/RPC per `fetch`, öffentlicher `sb_publishable_…`-Schlüssel | Schutz liegt in der Datenbank (Zeilenschutz), nicht im Code der Seite |
| Bilder | Supabase Storage, beim Hochladen im Gerät auf ~800 px WebP verkleinert | Karten laden schnell auch im Mobilfunk |
| Link-Vorschau, Kalender, Konto löschen, Einladen | Supabase Edge Functions | Auftrag; Geheimnisse bleiben auf dem Server |
| Tests | Playwright (Oberfläche) + Abschottungstest (siehe 3.4) | |
| Adresse | `lulkasss.github.io/freundebuch`, Gästelink `…/freundebuch/#l/<Schlüssel>` | Der Schlüssel steht hinter `#` und geht so nie an GitHub oder an Shops (kein Referer) |

**Annahme:** Repo öffentlich wie Wattbuch und Klar, weil GitHub Pages bei privaten Repos ein Bezahl-Konto braucht.
Im Repo liegen nie echte Daten.

**Hinweis Kostenlos-Stufe:** Supabase pausiert kostenlose Projekte nach 7 Tagen ohne Zugriff. Damit ein Geburtstagslink
im Sommer nicht ins Leere läuft, ruft ein kleiner GitHub-Zeitplan das Projekt alle drei Tage einmal auf.

## 2. Datenmodell

Jede Zeile trägt `konto_id` (= Anmelde-ID des Besitzers). Löschen eines Kontos löscht alles, was daran hängt.

### Etappe 1: Wunschliste

```
konto            id, anzeigename ("Lukas"), angelegt
wunsch           id, konto_id, titel, beschreibung, bild_pfad, shop_url, haendler,
                 preis_ca, preis_stand (Datum), zusammenlegen (ja/nein), angelegt, entfernt_am
liste            id, konto_id, titel ("Weihnachten 2026"), anlass_datum, aufdecken_ab,
                 link_schluessel (128 Bit Zufall), aufgedeckt_am, archiviert
liste_wunsch     liste_id, wunsch_id, reihenfolge
gast             id, konto_id, name ("Mama"), person_id (ab Etappe 2)
liste_gast       liste_id, gast_id
reservierung     id, wunsch_id, liste_id, gast_id, art (schenke_ich | bin_dabei),
                 geraet_hash, angelegt, zurueckgenommen_am, konto_des_gastes (ab Etappe 3)
wunsch_voll      wunsch_id, liste_id, markiert_von_gast, markiert_am
```

- **Wünsche gehören mir, nicht der Liste.** Eine Liste zeigt eine Auswahl meiner Wünsche. So ist „Was ich brauche“ ab
  Etappe 2 ein Teil meiner eigenen Seite, und die Wunschliste ist das, was ich davon teile (Auftrag). Ein Wunsch kann
  auf zwei Listen stehen; ist er einmal reserviert, ist er auf allen weg.
- **Reservierungen stehen in eigenen Tabellen**, nicht am Wunsch. Würde ein Feld „reserviert“ am Wunsch stehen, könnte
  ich es lesen. `reservierung` und `wunsch_voll` haben für niemanden Leserechte; nur die Funktionen in 3.2 kommen dran.
- **Gerät statt Kennwort:** Das Gerät des Gastes erzeugt beim ersten Besuch einen Zufallsschlüssel (bleibt im
  Browser). Gespeichert wird nur dessen Prüfsumme. Zurücknehmen geht nur mit dem passenden Schlüssel.
- Entfernt: Nehme ich einen Wunsch heraus, wird er nur ausgeblendet. Wer ihn schon reserviert hat, sieht „Von der
  Liste genommen“ statt einer Lücke.

### Etappe 2: Personenbuch

```
person           id, konto_id, ist_ich, name, foto_pfad, geburtstag_tag, geburtstag_monat,
                 geburtsjahr (leer erlaubt), kennen_woher, beschenken_zu (geburtstag, weihnachten)
steckbrief       id, konto_id, person_id, bezeichnung ("Schuhgröße"), wert ("42"), reihenfolge
beziehung        id, konto_id, person_id, andere_person_id oder name, art ("Partnerin", "Sohn")
art              id, konto_id (leer = vorgegeben), name, zeichnung, reihenfolge
eintrag          id, konto_id, person_id, art_id (leer erlaubt), text, datum, angelegt, geaendert
geschenk         id, konto_id, person_id, titel, notiz, bild_pfad, shop_url, haendler,
                 preis_ca, preis_stand, stand (idee | besorgt | verschenkt), anlass, anlass_jahr,
                 reservierung_id (ab Etappe 3)
kalender_abo     konto_id, schluessel (128 Bit, neu erzeugbar)
```

- Steckbrief: feste Felder nur Geburtstag und „woher wir uns kennen“; Größen und alles Weitere als freie Zeilen
  mit Vorschlägen (Kleidergröße, Schuhgröße, Ringgröße). Familie verknüpft Personen im Buch oder steht als Name.
  Kein Formular mit zwanzig Feldern.
- Vorgegebene Arten: mag, mag nicht, Interesse, Geschichte, Erlebnis, Geschenkidee. Eigene Arten pro Konto.
- `eintrag.datum` ist der Tag des Geschehens (Standard heute, änderbar); danach sortiert die Zeitleiste.
- Ein Gast der Wunschliste kann mit einer Person verknüpft werden („Mama“ ist Person „Mama“).

### Etappe 3: Konten für andere

```
einladung        id, von_konto, email, angelegt, angenommen_am
fremde_liste     konto_id, link_schluessel, person_id   (wessen Liste ist das in meinem Buch)
```

- Reserviert jemand mit Konto auf einer fremden Liste, fragt die App einmal „Wer ist das in deinem Buch?“ und legt bei
  dieser Person ein `geschenk` mit Stand „besorgt“ an. Es gehört dem Reservierenden, nicht dem Listenbesitzer.

## 3. Zugriffsregeln

### 3.1 Grundsatz
- Zeilenschutz auf **jeder** Tabelle: lesen und schreiben nur, wenn `konto_id = angemeldetes Konto`.
- Gäste (ohne Anmeldung) haben auf **keine** Tabelle Rechte. Sie kommen nur über die Gast-Funktionen mit dem
  Link-Schlüssel an Daten, und diese liefern nur festgelegte Felder.
- Bilder: Wunschbilder in einem öffentlichen Ordner mit zufälligen Dateinamen (Produktfotos, nichts Persönliches).
  Personenfotos in einem privaten Ordner, nur das eigene Konto.

### 3.2 Funktionen (die einzigen Wege an Reservierungen)

| Funktion | Wer | Gibt heraus |
| --- | --- | --- |
| `gast_liste(schluessel)` | jeder mit Link | Listentitel, mein Anzeigename, Gastnamen, Wünsche mit Stand je Gast: frei / von dir / zusammenlegen (mit Namen der Beteiligten) / voll. Fremde Reservierungen nur als „weg“, ohne Namen |
| `gast_reservieren(schluessel, wunsch, gast, geraet)` | jeder mit Link | sperrt den Wunsch beim Schreiben, damit zwei gleichzeitige Tipps nicht beide gewinnen |
| `gast_zuruecknehmen(schluessel, reservierung, geraet)` | nur gleiches Gerät | |
| `gast_voll(schluessel, wunsch, geraet)` | nur Beteiligte | Wunsch verschwindet für alle anderen |
| `mein_stand(liste)` | Besitzer | je Gast die Anzahl („Mama · 2“), nie welche |
| `gast_freigeben(liste, gast)` | Besitzer | gibt alle Reservierungen eines Gastes frei (falls dessen Gerät weg ist), ohne zu zeigen, welche |
| `aufdecken(liste)` | Besitzer, erst ab `aufdecken_ab` | wer was geschenkt hat |

- `aufdecken_ab` ist standardmäßig der Tag nach dem Anlass. Sobald eine Reservierung besteht, lässt sich das Datum
  nicht mehr vorziehen (sonst könnte ich mir den Anlass auf gestern legen und nachsehen).
- Export vor dem Aufdecken enthält keine Reservierungen.
- **Ehrliche Grenze:** Öffne ich meinen eigenen Link im privaten Fenster, sehe ich wie jeder Gast, was weg ist. Das
  lässt sich ohne Gast-Konten nicht verhindern. Angemeldet zeigt mir der Link nur eine Vorschau ohne Reservierungsstand.

### 3.3 Edge Functions
- `vorschau` (nur angemeldet): lädt die Shop-Seite, liest Open Graph und JSON-LD (Titel, Bild, Preis), Händler aus
  der Adresse (amazon.de → Amazon, decathlon.de → Decathlon, sonst Seitenname). Bild in dieser Reihenfolge: Open Graph,
  JSON-LD, sonst das erste große Produktbild der Seite (bei Amazon das Hauptbild aus dem Seitencode, notfalls über die
  ASIN). Gibt die Seite nichts her (Amazon sperrt Server-Abrufe zeitweise): Titel aus der Adresse, Karte ohne Foto mit
  Zeichnung. Nur `http(s)`, keine internen Adressen. Bild wird in den eigenen Speicher übernommen.
- `kalender?s=<schluessel>`: Geburtstage als abonnierbarer Kalender (nur Name und Tag, keine Einträge), Schlüssel
  neu erzeugbar.
- `konto_loeschen` (Etappe 3), `einladen` (Etappe 3, nur Lukas).

### 3.4 Abschottungstest
- Liest die Liste **aller** Tabellen und Funktionen aus der Datenbank selbst, damit eine neue Tabelle nicht
  vergessen wird. Schlägt fehl, wenn eine Tabelle keinen Zeilenschutz hat.
- Legt Konto A mit Daten in jeder Tabelle an, dazu Konto B und einen Gast ohne Anmeldung. Prüft: B liest von A
  nichts und ändert nichts; der Gast liest keine Tabelle; jede Funktion mit A's Kennungen liefert B und dem Gast
  nichts; `gast_liste` gibt nur die erlaubten Felder heraus; A sieht vor dem Aufdecken nie, welcher Wunsch reserviert
  ist (auch nicht über Export, Stand oder Sortierung).
- Läuft zweimal: bei jedem `npm test` gegen eine Datenbank im Gerät (PGlite, echtes Postgres ohne Docker, das hier
  nicht installiert ist; **Annahme**, wird zu Beginn von Etappe 1 als Erstes geprüft) und nach jedem Einspielen gegen
  das echte Projekt mit zwei Testkonten, die danach wieder gelöscht werden.

## 4. Bildschirme

Handy zuerst, PC als breitere Fassung derselben Seiten. Oben links nie ein Titel, Logo oder Menüzeichen.

### Etappe 1: Wunschliste

**Gast (über den Link)**
1. **Wer bist du?** Die Namen, die ich angelegt habe, als große runde Felder. Ein Tipp, das Gerät merkt es sich; beim
   nächsten Mal geht es direkt zur Liste. „Nicht du?“ klein unten.
2. **Liste.** Kopf: „Lukas wünscht sich · Weihnachten 2026“. Karten mit Bild, Kurztitel, Mini-Beschreibung,
   „ca. 39 € · Stand 18.11.“, Händler, Knopf zum Shop, Knopf „Das schenke ich“. Beim Tipp die ruhige Animation (die
   Karte wird eingepackt) und sie wandert nach oben unter „Von dir“ mit „Zurücknehmen“. Weg ist sie für alle anderen.
   Zusammenlegen-Wünsche: „Zusammenlegen · Anna und Ben sind dabei“, Knopf „Ich bin dabei“; Beteiligte sehen
   „Ist voll“.
3. **Geht nicht mehr.** Hat in derselben Sekunde jemand anderes getippt: freundlicher Hinweis, Karte geht weg.

**Ich**
4. **Anmelden.** E-Mail eingeben, Link aus der Mail antippen, Gerät bleibt angemeldet.
5. **Meine Listen.** Je Anlass eine Karte: Titel, Datum, Anzahl Wünsche, „3 Leute haben etwas ausgesucht“.
6. **Liste.** Alle Wünsche immer vollständig, ohne Reservierungsstand. Oben: Link teilen (Teilen-Menü des Handys),
   Gäste mit Anzahl („Mama · 2, Ben · 1“), „So sehen es deine Leute“ (Vorschau), „Aufdecken ab 25.12.“ (vorher
   ausgegraut). Wünsche aus meinen anderen Listen per Tipp dazunehmen.
7. **Wunsch anlegen.** Ein Feld „Link einfügen“ (am Handy mit Einfügen-Knopf). Danach sind Bild, Titel, Preis, Händler
   vorgefüllt und Titel, Text, Preis, Händler direkt änderbar. Kein eigenes Hochladen von Bildern (Lukas, 20.11.2026:
   „link muss reichen oder halt kein bild“). Bild und Titel einer Wunschkarte führen per Klick direkt zum Shop.
   Schalter „Zum Zusammenlegen“.
8. **Gäste.** Namen anlegen, umbenennen, je Liste an- und abwählen, „Reservierungen freigeben“.
9. **Aufdecken.** Ab dem Tag nach dem Anlass: wer was geschenkt hat, je Gast.
10. **Export.** Eine Datei (ZIP mit JSON und Bildern).

### Etappe 2: Personenbuch

Unten am Handy fünf Ziele: **Start · Menschen · ＋ Festhalten · Suche · Ich**. Am PC links dieselben als ruhige
Spalte, ohne Logo. Festhalten und Suche gehen am PC zusätzlich über die Tastatur (`N`, `/`).

11. **Start.** Blickfang oben: der nächste Geburtstag als große gezeichnete Karte („Mia wird 34 · in 5 Tagen ·
    noch kein Geschenk“). Darunter zwei kurze Gruppen: „Bald“ (nächste Geburtstage) und „Geschenk fehlt“ (Anlässe in
    den nächsten Wochen ohne besorgtes Geschenk). Nicht mehr.
12. **Menschen.** Alle Personen mit Foto oder gezeichnetem Anfangsbuchstaben, alphabetisch, oben die zuletzt
    besuchten.
13. **Personenseite** (Mittelpunkt). Kopf: Name, Bild, Geburtstag mit Alter, „kennen uns aus …“. Steckbrief als
    kleine Zeilen (Größen, Familie), aufklappbar. Darunter Reihe mit den Arten als Filter (mag, mag nicht, Interesse,
    Geschichte, Erlebnis, Geschenkidee, eigene) und die Zeitleiste der Einträge. Geschenkideen mit Stand
    (Idee / besorgt / verschenkt) und Anlass. Ab Etappe 3: „Über ihre Wunschliste ausgesucht“.
14. **Festhalten** (von überall, ein Schritt). Blatt von unten: Person (zuletzt genutzte zuerst, Tippen sucht), ein
    Satz, Art optional als Chips, Speichern. Speichert sofort im Gerät und gleicht im Hintergrund ab.
15. **Suche** (von überall). Ein Feld, Treffer sofort beim Tippen über Namen, Steckbrief, Einträge und Geschenkideen,
    das Wort im Treffer hervorgehoben. Läuft im Gerät, damit sie ohne Warten antwortet.
16. **Ich** (meine eigene Seite). Dieselbe Seite wie jede Person, dazu „Was ich brauche“ (meine Wünsche) und
    „Geteilt als“ (meine Wunschlisten aus Etappe 1).
17. **Geschenkidee anlegen.** Wie Bildschirm 7 (derselbe Baustein), dazu Stand und Anlass.
18. **Einstellungen.** Konto, eigene Arten, Kalender abonnieren (Link kopieren, Anleitung für iPhone und Google),
    Export, hell/dunkel/wie das Gerät.

### Etappe 3: Konten für andere

19. **Einladen** (nur Lukas): E-Mail eingeben, Einladung geht über den eigenen Maildienst raus.
20. **Erste Anmeldung** einer Eingeladenen: Willkommen, eigener Name, die eigene Seite ist schon da.
21. **Konto löschen**: erst Export anbieten, dann mit Bestätigung alles löschen.
22. **Datenschutzerklärung und Impressum**: eigene Seiten, verlinkt in den Einstellungen und klein unten auf der
    Gästeseite.

## 5. Ablauf bis Weihnachten

1. Dein Go zu diesem Plan.
2. Vier Entwürfe (klickbar, Beispielinhalte erfunden: Personenseite, Festhalten, Wunschliste Gast und ich). Du
   wählst eins.
3. Etappe 1 bauen, Supabase-Projekt anlegen, einspielen, abnehmen. Ziel: Link verschickbar in der ersten
   Dezemberwoche.
4. Etappe 2, dann Etappe 3, je mit Abnahme.

## 6. Wo dein Wort fehlt (sonst gilt die Annahme)

1. **Zusammenlegen:** Ich markiere einzelne Wünsche als „zum Zusammenlegen“ (die teuren); nur dort gibt es „Ich bin
   dabei“, sonst „Das schenke ich“. *Alternative: bei jedem Wunsch beides.*
2. **„Wer und wie viele“** heißt: je Gast die Anzahl („Mama · 2“). Bei einer Liste mit nur einem Wunsch verrät das
   natürlich, welcher es ist.
3. **Aufdecken** ab dem Tag nach dem Anlass (Weihnachten: ab 25.12.), änderbar, aber nie vorziehbar, sobald etwas
   reserviert ist.
4. **Gastnamen** lege ich einmal an und wähle je Liste aus (Familie für Weihnachten, Freunde für den Geburtstag).
5. **Maildienst** für Etappe 3: Brevo (Server in der EU, kostenlos bis 300 Mails am Tag) als eigener Versand für die
   Anmeldelinks. In Etappe 1 reicht der eingebaute Versand, weil nur du dich anmeldest.
6. **Repo öffentlich** (für kostenloses GitHub Pages), ohne echte Daten.
