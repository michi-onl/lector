import { getDb } from '#lib/server/db/index.js';
import { exportAccount, exportStream } from '#lib/server/export.js';
import { requireUser } from '#lib/server/guard.js';
import { env } from 'cloudflare:workers';
import type { RequestHandler } from './$types';

/** Downloads everything in the account; for every tariff, since Free has an account too. */
export const GET: RequestHandler = ({ locals }) => {
	const user = requireUser(locals);
	return new Response(exportStream(exportAccount(getDb(env.DB), env.DOCUMENTS, user.id)), {
		headers: {
			'content-type': 'application/json; charset=utf-8',
			'content-disposition': 'attachment; filename="lector-export.json"',
			'cache-control': 'no-store'
		}
	});
};
