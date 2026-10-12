import { describe, expect, it } from 'vitest';
import { transitionReader, type ReaderState } from './machine.js';
import { buildPresentation, textBlocks, type PresentationUnit } from './presentation.js';
import { DEFAULT_READING_SETTINGS, type ReadingSettings } from './settings.js';
import {
	initialTimingState,
	lengthFactor,
	rawTimingFactor,
	SMART_TIMING_CONFIG,
	timeToken,
	type SmartTimingState
} from './timing.js';

const settings = (
	targetWpm = 300,
	speedMode: ReadingSettings['speedMode'] = 'adaptive'
): ReadingSettings => ({ ...DEFAULT_READING_SETTINGS, targetWpm, speedMode });

const model = textBlocks;

/** Delays of a whole token stream through the engine, in order. */
function stream(units: PresentationUnit[], reading: ReadingSettings) {
	let state: SmartTimingState | null = null;
	return units.map((unit) => {
		const timed = timeToken(unit.text, unit.boundaryAfter, reading, state);
		state = timed.state;
		return { text: unit.text, delay: timed.delayMs };
	});
}

const TEXTS = {
	prose:
		'Der Fluss lag ruhig im Tal. Am Ufer standen alte Bäume, deren Blätter im Wind raschelten. Kinder spielten auf der Wiese, während ihre Eltern auf einer Bank saßen und sich unterhielten. Später zogen Wolken auf, und alle gingen langsam nach Hause.',
	science:
		'Die Untersuchung zeigt, dass die Proteinbiosynthese in eukaryotischen Zellen durch posttranslationale Modifikationen reguliert wird. Insbesondere beeinflusst die Phosphorylierung der Translationsinitiationsfaktoren die Geschwindigkeit der Elongation; diese Ergebnisse widersprechen früheren Annahmen.',
	compounds:
		'Die Donaudampfschifffahrtsgesellschaft beantragte eine Rindfleischetikettierungsüberwachungsaufgabenübertragungsgesetzänderung beim Bundesverfassungsgericht.',
	short: 'Er ist da. Sie ist so. Es ist an. Wir tun es. Du bist es. Ja, so ist es.',
	technical:
		'Rufe getUserMedia() mit https://example.com/api/v2 auf, setze MAX_RETRY=3 und prüfe node_modules/@capacitor/ios am 3.5.2024 um 14:30 bei 25 km/h und 1.234,56 € sowie 42 %.',
	punctuation: 'Wirklich?! Ja: sicher; nein – doch! Warum? Weil, nun ja, es so ist. Oder!?'
};

