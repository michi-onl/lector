import { getDb } from '#lib/server/db/index.js';
import { requirePro } from '#lib/server/guard.js';
import { deleteDocument, openDocument } from '#lib/server/library.js';
import { error, json } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import type { RequestHandler } from './$types';

const NOT_FOUND = 'Dieser Text ist nicht in deiner Bibliothek.';

export const GET: RequestHandler = async ({ locals, params }) => {
	const user = requirePro(locals);
	const opened = await openDocument(getDb(env.DB), env.DOCUMENTS, user.id, params.id);
	if (!opened) error(404, NOT_FOUND);
	return json(opened);
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	const user = requirePro(locals);
	if (!(await deleteDocument(getDb(env.DB), env.DOCUMENTS, user.id, params.id)))
		error(404, NOT_FOUND);
	return new Response(null, { status: 204 });
};
