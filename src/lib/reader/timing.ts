import type { StructureBoundary } from './presentation.js';
import type { ReadingSettings } from './settings.js';
import { shapeToken, type PunctuationClass, type SpecialToken, type TokenShape } from './tokens.js';

/**
 * Adaptive timing, ported from Fovea's Smart Timing V2. Every parameter lives here. Lector
 * adds faster function words (spec: „schneller bei Funktionswörtern“) and lowers the
 * absolute minimum so that speeds above 750 WPM still differ per word. None of the values
 * is a measured optimum.
 */
export const SMART_TIMING_CONFIG = {
	version: 'lector-timing-1',
	/** Factor by visible core graphemes; outer punctuation does not count. */
	lengthFactors: [
		{ maxGraphemes: 2, factor: 0.8 },
		{ maxGraphemes: 6, factor: 1 },
		{ maxGraphemes: 10, factor: 1.15 },
		{ maxGraphemes: 14, factor: 1.3 },
		{ maxGraphemes: 20, factor: 1.4 },
		{ maxGraphemes: 28, factor: 1.55 },
		{ maxGraphemes: Infinity, factor: 1.7 }
	],
	/**
	 * Words of at least this many graphemes keep their full length time: smoothing does not
	 * damp them and the budget never shortens them. They still count in the budget, so the
	 * following ordinary words recover the target WPM gently.
	 */
	protectedWordGraphemes: 11,
	/** Length factor ceiling for articles, pronouns, prepositions, conjunctions, auxiliaries. */
	functionWordFactor: 0.8,
	/** Bonus relative to the base time; a combination like "?!" is one class of its own. */
	punctuationBonuses: {
		comma: 0.12,
		colon: 0.18,
		semicolon: 0.2,
		dash: 0.3,
		period: 0.5,
		question: 0.55,
		exclamation: 0.55,
		interrobang: 0.6
	} satisfies Record<PunctuationClass, number>,
	/** For a token before a structural boundary without closing punctuation (a heading). */
	boundaryBonuses: {
		sentence: 0.5,
		paragraph: 0.5,
		section: 0.5,
		chapter: 0.5
	} satisfies Record<Exclude<StructureBoundary, 'none'>, number>,
	specialTokenBonuses: {
		'simple-number': 0.1,
		'complex-number': 0.3,
		date: 0.3,
		time: 0.2,
		abbreviation: 0.1,
		unit: 0.15,
		url: 0.5,
		email: 0.5,
		technical: 0.4
	} satisfies Record<SpecialToken, number>,
	minRawFactor: 0.7,
	maxRawFactor: 1.9,
	minDelayFactor: 0.65,
	maxDelayFactor: 2,
	/** Absolute limits, so no token is unreadably short or stalls at any WPM. */
	absoluteMinDelayMs: 40,
	absoluteMaxDelayMs: 2000,
	/** Budget balance is held within ±2 base times; older deviation is forgiven. */
	maxBalanceFactor: 2,
	recoveryRate: 0.15,
	maxCorrectionFactor: 0.1,
	/** Weight of the previous delay: smoothed = current × 0.75 + previous × 0.25. */
	smoothingWeight: 0.25
} as const;

/** Transient engine state: never persisted. */
export interface SmartTimingState {
	/** The target WPM and mode this state belongs to; a change resets it. */
	targetWpm: number;
	enabled: boolean;
	previousDelay: number | null;
	targetElapsed: number;
	actualElapsed: number;
}

export type SmartTimingResetType = 'NONE' | 'SMOOTHING_RESET' | 'FULL_TIMING_RESET';

export interface TokenTiming {
	delayMs: number;
	baseTimeMs: number;
	rawFactor: number;
	state: SmartTimingState;
}

export function baseTimeMs(targetWpm: number): number {
	return 60000 / targetWpm;
}

export function initialTimingState(settings: ReadingSettings): SmartTimingState {
	return {
		targetWpm: settings.targetWpm,
		enabled: settings.speedMode === 'adaptive',
		previousDelay: null,
		targetElapsed: 0,
		actualElapsed: 0
	};
}

export function resetTiming(state: SmartTimingState, type: SmartTimingResetType): SmartTimingState {
	if (type === 'NONE') return state;
	if (type === 'SMOOTHING_RESET') return { ...state, previousDelay: null };
	return { ...state, previousDelay: null, targetElapsed: 0, actualElapsed: 0 };
}

/**
 * Closed word classes that readers barely fixate. Negations („nicht“, „kein“, „not“) are
 * deliberately missing: they carry the meaning of the sentence.
 */
const FUNCTION_WORDS = new Set(
	(
		'der die das den dem des ein eine einen einem einer eines und oder aber denn sondern ' +
		'dass als wie wenn ob weil da zu im in am an auf aus bei mit nach von vom zum zur für ' +
		'über unter vor durch gegen um bis seit er sie es wir ihr ich du man sich mir mich dir ' +
		'dich ihm ihn uns euch ihnen sein seine seinen seinem seiner ihre ihren ihrem ihrer ' +
		'ist sind war waren hat haben hatte wird werden wurde auch so ' +
		'the a an and or but of to in on at by for with from as is are was were be been it he ' +
		'she we they his her its their this that these those which'
	).split(' ')
);

export function isFunctionWord(token: TokenShape): boolean {
	return token.type === 'WORD' && FUNCTION_WORDS.has(token.coreText.toLocaleLowerCase('de'));
}

export function lengthFactor(graphemeCount: number): number {
	return SMART_TIMING_CONFIG.lengthFactors.find((entry) => graphemeCount <= entry.maxGraphemes)!
		.factor;
}

