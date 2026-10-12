# Sichtung Fovea: Import-Pipeline und RSVP-Logik

Stand: 12. Oktober 2026, Fovea-Commit `773385a`. Fovea ist Timos lokale React/Vite/Capacitor-App: Analyse und Speicherung laufen vollständig im Browser (IndexedDB), es gibt keinen Server.

## Kurzfazit

- **Leseengine:** fast unverändert übernehmen. Der Kern ist reines TypeScript ohne React- oder Browser-Abhängigkeiten, rund 1.650 Zeilen plus 2.000 Zeilen Tests.
- **Kalibrierung:** Logik und die sechs Kalibrierungstexte übernehmen, sie treffen genau den Kern von Lector („gemessene Geschwindigkeit“).
- **Import-Pipeline:** nur in Teilen übernehmen. Fovea betreibt großen Aufwand für Spaltenerkennung, Tagged PDF, OCR, Pausieren und Fortsetzen der Analyse und für die Textfluss-Evidenz der automatischen Fragen. Für das MVP reicht ein Bruchteil davon.
- **Fehlt in Fovea:** TXT- und URL-Import, Chunk-Modus, schnellere Funktionswörter, mehr als 600 WPM, Accounts und Server-Persistenz.

## Leseengine

| Fovea-Datei                                | Aufgabe                                                                                                                                                         | Empfehlung                          |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `features/reader/domain/tokens.ts`         | Token in Grapheme zerlegen, Satzzeichen klassifizieren, Sondertokens erkennen (Zahl, Datum, Uhrzeit, Einheit, URL, Abkürzung, Technisches)                      | übernehmen                          |
| `features/reader/domain/orp.ts`            | ORP-Buchstabe nach gemessener Glyphenbreite: 45 % der Wortbreite bei LTR, Mitte bei kurzen Wörtern und Sondertokens, Fallback ohne Messung                      | übernehmen                          |
| `features/reader/domain/smart-timing.ts`   | adaptive Anzeigedauer: Längenfaktor plus stärkster Bonus (Satzzeichen, Sondertoken, Strukturgrenze), Begrenzung, Glättung, Zeitbudget, das die Ziel-WPM hält    | übernehmen und erweitern (s. u.)    |
| `features/reader/domain/presentation.ts`   | Text in Präsentationseinheiten mit Satz-, Absatz-, Abschnitts- und Kapitel-IDs; Strukturpausen (Satz 180 ms, Absatz 450 ms …); Sprungziele                      | übernehmen, Visual-Einheiten kürzen |
| `features/reader/domain/reader-machine.ts` | reine Zustandsmaschine (`ready`, `playing`, `paused`, `structure`, `visual`, `question`, `completed`) mit Kommandos `start`, `pause`, `elapsed`, `jump`, `seek` | übernehmen                          |
| `features/documents/domain/sentences.ts`   | Satzgrenzen mit deutschen Abkürzungen und Ordinalzahlen („z. B.“, „bzw.“, „Dr.“, „am 3. Mai“)                                                                   | übernehmen                          |
| `ui/components/AnchorWord.tsx`             | misst per Canvas in der tatsächlich gerenderten Schrift und verschiebt das Wort so, dass der ORP-Buchstabe auf dem festen Ankerpunkt steht                      | als Svelte-Komponente nachbauen     |
| `ui/screens/ReaderScreen.tsx`              | `requestAnimationFrame`-Schleife gibt verstrichene Millisekunden an die Zustandsmaschine                                                                        | Muster übernehmen                   |
| `features/reader/domain/remap-position.ts` | Leseposition nach geänderter Quelldatei wiederfinden                                                                                                            | vorerst weglassen                   |

Die Dateien hängen nur von Typen aus `documents` und `settings` sowie von `sentences.ts` ab. Sie lassen sich samt Tests nach `src/lib/reader/` kopieren.

### Abgleich mit der Spezifikation