describe('Smart Timing V2 raw factor', () => {
	it('applies every length class to visible core graphemes', () => {
		expect([1, 2, 3, 6, 7, 10, 11, 14, 15, 20, 21, 28, 29, 60].map(lengthFactor)).toEqual([
			0.8, 0.8, 1, 1, 1.15, 1.15, 1.3, 1.3, 1.4, 1.4, 1.55, 1.55, 1.7, 1.7
		]);
		// Outer punctuation does not count towards the length.
		expect(rawTimingFactor('„Haus“', 'none')).toBe(1);
		expect(rawTimingFactor('Lesegeschwindigkeit', 'none')).toBe(1.4);
	});

	it('adds one punctuation class, combinations as their own class', () => {
		const word = (mark: string) => rawTimingFactor(`Wort${mark}`, mark ? 'none' : 'none');
		expect(word('')).toBe(1);
		expect(word(',')).toBeCloseTo(1.12);
		expect(word(':')).toBeCloseTo(1.18);
		expect(word(';')).toBeCloseTo(1.2);
		expect(rawTimingFactor('–', 'none')).toBeCloseTo(0.8 + 0.3);
		expect(rawTimingFactor('Wort.', 'sentence')).toBeCloseTo(1.5);
		expect(rawTimingFactor('Wort?', 'sentence')).toBeCloseTo(1.55);
		expect(rawTimingFactor('Wort!', 'sentence')).toBeCloseTo(1.55);
		expect(rawTimingFactor('Wort?!', 'sentence')).toBeCloseTo(1.6);
		expect(rawTimingFactor('Wort!?', 'sentence')).toBeCloseTo(1.6);
		// "?!" is one class, not "?" plus "!".
		expect(rawTimingFactor('Wort?!', 'sentence')).toBeLessThan(1 + 0.55 + 0.55);
	});

	it('gives a boundary bonus only to a token without punctuation, the stronger one wins', () => {
		for (const boundary of ['sentence', 'paragraph', 'section', 'chapter'] as const)
			expect(rawTimingFactor('Einleitung', boundary)).toBeCloseTo(1.15 + 0.5);
		expect(rawTimingFactor('Einleitung,', 'paragraph')).toBeCloseTo(1.15 + 0.12);
		expect(rawTimingFactor('Einleitung', 'none')).toBe(1.15);
	});

	it('times each special token class, without adding it to punctuation', () => {
		const bonus = SMART_TIMING_CONFIG.specialTokenBonuses;
		const cases: [string, keyof typeof bonus][] = [
			['42', 'simple-number'],
			['1.234,56', 'complex-number'],
			['3.5.2024', 'date'],
			['14:30', 'time'],
			['z.B.', 'abbreviation'],
			['25km', 'unit'],
			['https://lector.app/lesen', 'url'],
			['lesen@lector.app', 'email'],
			['MAX_RETRY', 'technical']
		];
		for (const [token, kind] of cases) {
			const length = lengthFactor(token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '').length);
			expect(rawTimingFactor(token, 'none'), token).toBeCloseTo(
				Math.min(SMART_TIMING_CONFIG.maxRawFactor, length + bonus[kind])
			);
		}
		// A date that ends the sentence takes the stronger bonus, not both.
		expect(rawTimingFactor('3.5.2024.', 'sentence')).toBeCloseTo(1.15 + 0.5);
	});

	it('treats a continuing dot as abbreviation or ordinal, never as a sentence end', () => {
		expect(rawTimingFactor('z.', 'none')).toBeCloseTo(0.8 + 0.1);
		expect(rawTimingFactor('bzw.', 'none')).toBeCloseTo(1 + 0.1);
		expect(rawTimingFactor('3.', 'none')).toBeCloseTo(0.8 + 0.1);
	});

	it('clamps the raw factor to 0.70 – 1.90', () => {
		expect(rawTimingFactor('https://example.com/a/very/long/path/to/somewhere', 'none')).toBe(1.9);
		expect(rawTimingFactor('a', 'none')).toBe(0.8);
	});
});

describe('function words', () => {
	it('shows articles, pronouns, prepositions and conjunctions faster than other words', () => {
		for (const word of ['der', 'Die', 'eine', 'und', 'weil', 'über', 'sich', 'the', 'with'])
			expect(rawTimingFactor(word, 'none'), word).toBe(SMART_TIMING_CONFIG.functionWordFactor);
		expect(rawTimingFactor('Hund', 'none')).toBe(1);
		expect(rawTimingFactor('einen,', 'none')).toBeCloseTo(0.8 + 0.12);
	});

	it('never speeds up negations', () => {
		for (const word of ['nicht', 'kein', 'keine', 'nie', 'not'])
			expect(rawTimingFactor(word, 'none'), word).toBeGreaterThanOrEqual(1);
	});
});

