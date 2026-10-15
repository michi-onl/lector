import { parseBlocks, parseFormat } from '#lib/library/library.js';
import { getDb } from '#lib/server/db/index.js';
import { requirePro } from '#lib/server/guard.js';
import { createDocument, listDocuments } from '#lib/server/library.js';
import { MAX_FILE_BYTES } from '#lib/import/files.js';
import { error, json } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	const user = requirePro(locals);
	return json(await listDocuments(getDb(env.DB), user.id));
};

const optionalText = (value: unknown) => (typeof value === 'string' && value ? value : undefined);

/**
 * Multipart: `document` holds the extracted text and its metadata as JSON, `source` the
 * optional original file.
 */
export const POST: RequestHandler = async ({ locals, request }) => {
	const user = requirePro(locals);
	const form = await request.formData().catch(() => error(400, 'Erwartet wird ein Formular.'));
	let meta: Record<string, unknown>;
	try {
		meta = JSON.parse(String(form.get('document')));
	} catch {
		error(400, 'Die Angaben zum Text fehlen.');
	}
	const blocks = parseBlocks(meta?.blocks);
	const format = parseFormat(meta?.format);
	if (!blocks || !format) error(400, 'Der Text ist leer, zu lang oder unvollständig.');
	const source = form.get('source');
	if (source !== null && !(source instanceof File)) error(400, 'Das Original ist keine Datei.');
	if (source && source.size > MAX_FILE_BYTES) error(413, 'Die Datei ist zu groß.');
	const result = await createDocument(getDb(env.DB), env.DOCUMENTS, user.id, {
		blocks,
		format,
		title: optionalText(meta.title),
		fileName: optionalText(meta.fileName),
		sourceUrl: optionalText(meta.sourceUrl),
		source: source ?? undefined
	});
	return json(result, { status: result.created ? 201 : 200 });
};
