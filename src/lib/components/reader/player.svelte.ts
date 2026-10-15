import type { ReadingUpdate } from '#lib/library/library.js';
import {
	buildPresentation,
	transitionReader,
	unitIndexForWord,
	type ChunkSize,
	type ReaderCommand,
	type ReaderState,
	type ReadingSettings,
	type SmartTimingState,
	type TextBlock
} from '#lib/reader/index.js';

export interface PlayerOptions {
	blocks: () => TextBlock[];
	settings: () => ReadingSettings;
	/** Word index to begin at, e.g. the saved position of a library document. */
	start?: number;
	oncomplete?: () => void;
	/** Called whenever the position changes or reading time passes. */
	onprogress?: (update: ReadingUpdate) => void;
}

/**
 * Playback of one text: the reader state machine, driven by animation frames while it runs.
 * Create it during component initialisation; the frame loop is an effect of that component.
 */
export class Player {
	readonly #options: PlayerOptions;
	// Transient timing state: it changes every word and nothing renders it.
	#timing: SmartTimingState | null = null;

	readonly units = $derived.by(() =>
		buildPresentation(this.#options.blocks(), this.#options.settings().chunkSize)
	);
	state = $state.raw<ReaderState>({ index: 0, phase: { kind: 'ready' } });

	readonly running = $derived(
		this.state.phase.kind === 'playing' || this.state.phase.kind === 'structure'
	);
	readonly completed = $derived(this.state.phase.kind === 'completed');
	readonly unit = $derived(this.units[this.state.index]);
	readonly totalWords = $derived(this.units.reduce((sum, item) => sum + item.words.length, 0));
	readonly wordsRead = $derived(this.completed ? this.totalWords : (this.unit?.wordIndex ?? 0));

	constructor(options: PlayerOptions) {
		this.#options = options;
		this.state = {
			index: unitIndexForWord(this.units, options.start ?? 0),
			phase: { kind: 'ready' }
		};

		$effect(() => {
			if (!this.running) return;
			let previous = performance.now();
			const tick = (now: number) => {
				this.command({ type: 'elapsed', milliseconds: Math.max(0, now - previous) });
				previous = now;
				frame = requestAnimationFrame(tick);
			};
			let frame = requestAnimationFrame(tick);
			return () => cancelAnimationFrame(frame);
		});
	}

	command(next: ReaderCommand) {
		const settings = this.#options.settings();
		const transition = transitionReader(this.state, next, this.units, settings, this.#timing);
		const finished = !this.completed && transition.state.phase.kind === 'completed';
		const moved = transition.state.index !== this.state.index;
		this.state = transition.state;
		this.#timing = transition.timing;
		const presented =
			transition.presentedIndex === null ? [] : this.units[transition.presentedIndex].words;
		if (moved || finished || presented.length || transition.activeMilliseconds)
			this.#options.onprogress?.({
				wordIndex: this.completed ? this.totalWords : (this.unit?.wordIndex ?? 0),
				completed: this.completed,
				activeMs: transition.activeMilliseconds,
				words: presented.length
			});
		if (finished) this.#options.oncomplete?.();
	}

	toggle() {
		if (this.running) return this.command({ type: 'pause' });
		if (this.completed) this.command({ type: 'seek', index: 0 });
		this.command({ type: 'start' });
	}

	/** The spec's sentence rewind: one tap jumps back to the start of the sentence. */
	rewind() {
		this.command({ type: 'jump', direction: -1, level: 'sentence' });
	}

	restart() {
		this.command({ type: 'seek', index: 0 });
	}

	/** New chunk sizes regroup the text; the reader stays on the same word. */
	setChunkSize(size: ChunkSize) {
		const wordIndex = this.unit?.wordIndex ?? 0;
		const wasRunning = this.running;
		this.#options.settings().chunkSize = size;
		this.state = { index: unitIndexForWord(this.units, wordIndex), phase: { kind: 'ready' } };
		this.#timing = null;
		if (wasRunning) this.command({ type: 'start' });
	}
}
