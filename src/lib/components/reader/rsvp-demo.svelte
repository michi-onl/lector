<script lang="ts">
	import { DEFAULT_PREFERENCES, type Preferences } from '#lib/preferences/preferences.js';
	import { DEMO_SPEED, DEMO_TEXT, demoWpm } from '#lib/presentation/demo.js';
	import { textBlocks } from '#lib/reader/index.js';
	import { cn } from '#lib/utils.js';
	import { Player } from './player.svelte.js';
	import Stage from './stage.svelte';

	/**
	 * The start page's demo: the reader plays a text and speeds up word by word. It starts once
	 * the stage comes into view and starts over after a short break; with reduced motion it
	 * waits for a tap. A tap plays and pauses.
	 */
	let { class: className }: { class?: string } = $props();

	const RESTART_AFTER_MS = 4000;

	const blocks = textBlocks(DEMO_TEXT);
	// Mutated in place: the player regroups its units only when `chunkSize` changes.
	const settings = $state<Preferences>({
		...DEFAULT_PREFERENCES,
		targetWpm: DEMO_SPEED.from,
		fontSize: 40
	});

	let element = $state<HTMLDivElement>();
	let reducedMotion = $state(false);
	let restart: ReturnType<typeof setTimeout> | undefined;

	const player = new Player({
		blocks: () => blocks,
		settings: () => settings,
		onprogress: ({ wordIndex }) => {
			settings.targetWpm = demoWpm(wordIndex, player.totalWords);
		},
		oncomplete: () => {
			if (reducedMotion) return;
			restart = setTimeout(() => {
				if (player.completed) player.toggle();
			}, RESTART_AFTER_MS);
		}
	});

	$effect(() => {
		if (!element) return;
		const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
		reducedMotion = reduce;
		if (reduce) return;
		const observer = new IntersectionObserver(
			([entry]) => {
				if (!entry.isIntersecting) return;
				observer.disconnect();
				if (player.state.phase.kind === 'ready') player.toggle();
			},
			{ threshold: 0.6 }
		);
		observer.observe(element);
		return () => {
			observer.disconnect();
			clearTimeout(restart);
		};
	});
</script>

<div bind:this={element} class={cn('w-full', className)}>
	<Stage
		word={player.unit?.text}
		completed={player.completed}
		completedText={reducedMotion ? 'Zum Wiederholen tippen' : 'Gleich noch einmal'}
		appearance={settings}
		label="Demo abspielen oder pausieren"
		onclick={() => {
			clearTimeout(restart);
			player.toggle();
		}}
		class="shadow-sm"
	>
		<span
			class="pointer-events-none absolute right-4 bottom-3 font-sans text-sm tabular-nums opacity-60"
			aria-hidden="true">{settings.targetWpm} WPM</span
		>
	</Stage>
</div>
