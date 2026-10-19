<script lang="ts">
	import Logo from '#lib/components/logo.svelte';
	import RsvpDemo from '#lib/components/reader/rsvp-demo.svelte';
	import SiteHeader from '#lib/components/site-header.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import ArrowCounterClockwise from 'phosphor-svelte/lib/ArrowCounterClockwise';
	import Gauge from 'phosphor-svelte/lib/Gauge';
	import Play from 'phosphor-svelte/lib/Play';
	import Target from 'phosphor-svelte/lib/Target';
	import Timer from 'phosphor-svelte/lib/Timer';

	const features = [
		{
			icon: Gauge,
			title: 'Gemessene Geschwindigkeit',
			text: 'Ein kurzes Quiz findet das Tempo, bei dem du noch verstehst, was du liest – statt eines willkürlichen Maximums.'
		},
		{
			icon: Target,
			title: 'Ein fester Fixationspunkt',
			text: 'Jedes Wort erscheint an derselben Stelle, der burgunderrote Buchstabe zeigt, wohin der Blick fällt. Wie das „o“ im Logo.'
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

	const critique = [
		[
			'Verständnis sinkt bei hohem Tempo',
			'Die Kalibrierung per Quiz findet die persönliche Grenze.'
		],
		['Keine Regressionen möglich', 'Satz-Rewind per Tipp.'],
		['Starres Tempo passt nicht zu jedem Wort', 'Adaptive Geschwindigkeit pro Wort.']
	];
</script>

<svelte:head>
	<title>Lector – lesen, so schnell dein Verständnis trägt</title>
	<meta
		name="description"
		content="Lector zeigt Texte Wort für Wort, in der Geschwindigkeit, die dein Verständnis noch trägt. PDFs, Word-Dateien und Webartikel."
	/>
</svelte:head>

<main class="mx-auto flex min-h-svh max-w-5xl flex-col gap-20 p-6 pb-20">
	<SiteHeader />

	<section class="flex flex-col items-center gap-6 pt-8 text-center">
		<h1 class="sr-only">Lector</h1>
		<Logo class="text-6xl sm:text-7xl" />
		<p class="max-w-xl font-heading text-2xl text-balance sm:text-3xl">
			Lesen soll nie der Engpass beim Lernen sein.
		</p>
		<p class="max-w-xl text-muted-foreground">
			Lector zeigt deine Texte Wort für Wort – so schnell, wie dein Verständnis es noch trägt. Ein
			Quiz belegt, dass der Inhalt angekommen ist.
		</p>
		<div class="flex flex-wrap justify-center gap-3">
			<Button href="/kalibrierung"><Gauge />Tempo kalibrieren</Button>
			<Button href="/lesen" variant="secondary"><Play />Text lesen</Button>
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
			<h2 id="science" class="font-heading text-2xl font-bold">Ehrlich zur Forschung</h2>
			<p class="text-muted-foreground">
				Ohne das Zurückspringen der Augen sinkt das Verständnis bei hohem Tempo; Speed-Reading
				tauscht im Wesentlichen Verständnis gegen Tempo (Rayner et al. 2016). Lector nimmt die
				Kritik ernst:
			</p>
		</div>
		<dl class="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-3">
			{#each critique as [problem, answer] (problem)}
				<div class="flex flex-col gap-1 bg-card p-5">
					<dt class="text-sm text-muted-foreground">{problem}</dt>
					<dd class="font-medium">{answer}</dd>
				</div>
			{/each}
		</dl>
	</section>

	<section class="flex flex-col items-start gap-4 rounded-xl bg-muted p-8">
		<h2 class="font-heading text-2xl font-bold">PDFs, Word-Dateien und Webartikel</h2>
		<p class="max-w-2xl text-muted-foreground">
			Kostenlos liest Lector eingefügten Text und Webartikel bis 300 Wörter pro Minute. Mit Pro
			kommen PDF und Word, unbegrenztes Tempo, eine Bibliothek auf allen Geräten und die Auswertung
			deiner Quizantworten dazu.
		</p>
		<Button href="/preise" variant="secondary">Preise ansehen</Button>
	</section>

	<footer class="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
		<span>Für die Präsentation:</span>
		<a href="/praesentation" class="underline underline-offset-4">Team-Intro per RSVP</a>
		<a href="/live" class="underline underline-offset-4">Live-Demo mit Publikum</a>
	</footer>
</main>
