import { shapeToken, type TextDirection, type TokenShape, type TokenType } from './tokens.js';

/** ORP start values from Fovea (Anchor & ORP V2), to be tuned only by evidence. */
export const ORP_CONFIG = {
	version: 'lector-orp-1',
	/** Optimal viewing position left of the word centre for left-to-right words. */
	ltrWordRatio: 0.45,
	/** Mirrored for right-to-left words. */
	rtlWordRatio: 0.55,
	/** Short words, special tokens and every uncertain case. */
	neutralRatio: 0.5,
	/** Words of at most this many graphemes take the neutral ratio. */
	shortWordGraphemes: 2
} as const;

export interface OrpResult {
	displayText: string;
	coreText: string;
	tokenType: TokenType;
	direction: TextDirection;
	targetRatio: number;
	/** Index of the ORP grapheme within the display graphemes. */
	orpGraphemeIndex: number;
	orpGrapheme: string;
	/** Position of the target within the core, in pixels from the core's visual left edge. */
	targetPixel: number | null;
	/** Whether the choice rests on measured widths; false means the safe centred fallback. */
	measured: boolean;
}

/**
 * Only a normal word gets the language bias; numbers, dates, URLs, technical tokens, short
 * words and unknown or mixed direction take the neutral centre.
 */
export function orpTargetRatio(token: TokenShape): number {
	if (token.type !== 'WORD' || token.coreGraphemes.length <= ORP_CONFIG.shortWordGraphemes)
		return ORP_CONFIG.neutralRatio;
	if (token.direction === 'LTR') return ORP_CONFIG.ltrWordRatio;
	if (token.direction === 'RTL') return ORP_CONFIG.rtlWordRatio;
	return ORP_CONFIG.neutralRatio;
}

/**
 * Chooses the ORP grapheme. `prefixWidths(k)` is the shaped width of the first k
 * core graphemes in the reader's real font, so kerning and proportional glyphs count. The
 * target lies at `targetRatio` of the core's visual width; the grapheme whose visual centre is
 * nearest wins, the earlier one on a tie. Without usable widths the safe fallback is the
 * centre grapheme by count with the neutral ratio.
 */
export function selectOrp(
	displayText: string,
	prefixWidths?: (graphemeCount: number) => number
): OrpResult {
	const token = shapeToken(displayText);
	const count = token.coreGraphemes.length;
	const base = {
		displayText,
		coreText: token.coreText,
		tokenType: token.type,
		direction: token.direction
	};
	const fallback = (): OrpResult => {
		const index = Math.max(0, Math.ceil(count / 2) - 1);
		return {
			...base,
			targetRatio: ORP_CONFIG.neutralRatio,
			orpGraphemeIndex: token.coreStart + index,
			orpGrapheme: token.coreGraphemes[index] ?? '',
			targetPixel: null,
			measured: false
		};
	};
	if (!count || !prefixWidths) return fallback();
	let edges: number[];
	try {
		edges = Array.from({ length: count + 1 }, (_, index) => prefixWidths(index));
	} catch {
		return fallback();
	}
	const width = edges[count];
	if (
		!edges.every(Number.isFinite) ||
		!(width > 0) ||
		edges.some((edge, index) => index > 0 && edge < edges[index - 1])
	)
		return fallback();
	const ratio = orpTargetRatio(token);
	const targetPixel = width * ratio;
	let best = 0;
	let distance = Infinity;
	for (let index = 0; index < count; index++) {
		const logicalCentre = (edges[index] + edges[index + 1]) / 2;
		// Right-to-left text runs from the right edge: mirror the logical advance.
		const visualCentre = token.direction === 'RTL' ? width - logicalCentre : logicalCentre;
		const gap = Math.abs(visualCentre - targetPixel);
		if (gap < distance - 1e-9) {
			distance = gap;
			best = index;
		}
	}
	return {
		...base,
		targetRatio: ratio,
		orpGraphemeIndex: token.coreStart + best,
		orpGrapheme: token.coreGraphemes[best],
		targetPixel,
		measured: true
	};
}

/**
 * Pixel alignment: the token moves so that the centre of the ORP grapheme lies
 * on the fixed anchor. `orpLeft` is the measured left edge of the ORP grapheme relative to
 * the token's left edge, including visible leading punctuation.
 */
export function alignmentOffset(orpLeft: number, orpWidth: number): number {
	return Number.isFinite(orpLeft) && Number.isFinite(orpWidth) ? -(orpLeft + orpWidth / 2) : 0;
}
