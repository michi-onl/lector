import { Readability } from '@mozilla/readability';
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
