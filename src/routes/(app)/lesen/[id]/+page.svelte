<script lang="ts">
	import type { PageProps } from './$types';
	import DocumentReader from './document-reader.svelte';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.entry.title} · Lector</title>
</svelte:head>

<h1 class="font-heading text-xl font-semibold">{data.entry.title}</h1>

{#key data.entry.id}
	<DocumentReader document={data} />
{/key}
<p class="text-sm text-muted-foreground">
	Tippen aufs Wort oder <kbd>←</kbd> springt zum Satzanfang, <kbd>Leertaste</kbd> startet und pausiert.
	Der Fortschritt wird in diesem Browser gespeichert.
</p>
