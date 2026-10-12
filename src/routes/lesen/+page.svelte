<script lang="ts">
	import Reader from '#lib/components/reader/reader.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { DEFAULT_READING_SETTINGS, textBlocks, type TextBlock } from '#lib/reader/index.js';
	import PencilSimple from 'phosphor-svelte/lib/PencilSimple';
	import Play from 'phosphor-svelte/lib/Play';

	let text = $state(
		[
			'Beim normalen Lesen springen die Augen in kurzen Sprüngen über die Zeile. Zwischen den Sprüngen ruhen sie für einen Sekundenbruchteil auf einem Wort; nur dann nehmen wir Text auf.',
			'Lector dreht das Prinzip um: Die Wörter kommen zum Auge, nicht das Auge zu den Wörtern. Jedes Wort erscheint an derselben Stelle, und ein hervorgehobener Buchstabe zeigt, wohin der Blick fällt.',
			'Wie schnell das gut geht, ist individuell. Deshalb misst Lector das Verständnis mit kurzen Quizfragen und stellt die Geschwindigkeit danach ein – so schnell, wie das eigene Verständnis es noch trägt.'
		].join('\n\n')
	);
	let settings = $state({ ...DEFAULT_READING_SETTINGS });
	let blocks = $state.raw<TextBlock[]>();

	const empty = $derived(!text.trim());
</script>

<svelte:head>
	<title>Lesen · Lector</title>
</svelte:head>

<main class="mx-auto flex min-h-svh max-w-3xl flex-col gap-8 p-6">
	<header class="flex items-center justify-between gap-4">
		<a href="/" class="font-heading text-2xl font-bold">Lect<span class="text-primary">o</span>r</a>
		{#if blocks}
			<Button variant="ghost" onclick={() => (blocks = undefined)}>
				<PencilSimple />Text ändern
			</Button>
		{/if}
	</header>

	{#if blocks}
		<Reader {blocks} bind:settings />
		<p class="text-sm text-muted-foreground">
			Tippen aufs Wort oder <kbd>←</kbd> springt zum Satzanfang, <kbd>Leertaste</kbd> startet und pausiert.
		</p>
	{:else}
		<form
			class="flex flex-col gap-4"
			onsubmit={(event) => {
				event.preventDefault();
				blocks = textBlocks(text);
			}}
		>
			<Label for="text">Text einfügen</Label>
			<textarea
				id="text"
				bind:value={text}
				rows="12"
				class="w-full min-w-0 rounded-3xl border border-input bg-input/30 px-4 py-3 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
				placeholder="Artikel, Skript oder Kapitel hier einfügen …"></textarea>
			<Button type="submit" class="self-start" disabled={empty}><Play />Lesen</Button>
		</form>
	{/if}
</main>
