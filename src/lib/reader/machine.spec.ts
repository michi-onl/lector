import { describe, expect, it } from 'vitest';
import { transitionReader, type ReaderCommand, type ReaderState } from './machine.js';
import { selectOrp } from './orp.js';
import {
	buildPresentation,
	findJumpIndex,
	type StructureBoundary,
	type TextBlock
} from './presentation.js';
import { DEFAULT_READING_SETTINGS } from './settings.js';
import { timeToken } from './timing.js';

const block = (
	id: string,
	text: string,
	boundaryAfter: StructureBoundary = 'paragraph'
): TextBlock => ({ id, text, sectionId: 'section', chapterId: 'chapter', boundaryAfter });
const units = buildPresentation([
	block('a', 'Ein Satz. Noch einer.', 'section'),
	block('b', 'Nächster Absatz.')
]);
const settings = DEFAULT_READING_SETTINGS;

describe('reader runtime', () => {
	it.each(['section', 'chapter'] as const)(
		'preserves a %s countdown through repeated pause/resume without presentation events',
		(level) => {
			const steps = buildPresentation([block('one', 'Ende.', level), block('two', 'Weiter.')]);
			let state: ReaderState = { index: 0, phase: { kind: 'structure', level, remainingMs: 1700 } };
			for (let count = 0; count < 3; count++) {
				const paused = transitionReader(state, { type: 'pause' }, steps, settings);
				expect(paused.presentedIndex).toBeNull();
				expect(paused.activeMilliseconds).toBe(0);
				expect(
					transitionReader(paused.state, { type: 'elapsed', milliseconds: 9000 }, steps, settings)
						.state
				).toEqual(paused.state);
				const resumed = transitionReader(paused.state, { type: 'start' }, steps, settings);
				expect(resumed.state).toEqual(state);
				expect(resumed.presentedIndex).toBeNull();
				state = resumed.state;
			}
			const tick = transitionReader(state, { type: 'elapsed', milliseconds: 200 }, steps, settings);
			expect(tick.state).toEqual({
				index: 0,
				phase: { kind: 'structure', level, remainingMs: 1500 }
			});
			expect(tick.presentedIndex).toBeNull();
			expect(tick.activeMilliseconds).toBe(0);
		}
	);
	it('skipping a structural timer while manually paused never starts playback', () => {
		const result = transitionReader(
			{ index: 0, phase: { kind: 'paused', resume: 'structure', remainingMs: 1000 } },
			{ type: 'skip-timer' },
			units,
			settings
		);
		expect(result.state).toEqual({ index: 1, phase: { kind: 'ready' } });
		expect(result.presentedIndex).toBeNull();
		expect(result.activeMilliseconds).toBe(0);
	});
	it('never counts content during a seek or starts playback after a large jump', () => {
		const result = transitionReader(
			{ index: 0, phase: { kind: 'playing', remainingMs: 20 } },
			{ type: 'seek', index: 5 },
			units,
			settings
		);
		expect(result.state.phase.kind).toBe('ready');
		expect(result.presentedIndex).toBeNull();
		expect(result.activeMilliseconds).toBe(0);
		const large = transitionReader(
			{ index: 0, phase: { kind: 'playing', remainingMs: 20 } },
			{ type: 'jump', direction: 1, level: 'paragraph' },
			units,
			settings
		);
		expect(large.state).toEqual({ index: 4, phase: { kind: 'ready' } });
	});
	it('freezes the remaining word time during manual pause', () => {
		const initial: ReaderState = { index: 0, phase: { kind: 'playing', remainingMs: 90 } };
		const paused = transitionReader(initial, { type: 'pause' }, units, settings).state;
		expect(
			transitionReader(paused, { type: 'elapsed', milliseconds: 5000 }, units, settings).state
		).toEqual(paused);
		expect(transitionReader(paused, { type: 'start' }, units, settings).state).toEqual(initial);
	});
	it('does not skip unseen words when the timer callback arrives late', () => {
		const result = transitionReader(
			{ index: 0, phase: { kind: 'playing', remainingMs: 100 } },
			{ type: 'elapsed', milliseconds: 10000 },
			units,
			settings
		);
		expect(result.state.index).toBe(1);
		expect(result.presentedIndex).toBe(0);
		expect(result.activeMilliseconds).toBe(100);
	});
	it('keeps sentence pauses distinct from section countdowns', () => {
		const result = transitionReader(
			{ index: 1, phase: { kind: 'playing', remainingMs: 10 } },
			{ type: 'elapsed', milliseconds: 10 },
			units,
			settings
		);
		expect(result.state.phase).toEqual({ kind: 'structure', level: 'sentence', remainingMs: 180 });
		const paused = transitionReader(result.state, { type: 'pause' }, units, settings).state;
		expect(transitionReader(paused, { type: 'start' }, units, settings).state).toEqual(
			result.state
		);
	});
	it('selects only the highest boundary duration', () => {
		const result = transitionReader(
			{ index: 3, phase: { kind: 'playing', remainingMs: 10 } },
			{ type: 'elapsed', milliseconds: 10 },
			units,
			settings
		);
		expect(result.state.phase).toEqual({ kind: 'structure', level: 'section', remainingMs: 2500 });
	});
	it('uses cumulative sentence navigation across paragraphs', () => {
		expect(findJumpIndex(units, 5, -1, 'sentence')).toBe(4);
		expect(findJumpIndex(units, 4, -1, 'sentence')).toBe(2);
		expect(findJumpIndex(units, 0, -1, 'sentence')).toBe(0);
	});
	it('does not produce an invalid anchor for empty or Unicode words', () => {
		expect(selectOrp('').orpGraphemeIndex).toBe(0);
		expect(selectOrp('A').orpGraphemeIndex).toBe(0);
		// Without measured widths the safe fallback is the centre grapheme.
		expect(selectOrp('Lesen').orpGrapheme).toBe('s');
	});
});

