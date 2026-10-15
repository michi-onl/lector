import { decodeHtml, extractArticle } from '#lib/server/article.js';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const MAX_HTML_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 10_000;

async function readLimited(response: Response): Promise<Uint8Array> {
	const reader = response.body?.getReader();
	if (!reader) return new Uint8Array();
	const chunks: Uint8Array[] = [];
	let length = 0;
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		length += value.byteLength;
		if (length > MAX_HTML_BYTES) {
			await reader.cancel();
			error(413, 'Die Seite ist zu groß.');
		}
		chunks.push(value);
	}
	const bytes = new Uint8Array(length);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return bytes;
}

/** Fetches a web page and returns its article as paragraphs; Free may import URLs too. */
export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json().catch(() => null)) as { url?: unknown } | null;
	let target: URL;
	try {
		target = new URL(String(body?.url ?? '').trim());
	} catch {
		error(400, 'Das ist keine gültige Adresse.');
	}
	if (target.protocol !== 'http:' && target.protocol !== 'https:')
		error(400, 'Lector lädt nur Seiten mit http oder https.');

	let response: Response;
	try {
		response = await fetch(target, {
			headers: {
				accept: 'text/html,application/xhtml+xml',
				'accept-language': 'de,en;q=0.8',
				'user-agent': 'Mozilla/5.0 (compatible; Lector/0.1; Leseliste)'
			},
			redirect: 'follow',
			signal: AbortSignal.timeout(TIMEOUT_MS)
		});
	} catch {
		error(502, 'Die Seite ist nicht erreichbar.');
	}
	if (!response.ok) error(502, `Die Seite antwortet mit dem Fehler ${response.status}.`);
	const contentType = response.headers.get('content-type');
	if (contentType && !/html|xml/iu.test(contentType))
		error(415, 'Unter der Adresse liegt keine Webseite. PDFs bitte herunterladen und hochladen.');

	const html = decodeHtml(await readLimited(response), contentType);
	const article = extractArticle(html, response.url || target.href);
	if (!article) error(422, 'Auf der Seite wurde kein Artikeltext gefunden.');
	return json({ ...article, sourceUrl: response.url || target.href });
};
