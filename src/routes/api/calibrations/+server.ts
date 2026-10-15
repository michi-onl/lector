import { parseRuns, saveCalibration } from '#lib/server/calibration.js';
import { getDb } from '#lib/server/db/index.js';
import { requirePro } from '#lib/server/guard.js';
import { error, json } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import type { RequestHandler } from './$types';

/** Stores a finished calibration; answers the new profile, or null if no limit was found. */
export const POST: RequestHandler = async ({ locals, request }) => {
	const user = requirePro(locals);
	const body = (await request.json().catch(() => null)) as {
		runs?: unknown;
		startedAt?: unknown;
	} | null;
	const runs = parseRuns(body?.runs);
	const startedAt = new Date(String(body?.startedAt));
	if (!runs || Number.isNaN(startedAt.getTime())) error(400, 'Die Kalibrierung ist unvollständig.');
	return json(await saveCalibration(getDb(env.DB), user.id, runs, startedAt), { status: 201 });
};
