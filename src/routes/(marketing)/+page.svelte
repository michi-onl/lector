<script lang="ts">
	import Logo from '#lib/components/logo.svelte';
	import RsvpDemo from '#lib/components/reader/rsvp-demo.svelte';
	import SiteFooter from '#lib/components/site-footer.svelte';
	import SiteHeader from '#lib/components/site-header.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { FREE_MAXIMUM_WPM } from '#lib/plan.js';
	import ArrowCounterClockwise from 'phosphor-svelte/lib/ArrowCounterClockwise';
	import Gauge from 'phosphor-svelte/lib/Gauge';
	import Play from 'phosphor-svelte/lib/Play';
	import Target from 'phosphor-svelte/lib/Target';
	import Timer from 'phosphor-svelte/lib/Timer';

	const features = [
		{
			icon: Gauge,
			title: 'Gemessene Geschwindigkeit',
			text: 'Ein kurzes Quiz misst, bis zu welchem Tempo du noch verstehst, was du liest. Auf dieses Tempo stellt sich Lector ein.'
		},
		{
			icon: Target,
			title: 'Ein fester Fixationspunkt',
			text: 'Jedes Wort erscheint an derselben Stelle, und ein burgunderroter Buchstabe zeigt, wohin der Blick fällt, so wie das „o“ im Logo.'
		},
		{
			icon: Timer,
			title: 'Adaptives Tempo',
			text: 'Lange Wörter, Zahlen und Satzenden bleiben länger stehen, kurze Funktionswörter kürzer.'
		},
		{
			icon: ArrowCounterClockwise,
			title: 'Satz-Rewind',
			text: 'Ein Tipp aufs Wort springt zum Satzanfang. Er ersetzt das Zurückspringen der Augen beim normalen Lesen.'
		}
	];

	const findings = [
		[
			'Verständnis braucht das passende Tempo',
			'Die Kalibrierung per Quiz findet deine persönliche Geschwindigkeit.'
		],
		['Zurückspringen hilft beim Verstehen', 'Satz-Rewind per Tipp.'],
		['Jedes Wort braucht seine eigene Zeit', 'Adaptive Geschwindigkeit pro Wort.']
	];
</script>

<svelte:head>
	<title>Lector – lesen, so schnell du verstehst</title>
	<meta
		name="description"
		content="Lector zeigt dir Texte Wort für Wort, so schnell, wie du sie noch verstehst. Für PDFs, Word-Dateien und Webartikel."
	/>
</svelte:head>

<SiteHeader prerendered />

<main class="mx-auto flex max-w-5xl flex-col gap-20 p-6 pb-20">
	<section class="flex flex-col items-center gap-6 pt-8 text-center">
		<h1 class="sr-only">Lector</h1>
		<Logo class="text-6xl sm:text-7xl" />
		<p class="max-w-xl font-heading text-2xl text-balance sm:text-3xl">
			Lesen soll nie der Engpass beim Lernen sein.
		</p>
		<p class="max-w-xl text-muted-foreground">
			Lector zeigt deine Texte Wort für Wort, so schnell, wie du sie noch verstehst. In einem kurzen
			Quiz findest du dieses Tempo heraus.
		</p>
		<div class="flex flex-wrap justify-center gap-3">
			<Button href="/kalibrierung"><Gauge />Tempo kalibrieren</Button>
			<Button href="/bibliothek/neu" variant="secondary"><Play />Text lesen</Button>
		</div>
		<RsvpDemo class="mt-4 max-w-2xl" />
	</section>

	<section class="grid gap-8 sm:grid-cols-2" aria-label="Funktionen">
		{#each features as feature (feature.title)}
			<div class="flex gap-4">
				<feature.icon class="size-7 shrink-0 text-primary" />
				<div class="flex flex-col gap-1">
					<h2 class="font-medium">{feature.title}</h2>
					<p class="text-sm text-muted-foreground">{feature.text}</p>
				</div>
			</div>
		{/each}
	</section>

	<section class="flex flex-col gap-6" aria-labelledby="science">
		<div class="flex max-w-2xl flex-col gap-2">
			<h2 id="science" class="font-heading text-2xl font-bold">Auf Forschung gebaut</h2>
			<p class="text-muted-foreground">Lector setzt drei Ergebnisse der Leseforschung um:</p>
		</div>
		<dl class="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-3">
			{#each findings as [finding, answer] (finding)}
				<div class="flex flex-col gap-1 bg-card p-5">
					<dt class="text-sm text-muted-foreground">{finding}</dt>
					<dd class="font-medium">{answer}</dd>
				</div>
			{/each}
		</dl>
	</section>

	<section class="flex flex-col items-start gap-4 rounded-xl bg-muted p-8">
		<h2 class="font-heading text-2xl font-bold">PDFs, Word-Dateien und Webartikel</h2>
		<p class="max-w-2xl text-muted-foreground">
			Kostenlos liest du eingefügten Text, PDFs und Webartikel mit bis zu {FREE_MAXIMUM_WPM} Wörtern pro
			Minute. Mit Pro kommen Word und E-Books, unbegrenztes Tempo, eine Bibliothek auf allen Geräten und
			die Auswertung deiner Quizantworten dazu.
		</p>
		<Button href="/preise" variant="secondary">Preise ansehen</Button>
	</section>
</main>

<SiteFooter />
