import { describe, expect, it } from 'vitest';
import {
	boundaryDurationMs,
	buildPresentation,
	findJumpIndex,
	textBlocks,
	unitIndexForWord,
	type PresentationUnit,
	type StructureBoundary
} from './presentation.js';
import { DEFAULT_READING_SETTINGS, MAXIMUM_WPM, MINIMUM_WPM, type ChunkSize } from './settings.js';
import { rawTimingFactor, timeToken } from './timing.js';

const defaults = DEFAULT_READING_SETTINGS;

function units(texts: [string, StructureBoundary][], chunkSize: ChunkSize = 1): PresentationUnit[] {
	return buildPresentation(
		texts.map(([text, boundaryAfter], index) => ({
			id: `n${index}`,
			text,
			sectionId: `s${index}`,
			chapterId: 'c',
			boundaryAfter
		})),
		chunkSize
	);
}

describe('clause punctuation timing (Smart Timing V2)', () => {
	const words = units([
		['plain comma, semi; colon: (aside), “quoted,” end.', 'paragraph'],
		['next', 'none']
	]);
	const factor = (text: string) => {
		const unit = words.find((candidate) => candidate.text === text)!;
		return rawTimingFactor(unit.text, unit.boundaryAfter);
	};

	it('lengthens comma, semicolon and colon words by their own class, in adaptive mode only', () => {
		expect(factor('plain')).toBe(1);
		expect(factor('comma,')).toBeCloseTo(1.12);
		expect(factor('semi;')).toBeCloseTo(1.2);
		expect(factor('colon:')).toBeCloseTo(1.18);
		// Outer brackets and quotes are not the word; the comma inside them still counts.
		expect(factor('(aside),')).toBeCloseTo(1.12);
		expect(factor('“quoted,”')).toBeCloseTo(1.12);
		const fixed = { ...defaults, speedMode: 'fixed' as const };
		for (const word of ['plain', 'comma,', 'semi;', 'colon:'])
			expect(timeToken(word, 'none', fixed, null).delayMs).toBe(200);
	});

	it('keeps clause punctuation weaker than a sentence end at every supported tempo', () => {
		const sentence = units([
			// A capitalised word follows: a lower-case one would continue the sentence (F).
			['one, two. Three', 'paragraph'],
			['next', 'none']
		]);
		for (const targetWpm of [MINIMUM_WPM, 240, 600, MAXIMUM_WPM]) {
			const settings = { ...defaults, targetWpm };
			const [one, two] = sentence;
			expect(timeToken(two.text, two.boundaryAfter, settings, null).delayMs).toBeGreaterThan(
				timeToken(one.text, one.boundaryAfter, settings, null).delayMs
			);
		}
	});

	it('lets only the highest structure pause follow a word, whatever its punctuation', () => {
		const boundaries = units([
			['closing,', 'sentence'],
			['para,', 'paragraph'],
			['section,', 'section'],
			['chapter,', 'chapter'],
			['plain', 'paragraph'],
			['next', 'none']
		]);
		const pause = (text: string) =>
			boundaryDurationMs(boundaries.find((unit) => unit.text === text)!);
		expect(pause('closing,')).toBe(180);
		expect(pause('para,')).toBe(450);
		expect(pause('section,')).toBe(2500);
		expect(pause('chapter,')).toBe(5000);
		expect(pause('plain')).toBe(450);
		// The token keeps its own comma class; it does not also get the boundary bonus.
		expect(rawTimingFactor('para,', 'paragraph')).toBeCloseTo(1.12);
		// Without own punctuation the boundary bonus applies instead (a heading).
		expect(rawTimingFactor('plain', 'paragraph')).toBeCloseTo(1.5);
	});
});

describe('punctuation before closing quotes and brackets (F8)', () => {
	it('times „Hallo,“ as a comma and ends sentences at „Ende.“', () => {
		const quoted = units([
			['Er sagte „Hallo,“ und rief „Ende.“ Dann ging er (fort.) Weiter', 'paragraph'],
			['next', 'none']
		]);
		expect(quoted.map((unit) => [unit.text, unit.boundaryAfter])).toEqual([
			['Er', 'none'],
			['sagte', 'none'],
			['„Hallo,“', 'none'],
			['und', 'none'],
			['rief', 'none'],
			['„Ende.“', 'sentence'],
			['Dann', 'none'],
			['ging', 'none'],
			['er', 'none'],
			['(fort.)', 'sentence'],
			['Weiter', 'paragraph'],
			['next', 'none']
		]);
		expect(new Set(quoted.slice(0, 6).map((unit) => unit.sentenceId)).size).toBe(1);
		expect(quoted[6].sentenceId).not.toBe(quoted[5].sentenceId);
		expect(rawTimingFactor('„Hallo,“', 'none')).toBeCloseTo(1.12);
		// One sentence-end class and one sentence pause; nothing stacks on top.
		expect(rawTimingFactor('„Ende.“', 'sentence')).toBeCloseTo(1.5);
		expect(rawTimingFactor('(fort.)', 'sentence')).toBeCloseTo(1.5);
		expect(boundaryDurationMs(quoted[5])).toBe(180);
		expect(boundaryDurationMs(quoted[9])).toBe(180);
	});

	it('lets a structure boundary pause follow a quoted comma without stacking bonuses', () => {
		const [unit] = units([
			['„Absatz,“', 'paragraph'],
			['next', 'none']
		]);
		expect(rawTimingFactor(unit.text, unit.boundaryAfter)).toBeCloseTo(1.12);
		expect(boundaryDurationMs(unit)).toBe(450);
	});
});

