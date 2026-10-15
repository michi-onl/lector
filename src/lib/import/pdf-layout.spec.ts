import { describe, expect, it } from 'vitest';
import {
	joinLines,
	linesFromItems,
	paragraphsFromPages,
	removeRunningLines,
	type PdfLine,
	type PdfTextItem
} from './pdf-layout.js';

function item(text: string, x: number, y: number, extra: Partial<PdfTextItem> = {}): PdfTextItem {
	return { text, x, y, width: text.length * 5, size: 10, endOfLine: false, ...extra };
}

/** A page of body lines, 12 pt apart, 400 wide unless the text marks a short line with „|“. */
function page(...texts: string[]): PdfLine[] {
	return texts.map((text, index) => ({
		text: text.replace('|', ''),
		x: 50,
		y: 700 - index * 12,
		width: text.endsWith('|') ? 150 : 400,
		size: 10
	}));
}

describe('linesFromItems', () => {
	it('joins runs on one baseline and splits at line ends', () => {
		const lines = linesFromItems([
			item('Lesen', 50, 700),
			item('ist', 80, 700),
			item('', 95, 700, { endOfLine: true }),
			item('schön.', 50, 688)
		]);
		expect(lines.map((line) => line.text)).toEqual(['Lesen ist', 'schön.']);
	});

	it('adds no space where runs touch', () => {
		const lines = linesFromItems([item('Verständ', 50, 700), item('nis', 90, 700)]);
		expect(lines[0].text).toBe('Verständnis');
	});

	it('keeps superscripts on their line', () => {
		const lines = linesFromItems([item('Rayner', 50, 700), item('1', 85, 703, { size: 6 })]);
		expect(lines).toHaveLength(1);
	});
});

describe('removeRunningLines', () => {
	it('drops page numbers and recurring heads, but keeps body text', () => {
		const pages = [1, 2, 3, 4].map((number) =>
			page(
				`Kapitel 2 · Seite ${number}`,
				`Satz ${number}.`,
				'Mittendrin.',
				`Ende ${number}.`,
				`${number}`
			)
		);
		const cleaned = removeRunningLines(pages);
		expect(cleaned.map((lines) => lines.map((line) => line.text))).toEqual(
			[1, 2, 3, 4].map((number) => [`Satz ${number}.`, 'Mittendrin.', `Ende ${number}.`])
		);
	});

	it('finds running heads from two pages on', () => {
		const cleaned = removeRunningLines([page('Titel', 'Text.', '1'), page('Titel', 'Mehr.', '2')]);
		expect(cleaned.map((lines) => lines.map((line) => line.text))).toEqual([['Text.'], ['Mehr.']]);
	});

	it('keeps the edge lines of a single page unless they are page numbers', () => {
		const cleaned = removeRunningLines([page('Titel', 'Text.', 'Seite 1 von 1')]);
		expect(cleaned[0].map((line) => line.text)).toEqual(['Titel', 'Text.']);
	});
});

describe('joinLines', () => {
	it('undoes hyphenation', () => {
		expect(joinLines('Die Verständnis-', 'grenze liegt')).toBe('Die Verständnisgrenze liegt');
	});

	it('keeps suspension hyphens and capitalised compounds', () => {
		expect(joinLines('Lese-', 'und Schreibfähigkeit')).toBe('Lese- und Schreibfähigkeit');
		expect(joinLines('RSVP-', 'Reader')).toBe('RSVP- Reader');
	});
});

describe('paragraphsFromPages', () => {
	it('ends paragraphs after short lines that end a sentence', () => {
		const paragraphs = paragraphsFromPages([
			page('Erster Absatz, der über', 'zwei Zeilen geht.|', 'Zweiter Absatz.|')
		]);
		expect(paragraphs).toEqual(['Erster Absatz, der über zwei Zeilen geht.', 'Zweiter Absatz.']);
	});

	it('ends paragraphs at headings and large gaps', () => {
		const lines = page('Einleitung|', 'Text nach der Überschrift.|');
		lines[0].size = 16;
		lines[1].y -= 30;
		expect(paragraphsFromPages([lines])).toEqual(['Einleitung', 'Text nach der Überschrift.']);
	});

	it('continues a paragraph across a page break', () => {
		expect(
			paragraphsFromPages([page('Der Satz läuft bis ans Seiten-'), page('ende weiter.|')])
		).toEqual(['Der Satz läuft bis ans Seitenende weiter.']);
	});

	it('starts a new paragraph on the next page after a finished one', () => {
		expect(
			paragraphsFromPages([
				page('Ein Absatz, der die Zeile füllt und', 'fertig ist.|'),
				page('Neu.|')
			])
		).toEqual(['Ein Absatz, der die Zeile füllt und fertig ist.', 'Neu.']);
	});
});
