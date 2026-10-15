<script lang="ts">
	import type { StoredProfile } from '#lib/calibration/index.js';
	import Reader from '#lib/components/reader/reader.svelte';
	import * as Alert from '#lib/components/ui/alert/index.js';
	import {
		libraryFor,
		mergeUpdates,
		resumePosition,
		type OpenedDocument,
		type ReadingUpdate
	} from '#lib/library/index.js';
	import { maximumWpm, type Plan } from '#lib/plan.js';
	import type { Preferences } from '#lib/preferences/preferences.js';
	import { preferenceSaver } from '#lib/preferences/store.js';
	import Lightning from 'phosphor-svelte/lib/Lightning';
	import { onDestroy, untrack } from 'svelte';

	/** Progress is saved this often while reading, and whenever the page is left. */
	const SAVE_INTERVAL_MS = 3000;

	let {
		document: opened,
		plan,
		preferences,
		profile
	}: {
		document: OpenedDocument;
		plan: Plan;
		preferences: Preferences;
		profile: StoredProfile | null;
	} = $props();

	const { entry, blocks, progress } = untrack(() => opened);
	const library = untrack(() => libraryFor(plan));
	const limit = untrack(() => maximumWpm(plan));
	const start = resumePosition(progress, entry.wordCount);
	let settings = $state(
		untrack(() => ({ ...preferences, targetWpm: Math.min(preferences.targetWpm, limit) }))
	);
	/** The calibrated speed lies beyond what the tariff reads. */
	const capped = untrack(() => profile !== null && profile.targetWpm > limit);
	const saver = untrack(() => preferenceSaver(plan));
	let pending: ReadingUpdate | null = null;
	let first = true;

	$effect(() => {
		const snapshot = $state.snapshot(settings);
		// The initial value is what was loaded; only changes need saving.
		if (first) first = false;
		else saver.save(snapshot);
	});

	function save() {
		saver.flush();
		if (!pending) return;
		const update = pending;
		pending = null;
		library
			.record(entry.id, update, entry.wordCount)
			.catch((error) => console.error('Lesefortschritt nicht gespeichert', error));
	}

	const timer = setInterval(save, SAVE_INTERVAL_MS);
	onDestroy(() => {
		clearInterval(timer);
		save();
	});
</script>

<svelte:window onpagehide={save} />
<svelte:document onvisibilitychange={() => document.visibilityState === 'hidden' && save()} />

{#if capped && profile}
	<Alert.Root>
		<Lightning />
		<Alert.Title>Dein Verständnis trägt {profile.targetWpm} WPM.</Alert.Title>
		<Alert.Description>
			Lector Free liest bis {limit} WPM.
			<a href="/preise" class="underline underline-offset-4">Mit Pro</a> liest du so schnell, wie die
			Kalibrierung es dir bescheinigt.
		</Alert.Description>
	</Alert.Root>
{/if}

<Reader
	{blocks}
	{start}
	bind:settings
	maximumWpm={limit}
	onprogress={(update) => (pending = mergeUpdates(pending, update))}
/>