describe('Smart Timing V2 delay pipeline', () => {
	it('keeps every delay within 0.65 – 2.00 base times and the absolute limits', () => {
		for (const wpm of [100, 250, 300, 400, 500, 600, 700, 1000]) {
			const base = 60000 / wpm;
			for (const { delay } of stream(
				buildPresentation(model(Object.values(TEXTS).join(' '))),
				settings(wpm)
			)) {
				expect(delay).toBeGreaterThanOrEqual(Math.max(40, Math.round(0.65 * base)));
				expect(delay).toBeLessThanOrEqual(Math.min(2000, Math.round(2 * base)));
			}
		}
	});

	it('smooths ordinary words: current × 0.75 + previous × 0.25', () => {
		const first = timeToken('Haus,', 'none', settings(), null);
		expect(first.delayMs).toBe(224);
		const second = timeToken('Baum', 'none', settings(), first.state);
		// Raw 200 ms smoothed with 224 ms is 206 ms; the budget corrects by −0.15 × 24 ms.
		expect(second.delayMs).toBe(Math.round(200 * 0.75 + 224 * 0.25 - 24 * 0.15));
	});

	it('never damps or shortens a long word, and does not stretch the next word with it', () => {
		let state: SmartTimingState | null = null;
		// Run up a budget debt first, so that a correction would apply.
		for (let index = 0; index < 6; index++)
			state = timeToken('Gesellschaftsvertrag', 'none', settings(), state).state;
		const long = timeToken('Donaudampfschifffahrtsgesellschaft', 'none', settings(), state);
		expect(long.delayMs).toBe(340);
		const next = timeToken('Haus', 'none', settings(), long.state);
		expect(next.delayMs).toBeLessThanOrEqual(200);
	});

	it('lets long words take noticeably longer than ordinary words at every tempo', () => {
		for (const wpm of [250, 300, 400, 500]) {
			const delays = stream(buildPresentation(model(TEXTS.compounds)), settings(wpm));
			const base = 60000 / wpm;
			const of = (word: string) => delays.find((item) => item.text.startsWith(word))!.delay;
			expect(of('Donaudampfschifffahrtsgesellschaft')).toBeGreaterThanOrEqual(
				Math.round(1.7 * base)
			);
			expect(of('Bundesverfassungsgericht.')).toBeGreaterThanOrEqual(Math.round(1.55 * base));
			expect(of('Die')).toBeLessThanOrEqual(Math.round(base));
		}
	});

	it('recovers gently: at most 0.10 base per token, balance held within ±2 base', () => {
		let state: SmartTimingState | null = null;
		const base = 200;
		for (let index = 0; index < 30; index++) {
			const timed = timeToken('Proteinbiosynthese', 'none', settings(), state);
			state = timed.state;
			const balance = state.targetElapsed - state.actualElapsed;
			expect(Math.abs(balance)).toBeLessThanOrEqual(2 * base + 1e-9);
		}
		const recovering = timeToken('Haus', 'none', settings(), state);
		expect(recovering.delayMs).toBe(200 - 0.1 * base);
	});

	it('keeps the target WPM in the long run for realistic texts', () => {
		const corpus = Array(30).fill(`${TEXTS.prose} ${TEXTS.science} ${TEXTS.short}`).join(' ');
		for (const wpm of [250, 300, 400, 500, 700, 1000]) {
			const delays = stream(buildPresentation(model(corpus)), settings(wpm));
			const effective = delays.length / (delays.reduce((sum, item) => sum + item.delay, 0) / 60000);
			expect(Math.abs(effective - wpm) / wpm, `${wpm} WPM`).toBeLessThan(0.03);
		}
	});

	it('uses the constant base time with Smart Timing off', () => {
		for (const { delay } of stream(
			buildPresentation(model(TEXTS.technical)),
			settings(300, 'fixed')
		))
			expect(delay).toBe(200);
	});

	it('resets fully when the target WPM or the mode changes', () => {
		const before = timeToken('Proteinbiosynthese', 'none', settings(300), null).state;
		expect(before.actualElapsed).toBeGreaterThan(0);
		const faster = timeToken('Haus', 'none', settings(350), before);
		expect(faster.state.targetWpm).toBe(350);
		expect(faster.delayMs).toBe(Math.round(60000 / 350));
		const off = timeToken('Haus', 'none', settings(300, 'fixed'), before);
		expect(off.state).toEqual(initialTimingState(settings(300, 'fixed')));
		const backOn = timeToken('Haus', 'none', settings(300), off.state);
		expect(backOn.delayMs).toBe(200);
	});

	it('gives the same sequence for the same text, target WPM and configuration', () => {
		const text = Object.values(TEXTS).join(' ');
		expect(stream(buildPresentation(model(text)), settings(320))).toEqual(
			stream(buildPresentation(model(text)), settings(320))
		);
	});

	it('covers numbers, dates, abbreviations, technical text and dense punctuation', () => {
		const technical = stream(buildPresentation(model(TEXTS.technical)), settings());
		const of = (word: string) => technical.find((item) => item.text === word)!.delay;
		expect(of('https://example.com/api/v2')).toBeGreaterThan(of('mit'));
		expect(of('3.5.2024')).toBeGreaterThan(of('am'));
		expect(of('MAX_RETRY=3')).toBeGreaterThan(of('setze'));
		const marks = stream(buildPresentation(model(TEXTS.punctuation)), settings());
		expect(marks.find((item) => item.text === 'Wirklich?!')!.delay).toBeGreaterThan(200);
		expect(marks.every((item) => item.delay <= 400)).toBe(true);
	});
});

