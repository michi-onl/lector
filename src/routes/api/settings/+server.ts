import { getDb } from '#lib/server/db/index.js';
import { requirePro } from '#lib/server/guard.js';
import { loadSettings, saveSettings } from '#lib/server/settings.js';
import { json } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	const user = requirePro(locals);
	return json(await loadSettings(getDb(env.DB), user.id));
};

export const PUT: RequestHandler = async ({ locals, request }) => {
	const user = requirePro(locals);
	return json(await saveSettings(getDb(env.DB), user.id, await request.json().catch(() => null)));
};
