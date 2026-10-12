import { getRequestEvent } from '$app/server';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { env } from 'cloudflare:workers';
import { getDb, schema } from './db/index.js';

/** The origin differs between localhost, workers.dev and preview URLs, so it comes per request. */
export function createAuth(baseURL: string) {
	return betterAuth({
		baseURL,
		secret: env.BETTER_AUTH_SECRET,
		database: drizzleAdapter(getDb(env.DB), { provider: 'sqlite', schema }),
		emailAndPassword: { enabled: true },
		// Must stay the last plugin: it copies Better Auth's cookies into SvelteKit's.
		plugins: [sveltekitCookies(getRequestEvent)]
	});
}

export type Auth = ReturnType<typeof createAuth>;
export type AuthSession = Auth['$Infer']['Session'];
