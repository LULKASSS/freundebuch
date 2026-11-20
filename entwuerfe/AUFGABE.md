# Aufgabe für jeden der vier Entwürfe (20.11.2026)

Lies zuerst: `CLAUDE.md` (Zielkarte), `docs/auftrag.md` (Lukas' Auftrag, wörtlich), `docs/plan.md` (Abschnitt 4:
Bildschirme 1–3, 6, 11–16). Daten und Zeichnungen: `entwuerfe/gemeinsam/daten.js`, `entwuerfe/gemeinsam/zeichnungen.js`
(nur lesen, nicht ändern; eigene Zeichnungen in den eigenen Ordner). „Heute“ ist `HEUTE` (20.11.2026).

## Was der Entwurf können muss (klickbar, Zustand nur im Speicher)

Eine Seite mit Hash-Wegen. Start beim Öffnen: Personenseite von Mia (`#person/mia`).

1. **Personenseite** (Mittelpunkt, `#person/<id>`): oben Steckbrief (Name, Bild oder gezeichneter Anfangsbuchstabe,
   Geburtstag mit Alter und „in 6 Tagen“, woher wir uns kennen, Größen/Steckbrief-Zeilen, Familie, Tom verlinkt).
   Darunter Filter nach Art (alle Arten aus `ARTEN`, eine Auswahl „alle“) und die Einträge zeitlich sortiert, mit Datum
   und Art. Einträge ohne Art kommen auch vor. Reihenfolge neu→alt, mit einem leisen Umschalter auf alt→neu (für die
   Rede). Die Art eines Eintrags ist per Tipp änderbar (kleine Auswahl). Geschenkideen aus `GESCHENKE` mit Stand
   (Idee / besorgt / verschenkt) und Anlass gut sichtbar.
2. **Navigation:** Handy unten Start · Menschen · ＋ Festhalten · Suche · Ich. PC (≥ 900 px) dieselben Ziele als ruhige
   Spalte links. **Kein Titelbalken oben links: kein Logo, kein App-Name, kein Menüzeichen.**
   - Start (`#start`): Blickfang nächster Geburtstag (Mia, in 6 Tagen, 34), darunter „Bald“ und „Geschenk fehlt“. Mehr nicht.
   - Menschen (`#menschen`): alle Personen, Tipp öffnet die Personenseite.
   - Suche (`#suche`): ein Feld, Treffer sofort beim Tippen über Namen, Steckbrief, Einträge, Geschenkideen, Wort hervorgehoben.
   - Ich (`#person/ich`): dieselbe Seite wie jede Person, dazu „Was ich brauche“ (Wünsche) und „Geteilt als:
     Weihnachten 2026“ → Wunschliste Ich-Ansicht.
3. **Festhalten** (von überall, ein Schritt): Blatt/Fenster mit Person (zuletzt genutzte zuerst, Tippen sucht; auf
   einer Personenseite schon gewählt), ein Satz, Art optional als Chips, Speichern. Enter speichert, Esc schließt. Danach
   steht der Eintrag sofort in der Zeitleiste der Person, mit einer ruhigen Bestätigung.
4. **Wunschliste Gast** (`#gast`): „Wer bist du?“ mit den Namen aus `LISTE.gaeste` als große Felder → Liste (Gerät merkt
   die Wahl in localStorage, in try/catch; „Nicht Tom?“ klein). Karten mit Zeichnung, Kurztitel, Mini-Beschreibung,
   `euro(preis)` und „Stand 18.11.“, Händler, Knopf zum Shop (neuer Tab, rel="noopener noreferrer"), Knopf „Das schenke
   ich“. Ein Tipp reserviert: **sanfte, ruhige Animation** (das Wichtigste der App, unter 1 s, prefers-reduced-motion
   beachten), dann steht die Karte unter „Von dir“ mit „Zurücknehmen“. Von anderen Reservierte (`RESERVIERUNGEN`, art
   schenke_ich) sind für den Gast weg. Zusammenlegen-Wünsche (`zusammenlegen: true`): „Zusammenlegen · Mia und Jonas
   sind dabei“, Knopf „Ich bin dabei“; wer dabei ist, sieht „Ist voll“ und „Doch nicht“. „Ist voll“ nimmt den Wunsch für
   alle anderen weg. Keine Beträge rechnen.
