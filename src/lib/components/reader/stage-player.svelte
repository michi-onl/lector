<script lang="ts">
	import type { Preferences } from '#lib/preferences/preferences.js';
	import type { TextBlock } from '#lib/reader/index.js';
	import { onMount, untrack, type Snippet } from 'svelte';
	import { Player } from './player.svelte.js';
	import Stage from './stage.svelte';

	/**
	 * A stage that plays a text without the reader's controls, for the presentation and the
	 * projector in the live demo. A tap on the stage plays and pauses; the parent can do the
	 * same through `toggle()`.
	 */
	let {
		blocks,
		settings,
		autostart = false,
		completedText,
		label = 'Lesen oder pausieren',
		class: className,
		oncomplete,
		children
	}: {
		blocks: TextBlock[];
		settings: Preferences;
		autostart?: boolean;
		completedText?: string;
		label?: string;
		class?: string;
		oncomplete?: () => void;
		children?: Snippet;
	} = $props();

	const player = new Player({
		blocks: () => blocks,
		settings: () => settings,
		oncomplete: () => oncomplete?.()
	});

	onMount(() => {
		if (untrack(() => autostart)) player.toggle();
	});

	export function toggle() {
		player.toggle();
	}

	export function isRunning() {
		return player.running;
	}

	export function restart() {
		player.restart();
	}
</script>

<Stage
	word={player.unit?.text}
	completed={player.completed}
	{completedText}
	appearance={settings}
	{label}
	onclick={() => player.toggle()}
	class={className}
	{children}
/>
