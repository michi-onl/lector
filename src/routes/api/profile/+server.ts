import { importProfile, latestProfile } from '#lib/server/calibration.js';
import { getDb } from '#lib/server/db/index.js';
import { requirePro } from '#lib/server/guard.js';
import { parseProfile } from '#lib/calibration/profile.js';
import { error, json } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	const user = requirePro(locals);
	return json(await latestProfile(getDb(env.DB), user.id));
};

/** Takes over a profile from the browser; a profile the account already has stays. */
export const POST: RequestHandler = async ({ locals, request }) => {
	const user = requirePro(locals);
	const profile = parseProfile(await request.json().catch(() => null));
	if (!profile) error(400, 'Das Leseprofil ist unvollständig.');
	return json({ imported: await importProfile(getDb(env.DB), user.id, profile) });
};
