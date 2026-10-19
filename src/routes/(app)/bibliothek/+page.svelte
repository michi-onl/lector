<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Progress } from '#lib/components/ui/progress/index.js';
	import {
		FORMAT_LABELS,
		libraryFor,
		progressShare,
		type LibraryEntry
	} from '#lib/library/index.js';
	import { librarySize, syncs } from '#lib/plan.js';
	import DownloadSimple from 'phosphor-svelte/lib/DownloadSimple';
	import Plus from 'phosphor-svelte/lib/Plus';
	import Trash from 'phosphor-svelte/lib/Trash';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let items = $derived(data.items);
	/** The entry whose delete button asks for confirmation. */
	let confirming = $state<string | null>(null);
	const wpm = $derived(data.wpm);
	const synced = $derived(syncs(data.plan));
	const size = $derived(librarySize(data.plan));
	const numbers = new Intl.NumberFormat('de-DE');
	const dates = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'long' });

	function source(entry: LibraryEntry) {
		const format = FORMAT_LABELS[entry.format];
		return entry.sourceUrl ? `${format} (${new URL(entry.sourceUrl).hostname})` : format;
	}

	async function remove(entry: LibraryEntry) {
		await libraryFor(data.plan).remove(entry.id);
		items = items.filter((item) => item.entry.id !== entry.id);
		confirming = null;
	}
</script>

<svelte:head>
	<title>Bibliothek · Lector</title>
</svelte:head>

<div class="flex flex-wrap items-end justify-between gap-4">
	<div class="flex flex-col gap-1">
		<h1 class="font-heading text-3xl font-bold">Bibliothek</h1>
		<p class="text-sm text-muted-foreground">
			{#if synced}
				Lector speichert deine Texte und deinen Fortschritt im Konto, sodass du auf jedem Gerät
				weiterlesen kannst.
			{:else}
				{items.length} von {size} Texten, gespeichert in diesem Browser. Mit
				<a href="/preise" class="underline underline-offset-4">Lector Pro</a> hast du beliebig viele Texte
				auf allen deinen Geräten.
			{/if}
		</p>
	</div>
	<Button href="/bibliothek/neu"><Plus />Neuer Text</Button>
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
							{source(entry)} ·
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
						{#if entry.hasSource}
							<Button
								variant="ghost"
								size="icon"
								href="/api/documents/{entry.id}/source"
								aria-label="Original von „{entry.title}“ herunterladen"
								data-sveltekit-reload
							>
								<DownloadSimple />
							</Button>
						{/if}
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
				Füge einen Text ein, lade eine Datei hoch oder importiere einen Webartikel. Lector speichert
				deinen Lesefortschritt.
			</Card.Description>
		</Card.Header>
		<Card.Footer>
			<Button href="/bibliothek/neu"><Plus />Text hinzufügen</Button>
		</Card.Footer>
	</Card.Root>
{/if}
