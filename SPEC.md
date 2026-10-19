# Lector – Projektspezifikation

> Rapid-Screen-Reader: Dokumente hochladen, Text wird extrahiert und Wort für Wort in schnellen Frames angezeigt – in genau der Geschwindigkeit, die das eigene Verständnis noch trägt.

## Rahmen

|               |                                                                            |
| ------------- | -------------------------------------------------------------------------- |
| **Abgabe**    | Übelhör                                                                    |
| **Bewertung** | 50 % Dokumentation, 50 % Präsentation                                      |
| **Team**      | Robin, Timo, Magnus, Michi                                                 |
| **Logo**      | Das „o" in Lector als Fokuspunkt (Optimal Recognition Point, burgunderrot) |

### Interne Einteilung (C-Level)

| Bereich                        | Verantwortlich |
| ------------------------------ | -------------- |
| Technische Umsetzung & Content | Michi, Timo    |
| Marketing & Finanzen           | Robin, Magnus  |

## Produkt

### Produktvision

Lesen soll nie der Engpass beim Lernen sein.

### Wertversprechen

Lector bringt die Leseliste in den Kopf – so schnell, wie das eigene Gehirn es verarbeiten kann, und das Quiz belegt, dass der Inhalt verstanden wurde.

**Differenzierung:** RSVP-Reader gibt es bereits (Spritz, Spreeder, ReadMe!). Lector verkauft keine _maximale_, sondern eine _gemessene_ Geschwindigkeit: Das Verständnis wird geprüft, die Geschwindigkeit daran kalibriert.

### Value-Proposition-Canvas

#### Kundenprofil

**Customer Jobs**

- Große Textmengen in begrenzter Zeit lesen (Skripte, Paper, Akten, Fachartikel)
- Inhalte verstehen und behalten
- Sich auf Prüfungen, Sitzungen und Abgaben vorbereiten
- Bei der Recherche viele Quellen sichten
- Fachlich und aktuell auf dem Laufenden bleiben (News, Studien, Urteile)
- Texte aus verschiedenen Formaten lesen: PDF, Word, E-Book, Webseiten
- Lesestoff sammeln, ordnen und später weiterlesen

**Pains**

- Zeitdruck: Das Lesepensum ist größer als die verfügbare Zeit
- Geringe Lesegeschwindigkeit (im Schnitt ca. 200–300 Wörter pro Minute)
- Ablenkung durch Benachrichtigungen, Werbung und unruhiges Layout
- Unübersichtliche Webseiten mit Pop-ups, Cookie-Bannern und Anzeigen
- Ermüdung durch ständige Augenbewegungen und Zurückspringen im Text
- Konzentrationsverlust bei langen, trockenen Texten
- Unklar, wie schnell man lesen kann, ohne das Verständnis zu verlieren

**Gains**

- Spürbare Zeitersparnis: mehr Inhalte in kürzerer Zeit
- Gutes Textverständnis auch bei hohem Tempo
- Voller Fokus auf den Inhalt, ungestörtes Lesen im Flow
- Sichtbarer Fortschritt: die eigene Lesegeschwindigkeit messbar steigern
- Angenehme, individuell passende Darstellung
- Alle Lesestoffe an einem Ort, jederzeit wieder abrufbar
- Sofort loslegen, ohne Einarbeitung oder Installation
- Mehr Freiraum für andere Aufgaben, Vorsprung in Studium und Beruf

#### Wertangebot

**Products & Services**

- Web-App Lector mit RSVP-Reader
- Datei-Upload für PDF, Word und E-Books
- URL-Scraping: Artikeltext direkt aus Webseiten übernehmen
- Selbst einstellbare Lesegeschwindigkeit (Wörter pro Minute)
- Kalibrierung der Geschwindigkeit durch ein interaktives Quiz
- Optische Anpassung: Schriftart und Hintergrundfarbe
- Persönliche Bibliothek mit gespeicherten Inhalten
- Nutzerkonto mit Abo-Modell

**Pain Relievers**

- Wörter erscheinen einzeln an fester Position: keine Augenbewegungen, kein Zurückspringen
- Ablenkungsfreie Leseansicht ohne Werbung, Menüs oder Layout
- Scraping extrahiert nur den reinen Text, Pop-ups und Banner entfallen
- Ein Upload für alle Formate statt Wechsel zwischen Programmen
- Quiz-Kalibrierung beseitigt die Unsicherheit über das passende Tempo
- Längere Anzeige bei langen Wörtern und kurze Pausen nach Satzzeichen sichern das Verständnis
- Pausieren und Tempo jederzeit ändern: Die Nutzerinnen und Nutzer behalten die Kontrolle
- Läuft direkt im Browser, kein Kurs und keine Installation nötig

**Gain Creators**

- Lesetempo deutlich über dem Durchschnitt: mehr Inhalt in gleicher Zeit
- Tempo schrittweise steigern bis zum persönlichen Maximum bei vollem Verständnis
- Quiz macht Verständnis und Fortschritt messbar
- Volles Ausnutzen der kognitiven Kapazität fördert Fokus und Flow
- Individuelle Schrift und Farben für angenehmes, ermüdungsarmes Lesen
- Bibliothek bündelt alle Inhalte, Lesestand bleibt gespeichert
- Text hochladen oder Link einfügen und sofort loslegen

### Zielgruppen

Alle, die viel lesen:

- Studierende, Schülerinnen und Schüler, Lernende
- Forschende
- Juristinnen und Juristen
- Journalistinnen und Journalisten