- **ORP-Hervorhebung:** vorhanden.
- **Adaptive Geschwindigkeit:** Langsamer bei langen Wörtern, Zahlen, Satzzeichen und Satzenden ist vorhanden. „Schneller bei Funktionswörtern“ fehlt; nur Wörter mit höchstens zwei Buchstaben bekommen den Faktor 0,8. Fovea erprobt Worthäufigkeiten aus dlexDB in einem separaten Labor (`tools/smart-timing-lab`), nicht im Produkt, und ob abgeleitete dlexDB-Werte weitergegeben werden dürfen, ist dort ungeklärt. Einfacher: eine feste Liste geschlossener Wortklassen (Artikel, Präpositionen, Konjunktionen, Pronomen) mit eigenem Faktor. `sentences.ts` führt bereits eine solche Liste für Satzanfänge.
- **Satz-Rewind:** `findJumpIndex(units, index, -1, 'sentence')` springt zum Satzanfang bzw. zum vorigen Satz, wenn man schon am Anfang steht. Fehlt nur die Tap-Geste.
- **Chunk-Modus:** fehlt. Passt am besten in `buildPresentation`: zwei bis drei Wörter innerhalb eines Satzes zu einer Einheit zusammenfassen, Dauer aus den Einzelwörtern summieren.

### Anpassungen

- **WPM-Grenzen:** Fovea erlaubt 100–600 WPM (`settings.ts`, `calibration.ts`, `recommendTempo`). Lector braucht 700 WPM für den Einstieg der Präsentation, ca. 300 WPM als Free-Grenze und „unbegrenzt“ für Pro. Zusätzlich setzt `absoluteMinDelayMs: 80` eine harte Untergrenze, die ab 750 WPM jedes Wort gleich lang zeigt.
- **Einstellungen:** `ReadingSettings` enthält Fragenhäufigkeit, Visual-Anzeige und Pausenstufen pro Ebene. Für Lector auf WPM, adaptiv/fest, Schriftgröße, Schriftart und Hintergrund reduzieren (Karte „Optische Anpassung“).
- **Branding:** Der Übungstext der Kalibrierung nennt „FOVEA“.

## Kalibrierung und Quiz

- `features/calibration/domain/calibration.ts`: sechs Läufe mit verschiedenen Texten bei gestaffeltem Tempo (Start 240 WPM, dann +80, −60, +40, −20, +100). **Übernehmen.**
- `features/profile/domain/profile.ts`: `deriveProfile` setzt die Ziel-WPM auf den langsameren der zwei schnellsten Läufe mit mindestens 80 % richtigen Antworten; nötig sind mindestens sechs Antworten aus drei Läufen. `recommendTempo` passt das Tempo nach Quizfragen im Lesefluss vorsichtig an (−10 bzw. +5 WPM). **Übernehmen.**
- `features/calibration/domain/texts.ts`: sechs selbst verfasste deutsche Sachtexte mit je zwei bis drei Multiple-Choice-Fragen, nach Tiefe gestuft (Wiedergabe, Verständnis, Zusammenhang). **Übernehmen** als Startinhalt und für die Live-Demo mit Quiz per QR-Code.
- `features/questions/domain/question.ts`: regelbasierte Fragen aus dem eigenen Dokument, sehr vorsichtig und eng an die Textfluss-Evidenz der Analyzer gekoppelt (allein 4.276 Zeilen Sicherheitstests). **Nicht übernehmen**; die Spezifikation sieht KI-generierte Fragen als Ausbaustufe vor.
- `application/session-summary.ts`: effektive WPM einer Sitzung aus Anzeige- und Pausenzeit. Grundlage für „gesparte Lesestunden“ und die Speed-up-Kurve.

## Import-Pipeline

Ablauf in Fovea: Dateikopf prüfen → Original speichern → Warteschlange (höchstens zwei Analysen) → Analyzer je Format, nachgeladen → `DocumentModel` aus Knoten (`text`, `heading`, `image`, `table`, `formula`) mit Seite, Abschnitt und Strukturgrenze → `buildPresentation`.