describe('abbreviations inside a sentence (F)', () => {
	it('pauses only where the shared boundary evidence does not confirm that the sentence goes on', () => {
		const text =
			'Er sagte z. B. nichts, d. h. gar nichts. Prof. Beck kam bzw. ging. Dr. Ott las Art. 3 GG. Ende.';
		const sentence = units([
			[text, 'paragraph'],
			['next', 'none']
		]);
		const boundaryOf = (word: string) => sentence.find((unit) => unit.text === word)?.boundaryAfter;
		for (const word of ['z.', 'B.', 'd.', 'h.', 'bzw.'])
			expect(boundaryOf(word), word).toBe('none');
		for (const word of ['nichts.', 'ging.', 'GG.']) expect(boundaryOf(word), word).toBe('sentence');
		// Genuinely ambiguous: a title before a name or a reference before a number may end a
		// sentence, so the short sentence pause stays (known limitation).
		for (const word of ['Prof.', 'Dr.', 'Art.']) expect(boundaryOf(word), word).toBe('sentence');
		// Smart Timing V2 reads the same evidence: a continuing dot is no full stop, so no
		// sentence-end bonus returns after "z. B." or "bzw." (F).
		for (const word of ['z.', 'B.', 'd.', 'h.', 'bzw.'])
			expect(rawTimingFactor(word, boundaryOf(word)!), word).toBeLessThan(1.2);
		expect(rawTimingFactor('nichts.', 'sentence')).toBeCloseTo(1.5);
		// "z. B." and "d. h." stay inside one sentence unit for jumps and safe checkpoints.
		const first = sentence.findIndex((unit) => unit.text === 'Er');
		const end = sentence.findIndex((unit) => unit.text === 'nichts.');
		expect(new Set(sentence.slice(first, end + 1).map((unit) => unit.sentenceId)).size).toBe(1);
	});
});

describe('plain text', () => {
	it('splits paragraphs at blank lines and joins wrapped lines', () => {
		expect(textBlocks('Erste Zeile\nweiter.\n\n  \nZweiter   Absatz.\r\n\r\n')).toEqual([
			{
				id: 'p0',
				text: 'Erste Zeile weiter.',
				sectionId: 'section',
				chapterId: 'chapter',
				boundaryAfter: 'paragraph'
			},
			{
				id: 'p1',
				text: 'Zweiter Absatz.',
				sectionId: 'section',
				chapterId: 'chapter',
				boundaryAfter: 'paragraph'
			}
		]);
		expect(textBlocks(' \n\n ')).toEqual([]);
	});
});

describe('chunk mode', () => {
	const text: [string, StructureBoundary][] = [
		['Der kleine Hund lief schnell, weil es regnete. Dann kam die Sonne', 'paragraph'],
		['Neuer Absatz', 'paragraph']
	];
	const chunks = (size: ChunkSize) => units(text, size).map((unit) => unit.text);

	it('shows one word per frame by default', () => {
		expect(units(text).every((unit) => unit.words.length === 1)).toBe(true);
	});

	it('groups words but never across a clause mark, a sentence end or a paragraph', () => {
		expect(chunks(2)).toEqual([
			'Der kleine',
			'Hund lief',
			'schnell,',
			'weil es',
			'regnete.',
			'Dann kam',
			'die Sonne',
			'Neuer Absatz'
		]);
		expect(chunks(3)).toEqual([
			'Der kleine Hund',
			'lief schnell,',
			'weil es regnete.',
			'Dann kam die',
			'Sonne',
			'Neuer Absatz'
		]);
	});

	it('keeps long words alone so a frame stays readable', () => {
		const [first, second] = units([['ein Donaudampfschifffahrtsgesellschaft', 'paragraph']], 3);
		expect(first.text).toBe('ein');
		expect(second.text).toBe('Donaudampfschifffahrtsgesellschaft');
	});

	it('keeps sentence ids, boundaries and word positions consistent with single words', () => {
		const single = units(text);
		const grouped = units(text, 3);
		for (const unit of grouped) {
			const first = single[unit.wordIndex];
			expect(first.text).toBe(unit.words[0]);
			expect(unit.sentenceId).toBe(first.sentenceId);
			expect(unit.boundaryAfter).toBe(single[unit.wordIndex + unit.words.length - 1].boundaryAfter);
		}
		// The sentence rewind lands on a sentence start in both modes.
		const regnete = grouped.findIndex((unit) => unit.text === 'weil es regnete.');
		expect(grouped[findJumpIndex(grouped, regnete, -1, 'sentence')].text).toBe('Der kleine Hund');
	});

	it('finds the frame of a word after the chunk size changes', () => {
		const grouped = units(text, 3);
		const hund = units(text).findIndex((unit) => unit.text === 'Hund');
		expect(grouped[unitIndexForWord(grouped, hund)].text).toBe('Der kleine Hund');
		expect(unitIndexForWord(grouped, 999)).toBe(grouped.length - 1);
	});
});
