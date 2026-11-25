# CLAUDE.md – Freundebuch

Ein Buch über die Menschen in meinem Leben und über mich selbst, mit Wunschliste zum Teilen. Web-App, Handy zuerst
(GitHub Pages + eigenes Supabase-Projekt in Frankfurt). Gehört Lukas. Sprache in App, Code, Kommentaren und Commits:
**Deutsch**.

## Ziel

- Wofür: Zu jedem Menschen in meinem Leben und zu mir selbst liegt an einem Ort, was ihn ausmacht, und ich finde es in
  Sekunden wieder (für ein Geschenk, für eine Rede). Meine Wünsche teile ich als Liste, aus der man ohne Konto etwas
  aussucht, ohne dass zwei dasselbe kaufen und ohne dass ich erfahre, was ich bekomme.
- Mittelpunkt: Die App handelt von Menschen. Die Personenseite ist der Kern, die Wunschliste ist eine Seite davon
  (der Teil meiner eigenen Seite, den ich teile), nicht umgekehrt. Fühlt sich an wie genau dafür gemacht, nicht wie
  eine Notiz-App mit Ordnern.
- Wer, wann: ich (später eingeladene Freunde mit eigenem Konto) zwischendurch am Handy, wenn mir etwas über jemanden
  einfällt oder ich ein Geschenk suche; am PC zum Pflegen und für eine Rede. Gäste öffnen meinen Link am Handy und
  suchen etwas aus, ohne Namen und ohne Konto.
- Kernhandlungen, die schnell bleiben müssen: aussuchen und reservieren (Gast); etwas festhalten und etwas wiederfinden
  (ich). Keine Zusatzfunktion darf sie ausbremsen.
- Gelungen, wenn: die Wunschliste vor Weihnachten 2026 verschickt ist und niemand etwas doppelt schenkt; ein Gast ohne
  Erklärung in unter einer Minute etwas reserviert; ich einen Satz über jemanden in drei Handgriffen festhalte; ich für
  eine Rede auf „Geschichte“ filtere und alles in Reihenfolge habe; der Abschottungstest grün ist.
- Abgenommen: Plan `docs/plan.md` samt den sechs Annahmen in Abschnitt 6 (Go, Lukas, 20.11.2026): Zusammenlegen nur
  bei markierten Wünschen, Brevo für Etappe 3, Repo öffentlich. Design: **Entwurf C „Faden“**
  (`entwuerfe/faden/`, Stand Commit 655a212; Lukas, 20.11.2026). Bilder ohne eigenes Hochladen: Link reicht oder kein
  Bild; Klick auf Wunschkarte führt zum Shop. Keine Gäste, kein „Wer bist du?“, kein Aufdecken (Lukas,
  20.11.2026); ich sehe nur „3 Wünsche vergeben“, beim Zusammenlegen freiwillig ein Vorname (Lukas: „Passt so“).
  Preis direkt aus dem Shop (Variante im Link), ohne „ca.“ und ohne Stand; meine Wünsche als kleine Pille (Bild,
  Titel, Preis, Größe, wie oft); „Wie oft“ und Größe je Wunsch; Listentitel kleiner (Lukas, 22.11.2026).
- Nicht gewollt: Notiz-App mit Ordnern; starres Formular mit zwanzig Feldern; Lukas' strenger Linear-Look; Blau als
  Themenfarbe; KI-Baukasten-Optik; Titelbalken oben links (kein Logo, kein App-Name, kein Menüzeichen); eigene
  Push-Meldungen; Beträge rechnen beim Zusammenlegen; Kennwort oder Konto für Gäste; Registrieren ohne Einladung.

## Grundregeln

- Datenmodell von Anfang an für mehrere Konten, jede Zeile gehört einem Konto.
- Alles im Personenbuch ist privat und nur fürs eigene Konto lesbar. Nach außen geht nur, was ausdrücklich als
  Wunschliste geteilt ist. Der **Abschottungstest** beweist es: ein fremdes Konto und ein Gast ohne Konto kommen an
  nichts Privates. Er läuft bei jedem `npm test` und nach jedem Einspielen.