describe('Smart Timing V2 in the reader (integration matrix)', () => {
	const reading = settings();
	const units = buildPresentation(model(`${TEXTS.prose} ${TEXTS.science}`));
	const play = (state: ReaderState, timing: SmartTimingState, steps: number) => {
		let current = { state, timing };
		for (let step = 0; step < steps; step++) {
			const next = transitionReader(
				current.state,
				{ type: 'elapsed', milliseconds: 5000 },
				units,
				reading,
				current.timing
			);
			current = { state: next.state, timing: next.timing };
		}
		return current;
	};

	it('continues the state across tokens and structural pauses, resets on navigation and resume', () => {
		const started = transitionReader(
			{ index: 0, phase: { kind: 'ready' } },
			{ type: 'start' },
			units,
			reading
		);
		let current = play(started.state, started.timing, 14);
		expect(current.timing.targetElapsed).toBeGreaterThan(0);
		// A structural pause carries the state on.
		while (current.state.phase.kind !== 'structure')
			current = play(current.state, current.timing, 1);
		const inPause = current.timing;
		const afterPause = transitionReader(
			current.state,
			{ type: 'elapsed', milliseconds: 5000 },
			units,
			reading,
			inPause
		);
		expect(afterPause.structuralMilliseconds).toBeGreaterThan(0);
		expect(afterPause.timing.targetElapsed).toBeGreaterThan(inPause.targetElapsed);
		// A user pause: no time, no budget; resuming starts the timing clean.
		const paused = transitionReader(
			afterPause.state,
			{ type: 'pause' },
			units,
			reading,
			afterPause.timing
		);
		const idle = transitionReader(
			paused.state,
			{ type: 'elapsed', milliseconds: 600000 },
			units,
			reading,
			paused.timing
		);
		expect(idle.activeMilliseconds + idle.structuralMilliseconds).toBe(0);
		expect(idle.timing).toEqual(paused.timing);
		const resumed = transitionReader(idle.state, { type: 'start' }, units, reading, idle.timing);
		expect(resumed.timing.targetElapsed).toBe(0);
		expect(resumed.timing.previousDelay).toBeNull();
		// Backtracking resets as well.
		const back = transitionReader(
			resumed.state,
			{ type: 'jump', direction: -1, level: 'sentence' },
			units,
			reading,
			play(resumed.state, resumed.timing, 3).timing
		);
		expect(back.timing.targetElapsed).toBe(200);
		expect(back.state.index).toBeLessThan(resumed.state.index);
	});
});
