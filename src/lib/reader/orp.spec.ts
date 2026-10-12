import { describe, expect, it } from 'vitest';
import { alignmentOffset, ORP_CONFIG, orpTargetRatio, selectOrp } from './orp.js';
import { graphemes, shapeToken } from './tokens.js';

/** Prefix widths from per-grapheme advances, like canvas measurement of a proportional font. */
function widths(word: string, advance: (grapheme: string) => number) {
	const core = shapeToken(word).coreGraphemes;
	return (count: number) => core.slice(0, count).reduce((sum, item) => sum + advance(item), 0);
}
const proportional = (grapheme: string) =>
	({ i: 4, l: 4, W: 16, M: 15, m: 14 })[grapheme as 'i'] ?? 9;
const monospace = () => 10;

describe('Anchor & ORP V2 target ratio', () => {
	it('biases only normal words: LTR 0.45, RTL 0.55, everything else 0.50', () => {
		expect(orpTargetRatio(shapeToken('reading'))).toBe(0.45);
		expect(orpTargetRatio(shapeToken('שלומות'))).toBe(0.55);
		expect(orpTargetRatio(shapeToken('قراءة'))).toBe(0.55);
		for (const word of ['im', 'a', 'Ö'])
			expect(orpTargetRatio(shapeToken(word)), word).toBe(ORP_CONFIG.neutralRatio);
		for (const token of [
			'2024',
			'1.234,56',
			'3.5.2024',
			'14:30',
			'https://lector.app/x',
			'a@b.de',
			'MAX_RETRY',
			'—'
		])
			expect(orpTargetRatio(shapeToken(token)), token).toBe(0.5);
		// Unknown and mixed direction take the safe neutral ratio.
		expect(shapeToken('abcשלום').direction).toBe('MIXED');
		expect(orpTargetRatio(shapeToken('abcשלום'))).toBe(0.5);
		expect(orpTargetRatio(shapeToken('漢字テキスト'))).toBe(0.5);
	});

	it('classifies the V2 token classes', () => {
		expect(shapeToken('Lesen').type).toBe('WORD');
		expect(shapeToken('42').type).toBe('NUMBER');
		expect(shapeToken('3.5.2024').type).toBe('DATE_TIME');
		expect(shapeToken('14:30').type).toBe('DATE_TIME');
		expect(shapeToken('www.lector.app').type).toBe('URL_EMAIL');
		expect(shapeToken('lesen@lector.app').type).toBe('URL_EMAIL');
		expect(shapeToken('getUserMedia()').type).toBe('TECHNICAL');
		expect(shapeToken('§').type).toBe('OTHER');
		// Words with a slash are words, not paths.
		expect(shapeToken('und/oder').type).toBe('WORD');
	});
});

describe('Anchor & ORP V2 token normalisation', () => {
	it('ignores outer punctuation for the ORP but keeps it visible', () => {
		const token = shapeToken('(reading,');
		expect(token.coreText).toBe('reading');
		expect(token.displayText).toBe('(reading,');
		expect(token.coreStart).toBe(1);
		const result = selectOrp('(reading,', widths('(reading,', monospace));
		// 45 % of seven equal graphemes is 31.5 px: the centre of the fourth grapheme ("d").
		expect(result.orpGrapheme).toBe('d');
		expect(result.orpGraphemeIndex).toBe(4);
		expect(graphemes('(reading,')[result.orpGraphemeIndex]).toBe('d');
	});

	it('keeps inner hyphens, apostrophes and dots in the core', () => {
		expect(shapeToken('E-Mail').coreText).toBe('E-Mail');
		expect(shapeToken('don’t,').coreText).toBe('don’t');
		expect(shapeToken("don't").coreText).toBe("don't");
		expect(shapeToken('„state-of-the-art“').coreText).toBe('state-of-the-art');
	});

	it('works on visible grapheme clusters, not code points', () => {
		const decomposed = 'Cafés';
		expect(Array.from(decomposed)).toHaveLength(6);
		expect(shapeToken(decomposed).coreGraphemes).toEqual(['C', 'a', 'f', 'é', 's']);
		const family = 'Hi👨‍👩‍👧‍👦';
		expect(graphemes(family)).toEqual(['H', 'i', '👨‍👩‍👧‍👦']);
		const result = selectOrp(decomposed, widths(decomposed, monospace));
		expect(result.orpGrapheme).toBe('f');
		expect(result.orpGrapheme.length).toBeGreaterThan(0);
	});
});