- Die Datenbank gibt meiner Ansicht nie heraus, welcher Wunsch reserviert ist.
- Alles lässt sich als Datei exportieren.
- Jede Etappe ist allein lauffähig und wird abgenommen, bevor die nächste beginnt.

## Look

Warm und verspielt: weiche Farben, runde Karten, kleine Zeichnungen, sanfte ruhige Animation dort, wo etwas Wichtiges
passiert (Reservieren). Flieder als Akzent, kein Blau. Hell und dunkel gleichwertig. Gilt hier statt des Skills
`app-ui` (dessen Linear-Look ist ausdrücklich nicht gewollt); dessen Arbeitsweise (Zielkarte, jedes Element braucht eine
Zeile, die es trägt) gilt.

## Phase

Etappe 1 (Wunschliste) läuft, seit 20.11.2026; die echte Liste ist in Gebrauch. Etappe 2 (Personenbuch) gebaut am
25.11.2026 (Lukas: „mach mal allein weiter … um die wunschliste und auch das personenbuch hinzustellen“), **wartet auf
Lukas' Abnahme**. Danach Etappe 3 (Konten für andere). Design: Entwurf C „Faden“ (abgenommen 20.11.2026); die anderen
drei Entwürfe bleiben zum Nachschlagen in `entwuerfe/`. „Festhalten“ bleibt als Wort (Lukas, 20.11.2026); auf einer
Personenseite ist diese Person vorgewählt.

Annahmen in Etappe 2 (Lukas entscheidet): „Geschenk fehlt“ schaut 60 Tage voraus; keine Personenfotos, stattdessen der
gezeichnete Anhänger (folgt aus „Bilder ohne eigenes Hochladen“); neue Menschen stehen auf „schenke zum Geburtstag“;
ein Eintrag darf nur ein Jahr haben („2014“); der Filter „Geschichte“ beginnt mit der ältesten.

## Arbeitsweise

- Vor jedem Zeigen: Skill `ui-pruefung` (Handy und PC, hell und dunkel, Bilder ansehen) und ein separater Prüfer ohne
  Vorwissen, der das Ergebnis Punkt für Punkt gegen den Auftrag (`docs/auftrag.md`) hält. Was nicht erfüllt ist, wird
  nachgebaut, nicht nur gemeldet.
- Repo ist **öffentlich** (GitHub Pages): keine echten Namen, Geburtstage, Wünsche, Schlüssel außer dem öffentlichen
  `sb_publishable_…`. Beispiele sind erfunden.
- Annahmen als **Annahme** kennzeichnen. Lukas entscheidet.

## Technik

- App: `index.html` + `app/` (ES-Module ohne Build): `basis.js` (Hilfen, Blatt), `app.js` (Gast, Anmelden, Wunschliste,
  Seitenwechsel), `buch.js` + `faden.js` (Personenbuch, lädt nur angemeldet; Gäste nie). Bei Änderungen an `app.js` oder
  `style.css` die Zahl hinter `?v=` in `index.html` hochzählen.
- Personenbuch liegt zusätzlich im Gerät (`freundebuch.buch.<konto>`, beim Abmelden gelöscht); neue Einträge gehen über
  einen Ausgang (`freundebuch.ausgang.<konto>`), damit ohne Netz nichts verloren geht.
- Supabase-Projekt „Freundebuch“ (`khwjegrwmqgrwviciapg`, Frankfurt). Schema in `supabase/migrations/`, Edge Functions in
  `supabase/functions/`: `vorschau` (Link-Vorschau), `koppeln` (Code für die App), `kalender` (Geburtstage abonnieren).
- `npm test`: Abschottungstest (PGlite) und Oberflächentests (`oberflaeche`, `buch`) gegen den Prüfserver.
  `npm run pruefen` startet den Prüfserver (Port 5181): App plus Nachbildung von Supabase auf PGlite mit dem echten Schema; die App nutzt ihn nur auf
  localhost mit `localStorage['freundebuch.attrappe'] = 'ja'`. Rundgang: `tests/rundgang.schritte.mjs`.
- Nach jedem Einspielen ins echte Projekt `tests/abschottung.sql` per Supabase-MCP `execute_sql` ausführen; die
  Meldung muss `ABSCHOTTUNG_OK` lauten (der Block rollt alles zurück).
