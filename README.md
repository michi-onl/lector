# Lector

Rapid-Screen-Reader: Dokumente hochladen, Text wird extrahiert und Wort für Wort in schnellen Frames angezeigt – in genau der Geschwindigkeit, die das eigene Verständnis noch trägt. Produkt, Preise und Präsentationsplan stehen in [`SPEC.md`](SPEC.md).

Der Prototyp kann Texte einfügen, PDF-, Word- und Textdateien sowie Webartikel importieren, liest sie mit ORP, adaptivem Tempo, Satz-Rewind und Chunk-Modus, kalibriert das Tempo per Quiz, trennt Free und Pro und bringt die Präsentation mit: Team-Vorstellung per RSVP und Live-Demo mit QR-Code und Speed-up-Kurve. Seiten, Aufbau, Datenmodell und Ablauf der Live-Demo beschreibt [`docs/prototyp.md`](docs/prototyp.md).

## Technik

- [SvelteKit](https://svelte.dev/docs/kit) 3 mit Svelte 5 und TypeScript
- [Cloudflare Workers](https://developers.cloudflare.com/workers/) über `@sveltejs/adapter-cloudflare`, konfiguriert in `wrangler.jsonc`
- [Tailwind CSS](https://tailwindcss.com) 4 und [shadcn-svelte](https://shadcn-svelte.com) (Theme in `components.json`)
- Vitest, ESLint, Prettier

## Loslegen

Voraussetzung ist Node.js 22.17 oder neuer.

```sh
npm install
echo "BETTER_AUTH_SECRET=$(openssl rand -base64 32)" > .dev.vars
npx wrangler d1 migrations apply lector --local
npm run dev
```

Die App läuft dann unter <http://localhost:5173>. D1 und R2 laufen lokal in `.wrangler/`.

## Befehle

| Befehl            | Zweck                                                         |
| ----------------- | ------------------------------------------------------------- |
| `npm run dev`     | Entwicklungsserver                                            |
| `npm run build`   | Produktions-Build für Cloudflare                              |
| `npm run preview` | Build lokal in der Workers-Laufzeit (`wrangler dev`) testen   |
| `npm run check`   | Typprüfung mit `svelte-check`                                 |
| `npm run lint`    | Prettier und ESLint prüfen                                    |
| `npm run format`  | Code mit Prettier formatieren                                 |
| `npm test`        | Unit-Tests mit Vitest                                         |
| `npm run gen`     | Cloudflare-Typen nach Änderungen an `wrangler.jsonc` erzeugen |

UI-Komponenten kommen mit `npx shadcn-svelte add <name>` hinzu und landen in `src/lib/components/ui`.

## Aufbau

```
src/
  routes/          Seiten und Endpunkte (SvelteKit-Routing), API unter routes/api
  lib/             Gemeinsamer Code, importiert über #lib/…
    reader/        Leseengine: Tokens, ORP, Timing, Präsentationseinheiten, Zustandsmaschine
    calibration/   Kalibrierungstexte, Bewertung, Leseprofil
    import/        PDF-, DOCX- und TXT-Import im Browser
    library/       Bibliothek im Browser (IndexedDB) und im Konto (API)
    preferences/   Einstellungen und optische Anpassung
    live/          Regeln der Live-Demo
    presentation/  Texte der Team-Vorstellung
    server/        Nur auf dem Worker: Auth, D1, R2, URL-Import
    components/    UI-Komponenten
    plan.ts        Regeln der Tarife Free und Pro
migrations/        D1-Migrationen (Drizzle)
docs/              Projektdokumentation
static/            Statische Dateien
```

## Deployment

Vor dem ersten Deployment mit Konten braucht der Worker das Secret `BETTER_AUTH_SECRET` (`npx wrangler secret put BETTER_AUTH_SECRET`), und die Migrationen müssen in der entfernten Datenbank angewendet sein (`npx wrangler d1 migrations apply lector --remote`).

Hinweise für KI-Agenten und Stolperstellen im Setup stehen in [`AGENTS.md`](AGENTS.md).
