declare global {
	namespace App {
		// adapter-cloudflare 8 sets no platform: read bindings from `cloudflare:workers`.

		interface Locals {
			user: import('#lib/server/auth.js').AuthSession['user'] | null;
			session: import('#lib/server/auth.js').AuthSession['session'] | null;
		}
		interface PageData {
			/** From the root layout, on every page. */
			user: import('#lib/plan.js').SessionUser | null;
		}
	}
}

export {};
