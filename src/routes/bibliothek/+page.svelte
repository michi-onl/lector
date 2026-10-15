<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Progress } from '#lib/components/ui/progress/index.js';
	import { progressShare, removeDocument, type LibraryEntry } from '#lib/library/index.js';
	import { loadLocalPreferences } from '#lib/preferences/store.js';
	import Plus from 'phosphor-svelte/lib/Plus';
	import Trash from 'phosphor-svelte/lib/Trash';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let items = $derived(data.items);
	/** The entry whose delete button asks for confirmation. */
	let confirming = $state<string | null>(null);
	const wpm = loadLocalPreferences(localStorage).targetWpm;
	const numbers = new Intl.NumberFormat('de-DE');
	const dates = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'long' });

	async function remove(entry: LibraryEntry) {
		await removeDocument(entry.id);
		items = items.filter((item) => item.entry.id !== entry.id);
		confirming = null;
	}
</script>

<svelte:head>
	<title>Bibliothek · Lector</title>
</svelte:head>

<main class="mx-auto flex min-h-svh max-w-3xl flex-col gap-8 p-6">
	<header class="flex items-center justify-between gap-4">
		<a href="/" class="font-heading text-2xl font-bold">Lect<span class="text-primary">o</span>r</a>
		<Button href="/lesen"><Plus />Neuer Text</Button>
	</header>

	<div class="flex flex-col gap-1">
		<h1 class="font-heading text-3xl font-bold">Bibliothek</h1>
		<p class="text-sm text-muted-foreground">
			Ohne Account liegt die Bibliothek nur in diesem Browser.
		</p>
	</div>

	{#if items.length}
		<ul class="flex flex-col gap-4">
			{#each items as { entry, progress } (entry.id)}
				{@const share = progressShare(progress, entry.wordCount)}
				{@const left = Math.ceil((entry.wordCount - (progress?.position ?? 0)) / wpm)}
				<li>
					<Card.Root>
						<Card.Header>
							<Card.Title>
								<a href="/lesen/{entry.id}" class="hover:underline hover:underline-offset-4">
									{entry.title}
								</a>
							</Card.Title>
							<Card.Description>
								{numbers.format(entry.wordCount)} Wörter ·
								{#if progress?.completedAt && share === 1}
									fertig gelesen
								{:else if share > 0}
									{Math.round(share * 100)} % gelesen, noch ca. {left} Min.
								{:else}
									ca. {left} Min.
								{/if}
								{#if entry.lastOpenedAt}
									· zuletzt geöffnet am {dates.format(new Date(entry.lastOpenedAt))}
								{/if}
							</Card.Description>
							<Card.Action>
								{#if confirming === entry.id}
									<div class="flex gap-2">
										<Button variant="destructive" size="sm" onclick={() => remove(entry)}>
											Löschen
										</Button>
										<Button variant="ghost" size="sm" onclick={() => (confirming = null)}>
											Behalten
										</Button>
									</div>
								{:else}
									<Button
										variant="ghost"
										size="icon"
										aria-label="„{entry.title}“ löschen"
										onclick={() => (confirming = entry.id)}
									>
										<Trash />
									</Button>
								{/if}
							</Card.Action>
						</Card.Header>
						<Card.Content class="flex items-center gap-4">
							<Progress value={share * 100} class="flex-1" />
							<Button variant="secondary" size="sm" href="/lesen/{entry.id}">
								{share === 1 ? 'Noch einmal' : share > 0 ? 'Weiterlesen' : 'Lesen'}
							</Button>
						</Card.Content>
					</Card.Root>
				</li>
			{/each}
		</ul>
	{:else}
		<Card.Root>
			<Card.Header>
				<Card.Title>Noch nichts gespeichert</Card.Title>
				<Card.Description>
					Füge einen Text ein; Lector merkt sich, wo du aufgehört hast.
				</Card.Description>
			</Card.Header>
			<Card.Footer>
				<Button href="/lesen"><Plus />Text einfügen</Button>
			</Card.Footer>
		</Card.Root>
	{/if}
</main>
