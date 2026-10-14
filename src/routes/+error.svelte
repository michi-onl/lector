<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '#lib/components/ui/button/index.js';

	/** Kit's own messages are English; errors we throw already speak German. */
	const messages: Record<string, string> = {
		'Not Found': 'Diese Seite gibt es nicht.',
		'Internal Error': 'Da ist etwas schiefgegangen.'
	};

	const message = $derived(messages[page.error?.message ?? ''] ?? page.error?.message);
</script>

<svelte:head>
	<title>{page.status} · Lector</title>
</svelte:head>

<main class="flex min-h-svh flex-col items-center justify-center gap-6 p-6 text-center">
	<p class="font-heading text-5xl font-bold text-primary">{page.status}</p>
	<p class="max-w-md text-muted-foreground">
		{message}
	</p>
	<div class="flex flex-wrap justify-center gap-3">
		<Button href="/bibliothek">Zur Bibliothek</Button>
		<Button href="/" variant="ghost">Zur Startseite</Button>
	</div>
</main>
