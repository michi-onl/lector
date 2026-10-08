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

| Customer Gains                                            | Pain Relievers                                                             |
| --------------------------------------------------------- | -------------------------------------------------------------------------- |
| Inhalte schneller aufnehmen und verstehen → Zeitersparnis | Kein Ablenken durch Layout, Werbung, Tabs → direkter Fokus aufs Lesen      |
| Nachweisbares Verständnis statt gefühltem Überfliegen     | Kalibrierung verhindert, dass zu schnell und ohne Verständnis gelesen wird |
| Volles Ausnutzen der kognitiven Grenzen                   | Eine Bibliothek für PDFs, Dokumente und Webartikel                         |

### Zielgruppen

Alle, die viel lesen:

- Studierende, Schülerinnen und Schüler, Lernende
- Forschende
- Juristinnen und Juristen
- Journalistinnen und Journalisten

## Features

### Kern (MVP)

- **Datei-Upload** – PDF, DOCX, TXT; später OCR für Bilder/Scans
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

## Wissenschaftlicher Hintergrund

Die Forschung zu RSVP ist kritisch: Ohne Regressionen (Zurückspringen der Augen) sinkt das Verständnis bei hohen Geschwindigkeiten; Speed-Reading ist im Wesentlichen ein Tausch von Verständnis gegen Tempo (Rayner et al. 2016, _So Much to Read, So Little Time_, Psychological Science in the Public Interest 17(1)).

Lector greift das offen auf und macht es zum Verkaufsargument:

| Kritik                                  | Antwort von Lector                              |
| --------------------------------------- | ----------------------------------------------- |
| Verständnis sinkt bei hohem Tempo       | Quiz-Kalibrierung findet die persönliche Grenze |
| Keine Regressionen möglich              | Satz-Rewind per Tap                             |
| Starres Tempo passt nicht zu jedem Wort | Adaptive Geschwindigkeit pro Wort               |

## Geschäftsmodell

Freemium mit Abo (Preise als Entwurf, durch Marketing/Finanzen zu validieren):

| Tarif            | Umfang                                                           | Preis (Entwurf)                 |
| ---------------- | ---------------------------------------------------------------- | ------------------------------- |
| **Free**         | URL und Text, bis ca. 300 WPM, lokale Bibliothek                 | 0 €                             |
| **Pro**          | PDF/DOCX/OCR, Sync, unbegrenzte Geschwindigkeit, Quiz-Auswertung | 4–6 €/Monat, Studierendenrabatt |
| **Business/Edu** | Lizenzen für Hochschulen und Kanzleien                           | auf Anfrage                     |

**Wertargument für die Preisgestaltung:** „Gesparte Lesestunden pro Monat" als zentrale Kennzahl.

## Technik

**Entscheidung:** Neuentwicklung in **SvelteKit auf Cloudflare**.

| Baustein                       | Geplant                                                                     |
| ------------------------------ | --------------------------------------------------------------------------- |
| Frontend & SSR                 | SvelteKit (`@sveltejs/adapter-cloudflare`)                                  |
| Komponenten shadcn-svelte init | Preset `b4W4IuaMZE`, Farben angepasst: Burgunder auf Creme                  |
| Backend                        | Cloudflare Workers                                                          |
| Datenbank                      | Cloudflare D1 (Accounts, Bibliothek, Fortschritt)                           |
| Dateispeicher                  | Cloudflare R2 (hochgeladene Dokumente)                                      |
| Textextraktion                 | pdf.js (PDF), mammoth (DOCX), Readability (URL), Tesseract.js (OCR, später) |

Das bestehende Projekt **Fovea** (React/Vite/Capacitor) wird nicht weitergeführt, dient aber als Referenz für Import-Pipeline und RSVP-Logik.

## Präsentation

- **Einstieg mit der Lesetechnologie selbst:** Die erste Folie stellt das Team per RSVP vor – erst 300, dann 500, dann 700 WPM.
- **Live-Demo mit Publikum:** Lesen auf zwei Geschwindigkeiten, Quiz per QR-Code, Ergebnisse direkt anzeigen.
- **Speed-up-Kurve:** von normaler Lesegeschwindigkeit bis zum Verständnismaximum – mit den Daten aus der Live-Demo.
- **Wissenschaft offen ansprechen:** Kritik zeigen und Lectors Antworten darauf (siehe oben).
- **Logo als Erklärung:** Das hervorgehobene „o" zeigt das Prinzip des Fixationspunkts.
