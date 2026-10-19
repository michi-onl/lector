<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import type { StoredProfile } from '#lib/calibration/index.js';
	import { loadProfileFor } from '#lib/calibration/store.js';
	import * as Alert from '#lib/components/ui/alert/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import * as Tabs from '#lib/components/ui/tabs/index.js';
	import { Textarea } from '#lib/components/ui/textarea/index.js';
	import {
		ACCEPTED_FILES,
		blocksFromParagraphs,
		fileFormat,
		ImportError,
		importFile,
		MAX_FILE_BYTES
	} from '#lib/import/index.js';
	import { libraryFor, LibraryFullError, type NewDocument } from '#lib/library/index.js';
	import { allowsFormat, librarySize, planOf, syncs } from '#lib/plan.js';
	import { textBlocks } from '#lib/reader/index.js';
	import FileArrowUp from 'phosphor-svelte/lib/FileArrowUp';
	import Globe from 'phosphor-svelte/lib/Globe';
	import Play from 'phosphor-svelte/lib/Play';
	import WarningCircle from 'phosphor-svelte/lib/WarningCircle';
	import { onMount } from 'svelte';

	let text = $state(
		[
			'Beim normalen Lesen springen die Augen in kurzen Sprüngen über die Zeile. Zwischen den Sprüngen ruhen sie für einen Sekundenbruchteil auf einem Wort; nur dann nehmen wir Text auf.',
			'Bei Lector kommen die Wörter zum Auge. Jedes Wort erscheint an derselben Stelle, und ein hervorgehobener Buchstabe zeigt, wohin der Blick fällt.',
			'Wie schnell das gut geht, ist von Mensch zu Mensch verschieden. Deshalb prüft Lector das Verständnis mit kurzen Quizfragen und stellt die Geschwindigkeit danach ein.'
		].join('\n\n')
	);
	let url = $state('');
	let profile = $state.raw<StoredProfile | null>(null);
	/** What is happening right now, e.g. „Seite 3 von 12 …“; null when idle. */
	let busy = $state<string | null>(null);
	let failure = $state<string | null>(null);
	let dragging = $state(false);
	/** The failure is a limit of Free; the message then links to the tariffs. */
	let upgrade = $state(false);
	/** Texts in the library, if the tariff limits them; null while unknown. */
	let stored = $state<number | null>(null);

	const plan = $derived(planOf(page.data.user));
	const size = $derived(librarySize(plan));
	const full = $derived(stored !== null && stored >= size);

	onMount(() => {
		void loadProfileFor(plan).then((loaded) => (profile = loaded));
		if (Number.isFinite(size))
			void libraryFor(plan)
				.list()
				.then((items) => (stored = items.length))
				.catch(() => {});
	});

	const empty = $derived(!text.trim());

	/** Every text goes into the library first, so its progress is kept. */
	async function open(load: () => Promise<NewDocument>) {
		failure = null;
		upgrade = false;
		busy = 'Wird geladen …';
		try {
			const document = await load();
			if (syncs(plan)) busy = 'Wird in deinem Konto gespeichert …';
			const entry = await libraryFor(plan).add(document);
			await goto(`/lesen/${entry.id}`);
		} catch (error) {
			console.error(error);
			if (error instanceof LibraryFullError) upgrade = true;
			failure =
				error instanceof ImportError
					? error.message
					: error instanceof LibraryFullError
						? `${error.message} Lösche einen Text in der Bibliothek, um einen neuen zu lesen.`
						: syncs(plan)
							? 'Der Text ließ sich nicht in deinem Konto speichern. Bist du noch angemeldet?'
							: 'Der Text ließ sich nicht in der Bibliothek speichern. Erlaubt der Browser das Speichern von Daten für diese Seite?';
		} finally {
			busy = null;
		}
	}

	function readText(event: SubmitEvent) {
		event.preventDefault();
		void open(async () => ({ blocks: textBlocks(text), format: 'text' }));
	}

	function readFile(file: File | undefined) {
		if (!file) return;
		void open(async () => {
			const format = await fileFormat(file);
			if (!allowsFormat(plan, format)) {
				upgrade = true;
				throw new ImportError('Word-Dokumente und E-Books liest Lector Pro.');
			}
			busy = `„${file.name}“ wird gelesen …`;
			return importFile(file, (page, pages) => {
				busy = `Seite ${page} von ${pages} wird gelesen …`;
			});
		});
	}

	function readUrl(event: SubmitEvent) {
		event.preventDefault();
		void open(async () => {
			busy = 'Artikel wird geladen …';
			const response = await fetch('/api/import/url', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ url })
			});
			const body: {
				message?: string;
				title: string;
				paragraphs: string[];
				sourceUrl: string;
			} = await response.json();
			if (!response.ok) throw new ImportError(body.message ?? 'Der Artikel ließ sich nicht laden.');
			return {
				blocks: blocksFromParagraphs(body.paragraphs),
				format: 'url',
				title: body.title,
				sourceUrl: body.sourceUrl
			};
		});
	}

	function ondrop(event: DragEvent) {
		event.preventDefault();
		dragging = false;
		readFile(event.dataTransfer?.files[0]);
	}