describe('sentence rewind', () => {
	const rewind: ReaderCommand = { type: 'jump', direction: -1, level: 'sentence' };

	it('keeps playing from the sentence start when tapped during playback', () => {
		for (const phase of [
			{ kind: 'playing', remainingMs: 50 },
			{ kind: 'structure', level: 'sentence', remainingMs: 50 }
		] as const) {
			const result = transitionReader({ index: 3, phase }, rewind, units, settings);
			expect(result.state.index).toBe(2);
			expect(result.state.phase.kind).toBe('playing');
		}
	});
	it('stays paused when used while paused', () => {
		const result = transitionReader(
			{ index: 3, phase: { kind: 'paused', resume: 'word', remainingMs: 50 } },
			rewind,
			units,
			settings
		);
		expect(result.state).toMatchObject({ index: 2, phase: { kind: 'paused', resume: 'word' } });
	});
});

describe('chunk mode', () => {
	const chunked = buildPresentation([block('a', 'Der kleine Hund lief weiter.')], 3);
	const reading = { ...settings, chunkSize: 3 as const };

	it('shows a chunk for the sum of its words', () => {
		const started = transitionReader(
			{ index: 0, phase: { kind: 'ready' } },
			{ type: 'start' },
			chunked,
			reading
		);
		let timing = null;
		let sum = 0;
		for (const word of ['Der', 'kleine', 'Hund']) {
			const timed = timeToken(word, 'none', reading, timing);
			sum += timed.delayMs;
			timing = timed.state;
		}
		expect(started.state.phase).toEqual({ kind: 'playing', remainingMs: sum });
		expect(started.timing).toEqual(timing);
	});
});

describe('reader states', () => {
	const steps = buildPresentation([block('a', 'Eins zwei', 'none'), block('b', 'drei', 'none')]);
	const step = (state: ReaderState, command: ReaderCommand) =>
		transitionReader(state, command, steps, settings).state;
	const finish = (state: ReaderState) =>
		step(state, {
			type: 'elapsed',
			milliseconds: (state.phase as { remainingMs: number }).remainingMs
		});

	it('moves through ready, playing, paused and completed', () => {
		const ready: ReaderState = { index: 0, phase: { kind: 'ready' } };
		const playing = step(ready, { type: 'start' });
		expect(playing.phase.kind).toBe('playing');
		const paused = step(playing, { type: 'pause' });
		expect(paused.phase).toMatchObject({ kind: 'paused', resume: 'word' });
		expect(step(paused, { type: 'start' }).phase.kind).toBe('playing');
		const second = finish(playing);
		expect(second).toMatchObject({ index: 1, phase: { kind: 'playing' } });
		const third = finish(second);
		expect(third).toMatchObject({ index: 2, phase: { kind: 'playing' } });
		const done = finish(third);
		expect(done.phase.kind).toBe('completed');
		expect(step(done, { type: 'start' })).toEqual(done);
		expect(step(done, { type: 'seek', index: 0 })).toEqual({ index: 0, phase: { kind: 'ready' } });
	});
});
