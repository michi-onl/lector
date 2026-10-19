<script lang="ts">
	import { enhance } from '$app/forms';
	import { api } from '#lib/api.js';
	import { loadProfile } from '#lib/calibration/profile.js';
	import SiteHeader from '#lib/components/site-header.svelte';
	import SpeedCurve from '#lib/components/speed-curve.svelte';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import { libraryFor, transferLibrary } from '#lib/library/index.js';
	import { listLibrary } from '#lib/library/store.js';
	import { FREE_MAXIMUM_WPM } from '#lib/plan.js';
	import { loadLocalPreferences, PREFERENCES_KEY } from '#lib/preferences/store.js';
	import ArrowsClockwise from 'phosphor-svelte/lib/ArrowsClockwise';
	import Check from 'phosphor-svelte/lib/Check';
	import SignOut from 'phosphor-svelte/lib/SignOut';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const user = $derived(data.user!);
	const pro = $derived(user.plan === 'pro');
	/** Texts in this browser's library, for the transfer after an upgrade. */
	let localTexts = $state(0);
	let transfer = $state<{ status: 'idle' | 'running' | 'done' | 'failed'; message: string }>({
		status: 'idle',
		message: ''
	});
	const dates = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' });
	const percent = (share: number) => `${Math.round(share * 100)} %`;
	const profile = $derived(data.evaluation?.history.at(-1));

	/** Counts browser texts the account does not have yet; after a transfer that is none. */
	async function countLocalTexts() {
		const local = await listLibrary().catch(() => []);
		if (!local.length) return;
		const stored = await libraryFor('pro')
			.list()
			.catch(() => []);
		const known = new Set(stored.map(({ entry }) => entry.sha256));
		localTexts = local.filter(({ entry }) => !known.has(entry.sha256)).length;
	}

	// Also right after switching to Pro on this page.
	$effect(() => {
		if (pro) void countLocalTexts();
	});

	/** Library with progress, preferences and profile go from this browser into the account. */
	async function transferData() {
		transfer = { status: 'running', message: 'Wird übernommen …' };
		try {
			const added = await transferLibrary((done, total) => {
				transfer.message = `Text ${Math.min(done + 1, total)} von ${total} …`;
			});
			if (localStorage.getItem(PREFERENCES_KEY))
				await api('/api/settings', { method: 'PUT', json: loadLocalPreferences(localStorage) });
			const local = loadProfile(localStorage);
			if (local) await api('/api/profile', { method: 'POST', json: local });
			transfer = {
				status: 'done',
				message:
					added === 1
						? 'Ein Text ist jetzt in deinem Konto.'
						: `${added} Texte sind jetzt in deinem Konto.`
			};
		} catch (error) {
			console.error(error);
			transfer = { status: 'failed', message: 'Die Übernahme ist fehlgeschlagen.' };
		}
	}
</script>

<svelte:head>
	<title>Konto · Lector</title>
</svelte:head>

<SiteHeader />

