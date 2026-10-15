<script lang="ts">
	import { page } from '$app/state';
	import SiteHeader from '#lib/components/site-header.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { Slider } from '#lib/components/ui/slider/index.js';
	import { FREE_MAXIMUM_WPM } from '#lib/plan.js';
	import Check from 'phosphor-svelte/lib/Check';

	const user = $derived(page.data.user);

	/** Assumption of the calculator: a printed page holds about 300 words. */
	const WORDS_PER_PAGE = 300;
	const WEEKS_PER_MONTH = 52 / 12;

	let pagesPerWeek = $state(100);
	let ownWpm = $state(240);
	let lectorWpm = $state(450);

	const savedHours = $derived(
		lectorWpm > ownWpm
			? (pagesPerWeek * WORDS_PER_PAGE * WEEKS_PER_MONTH * (1 / ownWpm - 1 / lectorWpm)) / 60
			: 0
	);
	const hours = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });

	const tiers = [
		{
			name: 'Free',
			price: '0 €',
			features: [
				'Text einfügen, TXT-Dateien und Webartikel',
				`Bis ${FREE_MAXIMUM_WPM} Wörter pro Minute`,
				'Kalibrierung per Quiz',
				'Bibliothek in diesem Browser'
			]
		},
		{
			name: 'Pro',
			price: '4–6 € / Monat',
			note: 'Studierendenrabatt',
			features: [
				'Alles aus Free',
				'PDF- und Word-Dateien, Originale im Konto',
				'Unbegrenzte Geschwindigkeit',
				'Bibliothek und Fortschritt auf allen Geräten',
				'Auswertung aller Quizantworten'
			]
		},
		{
			name: 'Business/Edu',
			price: 'Auf Anfrage',
			features: [
				'Lizenzen für Hochschulen und Kanzleien',
				'Alles aus Pro für jedes Mitglied',
				'Gemeinsame Einführung und Live-Kalibrierung'
			]
		}
	];
</script>

<svelte:head>
	<title>Preise · Lector</title>
</svelte:head>

<main class="mx-auto flex min-h-svh max-w-5xl flex-col gap-10 p-6">
	<SiteHeader />

	<div class="flex max-w-2xl flex-col gap-2">
		<h1 class="font-heading text-3xl font-bold">Preise</h1>
		<p class="text-muted-foreground">
			Lector verkauft keine maximale, sondern eine gemessene Geschwindigkeit. Kostenlos lesen, mit
			Pro die volle Geschwindigkeit nutzen, die dein Verständnis trägt. Die Preise sind ein Entwurf.
		</p>
	</div>

	<div class="grid gap-6 md:grid-cols-3">
		{#each tiers as tier (tier.name)}
			<Card.Root class={tier.name === 'Pro' ? 'border-primary ring-1 ring-primary' : ''}>
				<Card.Header>
					<Card.Title class="font-heading text-xl">{tier.name}</Card.Title>
					<Card.Description>
						<span class="text-2xl font-semibold text-foreground">{tier.price}</span>
						{#if tier.note}<span class="block">{tier.note}</span>{/if}
					</Card.Description>
				</Card.Header>
				<Card.Content class="flex-1">
					<ul class="flex flex-col gap-2 text-sm">
						{#each tier.features as feature (feature)}
							<li class="flex gap-2">
								<Check class="mt-0.5 shrink-0 text-primary" />{feature}
							</li>
						{/each}
					</ul>
				</Card.Content>
				<Card.Footer>
					{#if tier.name === 'Free'}
						<Button variant="secondary" href="/lesen">Kostenlos lesen</Button>
					{:else if tier.name === 'Pro'}
						<Button href={user ? '/konto' : '/registrieren?weiter=/konto'}>
							{user?.plan === 'pro' ? 'Dein Tarif' : 'Pro testen'}
						</Button>
					{:else}
						<p class="text-sm text-muted-foreground">Sprich uns nach der Präsentation an.</p>
					{/if}
				</Card.Footer>
			</Card.Root>
		{/each}
	</div>

	<section class="flex flex-col gap-6" aria-labelledby="calculator">
		<div class="flex flex-col gap-1">
			<h2 id="calculator" class="font-heading text-2xl font-bold">Gesparte Lesestunden</h2>
			<p class="text-sm text-muted-foreground">
				Wie viel Zeit Lector im Monat spart, bei rund {WORDS_PER_PAGE} Wörtern pro Seite.
			</p>
		</div>
		<div class="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
			<div class="flex flex-col gap-6">
				<div class="flex flex-col gap-3">
					<div class="flex justify-between text-sm">
						<Label>Seiten pro Woche</Label><span class="tabular-nums">{pagesPerWeek}</span>
					</div>
					<Slider type="single" bind:value={pagesPerWeek} min={10} max={500} step={10} />
				</div>
				<div class="flex flex-col gap-3">
					<div class="flex justify-between text-sm">
						<Label>Dein Tempo ohne Lector</Label><span class="tabular-nums">{ownWpm} WPM</span>
					</div>
					<Slider type="single" bind:value={ownWpm} min={100} max={400} step={10} />
				</div>
				<div class="flex flex-col gap-3">
					<div class="flex justify-between text-sm">
						<Label>Dein kalibriertes Tempo mit Lector</Label><span class="tabular-nums"
							>{lectorWpm} WPM</span
						>
					</div>
					<Slider type="single" bind:value={lectorWpm} min={100} max={1000} step={10} />
				</div>
			</div>
			<div class="flex flex-col gap-1 md:w-56 md:text-right">
				<p class="text-5xl font-semibold">{hours.format(savedHours)} h</p>
				<p class="text-sm text-muted-foreground">gespart pro Monat</p>
			</div>
		</div>
	</section>
</main>
