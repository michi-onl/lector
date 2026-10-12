import { building } from '$app/env';
import type { Handle } from '@sveltejs/kit/hooks';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { createAuth } from '#lib/server/auth.js';

export const handle: Handle = async ({ event, resolve }) => {
	if (building) return resolve(event);
	const auth = createAuth(event.url.origin);
	const current = await auth.api.getSession({ headers: event.request.headers });
	event.locals.user = current?.user ?? null;
	event.locals.session = current?.session ?? null;
	return svelteKitHandler({ event, resolve, auth, building });
};
