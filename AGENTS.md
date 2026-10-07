# Lector

Student project (DHBW, due 25.11.2026): an RSVP speed reader whose speed is calibrated by comprehension quizzes. Grading is 50 % documentation, 50 % presentation, so docs and pitch material count as much as code.

## Sources of truth

- `spec.md` is the product spec: features, pricing, tech stack, presentation plan. Read it before planning work. It doesn't track progress.
- The Planka board tracks who does what and how far it is. When the spec and the board disagree, point out the difference to the user rather than silently picking one.
- `Fovea/` is the old React/Vite/Capacitor app, gitignored and local only. Use it as reference for the import pipeline and RSVP logic; build new code in SvelteKit on Cloudflare as the spec says.

## Language

Spec, board cards and all project content are German. Use German typography („…", –) and paired gender forms („Juristinnen und Juristen") as `spec.md` does. Chat with the user in whatever language they write.

## Planka (MCP server `planka`)

- Project `Lector` (id `1880543747888907273`), board `Lector` (id `1880547465795470352`).
- Lists in order: **Backlog** → **On-Going** → **Finish**. Move a card to Finish when its tasks are checked off.
- Labels: Technik, Feature, Design, Projektdokumentation, Präsentation.
- Team: Michi (Planka user "Michael") and Timo handle tech and content; Robin and Magnus handle marketing and finance.
- `boards get` returns ~70 KB and overflows the tool result; the harness saves it to a file. Query that file with `jq` (`.included.lists`, `.cards`, `.taskLists`, `.tasks`, `.cardLabels`, `.cardMemberships`).
- Credentials load from `.env` (gitignored). Writes on the board are visible to the whole team; confirm with the user before creating, moving or deleting cards.
