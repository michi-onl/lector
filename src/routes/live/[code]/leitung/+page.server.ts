import { normalizeCode } from '#lib/live/live.js';
import { getDb } from '#lib/server/db/index.js';
import { findLiveSession } from '#lib/server/live.js';
import { error, redirect } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import { renderSVG } from 'uqr';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const code = normalizeCode(params.code);
	if (!locals.user) redirect(303, `/anmelden?weiter=/live/${code}/leitung`);
	const session = await findLiveSession(getDb(env.DB), code);
	if (!session) error(404, 'Diese Live-Demo gibt es nicht.');
	if (session.hostId !== locals.user.id) error(403, 'Diese Live-Demo leitet jemand anderes.');
	const joinUrl = `${url.origin}/live/${code}`;
	return { code, joinUrl, qr: renderSVG(joinUrl, { border: 1 }) };
};
