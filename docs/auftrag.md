# Auftrag (Lukas, 20.11.2026, wörtlich)

Bau mir eine Web-App (GitHub Pages + Supabase, eigenes Supabase-Projekt in Frankfurt,
neues Repo LULKASSS/freundebuch), Handy zuerst: ein Freundebuch mit Wunschliste.

## Ziel
Ich habe zu jedem Menschen in meinem Leben und zu mir selbst an einem Ort, was ihn
ausmacht, und finde es in Sekunden wieder, etwa für ein Geschenk oder eine Rede.
Meine Wünsche kann ich als Liste teilen, aus der man ohne Konto etwas aussucht, ohne
dass zwei dasselbe kaufen und ohne dass ich erfahre, was ich bekomme.

Die App handelt von Menschen. Die Wunschliste ist eine Seite davon, nicht umgekehrt.
Sie soll sich anfühlen wie etwas, das genau dafür gemacht ist, nicht wie eine
Notiz-App mit Ordnern.

## Grundregeln
- Datenmodell von Anfang an für mehrere Konten; jede Zeile gehört einem Konto.
- Alles im Personenbuch ist privat und nur für das eigene Konto lesbar. Nach außen
  geht ausschließlich, was ausdrücklich als Wunschliste geteilt ist. Dafür gibt es
  einen eigenen Test: Ein fremdes Konto und ein Gast ohne Konto kommen an nichts
  Privates.
- Jede Etappe ist allein lauffähig und wird abgenommen, bevor die nächste beginnt.
- Die Kernhandlungen müssen schnell bleiben: aussuchen und reservieren (Gast),
  etwas festhalten und etwas wiederfinden (ich). Zusatzfunktionen dürfen sie nicht
  ausbremsen.
- Alles lässt sich als Datei exportieren.

## Etappe 1: Wunschliste (soll vor Weihnachten laufen)
Gast mit Link, ohne Konto und ohne Passwort:
- Eigenen Namen antippen (ich lege die Namen vorher an, das Gerät merkt sich die Wahl).
- Karten mit Bild, Kurztitel, Mini-Beschreibung, ca.-Preis, Händler (z. B. Amazon,
  Decathlon) und Knopf zum Shop.
- „Das schenke ich“ ist ein Tipp. Danach ist das Geschenk für alle anderen weg.
- Zurücknehmen kann nur, wer reserviert hat (gleiches Gerät).
- Zusammenlegen: Bei einem Wunsch können sich mehrere beteiligen; er bleibt sichtbar,
  bis einer der Beteiligten ihn als voll markiert. Die App rechnet keine Beträge.
- Kein Kennwort; der Schutz ist der nicht erratbare Link.

Ich:
- Link einfügen, die App füllt Bild, Titel, Preis und Händler vor (Supabase Edge
  Function, Open-Graph/JSON-LD). Jedes Feld kann ich von Hand ändern und ein Bild
  selbst hochladen, weil manche Shops (v. a. Amazon) nichts hergeben.
- Preis als „ca.“ mit Datum.
- Meine Liste bleibt immer vollständig. Ich sehe nur, wer etwas reserviert hat und
  wie viele, nie welches. Die Datenbank gibt meiner Ansicht die Zuordnung nicht heraus.
- Mehrere Anlässe (z. B. Weihnachten, Geburtstag) als eigene Listen.
- Auflösung: Nach dem Anlass kann ich aufdecken, wer was geschenkt hat; vorher nicht.

## Etappe 2: Personenbuch (der Kern)
- Jede Person und ich selbst haben dieselbe Seite: oben ein Steckbrief (Geburtstag,
  woher wir uns kennen, Größen, Familie), darunter einzelne Einträge mit Art und Datum.
- Arten: mag, mag nicht, Interesse, Geschichte/Anekdote, Erlebnis, Geschenkidee.
  Die Arten sind vorgegeben, ich kann eigene ergänzen. Kein starres Formular mit
  zwanzig Feldern.
- Einträge sind nach Art filterbar und zeitlich sortiert. Für eine Rede filtere ich
  auf „Geschichte“ und habe alles in Reihenfolge.
- Festhalten in einem Schritt, von überall erreichbar: Person wählen, Satz schreiben,
  speichern. Die Art ist optional und nachträglich änderbar.
- Suche über alle Personen und Einträge, von jeder Seite aus erreichbar.
- Geschenkideen: Link einfügen wie bei der Wunschliste, mit Stand Idee / besorgt /
  verschenkt und für welchen Anlass.
- Meine eigene Seite: was ich bin und was ich brauche. Die Wunschliste ist der Teil
  davon, den ich teile.
- Startseite: wer hat als Nächstes Geburtstag, für wen fehlt noch ein Geschenk.
  Einladend, mit klarer Gliederung und einem Blickfang, nicht vollgestopft.
- Geburtstage als abonnierbarer Kalender, keine eigenen Push-Meldungen.

## Etappe 3: Konten für andere
- Nur auf Einladung von mir. Anmeldung per E-Mail-Link über einen eigenen Maildienst
  (der eingebaute Versand von Supabase reicht dafür nicht).
- Jedes Konto hat sein eigenes Personenbuch und eigene Wunschlisten und kann sich
  samt aller Daten selbst löschen.
- Wer bei jemandem etwas reserviert und ein Konto hat, sieht es bei dieser Person
  in seinem Personenbuch.
- Vor dem Start: Datenschutzerklärung und Impressum.

## Look
Warm und verspielt, nicht mein sonstiger strenger Linear-Look: weiche Farben, runde
Karten, kleine Zeichnungen, sanfte ruhige Animation dort, wo etwas Wichtiges passiert
(z. B. beim Reservieren). Flieder als Akzent, kein Blau als Themenfarbe. Hell und
dunkel. Soll nicht nach KI-Baukasten aussehen. Kein Titelbalken oben links (kein
Logo, kein App-Name, kein Zeichen als Menü-Knopf).

## Reihenfolge
1. Zielkarte in die CLAUDE.md schreiben, dann den Plan zeigen: Datenmodell,
   Zugriffsregeln, Bildschirme aller drei Etappen. STOPP, auf mein Go warten.
2. Vier verschiedene Designs als klickbare Entwürfe mit echten Beispielinhalten,
   je mit Personenseite (als Mittelpunkt), Schnell-Festhalten und Wunschliste.
   STOPP, ich wähle eins.
3. Etappe 1 bauen und abnehmen lassen, dann Etappe 2, dann Etappe 3.
4. Vor jedem Zeigen: ui-pruefung (Handy und PC, hell und dunkel) und ein separater
   Prüfer ohne Vorwissen, der das Ergebnis Punkt für Punkt gegen diesen Auftrag hält.
   Was nicht erfüllt ist, wird nachgebaut, nicht nur gemeldet.
