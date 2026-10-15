import { parseReadingUpdate } from '#lib/library/library.js';
import { getDb } from '#lib/server/db/index.js';
import { requirePro } from '#lib/server/guard.js';
import { recordProgress } from '#lib/server/library.js';
import { error } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import type { RequestHandler } from './$types';

/** Adds what the reader reported since its last save. */
export const POST: RequestHandler = async ({ locals, params, request }) => {
	const user = requirePro(locals);
	const update = parseReadingUpdate(await request.json().catch(() => null));
	if (!update) error(400, 'Der Lesefortschritt ist unvollständig.');
	if (!(await recordProgress(getDb(env.DB), user.id, params.id, update)))
		error(404, 'Dieser Text ist nicht in deiner Bibliothek.');
	return new Response(null, { status: 204 });
};
