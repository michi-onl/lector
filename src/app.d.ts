// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// adapter-cloudflare 8 sets no platform: read bindings from `cloudflare:workers`.

		// interface Error {}
		interface Locals {
			user: import('#lib/server/auth.js').AuthSession['user'] | null;
			session: import('#lib/server/auth.js').AuthSession['session'] | null;
		}
		// interface PageData {}
		// interface PageState {}
	}
}

export {};