| Format        | Fovea                                                                                                                                                               | Empfehlung für Lector                                                                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| PDF           | `pdf-analyzer.ts` mit pdf.js: Leserichtung über Spalten (`reading-order.ts`), Tagged-PDF-Struktur, Überschriften über Zeilenhöhe, Kopf- und Fußzeilen, OCR-Fallback | pdf.js-Einrichtung, `reading-order.ts` und Absatzbildung übernehmen; Textfluss- und Atom-Evidenz weglassen, sie dient nur den Fragen |
| DOCX          | `office-analyzer.ts`: eigener Parser mit JSZip und XML, inklusive Formeln, Textfeldern und Fußnoten; **kein mammoth**                                               | mammoth wie in der Spezifikation (weniger Code); Fovea-Parser nur, falls Formeln wichtig werden                                      |
| TXT           | fehlt                                                                                                                                                               | neu, trivial                                                                                                                         |
| URL           | fehlt                                                                                                                                                               | neu, mit Readability                                                                                                                 |
| PPTX, Bilder  | JSZip bzw. Tesseract.js, HEIC über libheif                                                                                                                          | nicht im MVP (OCR „später“)                                                                                                          |
| Prüfung       | `source-validation.ts`: Magic Bytes, 80 MB, 1.000 Seiten, Schutz vor Zip-Bomben                                                                                     | übernehmen                                                                                                                           |
| Warteschlange | Pausieren, Fortsetzen ab Checkpoint, Abbrechen                                                                                                                      | weglassen                                                                                                                            |

### Wo extrahiert wird

Fovea extrahiert im Browser. Das sollte Lector beibehalten: pdf.js (mit eigenem Worker) und mammoth laufen im Browser, danach gehen Original und extrahiertes Modell an den Server. Workers haben 128 MB Arbeitsspeicher und knappe CPU-Zeit pro Anfrage; große PDFs dort zu parsen, wäre riskant. Außerdem braucht die Free-Stufe mit lokaler Bibliothek so keinen Server.

Nur der URL-Import muss serverseitig laufen, weil der Browser fremde Seiten wegen CORS nicht laden darf. Readability braucht ein DOM; im Worker kommt dafür z. B. linkedom in Frage (noch zu prüfen).

## Datenmodell für D1 und R2

Fovea speichert den gesamten Zustand als ein JSON-Objekt in IndexedDB. Für D1 bietet sich an:

| Tabelle        | Inhalt (aus Fovea abgeleitet)                                                                                                                         |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users`        | neu, fehlt in Fovea (Karte „Accounts und Login“)                                                                                                      |
| `documents`    | Titel, Dateiname, Format, Sprache, SHA-256, Größe, importiert/zuletzt geöffnet, Analysestatus, R2-Schlüssel für Original und Modell, Analyzer-Version |
| `progress`     | aktuelle und sichere Position (Index der Präsentationseinheit), höchste erreichte Position, abgeschlossen am, Einstellungen der Sitzung               |
| `measurements` | Quelle (Kalibrierung oder Sitzung), WPM, richtig/beantwortet/übersprungen, Fragetiefe, Zeitpunkt                                                      |
| `profiles`     | Ziel-WPM, Verständnisquote, Sicherheit, Version                                                                                                       |

- **R2:** Originaldatei und das extrahierte `DocumentModel` als JSON. Das Modell großer Dokumente kann mehrere Megabyte erreichen und gehört nicht in eine D1-Zeile.
- **Position:** Der Index hängt von Extraktor und Tokenisierung ab. Darum die Analyzer-Version mitspeichern; ändert sie sich, Position über `remap-position.ts` neu zuordnen oder das alte Modell behalten.
- **Nicht übernehmen:** die Listen aller präsentierten Einheiten-IDs pro Sitzung (`presentedUnitIds`, `presentedWordIds`); sie wachsen mit jedem Wort. Zähler reichen.

## Nicht übernehmen

Revisionsverwaltung geänderter Quelldateien, Rückgängig beim Löschen, Speicher-Wiederherstellung, Migration aus FocusFlow, Capacitor und Android, Originalansicht (PDF-, Word- und Folien-Rendering), englische Oberfläche.

## Vorgeschlagene Reihenfolge

1. Reader-Kern (`tokens`, `orp`, `smart-timing`, `presentation`, `reader-machine`, `sentences`) mit Tests nach `src/lib/reader/` übernehmen, Einstellungen verkleinern, WPM-Grenzen lösen.
2. Ankerwort als Svelte-Komponente und Abspielschleife; Eingabe zunächst als Textfeld, damit ist TXT abgedeckt.
3. D1-Schema und R2-Bucket nach dem Entwurf oben.
4. PDF- und DOCX-Import im Browser.
5. Kalibrierung mit den Fovea-Texten.
