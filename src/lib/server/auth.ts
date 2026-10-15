import { getRequestEvent } from '$app/server';
import { betterAuth } from 'better-auth';
import { APIError } from 'better-auth/api';
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
		user: {
			additionalFields: {
				// Changed only by Lector itself (account page), never by sign-up input.
				plan: { type: 'string', required: false, defaultValue: 'free', input: false }
			}
		},
		// Must stay the last plugin: it copies Better Auth's cookies into SvelteKit's.
		plugins: [sveltekitCookies(getRequestEvent)]
	});
}

export type Auth = ReturnType<typeof createAuth>;
export type AuthSession = Auth['$Infer']['Session'];

const AUTH_MESSAGES: Record<string, string> = {
	INVALID_EMAIL_OR_PASSWORD: 'E-Mail-Adresse oder Passwort stimmen nicht.',
	INVALID_EMAIL: 'Das ist keine gültige E-Mail-Adresse.',
	PASSWORD_TOO_SHORT: 'Das Passwort braucht mindestens 8 Zeichen.',
	PASSWORD_TOO_LONG: 'Das Passwort ist zu lang.',
	USER_ALREADY_EXISTS: 'Zu dieser E-Mail-Adresse gibt es schon ein Konto.',
	USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'Zu dieser E-Mail-Adresse gibt es schon ein Konto.'
};

/** A German message for a Better Auth error, or null for errors that are not the user's. */
export function authMessage(error: unknown): string | null {
	if (!(error instanceof APIError)) return null;
	const code = (error.body as { code?: string } | undefined)?.code;
	return (code && AUTH_MESSAGES[code]) || 'Das hat nicht geklappt. Bitte versuche es noch einmal.';
}

/** Where to go after signing in: a path on this site, never another origin. */
export function nextPath(value: string | null, fallback = '/bibliothek'): string {
	return value?.startsWith('/') && !value.startsWith('//') ? value : fallback;
}
