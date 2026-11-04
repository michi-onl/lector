import { afterEach, describe, expect, it, vi } from 'vitest';
import { decodeHtml, extractArticle, fetchPublicPage, isPublicUrl } from './article.js';

const filler = Array.from(
	{ length: 6 },
	(_, index) =>
		`<p>Absatz ${index + 1}: Beim normalen Lesen springen die Augen in kurzen Sprüngen über die Zeile, und zwischen den Sprüngen ruhen sie für einen Sekundenbruchteil auf einem Wort.</p>`
).join('');

const page = (body: string) =>
	`<!doctype html><html><head><title>Lesen lernen – Zeitung</title><meta property="og:site_name" content="Zeitung"></head><body><nav><a href="/">Start</a><a href="/a">Ressort</a></nav><article><h1>Lesen lernen</h1>${body}</article><footer>© Zeitung</footer></body></html>`;

describe('extractArticle', () => {
	it('keeps the article paragraphs and drops navigation', () => {
		const article = extractArticle(page(filler), 'https://zeitung.example/lesen');
		expect(article?.siteName).toBe('Zeitung');
		expect(article?.paragraphs).toHaveLength(6);
		expect(article?.paragraphs[0]).toMatch(/^Absatz 1: Beim normalen Lesen/u);
		expect(article?.paragraphs.join(' ')).not.toContain('Ressort');
	});

	it('drops footnote markers', () => {
		const article = extractArticle(
			page(filler.replace('Wort.</p>', 'Wort.<sup class="reference">[2]</sup></p>')),
			'https://zeitung.example/lesen'
		);
		expect(article?.paragraphs[0]).toMatch(/Wort\.$/u);
	});

	it('reads list items with paragraphs once', () => {
		const article = extractArticle(
			page(`${filler}<ul><li><p>Ein Punkt der Liste.</p></li></ul>`),
			'https://zeitung.example/lesen'
		);
		expect(article?.paragraphs.filter((text) => text === 'Ein Punkt der Liste.')).toHaveLength(1);
	});

	it('finds nothing on a page without text', () => {
		expect(
			extractArticle('<html><body><nav>Menü</nav></body></html>', 'https://x.example')
		).toBeNull();
	});
});

describe('decodeHtml', () => {
	it('follows the meta charset', () => {
		const bytes = new Uint8Array([
			...new TextEncoder().encode('<meta charset="windows-1252"><p>'),
			0xfc,
			0x62,
			0x65,
			0x72
		]);
		expect(decodeHtml(bytes, 'text/html')).toContain('über');
	});
});

describe('isPublicUrl', () => {
	it.each([
		'https://zeitung.example/artikel',
		'http://www.tagesschau.de/',
		'https://de.wikipedia.org:443/wiki/Lesen'
	])('allows %s', (url) => {
		expect(isPublicUrl(new URL(url))).toBe(true);
	});

	it.each([
		'http://localhost/',
		'http://LOCALHOST./',
		'http://intranet/',
		'http://drucker.local/',
		'http://db.internal/',
		'http://127.0.0.1/',
		'http://2130706433/',
		'http://0x7f.0.0.1/',
		'http://10.0.0.1/',
		'http://169.254.169.254/latest/meta-data/',
		'http://8.8.8.8/',
		'http://[::1]/',
		'http://[::ffff:127.0.0.1]/',
		'http://zeitung.example:8080/',
		'http://nutzer:passwort@zeitung.example/',
		'ftp://zeitung.example/',
		'file:///etc/passwd'
	])('rejects %s', (url) => {
		expect(isPublicUrl(new URL(url))).toBe(false);
	});
});

describe('fetchPublicPage', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	const redirect = (location: string) => new Response(null, { status: 302, headers: { location } });

	it('never contacts a private address the first request names', async () => {
		const fetcher = vi.fn();
		vi.stubGlobal('fetch', fetcher);
		await expect(fetchPublicPage(new URL('http://127.0.0.1/'))).rejects.toMatchObject({
			status: 400
		});
		expect(fetcher).not.toHaveBeenCalled();
	});

	it('follows redirects between public pages and reports the final address', async () => {
		const fetcher = vi
			.fn()
			.mockResolvedValueOnce(redirect('/neu'))
			.mockResolvedValueOnce(new Response('<html></html>'));
		vi.stubGlobal('fetch', fetcher);
		const { response, url } = await fetchPublicPage(new URL('https://zeitung.example/alt'));
		expect(response.status).toBe(200);
		expect(url.href).toBe('https://zeitung.example/neu');
		expect(fetcher.mock.calls[0][1].redirect).toBe('manual');
	});

	it('stops at a redirect to a private address', async () => {
		const fetcher = vi.fn().mockResolvedValueOnce(redirect('http://169.254.169.254/'));
		vi.stubGlobal('fetch', fetcher);
		await expect(fetchPublicPage(new URL('https://zeitung.example/'))).rejects.toMatchObject({
			status: 400
		});
		expect(fetcher).toHaveBeenCalledTimes(1);
	});

	it('gives up on redirect loops', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => redirect('https://zeitung.example/'))
		);
		await expect(fetchPublicPage(new URL('https://zeitung.example/'))).rejects.toMatchObject({
			status: 502
		});
	});

	it('reports an unreachable page', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
		await expect(fetchPublicPage(new URL('https://zeitung.example/'))).rejects.toMatchObject({
			status: 502
		});
	});
});
