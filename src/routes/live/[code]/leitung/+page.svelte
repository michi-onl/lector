<script lang="ts">
	import Logo from '#lib/components/logo.svelte';
	import StagePlayer from '#lib/components/reader/stage-player.svelte';
	import SpeedCurve from '#lib/components/speed-curve.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import { LivePoll } from '#lib/live/poll.svelte.js';
	import { DEFAULT_PREFERENCES } from '#lib/preferences/preferences.js';
	import { textBlocks } from '#lib/reader/index.js';
	import ArrowRight from 'phosphor-svelte/lib/ArrowRight';
	import ChartLine from 'phosphor-svelte/lib/ChartLine';
	import Check from 'phosphor-svelte/lib/Check';
	import Users from 'phosphor-svelte/lib/Users';
	import { untrack } from 'svelte';
	import type { PageProps } from './$types';

	/**
	 * The projector during the live demo: QR code, then each round's text at its speed, the
	 * answers coming in, the results, and finally the speed-up curve from the audience's data.
	 */
	let { data }: PageProps = $props();

	const poll = new LivePoll(untrack(() => data.code));
	const view = $derived(poll.view);
	const current = $derived(view ? view.rounds[view.round] : undefined);
	let player = $state<StagePlayer>();
	let read = $state(false);
	let advancing = $state(false);
	let width = $state(1280);

	const settings = $derived({
		...DEFAULT_PREFERENCES,
		background: 'night' as const,
		targetWpm: current?.wpm ?? 300,
		fontSize: Math.round(Math.min(144, Math.max(48, width / 11)))
	});
	const percent = (share: number) => `${Math.round(share * 100)} %`;
	const host = $derived(data.joinUrl.replace(/^https?:\/\//u, ''));

	async function next() {
		advancing = true;
		try {
			await poll.send({ action: 'advance' });
			read = false;
		} finally {
			advancing = false;
		}
	}

	function onkeydown(event: KeyboardEvent) {
		if (view?.phase !== 'reading' || event.key !== ' ') return;
		if ((event.target as HTMLElement | null)?.closest('button:not([data-reader-stage])')) return;
		event.preventDefault();
		player?.toggle();
	}
</script>

<svelte:window {onkeydown} bind:innerWidth={width} />

<svelte:head>
	<title>Live-Demo leiten · Lector</title>
</svelte:head>

<main class="mx-auto flex min-h-svh max-w-6xl flex-col gap-8 p-6">
	<header class="flex flex-wrap items-center justify-between gap-4">
		<div class="flex items-center gap-4">
			<a href="/live" aria-label="Zur Live-Demo-Übersicht"><Logo class="text-2xl" /></a>
			<span class="text-muted-foreground">Live-Demo</span>
		</div>
		{#if view}
			<div class="flex items-center gap-6 text-muted-foreground">
				<span class="flex items-center gap-2"><Users />{view.participants}</span>
				<span class="font-mono tracking-widest">{data.code}</span>
			</div>
		{/if}
	</header>

	{#if !view}
		<p class="text-muted-foreground">{poll.failure ?? 'Verbinde …'}</p>
	{:else if view.phase === 'lobby'}
		<section class="grid items-center gap-10 md:grid-cols-[auto_1fr]">
			<div class="w-72 rounded-xl bg-white p-3 sm:w-96">
				<!-- eslint-disable-next-line svelte/no-at-html-tags -- uqr draws only modules, never the encoded text -->
				{@html data.qr}
			</div>
			<div class="flex flex-col gap-6">
				<h1 class="font-heading text-4xl font-bold sm:text-5xl">Machen Sie mit!</h1>
				<p class="text-xl text-muted-foreground">
					QR-Code scannen oder <strong class="text-foreground">{host}</strong> öffnen.
				</p>
				<p class="font-mono text-5xl tracking-[0.3em]">{data.code}</p>
				<p class="text-xl">
					{view.participants === 1 ? 'Eine Person ist' : `${view.participants} Personen sind`} dabei.
				</p>
				<Button size="lg" class="self-start" onclick={next} disabled={advancing}>
					<ArrowRight />Runde 1 starten
				</Button>
			</div>
		</section>
	{:else if view.phase === 'reading' && current && view.text}
		<section class="flex flex-1 flex-col gap-6">
			<p class="text-xl text-muted-foreground">
				Runde {view.round + 1} von {view.rounds.length} ·
				<strong class="text-foreground">{current.wpm} WPM</strong> · „{current.title}“
			</p>
			{#key view.round}
				<StagePlayer
					bind:this={player}
					blocks={textBlocks(view.text)}
					{settings}
					completedText="Fertig gelesen"
					class="min-h-[50svh] flex-1"
					oncomplete={() => (read = true)}
				/>
			{/key}
			<div class="flex flex-wrap items-center gap-4">
				<Button
					size="lg"
					variant={read ? 'default' : 'secondary'}
					onclick={next}
					disabled={advancing}
				>
					<ArrowRight />Fragen freigeben
				</Button>
				<span class="text-sm text-muted-foreground">
					Tippen auf den Text oder Leertaste startet und pausiert.
				</span>
			</div>
		</section>
	{:else if view.phase === 'questions'}
		<section class="flex flex-1 flex-col items-center justify-center gap-8 text-center">
			<h1 class="font-heading text-4xl font-bold sm:text-5xl">Jetzt auf dem Handy antworten</h1>
			<p class="text-7xl font-semibold tabular-nums">
				{view.answered}<span class="text-muted-foreground"> / {view.participants}</span>
			</p>
			<p class="text-xl text-muted-foreground">haben geantwortet</p>
			<Button size="lg" onclick={next} disabled={advancing}><ChartLine />Auswerten</Button>
		</section>
	{:else if view.phase === 'results'}
		{@const result = view.results.at(-1)}
		{#if result}
			<section class="flex flex-col gap-8">
				<div class="flex flex-col gap-2">
					<p class="text-xl text-muted-foreground">Runde {result.round + 1} · „{result.title}“</p>
					<h1 class="text-6xl font-semibold">
						{percent(result.share)} richtig bei {result.wpm} WPM
					</h1>
					<p class="text-xl text-muted-foreground">
						{result.understood} von {result.participants} haben beide Fragen richtig beantwortet.
					</p>
				</div>
				<div class="grid gap-4 md:grid-cols-2">
					{#each result.questions as question (question.prompt)}
						<Card.Root>
							<Card.Header>
								<Card.Title class="text-lg leading-snug">{question.prompt}</Card.Title>
								<Card.Description class="flex items-start gap-2 text-base">
									<Check class="mt-1 shrink-0 text-primary" />{question.answer}
								</Card.Description>
							</Card.Header>
							<Card.Content class="flex items-center gap-4">
								<div class="h-3 flex-1 overflow-hidden rounded-full bg-muted">
									<div
										class="h-full rounded-full bg-primary"
										style:width="{question.share * 100}%"
									></div>
								</div>
								<span class="w-14 text-right font-medium tabular-nums"
									>{percent(question.share)}</span
								>
							</Card.Content>
						</Card.Root>
					{/each}
				</div>
				<Button size="lg" class="self-start" onclick={next} disabled={advancing}>
					{#if view.round + 1 < view.rounds.length}
						<ArrowRight />Runde {view.round + 2} starten
					{:else}
						<ChartLine />Speed-up-Kurve zeigen
					{/if}
				</Button>
			</section>
		{/if}
	{:else if view.phase === 'finished'}
		<section class="flex flex-col gap-6">
			<div class="flex flex-col gap-2">
				<h1 class="font-heading text-4xl font-bold">Speed-up-Kurve</h1>
				<p class="text-xl text-muted-foreground">
					Ihr Verständnis nach Lesetempo, live gemessen mit {view.participants} Personen.
				</p>
			</div>
			<Card.Root>
				<Card.Content class="pt-6">
					<SpeedCurve
						points={view.results.map((result) => ({
							wpm: result.wpm,
							share: result.share,
							count: result.answers
						}))}
						label="Verständnis des Publikums nach Lesetempo"
					/>
				</Card.Content>
			</Card.Root>
			<p class="max-w-3xl text-lg text-muted-foreground">
				Das Verständnis sinkt mit dem Tempo, aber nicht für alle gleich. Lector misst die Grenze für
				jede Person einzeln und liest genau so schnell.
			</p>
		</section>
	{/if}
</main>
