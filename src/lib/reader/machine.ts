import {
	boundaryDurationMs,
	findJumpIndex,
	type JumpLevel,
	type PresentationUnit,
	type StructureBoundary
} from './presentation.js';
import type { ReadingSettings } from './settings.js';
import {
	initialTimingState,
	resetTiming,
	timeToken,
	type SmartTimingResetType,
	type SmartTimingState
} from './timing.js';

/**
 * The reader state model, ported from Fovea without visuals and in-text questions. One phase
 * at a time, never a combination of flags; `paused` remembers what it interrupted.
 */
export type ReaderPhase =
	| { kind: 'ready' }
	| { kind: 'playing'; remainingMs: number }
	| { kind: 'paused'; resume: 'word' | 'structure'; remainingMs: number }
	| { kind: 'structure'; remainingMs: number; level: Exclude<StructureBoundary, 'none'> }
	| { kind: 'completed' };

export interface ReaderState {
	index: number;
	phase: ReaderPhase;
}
export type ReaderCommand =
	| { type: 'start' }
	| { type: 'pause' }
	| { type: 'elapsed'; milliseconds: number }
	| { type: 'skip-timer' }
	| { type: 'jump'; direction: -1 | 1; level: JumpLevel }
	| { type: 'seek'; index: number };

export interface ReaderTransition {
	state: ReaderState;
	/** The unit that has just been fully shown, if any. */
	presentedIndex: number | null;
	/** Active reading time: words on screen. */
	activeMilliseconds: number;
	/** Automatic structural pause time: engine time, not active reading. */
	structuralMilliseconds: number;
	/** The timing engine's transient state after this transition. */
	timing: SmartTimingState;
}

interface Step {
	state: ReaderState;
	timing: SmartTimingState;
}

/** A chunk is timed word by word, so its time is the sum of its words' times. */
export function timeUnit(
	unit: PresentationUnit,
	settings: ReadingSettings,
	timing: SmartTimingState
): { delayMs: number; timing: SmartTimingState } {
	let delayMs = 0;
	for (const [index, word] of unit.words.entries()) {
		const last = index === unit.words.length - 1;
		const timed = timeToken(word, last ? unit.boundaryAfter : 'none', settings, timing);
		delayMs += timed.delayMs;
		timing = timed.state;
	}
	return { delayMs, timing };
}

function phaseForUnit(
	index: number,
	units: PresentationUnit[],
	settings: ReadingSettings,
	timing: SmartTimingState
): Step {
	const timed = timeUnit(units[index], settings, timing);
	return {
		state: { index, phase: { kind: 'playing', remainingMs: timed.delayMs } },
		timing: timed.timing
	};
}

function advance(
	state: ReaderState,
	units: PresentationUnit[],
	settings: ReadingSettings,
	timing: SmartTimingState
): Step {
	if (state.index + 1 >= units.length)
		return { state: { ...state, phase: { kind: 'completed' } }, timing };
	return phaseForUnit(state.index + 1, units, settings, timing);
}

/**
 * The playback orchestration of one command. The reader decides order and state only; the
 * timing engine decides word time, `boundaryDurationMs` the structural pause, navigation the
 * target index. Navigation, resuming after a user pause and a new start reset the timing
 * fully; structural pauses and the next word continue it.
 */
