<script lang="ts">
	import { page } from '$app/state';
	import SiteHeader from '#lib/components/site-header.svelte';
	import { Button } from '#lib/components/ui/button/index.js';

	/** Kit's own messages are English; errors we throw already speak German. */
	const DEFAULTS: Record<string, string> = {
		'Not Found': 'Diese Seite gibt es nicht.',
		'Internal Error': 'Da ist etwas schiefgegangen. Versuch es gleich noch einmal.'
	};

	const message = $derived(
		page.error ? (DEFAULTS[page.error.message] ?? page.error.message) : DEFAULTS['Internal Error']
	);
</script>

<svelte:head>
	<title>Fehler {page.status} · Lector</title>
</svelte:head>

<SiteHeader />

<main class="mx-auto flex max-w-3xl flex-col gap-8 p-6">
	<section class="flex flex-col items-start gap-4">
		<p class="text-sm text-muted-foreground">Fehler {page.status}</p>
		<h1 class="font-heading text-3xl font-bold">{message}</h1>
		<div class="flex flex-wrap gap-3">
			<Button href="/bibliothek">Zur Bibliothek</Button>
			<Button href="/" variant="ghost">Zur Startseite</Button>
		</div>
	</section>
</main>
