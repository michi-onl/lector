<script lang="ts">
	import { BACKGROUNDS, FONTS, type Appearance } from '#lib/preferences/preferences.js';
	import { cn } from '#lib/utils.js';
	import type { Snippet } from 'svelte';
	import AnchorWord from './anchor-word.svelte';

	/**
	 * The reading surface: the current frame on the fixed anchor, between two guide marks, in
	 * the reader's font and colours. The ORP letter takes the stage's `--primary`. The word sits
	 * in the vertical centre, so the stage can grow to fill a screen.
	 */
	let {
		word,
		completed = false,
		completedText = 'Fertig gelesen',
		appearance,
		label,
		onclick,
		class: className,
		children
	}: {
		word: string | undefined;
		completed?: boolean;
		completedText?: string;
		appearance: Appearance;
		label: string;
		onclick: () => void;
		class?: string;
		/** Overlay content, e.g. the speed in the presentation. */
		children?: Snippet;
	} = $props();

	const colors = $derived(BACKGROUNDS[appearance.background]);
</script>

<button
	type="button"
	class={cn(
		'relative flex w-full cursor-pointer flex-col justify-center rounded-lg py-8 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
		FONTS[appearance.font].class,
		className
	)}
	style:background-color={colors.background}
	style:color={colors.foreground}
	style:--primary={colors.focus}
	style:font-size="{appearance.fontSize}px"
	aria-label={label}
	data-reader-stage
	{onclick}
>
	<span class="relative block w-full py-6">
		<span class="absolute top-0 left-1/2 h-4 w-px" style:background-color={colors.guide}></span>
		<span class="absolute bottom-0 left-1/2 h-4 w-px" style:background-color={colors.guide}></span>
		{#if completed}
			<span class="block h-[1.6em] leading-[1.6em] opacity-60">{completedText}</span>
		{:else if word}
			<AnchorWord {word} />
		{:else}
			<span class="block h-[1.6em]"></span>
		{/if}
	</span>
	{@render children?.()}
</button>