5. **Wunschliste Ich** (`#liste`): alle 8 Wünsche immer vollständig, **ohne jeden Reservierungsstand**. Oben: Link
   teilen (kopiert einen erfundenen Link), Gäste mit Anzahl („Mama · 1“ …, aus `RESERVIERUNGEN` gezählt, je Gast,
   nie welcher Wunsch), „So sehen es deine Leute“ → `#gast`, „Aufdecken ab 25.12.“ ausgegraut.

## Gestaltung (für alle)

- Warm und verspielt, weiche Farben, runde Formen, kleine Zeichnungen, Animation nur dort, wo etwas Wichtiges
  passiert (Reservieren, Festhalten). **Flieder als Akzent, kein Blau** (kein Farbton zwischen Türkis und Indigo als
  Themenfarbe). Hell und dunkel gleichwertig: Farben als Tokens auf `:root`, dunkel über
  `@media (prefers-color-scheme: dark)`, `body` mit eigenem Hintergrund.
- Soll nicht nach KI-Baukasten aussehen: kein Inter/DM Sans/Poppins, keine Violett-Blau-Verläufe, kein Glas-Effekt,
  keine Emojis als Zeichen, keine gleichförmigen Kartenraster mit Standardschatten, kein „✨“.
- Keine Erklärsätze und Hinweiszeilen. Kurze deutsche Wörter. Datum deutsch.
- Handy zuerst (390 px), PC (1280 px) als breitere Fassung, kein waagrechtes Scrollen. Tippflächen ≥ 44 px.
  Text überall ≥ 4,5 : 1 Kontrast. Tastatur: Tab erreicht alles, Fokus sichtbar, am PC `N` öffnet Festhalten, `/` die Suche.
- Pillen, Chips und Knopfreihen bleiben einzeilig (Filterreihe darf waagrecht wischen, sonst nichts).
- Schriften nur von Google Fonts.

## Dateien und Prüfung

- Nur in deinen Ordner `entwuerfe/<name>/` schreiben: `index.html`, `style.css`, `app.js` (ES-Modul, kein Build),
  `rundgang.schritte.mjs`. Nichts außerhalb ändern, nicht committen.
- Eigener Server: `PORT=<dein Port> node scripts/serve.mjs` im Hintergrund, am Ende beenden.
- `rundgang.schritte.mjs` klickt alles oben durch (`export default async (page, foto) => { … await foto('name') … }`):
  Personenseite, Filter Geschichte, Umschalter alt→neu, Art eines Eintrags ändern, Festhalten öffnen und speichern,
  Start, Suche „Lakritz“, Ich, Wunschliste Ich, Gast: Tom wählen, w1 reservieren, zurücknehmen, bei w5 „Ich bin dabei“.
- Rundgang: `node /Users/lulkas/.claude/plugins/synced/65be4d1b-c176-4475-9fb6-adbb5d2cc49b_7aa81920-5216-4193-84f0-9db0c98311e4/lukas-assistenz/skills/ui-pruefung/scripts/rundgang.mjs http://localhost:<Port>/entwuerfe/<name>/ --schritte entwuerfe/<name>/rundgang.schritte.mjs --aus <Bildordner>`
  (390 und 1280 px, hell und dunkel). Jeden gemeldeten Fehler beheben, bis er sauber durchläuft.
- Dann die Bilder wirklich ansehen (Read) und verbessern, was schief, gequetscht, umbrochen, zu voll oder langweilig
  aussieht. Einmal nur mit Tastatur durch.
