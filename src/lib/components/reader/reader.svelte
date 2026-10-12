<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { Progress } from '#lib/components/ui/progress/index.js';
	import * as RadioGroup from '#lib/components/ui/radio-group/index.js';
	import { Slider } from '#lib/components/ui/slider/index.js';
	import { Switch } from '#lib/components/ui/switch/index.js';
	import {
		buildPresentation,
		MAXIMUM_WPM,
		MINIMUM_WPM,
		transitionReader,
		unitIndexForWord,
		type ChunkSize,
		type ReaderCommand,
		type ReaderState,
		type ReadingSettings,
		type SmartTimingState,
		type TextBlock
	} from '#lib/reader/index.js';
	import ArrowCounterClockwise from 'phosphor-svelte/lib/ArrowCounterClockwise';
	import Pause from 'phosphor-svelte/lib/Pause';
	import Play from 'phosphor-svelte/lib/Play';
	import SkipBack from 'phosphor-svelte/lib/SkipBack';
	import AnchorWord from './anchor-word.svelte';

	let {
		blocks,
		settings = $bindable(),
		oncomplete
	}: { blocks: TextBlock[]; settings: ReadingSettings; oncomplete?: () => void } = $props();

	const units = $derived(buildPresentation(blocks, settings.chunkSize));
	let reader = $state.raw<ReaderState>({ index: 0, phase: { kind: 'ready' } });
	// Transient timing state: it changes every word and nothing renders it.
	let timing: SmartTimingState | null = null;

	const running = $derived(reader.phase.kind === 'playing' || reader.phase.kind === 'structure');
	const completed = $derived(reader.phase.kind === 'completed');
	const unit = $derived(units[reader.index]);
	const totalWords = $derived(units.reduce((sum, item) => sum + item.words.length, 0));
	const wordsRead = $derived(completed ? totalWords : (unit?.wordIndex ?? 0));
	const minutesLeft = $derived(Math.ceil((totalWords - wordsRead) / settings.targetWpm));

	function command(next: ReaderCommand) {
		const transition = transitionReader(reader, next, units, settings, timing);
		const finished = !completed && transition.state.phase.kind === 'completed';
		reader = transition.state;
		timing = transition.timing;
		if (finished) oncomplete?.();
	}

	function toggle() {
		if (running) return command({ type: 'pause' });
		if (completed) command({ type: 'seek', index: 0 });
		command({ type: 'start' });
	}

	/** The spec's sentence rewind: one tap jumps back to the start of the sentence. */
	function rewind() {
		command({ type: 'jump', direction: -1, level: 'sentence' });
	}

	function restart() {
		command({ type: 'seek', index: 0 });
	}

	/** New chunk sizes regroup the text; the reader stays on the same word. */
	function setChunkSize(value: string) {
		const wordIndex = unit?.wordIndex ?? 0;
		const wasRunning = running;
		settings.chunkSize = Number(value) as ChunkSize;
		reader = { index: unitIndexForWord(units, wordIndex), phase: { kind: 'ready' } };
		timing = null;
		if (wasRunning) command({ type: 'start' });
	}

	$effect(() => {
		if (!running) return;
		let previous = performance.now();
		let frame = requestAnimationFrame(function tick(now) {
			command({ type: 'elapsed', milliseconds: Math.max(0, now - previous) });
			previous = now;
			frame = requestAnimationFrame(tick);
		});
		return () => cancelAnimationFrame(frame);
	});

	function onkeydown(event: KeyboardEvent) {
		if (event.metaKey || event.ctrlKey || event.altKey) return;
		// Controls keep their own keys (Space presses a button, arrows move a slider), except the
		// stage: there Space plays and pauses instead of rewinding.
		const target = event.target as HTMLElement | null;
		const control = target?.closest('input, textarea, button, [role="slider"], [role="radio"]');
		if (control && !control.hasAttribute('data-reader-stage')) return;
		if (event.key === ' ') toggle();
		else if (event.key === 'ArrowLeft') rewind();
		else if (event.key === 'ArrowRight') command({ type: 'jump', direction: 1, level: 'sentence' });
		else return;
		event.preventDefault();
	}
</script>

<svelte:window {onkeydown} />

<div class="flex flex-col gap-6">
	<button
		type="button"
		class="relative cursor-pointer rounded-lg bg-muted py-14 font-heading text-4xl text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:text-5xl"
		onclick={rewind}
		aria-label="Zum Satzanfang springen"
		data-reader-stage
	>
		<span class="absolute top-4 left-1/2 h-4 w-px bg-border"></span>
		<span class="absolute bottom-4 left-1/2 h-4 w-px bg-border"></span>
		{#if completed}
			<span class="block h-[1.6em] leading-[1.6em] text-muted-foreground">Fertig gelesen</span>
		{:else if unit}
			<AnchorWord word={unit.text} />
		{/if}
	</button>

	<div class="flex flex-col gap-2">
		<Progress value={totalWords ? (wordsRead / totalWords) * 100 : 0} />
		<p class="text-sm text-muted-foreground">
			{wordsRead} von {totalWords} Wörtern · noch ca. {minutesLeft} Min.
		</p>
	</div>

	<div class="flex flex-wrap items-center gap-3">
		<Button onclick={toggle}>
			{#if running}<Pause />Pause{:else if completed}<ArrowCounterClockwise />Noch einmal{:else}<Play
				/>Lesen{/if}
		</Button>
		<Button variant="secondary" onclick={rewind} disabled={completed}>
			<SkipBack />Satzanfang
		</Button>
		<Button variant="ghost" onclick={restart} disabled={reader.index === 0 && !completed}>
			<ArrowCounterClockwise />Von vorn
		</Button>
	</div>

	<div class="grid gap-6 sm:grid-cols-[1fr_auto_auto] sm:items-center">
		<div class="flex items-center gap-3">
			<Label class="shrink-0 text-muted-foreground">Tempo</Label>
			<Slider
				type="single"
				bind:value={settings.targetWpm}
				min={MINIMUM_WPM}
				max={MAXIMUM_WPM}
				step={10}
				aria-label="Tempo in Wörtern pro Minute"
			/>
			<span class="w-20 shrink-0 text-right text-sm tabular-nums">{settings.targetWpm} WPM</span>
		</div>
		<div class="flex items-center gap-3">
			<Switch
				id="adaptive"
				checked={settings.speedMode === 'adaptive'}
				onCheckedChange={(checked) => (settings.speedMode = checked ? 'adaptive' : 'fixed')}
			/>
			<Label for="adaptive">Adaptives Tempo</Label>
		</div>
		<RadioGroup.Root
			class="flex items-center gap-4"
			value={String(settings.chunkSize)}
			onValueChange={setChunkSize}
			aria-label="Wörter pro Anzeige"
		>
			{#each [1, 2, 3] as size (size)}
				<div class="flex items-center gap-2">
					<RadioGroup.Item value={String(size)} id="chunk-{size}" />
					<Label for="chunk-{size}" class="font-normal">
						{size === 1 ? '1 Wort' : `${size} Wörter`}
					</Label>
				</div>
			{/each}
		</RadioGroup.Root>
	</div>
</div>
