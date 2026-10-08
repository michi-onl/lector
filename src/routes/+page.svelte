<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
</script>

<svelte:head>
	<title>Lector</title>
</svelte:head>

<main class="flex min-h-svh flex-col items-center justify-center gap-6 p-6 text-center">
	<h1 class="font-heading text-5xl font-bold">Lect<span class="text-primary">o</span>r</h1>
	<p class="max-w-md text-muted-foreground">Lesen soll nie der Engpass beim Lernen sein.</p>
	<Button>Text importieren</Button>
</main>
