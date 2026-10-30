# Marktabgleich: Was Lector im Vergleich fehlt

Siehe außerdem mockup pdf's.

Stand: 19. Oktober 2026. Verglichen wurde der Prototyp (siehe [`prototyp.md`](prototyp.md)) mit Spritz, SwiftRead/Spreeder, Speechify, Readwise Reader, Outread und Bionic Reading. Die Leseengine hält mit; die Lücken liegen drumherum. Die Reihenfolge entspricht der Dringlichkeit.

## 1. Das Quiz misst nur die Kalibrierungstexte

Das Verkaufsargument aus [`SPEC.md`](../SPEC.md) ist die _gemessene_ statt der _maximalen_ Geschwindigkeit. Gemessen wird aber nur an sechs fest eingebauten Texten. Wer ein Urteil mit „kalibrierten“ 450 WPM liest, erfährt nicht, ob er oder sie dieses Urteil verstanden hat. Speechify und Readwise erzeugen per KI bereits Zusammenfassungen und Fragen zu den eigenen Dokumenten; damit ist das wichtigste Unterscheidungsmerkmal von Lector schwächer als die Nebenfunktionen der Konkurrenz.

**Vorschlag:** KI-generierte Fragen zum eigenen Text, etwa am Kapitelende. Damit misst die Kalibrierung laufend weiter, Pro bekommt einen echten Kaufgrund, und die Kritik von Rayner et al. (2016) ist besser beantwortet: Das Verständnis wird am tatsächlichen Lesestoff geprüft, nicht aus einem Test abgeleitet.

## 2. Die gesparten Lesestunden erscheinen nur auf der Preisseite

Die Spezifikation macht „gesparte Lesestunden pro Monat“ zur zentralen Kennzahl der Preisgestaltung, im Produkt taucht sie aber nur im Rechner auf `/preise` auf. Die Daten liegen schon vor: `progress` speichert Lesezeit und gelesene Wörter.

**Vorschlag:** eine Statistikansicht mit gesparter Zeit, gelesenen Wörtern, Streak und Tempoverlauf. Das ist wenig Aufwand, bindet Nutzerinnen und Nutzer wie bei Readwise und belegt den Wert von Pro im Moment des Lesens statt nur auf der Preisseite.

## 3. Lector passt nicht in mobile und Browser-Gewohnheiten

- **Kein Web-App-Manifest, kein Service Worker, kein Apple-Touch-Icon.** Lector lässt sich nicht auf dem Handy installieren und nicht offline nutzen, etwa im Zug. Für eine Lese-App, die „keine Installation nötig“ verspricht, ist Installierbarkeit Grundausstattung.
- **Kein Weg, Text an Lector zu schicken.** SwiftRead wird fast nur über die Browser-Extension „Diese Seite lesen“ verbreitet. Ein Web Share Target im Manifest (Android: Teilen → Lector) ist deutlich billiger als eine Extension und deckt den Großteil ab. Die Extension kann später folgen, wie in der Spezifikation vorgesehen.

## 4. Grundfunktionen von Konto und Datenschutz

- **Konto löschen und Daten exportieren** ist nach DSGVO Art. 17 und 20 Pflicht, und die neue Datenschutzseite macht die Lücke sichtbarer. Das Löschen ist fast fertig: D1 löscht per Kaskade, es fehlt nur das Aufräumen des R2-Präfixes `users/<id>/`.
- **Passwort zurücksetzen und E-Mail bestätigen** braucht einen Mailversand (z. B. Resend oder Cloudflare Email). Echte Nutzerinnen und Nutzer stoßen innerhalb einer Woche darauf.
- **Anmeldung mit Google oder Apple** erwarten Studierende; Better Auth unterstützt das mit wenigen Zeilen Konfiguration.

## 5. Auffindbarkeit und Conversion

- **Keine Open-Graph- und Twitter-Tags, keine Sitemap.** Geteilte Links zeigen keine Vorschau; das bremst Mundpropaganda unter Studierenden.
- **Die Startseite** hat keine „So funktioniert’s“-Schritte, keine Belege (Stimmen von Nutzerinnen und Nutzern oder die Ergebnisse der Live-Demo), keine FAQ und keinen Aufruf zur Registrierung. Beide Buttons führen ohne Konto in die App.
- **Die Preisseite** hat keinen Umschalter zwischen Monat und Jahr, obwohl 29,99 € im Jahr 37 % sparen. Der Studierendenrabatt ist nicht beziffert. Business/Edu verweist mit „Sprich uns nach der Präsentation an“ statt auf ein Kontaktformular; das hält dem Markt am wenigsten stand.
- **Zahlung und Testphase.** Für einen echten Start braucht es Stripe Checkout mit der 7-tägigen Testphase. Für die Präsentation reicht vermutlich ein simulierter Bezahlablauf.

## 6. Kleinere Funktionen der Konkurrenz

- **OCR und mehrspaltige PDFs** stehen schon unter „Bekannte Grenzen“ in [`prototyp.md`](prototyp.md). Bei Forschenden sowie Juristinnen und Juristen scheitert der Import daran am häufigsten.
- **Nur Deutsch.** Für die Präsentation genügt das; Englisch vervielfacht den adressierbaren Markt.
- **Alternative Lesemodi** wie Bionic-Hervorhebung oder klassisches Scrollen. Viele empfinden reines RSVP bei langen Sitzungen als anstrengend.

## Empfehlung für das Projekt

Bewertet werden Dokumentation und Präsentation je zur Hälfte. Deshalb umsetzen:

- **Statistik mit gesparter Zeit (Punkt 2):** wenig Aufwand, zeigt die Preislogik direkt im Produkt.
- **KI-Fragen zum eigenen Text (Punkt 1),** auch in schmaler Form: Die Differenzierung hält dann auch kritischen Nachfragen stand.
- **Konto löschen und Open-Graph-Tags:** billig und schließen offensichtliche Lücken.

Zahlung, PWA, Browser-Extension und OCR besser als Roadmap-Folie zeigen, statt sie zu bauen.
