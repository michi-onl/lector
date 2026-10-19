<script lang="ts">
	import { syncs } from '#lib/plan.js';
	import type { PageProps } from './$types';
	import DocumentReader from './document-reader.svelte';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.document.entry.title} · Lector</title>
</svelte:head>

<h1 class="font-heading text-xl font-semibold">{data.document.entry.title}</h1>

{#key data.document.entry.id}
	<DocumentReader
		document={data.document}
		plan={data.plan}
		preferences={data.preferences}
		profile={data.profile}
	/>
{/key}
<p class="text-sm text-muted-foreground">
	Tippen aufs Wort oder <kbd>←</kbd> springt zum Satzanfang, <kbd>Leertaste</kbd> startet und
	pausiert. Im Volltext springt ein Klick aufs Wort dorthin.
	{syncs(data.plan)
		? 'Lector speichert den Fortschritt in deinem Konto.'
		: 'Lector speichert den Fortschritt in diesem Browser.'}
</p>
