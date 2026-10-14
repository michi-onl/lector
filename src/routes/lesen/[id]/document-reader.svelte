<script lang="ts">
	import { loadProfile } from '#lib/calibration/index.js';
	import Reader from '#lib/components/reader/reader.svelte';
	import {
		mergeUpdates,
		recordReading,
		resumePosition,
		saveProgress,
		type OpenedDocument,
		type ReadingUpdate
	} from '#lib/library/index.js';
	import { DEFAULT_READING_SETTINGS } from '#lib/reader/index.js';
	import { onDestroy, untrack } from 'svelte';

	/** Progress is saved this often while reading, and whenever the page is left. */
	const SAVE_INTERVAL_MS = 3000;

	let { document: opened }: { document: OpenedDocument } = $props();

	const { entry, blocks } = untrack(() => opened);
	let progress = untrack(() => opened.progress);
	const start = resumePosition(progress, entry.wordCount);
	let settings = $state({
		...DEFAULT_READING_SETTINGS,
		targetWpm: loadProfile(localStorage)?.targetWpm ?? DEFAULT_READING_SETTINGS.targetWpm
	});
	let pending: ReadingUpdate | null = null;

	function save() {
		if (!pending) return;
		progress = recordReading(progress, pending, entry.wordCount);
		pending = null;
		saveProgress(progress).catch((error) =>
			console.error('Lesefortschritt nicht gespeichert', error)
		);
	}

	const timer = setInterval(save, SAVE_INTERVAL_MS);
	onDestroy(() => {
		clearInterval(timer);
		save();
	});
</script>

<svelte:window onpagehide={save} />
<svelte:document onvisibilitychange={() => document.visibilityState === 'hidden' && save()} />

<Reader
	{blocks}
	{start}
	bind:settings
	onprogress={(update) => (pending = mergeUpdates(pending, update))}
/>
