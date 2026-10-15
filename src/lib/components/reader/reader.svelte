<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { Progress } from '#lib/components/ui/progress/index.js';
	import * as RadioGroup from '#lib/components/ui/radio-group/index.js';
	import { Slider } from '#lib/components/ui/slider/index.js';
	import { Switch } from '#lib/components/ui/switch/index.js';
	import * as ToggleGroup from '#lib/components/ui/toggle-group/index.js';
	import type { ReadingUpdate } from '#lib/library/library.js';
	import {
		BACKGROUNDS,
		FONT_SIZE,
		FONTS,
		type Preferences,
		type ReaderBackground,
		type ReaderFont
	} from '#lib/preferences/preferences.js';
	import { MAXIMUM_WPM, MINIMUM_WPM, type ChunkSize, type TextBlock } from '#lib/reader/index.js';
	import ArrowCounterClockwise from 'phosphor-svelte/lib/ArrowCounterClockwise';
	import Article from 'phosphor-svelte/lib/Article';
	import Pause from 'phosphor-svelte/lib/Pause';
	import Play from 'phosphor-svelte/lib/Play';
	import SkipBack from 'phosphor-svelte/lib/SkipBack';
	import { untrack } from 'svelte';
	import FullText from './full-text.svelte';
	import { Player } from './player.svelte.js';
	import Stage from './stage.svelte';

	let {
		blocks,
		settings = $bindable(),
		locked = false,
		start = 0,
		maximumWpm = MAXIMUM_WPM,
		oncomplete,
		onprogress
	}: {
		blocks: TextBlock[];
		settings: Preferences;
		/** Calibration: the speed stays as set and the text reads once, without rewinds. */
		locked?: boolean;
		/** Word index to begin at, e.g. the saved position of a library document. */
		start?: number;
		/** The tariff's limit for the speed slider. */
		maximumWpm?: number;
		oncomplete?: () => void;
		/** Called whenever the position changes or reading time passes. */
		onprogress?: (update: ReadingUpdate) => void;
	} = $props();

	const player = new Player({
		blocks: () => blocks,
		settings: () => settings,
		start: untrack(() => start),
		oncomplete: () => oncomplete?.(),
		onprogress: (update) => onprogress?.(update)
	});
	let showText = $state(false);

	const minutesLeft = $derived(
		Math.ceil((player.totalWords - player.wordsRead) / settings.targetWpm)
	);

	function rewind() {
		if (!locked) player.rewind();
	}

	function onkeydown(event: KeyboardEvent) {
		if (event.metaKey || event.ctrlKey || event.altKey) return;
		// Controls keep their own keys (Space presses a button, arrows move a slider), except the
		// stage: there Space plays and pauses instead of rewinding.
		const target = event.target as HTMLElement | null;
		const control = target?.closest('input, textarea, button, [role="slider"], [role="radio"]');
		if (control && !control.hasAttribute('data-reader-stage')) return;
		if (event.key === ' ') player.toggle();
		else if (event.key === 'ArrowLeft') rewind();
		else if (event.key === 'ArrowRight' && !locked)
			player.command({ type: 'jump', direction: 1, level: 'sentence' });
		else return;
		event.preventDefault();
	}
</script>

<svelte:window {onkeydown} />

<div class="flex flex-col gap-6">
	<Stage
		word={player.unit?.text}
		completed={player.completed}
		appearance={settings}
		label={locked ? 'Lesen oder pausieren' : 'Zum Satzanfang springen'}
		onclick={locked ? () => player.toggle() : rewind}
	/>

	<div class="flex flex-col gap-2">
		<Progress value={player.totalWords ? (player.wordsRead / player.totalWords) * 100 : 0} />
		<p class="text-sm text-muted-foreground">
			{player.wordsRead} von {player.totalWords} Wörtern · noch ca. {minutesLeft} Min.
		</p>
	</div>

	<div class="flex flex-wrap items-center gap-3">
		<Button onclick={() => player.toggle()}>
			{#if player.running}<Pause />Pause{:else if player.completed}<ArrowCounterClockwise />Noch
				einmal{:else}<Play />Lesen{/if}
		</Button>
		{#if !locked}
			<Button variant="secondary" onclick={rewind} disabled={player.completed}>
				<SkipBack />Satzanfang
			</Button>
			<Button
				variant="ghost"
				onclick={() => player.restart()}
				disabled={player.state.index === 0 && !player.completed}
			>
				<ArrowCounterClockwise />Von vorn
			</Button>
			<Button variant="ghost" onclick={() => (showText = !showText)} aria-expanded={showText}>
				<Article />{showText ? 'Volltext ausblenden' : 'Volltext'}
			</Button>
		{:else}
			<span class="text-sm text-muted-foreground tabular-nums">{settings.targetWpm} WPM</span>
		{/if}
	</div>

	{#if !locked}
		<section class="flex flex-col gap-4" aria-labelledby="reader-speed">
			<h2 id="reader-speed" class="text-sm font-medium">Tempo</h2>
			<div class="grid gap-6 sm:grid-cols-[1fr_auto_auto] sm:items-center">
				<div class="flex items-center gap-3">
					<Slider
						type="single"
						bind:value={settings.targetWpm}
						min={MINIMUM_WPM}
						max={maximumWpm}
						step={10}
						aria-label="Tempo in Wörtern pro Minute"
					/>
					<span class="w-20 shrink-0 text-right text-sm tabular-nums">{settings.targetWpm} WPM</span
					>
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
					onValueChange={(value) => player.setChunkSize(Number(value) as ChunkSize)}
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
		</section>

		<section class="flex flex-col gap-4" aria-labelledby="reader-appearance">
			<h2 id="reader-appearance" class="text-sm font-medium">Darstellung</h2>
			<div class="flex flex-wrap items-center gap-x-8 gap-y-4">
				<ToggleGroup.Root
					type="single"
					variant="outline"
					value={settings.font}
					onValueChange={(value) => value && (settings.font = value as ReaderFont)}
					aria-label="Schriftart"
				>
					{#each Object.entries(FONTS) as [value, font] (value)}
						<ToggleGroup.Item {value} class={font.class}>{font.label}</ToggleGroup.Item>
					{/each}
				</ToggleGroup.Root>
				<ToggleGroup.Root
					type="single"
					variant="outline"
					value={settings.background}
					onValueChange={(value) => value && (settings.background = value as ReaderBackground)}
					aria-label="Hintergrund"
				>
					{#each Object.entries(BACKGROUNDS) as [value, colors] (value)}
						<ToggleGroup.Item {value} class="gap-2">
							<span
								class="size-3.5 rounded-full border"
								style:background-color={colors.background}
								style:border-color={colors.guide}
							></span>
							{colors.label}
						</ToggleGroup.Item>
					{/each}
				</ToggleGroup.Root>
				<div class="flex min-w-48 flex-1 items-center gap-3">
					<Label class="shrink-0 text-muted-foreground">Größe</Label>
					<Slider
						type="single"
						bind:value={settings.fontSize}
						min={FONT_SIZE.min}
						max={FONT_SIZE.max}
						step={FONT_SIZE.step}
						aria-label="Schriftgröße in Pixeln"
					/>
					<span class="w-14 shrink-0 text-right text-sm tabular-nums">{settings.fontSize} px</span>
				</div>
			</div>
		</section>
	{/if}

	{#if showText && !locked}
		<FullText
			{blocks}
			current={player.completed || !player.unit
				? null
				: { wordIndex: player.unit.wordIndex, length: player.unit.words.length }}
			onseek={(wordIndex) => player.seekWord(wordIndex)}
		/>
	{/if}
</div>