## Features

### Kern (MVP)

- **Datei-Upload** – PDF, DOCX, EPUB, TXT; später OCR für Bilder/Scans (PNG)
- **URL-Scraping** – Webartikel per Link importieren
- **Geschwindigkeit selbst steuern** – WPM frei einstellbar
- **Kalibrierung per interaktivem Quiz** – ermittelt die persönliche Verständnisgrenze statt eines willkürlichen Maximums
- **Optische Anpassung** – Schriftart, Hintergrundfarbe
- **Bibliothek** – gespeicherte Inhalte mit Lesefortschritt

### Leseengine

- **ORP-Hervorhebung** – fester Fixationspunkt pro Wort (siehe Logo)
- **Adaptive Geschwindigkeit** – langsamer bei langen Wörtern, Zahlen, Satzzeichen und Satzenden; schneller bei Funktionswörtern
- **Satz-Rewind** – ein Tap springt zum Satzanfang (ersetzt das Zurückspringen der Augen beim normalen Lesen)
- **Chunk-Modus** – optional 2–3 Wörter pro Frame

### Ausbaustufen (nach MVP)

- KI-generierte Quizfragen und Zusammenfassungen aus dem eigenen Text
- Browser-Extension „In Lector lesen"
- Statistiken und Streaks: gelesene Seiten, gesparte Zeit
- Geräteübergreifende Synchronisierung
- Teamauswertung für Business/Edu

## Wissenschaftlicher Hintergrund

Die Forschung zu RSVP ist kritisch: Ohne Regressionen (Zurückspringen der Augen) sinkt das Verständnis bei hohen Geschwindigkeiten; Speed-Reading ist im Wesentlichen ein Tausch von Verständnis gegen Tempo (Rayner et al. 2016, _So Much to Read, So Little Time_, Psychological Science in the Public Interest 17(1)).

Lector greift das offen auf und macht es zum Verkaufsargument:

| Kritik                                  | Antwort von Lector                              |
| --------------------------------------- | ----------------------------------------------- |
| Verständnis sinkt bei hohem Tempo       | Quiz-Kalibrierung findet die persönliche Grenze |
| Keine Regressionen möglich              | Satz-Rewind per Tap                             |
| Starres Tempo passt nicht zu jedem Wort | Adaptive Geschwindigkeit pro Wort               |

## Geschäftsmodell

Freemium mit Abo, Tarife nach dem Preismodell von Marketing und Finanzen:

| Tarif            | Zielgruppe                                        | Umfang                                                                                                                                                                                        | Preis                                                                |
| ---------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **Free**         | Gelegenheitsleserinnen und -leser                 | Text, TXT, PDF und URL; bis 300 WPM; Bibliothek im Browser mit bis zu 3 Texten; Quiz zeigt die Verbesserung der Geschwindigkeit; Standardschrift und -farbe                                   | 0 €                                                                  |
| **Pro**          | Studierende, Forschende, Juristinnen und Juristen | zusätzlich DOCX, EPUB und später OCR (PNG); unbegrenzte Geschwindigkeit; unbegrenzte Bibliothek im Konto (Sync); Quiz-Auswertung mit Verlauf und Fortschrittskurve; alle Schriften und Farben | 3,99 €/Monat oder 29,99 €/Jahr, 7 Tage Testphase, Studierendenrabatt |
| **Business/Edu** | Hochschulen, Kanzleien, Bildungseinrichtungen     | Lizenzen mit allem aus Pro; später Teamauswertung                                                                                                                                             | pro Person, mit Mengenrabatt                                         |

**Wertargument für die Preisgestaltung:** „Gesparte Lesestunden pro Monat" als zentrale Kennzahl.

## Technik

**Entscheidung:** Neuentwicklung in **SvelteKit auf Cloudflare**.

| Baustein                       | Geplant                                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------------------------ |
| Frontend & SSR                 | SvelteKit (`@sveltejs/adapter-cloudflare`)                                                             |
| Komponenten shadcn-svelte init | Preset `b4W4IuaMZE`, Farben angepasst: Burgunder auf Creme                                             |
| Backend                        | Cloudflare Workers                                                                                     |
| Datenbank                      | Cloudflare D1 (Accounts, Bibliothek, Fortschritt)                                                      |
| Dateispeicher                  | Cloudflare R2 (hochgeladene Dokumente)                                                                 |
| Textextraktion                 | pdf.js (PDF), mammoth (DOCX), eigener EPUB-Leser (EPUB), Readability (URL), Tesseract.js (OCR, später) |

Das bestehende Projekt **Fovea** (React/Vite/Capacitor) wird nicht weitergeführt, dient aber als Referenz für Import-Pipeline und RSVP-Logik.

## Präsentation

- **Einstieg mit der Lesetechnologie selbst:** Die erste Folie stellt das Team per RSVP vor – erst 300, dann 500, dann 700 WPM.
- **Live-Demo mit Publikum:** Lesen auf zwei Geschwindigkeiten, Quiz per QR-Code, Ergebnisse direkt anzeigen.
- **Speed-up-Kurve:** von normaler Lesegeschwindigkeit bis zum Verständnismaximum – mit den Daten aus der Live-Demo.
- **Wissenschaft offen ansprechen:** Kritik zeigen und Lectors Antworten darauf (siehe oben).
- **Logo als Erklärung:** Das hervorgehobene „o" zeigt das Prinzip des Fixationspunkts.