<main class="mx-auto flex max-w-3xl flex-col gap-8 p-6">
	<div class="flex flex-wrap items-end justify-between gap-4">
		<div class="flex flex-col gap-1">
			<h1 class="font-heading text-3xl font-bold">Hallo, {user.name}</h1>
			<p class="text-sm text-muted-foreground">{user.email}</p>
		</div>
		<form method="POST" action="?/abmelden" use:enhance>
			<Button type="submit" variant="ghost"><SignOut />Abmelden</Button>
		</form>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				Tarif <Badge variant={pro ? 'default' : 'secondary'}>{pro ? 'Pro' : 'Free'}</Badge>
			</Card.Title>
			<Card.Description>
				{#if pro}
					Word und E-Books, unbegrenztes Tempo, Bibliothek und Fortschritt auf allen Geräten,
					Auswertung deiner Kalibrierungen.
				{:else}
					Text, PDFs und Webartikel bis {FREE_MAXIMUM_WPM} WPM, Bibliothek in diesem Browser.
				{/if}
			</Card.Description>
		</Card.Header>
		<Card.Footer class="flex flex-wrap items-center gap-3">
			<form method="POST" action="?/plan" use:enhance>
				<input type="hidden" name="plan" value={pro ? 'free' : 'pro'} />
				<Button type="submit" variant={pro ? 'ghost' : 'default'}>
					{pro ? 'Zu Free wechseln' : 'Pro aktivieren'}
				</Button>
			</form>
			<span class="text-sm text-muted-foreground">
				Prototyp: Der Wechsel kostet nichts. <a href="/preise" class="underline underline-offset-4"
					>Preise</a
				>
			</span>
		</Card.Footer>
	</Card.Root>

	{#if pro && localTexts > 0}
		<Card.Root>
			<Card.Header>
				<Card.Title>Aus diesem Browser übernehmen</Card.Title>
				<Card.Description>
					{localTexts === 1 ? 'Ein Text liegt' : `${localTexts} Texte liegen`} noch in der Bibliothek
					dieses Browsers. Mit Fortschritt, Einstellungen und Leseprofil ins Konto übernehmen? Texte,
					die schon im Konto sind, überspringt Lector.
				</Card.Description>
			</Card.Header>
			<Card.Footer class="flex flex-wrap items-center gap-3">
				<Button
					variant="secondary"
					onclick={transferData}
					disabled={transfer.status === 'running' || transfer.status === 'done'}
				>
					{#if transfer.status === 'done'}<Check />{:else}<ArrowsClockwise />{/if}Übernehmen
				</Button>
				<span
					class="text-sm {transfer.status === 'failed'
						? 'text-destructive'
						: 'text-muted-foreground'}"
					aria-live="polite">{transfer.message}</span
				>
			</Card.Footer>
		</Card.Root>
	{/if}

	<section id="auswertung" class="flex scroll-mt-6 flex-col gap-4">
		<h2 class="font-heading text-2xl font-bold">Auswertung</h2>
		{#if !data.evaluation}
			<p class="text-muted-foreground">
				Mit Pro speichert Lector jede Antwort deiner Kalibrierungen und zeigt, wie dein Verständnis
				mit dem Tempo sinkt und wie sich deine Grenze mit der Zeit verschiebt.
			</p>
		{:else if !data.evaluation.curve.length}
			<p class="text-muted-foreground">
				Noch keine Kalibrierung im Konto.
				<a href="/kalibrierung" class="underline underline-offset-4">Jetzt kalibrieren</a>; danach
				steht hier deine Kurve.
			</p>
		{:else}
			{#if profile}
				<div class="flex flex-col gap-1">
					<p class="text-sm text-muted-foreground">Aktuelle Verständnisgrenze</p>
					<p class="text-5xl font-semibold">{profile.targetWpm} WPM</p>
					<p class="text-sm text-muted-foreground">
						{profile.comprehension !== null
							? `${percent(profile.comprehension)} richtig bis zu diesem Tempo · `
							: ''}kalibriert am {dates.format(new Date(profile.calibratedAt))}
					</p>
				</div>
			{/if}
			<Card.Root>
				<Card.Header>
					<Card.Title>Verständnis nach Lesetempo</Card.Title>
					<Card.Description>
						Anteil richtiger Antworten aus {data.evaluation.calibrations}
						{data.evaluation.calibrations === 1 ? 'Kalibrierung' : 'Kalibrierungen'}.
					</Card.Description>
				</Card.Header>
				<Card.Content>
					<SpeedCurve
						points={data.evaluation.curve}
						marker={profile ? { wpm: profile.targetWpm, label: 'Deine Grenze' } : undefined}
					/>
				</Card.Content>
			</Card.Root>
			{#if data.evaluation.history.length > 1}
				<ol class="flex flex-col divide-y rounded-lg border">
					{#each data.evaluation.history.toReversed() as entry (entry.calibratedAt)}
						<li class="flex items-center justify-between gap-4 px-4 py-3 text-sm">
							<span>{dates.format(new Date(entry.calibratedAt))}</span>
							<span class="tabular-nums">{entry.targetWpm} WPM</span>
						</li>
					{/each}
				</ol>
			{/if}
		{/if}
		<Button href="/kalibrierung" variant="secondary" class="self-start">Neu kalibrieren</Button>
	</section>
</main>
