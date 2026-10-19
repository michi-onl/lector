<script lang="ts">
	import Logo from '#lib/components/logo.svelte';
	import StagePlayer from '#lib/components/reader/stage-player.svelte';
	import { BACKGROUNDS, DEFAULT_PREFERENCES } from '#lib/preferences/preferences.js';
	import { INTRO_SEGMENTS } from '#lib/presentation/intro.js';
	import { textBlocks } from '#lib/reader/index.js';

	/**
	 * The first slide: the team introduces itself by RSVP at rising speeds. Space, the arrow
	 * keys or a presenter's clicker (Page Down / Page Up) step through it; F toggles full screen.
	 */
	let segment = $state(-1);
	let done = $state(false);
	let player = $state<StagePlayer>();
	let width = $state(1280);

	const colors = BACKGROUNDS.night;
	const current = $derived(INTRO_SEGMENTS[segment]);
	const finished = $derived(segment === INTRO_SEGMENTS.length - 1 && done);
	const settings = $derived({
		...DEFAULT_PREFERENCES,
		background: 'night' as const,
		speedMode: 'adaptive' as const,
		targetWpm: current?.wpm ?? 300,
		// Projector size: about a ninth of the screen width per letter height.
		fontSize: Math.round(Math.min(180, Math.max(48, width / 9)))
	});

	function forward() {
		if (segment >= 0 && !done) return player?.toggle();
		if (segment < INTRO_SEGMENTS.length - 1) {
			segment++;
			done = false;
		}
	}

	function back() {
		if (segment < 0) return;
		if (player?.isRunning() || done) {
			done = false;
			player?.restart();
		} else if (segment > 0) segment--;
		else segment = -1;
	}

	function onkeydown(event: KeyboardEvent) {
		if (event.metaKey || event.ctrlKey || event.altKey) return;
		if ([' ', 'Enter', 'ArrowRight', 'PageDown'].includes(event.key)) forward();
		else if (['ArrowLeft', 'PageUp', 'Backspace'].includes(event.key)) back();
		else if (event.key === 'f' || event.key === 'F') {
			if (document.fullscreenElement) void document.exitFullscreen();
			else void document.documentElement.requestFullscreen();
		} else return;
		event.preventDefault();
	}
</script>

<svelte:window {onkeydown} bind:innerWidth={width} />

<svelte:head>
	<title>Präsentation · Lector</title>
</svelte:head>

<main
	class="fixed inset-0 flex flex-col"
	style:background-color={colors.background}
	style:color={colors.foreground}
	style:--primary={colors.focus}
>
	{#if segment < 0 || finished}
		<button
			type="button"
			class="flex flex-1 cursor-pointer flex-col items-center justify-center gap-6 outline-none"
			onclick={forward}
		>
			<Logo class="text-[min(18vw,12rem)]" />
			{#if finished}
				<p class="font-heading text-[min(4vw,2.5rem)] opacity-80">So schnell, wie Sie verstehen.</p>
			{:else}
				<p class="text-sm opacity-50">Leertaste oder Klicker startet · F für Vollbild</p>
			{/if}
		</button>
	{:else}
		{#key segment}
			<StagePlayer
				bind:this={player}
				blocks={textBlocks(current.text)}
				{settings}
				autostart
				completedText="{current.wpm} WPM"
				class="flex-1 rounded-none"
				oncomplete={() => (done = true)}
			/>
		{/key}
	{/if}

	<footer
		class="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-8"
	>
		<span class="text-2xl font-semibold tabular-nums opacity-70">
			{#if current && !finished}{current.wpm} WPM{/if}
		</span>
		<span class="flex gap-2" aria-hidden="true">
			{#each INTRO_SEGMENTS as item, index (item.wpm)}
				<span
					class="size-2.5 rounded-full {index <= segment ? 'bg-primary' : 'bg-current opacity-25'}"
				></span>
			{/each}
		</span>
	</footer>
</main>