</script>

<svelte:head>
	<title>Neuer Text · Lector</title>
</svelte:head>

<div class="flex flex-col gap-1">
	<h1 class="font-heading text-3xl font-bold">Neuer Text</h1>
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

{#if full}
	<Alert.Root>
		<WarningCircle />
		<Alert.Title>Deine Bibliothek ist voll.</Alert.Title>
		<Alert.Description>
			<p>
				Lector Free hebt bis zu {size} Texte auf. Lösche einen in der
				<a href="/bibliothek" class="underline underline-offset-4">Bibliothek</a>, oder lies mit
				<a href="/preise" class="underline underline-offset-4">Lector Pro</a> ohne Grenze.
			</p>
		</Alert.Description>
	</Alert.Root>
{/if}

<Tabs.Root value="text" class="gap-6">
	<Tabs.List class="w-full sm:w-fit">
		<Tabs.Trigger value="text">Text einfügen</Tabs.Trigger>
		<Tabs.Trigger value="file">Datei</Tabs.Trigger>
		<Tabs.Trigger value="url">Webartikel</Tabs.Trigger>
	</Tabs.List>

	<Tabs.Content value="text">
		<form class="flex flex-col gap-4" onsubmit={readText}>
			<Label for="text" class="sr-only">Text</Label>
			<Textarea
				id="text"
				bind:value={text}
				rows={12}
				class="min-h-64 rounded-3xl px-4 md:text-base"
				placeholder="Artikel, Skript oder Kapitel hier einfügen …"
			/>
			<Button type="submit" class="self-start" disabled={empty || !!busy}><Play />Lesen</Button>
		</form>
	</Tabs.Content>

	<Tabs.Content value="file">
		<label
			class="flex cursor-pointer flex-col items-center gap-3 rounded-3xl border-2 border-dashed px-6 py-14 text-center transition-colors hover:bg-muted/60 data-[dragging=true]:border-primary data-[dragging=true]:bg-muted"
			data-dragging={dragging}
			ondragover={(event) => {
				event.preventDefault();
				dragging = true;
			}}
			ondragleave={() => (dragging = false)}
			{ondrop}
		>
			<FileArrowUp class="size-10 text-primary" />
			<span class="font-medium">Datei auswählen oder hierher ziehen</span>
			<span class="text-sm text-muted-foreground">
				{#if plan === 'pro'}
					PDF, Word (DOCX), E-Book (EPUB) oder TXT, bis {MAX_FILE_BYTES / 1024 / 1024} MB. Lector liest
					den Text in deinem Browser aus und speichert das Original in deinem Konto.
				{:else}
					PDF oder TXT, bis {MAX_FILE_BYTES / 1024 / 1024} MB. Word (DOCX) und E-Books (EPUB) liest
					<a href="/preise" class="underline underline-offset-4">Lector Pro</a>.
				{/if}
			</span>
			<input
				type="file"
				accept={ACCEPTED_FILES}
				class="sr-only"
				disabled={!!busy}
				onchange={(event) => readFile(event.currentTarget.files?.[0])}
			/>
		</label>
	</Tabs.Content>

	<Tabs.Content value="url">
		<form class="flex flex-col gap-4" onsubmit={readUrl}>
			<Label for="url">Adresse des Artikels</Label>
			<div class="flex flex-col gap-3 sm:flex-row">
				<Input
					id="url"
					type="url"
					bind:value={url}
					required
					placeholder="https://…"
					autocomplete="url"
				/>
				<Button type="submit" disabled={!url.trim() || !!busy}><Globe />Artikel laden</Button>
			</div>
			<p class="text-sm text-muted-foreground">
				Lector lädt die Seite und lässt Navigation, Werbung und Kommentare weg.
			</p>
		</form>
	</Tabs.Content>
</Tabs.Root>

<div aria-live="polite">
	{#if busy}
		<p class="text-sm text-muted-foreground">{busy}</p>
	{:else if failure}
		<Alert.Root variant={upgrade ? 'default' : 'destructive'}>
			<WarningCircle />
			<Alert.Description>
				{failure}
				{#if upgrade}
					<a href="/preise" class="underline underline-offset-4">Mehr zu Lector Pro.</a>
				{/if}
			</Alert.Description>
		</Alert.Root>
	{/if}
</div>