export function transitionReader(
	state: ReaderState,
	command: ReaderCommand,
	units: PresentationUnit[],
	settings: ReadingSettings,
	timingState?: SmartTimingState | null
): ReaderTransition {
	const timing = timingState ?? initialTimingState(settings);
	const result = (
		step: Step,
		extra: Partial<Omit<ReaderTransition, 'state' | 'timing'>> = {}
	): ReaderTransition => ({
		state: step.state,
		timing: step.timing,
		presentedIndex: null,
		activeMilliseconds: 0,
		structuralMilliseconds: 0,
		...extra
	});
	const reset = (type: SmartTimingResetType) => resetTiming(timing, type);
	const unchanged = result({ state, timing });
	const unit = units[state.index];
	if (!unit) return unchanged;
	switch (command.type) {
		case 'seek': {
			const index = Math.max(0, Math.min(units.length - 1, Math.trunc(command.index)));
			if (!Number.isFinite(index)) return unchanged;
			return result({
				state: { index, phase: { kind: 'ready' } },
				timing: reset('FULL_TIMING_RESET')
			});
		}
		case 'jump': {
			const index = findJumpIndex(units, state.index, command.direction, command.level);
			const isLargeJump = !['word', 'sentence'].includes(command.level);
			const wasPlaying = state.phase.kind === 'playing' || state.phase.kind === 'structure';
			// Every jump interrupts the continuous timing context.
			const clean = reset('FULL_TIMING_RESET');
			if (isLargeJump) return result({ state: { index, phase: { kind: 'ready' } }, timing: clean });
			const timed = timeUnit(units[index], settings, clean);
			// Sentence rewind during playback goes on playing from the sentence start.
			const phase: ReaderPhase = wasPlaying
				? { kind: 'playing', remainingMs: timed.delayMs }
				: { kind: 'paused', resume: 'word', remainingMs: timed.delayMs };
			return result({ state: { index, phase }, timing: timed.timing });
		}
		case 'start': {
			if (state.phase.kind === 'ready')
				return result(phaseForUnit(state.index, units, settings, reset('FULL_TIMING_RESET')));
			if (state.phase.kind !== 'paused') return unchanged;
			const paused = state.phase;
			const phase: ReaderPhase =
				paused.resume === 'structure'
					? {
							kind: 'structure',
							remainingMs: paused.remainingMs,
							level: unit.boundaryAfter === 'none' ? 'sentence' : unit.boundaryAfter
						}
					: { kind: 'playing', remainingMs: paused.remainingMs };
			// Resuming after a user pause carries no old smoothing or budget.
			return result({ state: { ...state, phase }, timing: reset('FULL_TIMING_RESET') });
		}
		case 'pause': {
			const phase = state.phase;
			if (phase.kind !== 'playing' && phase.kind !== 'structure') return unchanged;
			return result({
				state: {
					...state,
					phase: {
						kind: 'paused',
						resume: phase.kind === 'playing' ? 'word' : 'structure',
						remainingMs: phase.remainingMs
					}
				},
				timing
			});
		}
		case 'skip-timer': {
			const skipping =
				state.phase.kind === 'structure' ||
				(state.phase.kind === 'paused' && state.phase.resume === 'structure');
			if (!skipping) return unchanged;
			const next = advance(state, units, settings, timing);
			// Skipping while manually paused never starts playback.
			if (state.phase.kind === 'paused' && next.state.phase.kind !== 'completed')
				return result({ ...next, state: { ...next.state, phase: { kind: 'ready' } } });
			return result(next);
		}
		case 'elapsed': {
			if (!Number.isFinite(command.milliseconds) || command.milliseconds < 0) return unchanged;
			const phase = state.phase;
			if (phase.kind !== 'playing' && phase.kind !== 'structure') return unchanged;
			// Delayed callbacks must never count or skip words that were not displayed.
			const elapsed = Math.min(command.milliseconds, phase.remainingMs);
			const remainingMs = Math.max(0, phase.remainingMs - elapsed);
			const time =
				phase.kind === 'structure'
					? { activeMilliseconds: 0, structuralMilliseconds: elapsed }
					: { activeMilliseconds: elapsed };
			if (remainingMs > 0)
				return result({ state: { ...state, phase: { ...phase, remainingMs } }, timing }, time);
			if (phase.kind === 'structure') return result(advance(state, units, settings, timing), time);
			const pauseMs = boundaryDurationMs(unit);
			if (pauseMs > 0 && state.index < units.length - 1) {
				// The structural pause follows the word; the timing state carries on.
				return result(
					{
						state: {
							...state,
							phase: {
								kind: 'structure',
								remainingMs: pauseMs,
								level: unit.boundaryAfter === 'none' ? 'sentence' : unit.boundaryAfter
							}
						},
						timing
					},
					{ ...time, presentedIndex: state.index }
				);
			}
			return result(advance(state, units, settings, timing), {
				...time,
				presentedIndex: state.index
			});
		}
	}
}
