<script lang="ts">
	import SiteHeader from '#lib/components/site-header.svelte';
	import { syncs } from '#lib/plan.js';
	import type { PageProps } from './$types';
	import DocumentReader from './document-reader.svelte';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.document.entry.title} · Lector</title>
</svelte:head>

<main class="mx-auto flex min-h-svh max-w-3xl flex-col gap-8 p-6">
	<SiteHeader />

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
		pausiert.
		{syncs(data.plan)
			? 'Der Fortschritt wird in deinem Konto gespeichert.'
			: 'Der Fortschritt wird in diesem Browser gespeichert.'}
	</p>
</main>
