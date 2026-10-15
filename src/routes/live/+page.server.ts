import { DEFAULT_LIVE_SPEEDS, parseSpeeds } from '#lib/live/live.js';
import { getDb } from '#lib/server/db/index.js';
import { createLiveSession } from '#lib/server/live.js';
import { fail, redirect } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import type { Actions } from './$types';

export const actions: Actions = {
	/** Starts a live demo; the presenter needs an account, the audience does not. */
	default: async ({ locals, request }) => {
		if (!locals.user) redirect(303, '/anmelden?weiter=/live');
		const value = String((await request.formData()).get('speeds') ?? '');
		const speeds = parseSpeeds(value || DEFAULT_LIVE_SPEEDS.join(', '));
		if (!speeds)
			return fail(400, {
				speeds: value,
				message: 'Ein bis vier Geschwindigkeiten zwischen 100 und 1000 WPM, z. B. „300, 600“.'
			});
		const code = await createLiveSession(getDb(env.DB), locals.user.id, speeds);
		redirect(303, `/live/${code}/leitung`);
	}
};
