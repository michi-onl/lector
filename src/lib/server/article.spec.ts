import { describe, expect, it } from 'vitest';
import { decodeHtml, extractArticle } from './article.js';

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
