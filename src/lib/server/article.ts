import { Readability } from '@mozilla/readability';
import { error } from '@sveltejs/kit';
import { parseHTML } from 'linkedom';

/**
 * URL import. Browsers may not load other sites (CORS), so the Worker fetches the page and
 * Readability finds the article; linkedom stands in for the DOM Workers lack.
 */
export interface Article {
	title: string;
	paragraphs: string[];
	siteName: string | null;
}

/** Elements whose text forms one paragraph of the reader. */
const BLOCKS = 'p, h1, h2, h3, h4, h5, h6, li, blockquote, pre, figcaption, dt, dd';

/** Less than this is a menu or an error page, not something to read. */
const MIN_CHARACTERS = 200;

const clean = (text: string | null | undefined) => (text ?? '').replace(/\s+/gu, ' ').trim();

export function extractArticle(html: string, url: string): Article | null {
	const { document } = parseHTML(html);
	// Footnote markers like „[2]“ would be read as words.
	for (const marker of document.querySelectorAll('sup'))
		if (/^\s*\[[^\]]{1,4}\]\s*$/u.test(marker.textContent ?? '')) marker.remove();
	const article = new Readability(document as unknown as Document).parse();
	if (!article?.content) return null;
	const { document: content } = parseHTML(
		`<!doctype html><html><body>${article.content}</body></html>`
	);
	const paragraphs: string[] = [];
	for (const element of content.querySelectorAll(BLOCKS)) {
		// Only the innermost blocks, so a list item with paragraphs is not read twice.
		if (element.querySelector(BLOCKS)) continue;
		const text = clean(element.textContent);
		if (text) paragraphs.push(text);
	}
	// Some sites put text straight into divs; then the plain text is the better source.
	const total = clean(article.textContent).length;
	const collected = paragraphs.reduce((sum, paragraph) => sum + paragraph.length, 0);
	const text =
		collected >= total * 0.6
			? paragraphs
			: (article.textContent ?? '')
					.split(/\n\s*\n/u)
					.map(clean)
					.filter(Boolean);
	if (text.join(' ').length < MIN_CHARACTERS) return null;
	return {
		title: clean(article.title) || new URL(url).hostname,
		paragraphs: text,
		siteName: clean(article.siteName) || null
	};
}

/** The charset of the response or the page's meta tag; UTF-8 otherwise. */
export function decodeHtml(bytes: Uint8Array, contentType: string | null): string {
	const head = new TextDecoder('latin1').decode(bytes.subarray(0, 4096));
	const charset =
		contentType?.match(/charset=["']?([\w-]+)/iu)?.[1] ??
		head.match(/<meta[^>]+charset=["']?([\w-]+)/iu)?.[1] ??
		'utf-8';
	try {
		return new TextDecoder(charset).decode(bytes);
	} catch {
		return new TextDecoder().decode(bytes);
	}
}

const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 10_000;

/**
 * Whether the Worker may fetch this address: a named public host on the default port, without
 * credentials. `URL` normalizes every spelling of an IP address, so all of them are caught here.
 */
export function isPublicUrl(url: URL): boolean {
	if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
	if (url.username || url.password || url.port) return false;
	const host = url.hostname.toLowerCase().replace(/\.$/u, '');
	if (host.startsWith('[') || /^[\d.]+$/u.test(host)) return false;
	return host.includes('.') && !/\.(localhost|local|internal|intranet|lan|home|corp)$/u.test(host);
}

/** Fetches a page, checking the address of every redirect before following it. */
export async function fetchPublicPage(start: URL): Promise<{ response: Response; url: URL }> {
	const signal = AbortSignal.timeout(TIMEOUT_MS);
	let url = start;
	for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
		if (!isPublicUrl(url)) error(400, 'Lector lädt nur öffentliche Webseiten.');
		let response: Response;
		try {
			response = await fetch(url, {
				headers: {
					accept: 'text/html,application/xhtml+xml',
					'accept-language': 'de,en;q=0.8',
					'user-agent': 'Mozilla/5.0 (compatible; Lector/0.1; Leseliste)'
				},
				redirect: 'manual',
				signal
			});
		} catch {
			error(502, 'Die Seite ist nicht erreichbar.');
		}
		const location = response.headers.get('location');
		if (response.status < 300 || response.status >= 400 || !location) return { response, url };
		await response.body?.cancel();
		try {
			url = new URL(location, url);
		} catch {
			error(502, 'Die Seite leitet an eine ungültige Adresse weiter.');
		}
	}
	error(502, 'Die Seite leitet zu oft weiter.');
}
