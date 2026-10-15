import { getDb } from '#lib/server/db/index.js';
import { requirePro } from '#lib/server/guard.js';
import { readSource } from '#lib/server/library.js';
import { error } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import type { RequestHandler } from './$types';

/** Downloads the original file. */
export const GET: RequestHandler = async ({ locals, params }) => {
	const user = requirePro(locals);
	const found = await readSource(getDb(env.DB), env.DOCUMENTS, user.id, params.id);
	if (!found) error(404, 'Zu diesem Text gibt es keine Originaldatei.');
	const name = found.row.fileName ?? `${found.row.title}.${found.row.format}`;
	return new Response(found.object.body, {
		headers: {
			'content-type': found.object.httpMetadata?.contentType ?? 'application/octet-stream',
			'content-length': String(found.object.size),
			'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(name)}`
		}
	});
};