/**
 * The raw factor of one token: length factor plus the strongest single bonus. Punctuation,
 * boundary and special-token bonuses never add up. A dot that does not end the sentence (an
 * abbreviation like "z." or "bzw.", or "3." in "3. Mai") is no full stop: the existing
 * sentence evidence decides, so no false sentence delay returns.
 */
export function rawTimingFactor(text: string, boundaryAfter: StructureBoundary): number {
	const config = SMART_TIMING_CONFIG;
	const token = shapeToken(text);
	const continuesSentence = token.punctuation === 'period' && boundaryAfter === 'none';
	const special: SpecialToken | null =
		token.special ??
		(continuesSentence ? (/\p{L}/u.test(token.coreText) ? 'abbreviation' : 'simple-number') : null);
	const punctuation =
		token.punctuation && !continuesSentence ? config.punctuationBonuses[token.punctuation] : 0;
	const boundary =
		boundaryAfter !== 'none' && !token.punctuation ? config.boundaryBonuses[boundaryAfter] : 0;
	const bonus = Math.max(punctuation, boundary, special ? config.specialTokenBonuses[special] : 0);
	const length = lengthFactor(token.coreGraphemes.length);
	const factor =
		(isFunctionWord(token) ? Math.min(length, config.functionWordFactor) : length) + bonus;
	return Math.min(config.maxRawFactor, Math.max(config.minRawFactor, factor));
}

export function clampDelay(delay: number, base: number): number {
	const config = SMART_TIMING_CONFIG;
	const relative = Math.min(
		config.maxDelayFactor * base,
		Math.max(config.minDelayFactor * base, delay)
	);
	return Math.min(config.absoluteMaxDelayMs, Math.max(config.absoluteMinDelayMs, relative));
}

/**
 * The display time of one text token: base time, raw factor,
 * clamp, smoothing, gentle rolling-budget correction, final clamp. With Smart Timing off
 * ("Festes Tempo") every token takes exactly the base time. Pure and deterministic.
 */
export function timeToken(
	text: string,
	boundaryAfter: StructureBoundary,
	settings: ReadingSettings,
	current: SmartTimingState | null | undefined
): TokenTiming {
	const enabled = settings.speedMode === 'adaptive';
	// A changed target WPM or a switched mode starts from a clean state.
	const state =
		current && current.targetWpm === settings.targetWpm && current.enabled === enabled
			? current
			: initialTimingState(settings);
	const base = baseTimeMs(settings.targetWpm);
	if (!enabled) {
		const delay = clampDelay(base, base);
		return { delayMs: Math.round(delay), baseTimeMs: base, rawFactor: 1, state };
	}
	let rawFactor: number;
	try {
		rawFactor = rawTimingFactor(text, boundaryAfter);
	} catch {
		// A failing token falls back to the constant base time; the reader keeps going.
		return { delayMs: Math.round(base), baseTimeMs: base, rawFactor: 1, state };
	}
	const stages = timingStages(shapeToken(text), boundaryAfter, rawFactor, state);
	return { delayMs: stages.delayMs, baseTimeMs: base, rawFactor, state: stages.state };
}

/** The intermediate values of the delay pipeline for one token, in pipeline order. */
export interface TimingStages {
	/** base × raw factor after the delay clamp. */
	rawDelayMs: number;
	smoothedDelayMs: number;
	correctionMs: number;
	/** A sentence-end or boundary delay or a long word: smoothing does not apply either way. */
	bypass: boolean;
	delayMs: number;
	state: SmartTimingState;
}

/**
 * The adaptive delay pipeline after the raw factor: clamp, smoothing, gentle rolling-budget
 * correction, final clamp. `timeToken` runs it with the raw factor; the state must belong to
 * the current target WPM with Smart Timing on. Pure and deterministic.
 */
export function timingStages(
	token: TokenShape,
	boundaryAfter: StructureBoundary,
	rawFactor: number,
	state: SmartTimingState
): TimingStages {
	const config = SMART_TIMING_CONFIG;
	const base = baseTimeMs(state.targetWpm);
	const raw = clampDelay(base * rawFactor, base);
	const longWord = token.coreGraphemes.length >= config.protectedWordGraphemes;
	// A deliberate sentence-end or boundary delay and a long word bypass smoothing both ways:
	// they are not damped, and they do not stretch the next word.
	const bypass =
		longWord ||
		(boundaryAfter !== 'none' &&
			(token.punctuation === null ||
				['period', 'question', 'exclamation', 'interrobang'].includes(token.punctuation)));
	const smoothed =
		bypass || state.previousDelay === null
			? raw
			: raw * (1 - config.smoothingWeight) + state.previousDelay * config.smoothingWeight;
	const balance = state.targetElapsed - state.actualElapsed;
	const correction = Math.min(
		config.maxCorrectionFactor * base,
		Math.max(longWord ? 0 : -config.maxCorrectionFactor * base, balance * config.recoveryRate)
	);
	const delay = Math.round(clampDelay(smoothed + correction, base));
	const targetElapsed = state.targetElapsed + base;
	// Older deviation beyond ±2 base times is forgiven, never carried on.
	const limit = config.maxBalanceFactor * base;
	const nextBalance = Math.min(
		limit,
		Math.max(-limit, targetElapsed - (state.actualElapsed + delay))
	);
	return {
		rawDelayMs: raw,
		smoothedDelayMs: smoothed,
		correctionMs: correction,
		bypass,
		delayMs: delay,
		state: {
			...state,
			previousDelay: bypass ? state.previousDelay : delay,
			targetElapsed,
			actualElapsed: targetElapsed - nextBalance
		}
	};
}
