<script lang="ts">
	import { goto } from '$app/navigation';
	import { loadProfile, type StoredProfile } from '#lib/calibration/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { addText } from '#lib/library/index.js';
	import Books from 'phosphor-svelte/lib/Books';
	import Play from 'phosphor-svelte/lib/Play';
	import { onMount } from 'svelte';

	let text = $state(
		[
			'Beim normalen Lesen springen die Augen in kurzen Sprüngen über die Zeile. Zwischen den Sprüngen ruhen sie für einen Sekundenbruchteil auf einem Wort; nur dann nehmen wir Text auf.',
			'Lector dreht das Prinzip um: Die Wörter kommen zum Auge, nicht das Auge zu den Wörtern. Jedes Wort erscheint an derselben Stelle, und ein hervorgehobener Buchstabe zeigt, wohin der Blick fällt.',
			'Wie schnell das gut geht, ist individuell. Deshalb misst Lector das Verständnis mit kurzen Quizfragen und stellt die Geschwindigkeit danach ein – so schnell, wie das eigene Verständnis es noch trägt.'
		].join('\n\n')
	);
	let profile = $state.raw<StoredProfile | null>(null);
	let saving = $state(false);
	let failed = $state(false);

	onMount(() => {
		profile = loadProfile(localStorage);
	});

	const empty = $derived(!text.trim());

	/** Every text goes into the library first, so its progress is kept. */
	async function read(event: SubmitEvent) {
		event.preventDefault();
		saving = true;
		failed = false;
		try {
			const entry = await addText(text);
			await goto(`/lesen/${entry.id}`);
		} catch (error) {
			console.error(error);
			failed = true;
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>Lesen · Lector</title>
</svelte:head>

<main class="mx-auto flex min-h-svh max-w-3xl flex-col gap-8 p-6">
	<header class="flex items-center justify-between gap-4">
		<a href="/" class="font-heading text-2xl font-bold">Lect<span class="text-primary">o</span>r</a>
		<Button variant="ghost" href="/bibliothek"><Books />Bibliothek</Button>
	</header>

	<form class="flex flex-col gap-4" onsubmit={read}>
		<Label for="text">Text einfügen</Label>
		<textarea
			id="text"
			bind:value={text}
			rows="12"
			class="w-full min-w-0 rounded-3xl border border-input bg-input/30 px-4 py-3 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
			placeholder="Artikel, Skript oder Kapitel hier einfügen …"></textarea>
		<div class="flex flex-wrap items-center gap-x-4 gap-y-2">
			<Button type="submit" disabled={empty || saving}><Play />Lesen</Button>
			<p class="text-sm text-muted-foreground">
				{#if profile}
					Kalibriert auf {profile.targetWpm} WPM ·
					<a href="/kalibrierung" class="underline underline-offset-4">neu kalibrieren</a>
				{:else}
					<a href="/kalibrierung" class="underline underline-offset-4">Tempo kalibrieren</a>
					und mit dem Tempo lesen, das dein Verständnis trägt
				{/if}
			</p>
		</div>
		{#if failed}
			<p class="text-sm text-destructive">
				Der Text ließ sich nicht in der Bibliothek speichern. Erlaubt der Browser das Speichern von
				Daten für diese Seite?
			</p>
		{/if}
	</form>
</main>
