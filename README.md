# Lector

Rapid-Screen-Reader: Dokumente hochladen, Text wird extrahiert und Wort für Wort in schnellen Frames angezeigt – in genau der Geschwindigkeit, die das eigene Verständnis noch trägt. Produkt, Preise und Präsentationsplan stehen in [`SPEC.md`](SPEC.md).

## Technik

- [SvelteKit](https://svelte.dev/docs/kit) 3 mit Svelte 5 und TypeScript
- [Cloudflare Workers](https://developers.cloudflare.com/workers/) über `@sveltejs/adapter-cloudflare`, konfiguriert in `wrangler.jsonc`
- [Tailwind CSS](https://tailwindcss.com) 4 und [shadcn-svelte](https://shadcn-svelte.com) (Theme in `components.json`)
- Vitest, ESLint, Prettier

## Loslegen

Voraussetzung ist Node.js 22.17 oder neuer.

```sh
npm install
npm run dev
```

Die App läuft dann unter <http://localhost:5173>.

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
  routes/        Seiten und Endpunkte (SvelteKit-Routing)
  lib/           Gemeinsamer Code, importiert über #lib/…
    components/  UI-Komponenten
static/          Statische Dateien
```

Hinweise für KI-Agenten und Stolperstellen im Setup stehen in [`AGENTS.md`](AGENTS.md).