describe('Anchor & ORP V2 pixel selection', () => {
	it('chooses by real glyph width: "iiiiiiii" and "WWWWWWWW" align by pixels', () => {
		const narrow = selectOrp('iiiiiiii', widths('iiiiiiii', proportional));
		const wide = selectOrp('WWWWWWWW', widths('WWWWWWWW', proportional));
		expect(narrow.targetPixel).toBeCloseTo(32 * 0.45);
		expect(wide.targetPixel).toBeCloseTo(128 * 0.45);
		expect(narrow.targetPixel).not.toBeCloseTo(wide.targetPixel!);
		// Mixed widths: the pixel target picks a different grapheme than counting would.
		const mixed = selectOrp('iiiiWWWW', widths('iiiiWWWW', proportional));
		// Width 80 px, target 36 px: the second W (centre 40 px), not the 4th grapheme by count.
		expect(mixed.orpGraphemeIndex).toBe(5);
		expect(mixed.measured).toBe(true);
	});

	it('positions a long German compound as one token, without splitting', () => {
		const word = 'Donaudampfschifffahrtsgesellschaft';
		const result = selectOrp(word, widths(word, monospace));
		expect(shapeToken(word).coreGraphemes).toHaveLength(34);
		expect(result.orpGraphemeIndex).toBe(15);
		expect(result.coreText).toBe(word);
	});

	it('mirrors the target for right-to-left words', () => {
		const word = 'שלומות';
		const result = selectOrp(word, widths(word, monospace));
		// 55 % from the left edge of six 10 px graphemes = 33 px; logical index 2 is drawn there.
		expect(result.targetRatio).toBe(0.55);
		expect(result.orpGraphemeIndex).toBe(2);
	});

	it('falls back to the safe centre without usable measurements and never throws', () => {
		for (const measure of [
			undefined,
			() => Number.NaN,
			() => 0,
			() => {
				throw new Error('no font');
			},
			(count: number) => 10 - count
		]) {
			const result = selectOrp('reading', measure);
			expect(result.measured).toBe(false);
			expect(result.targetRatio).toBe(0.5);
			expect(result.orpGrapheme).toBe('d');
		}
		expect(selectOrp('').orpGrapheme).toBe('');
	});

	it('recalculates with typography: size scales the pixels, a new font may move the grapheme', () => {
		const word = 'WWWiiiiii';
		const regular = selectOrp(word, widths(word, proportional));
		const larger = selectOrp(
			word,
			widths(word, (grapheme) => proportional(grapheme) * 2)
		);
		expect(larger.orpGraphemeIndex).toBe(regular.orpGraphemeIndex);
		expect(larger.targetPixel).toBeCloseTo(regular.targetPixel! * 2);
		const other = selectOrp(word, widths(word, monospace));
		expect(other.orpGraphemeIndex).not.toBe(regular.orpGraphemeIndex);
	});

	it('is deterministic for the same token, metrics and configuration', () => {
		const run = () =>
			selectOrp('Lesegeschwindigkeit,', widths('Lesegeschwindigkeit,', proportional));
		expect(run()).toEqual(run());
	});

	it('puts the ORP grapheme centre on the anchor', () => {
		// ORP grapheme from 30 px to 40 px within the token: shift left by 35 px.
		expect(alignmentOffset(30, 10)).toBe(-35);
		expect(alignmentOffset(Number.NaN, 10)).toBe(0);
	});
});
