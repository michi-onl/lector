<script lang="ts">
	import { page } from '$app/state';
	import Logo from '#lib/components/logo.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import * as RadioGroup from '#lib/components/ui/radio-group/index.js';
	import { normalizeCode } from '#lib/live/live.js';
	import { LivePoll } from '#lib/live/poll.svelte.js';
	import ArrowRight from 'phosphor-svelte/lib/ArrowRight';
	import { onMount } from 'svelte';

	/** One id per phone, kept across demos; it names no one. */
	const PARTICIPANT_KEY = 'lector.live.participant';
	const SKIP = 'skip';

	function participantId(): string {
		try {
			const stored = localStorage.getItem(PARTICIPANT_KEY);
			if (stored) return stored;
			const created = crypto.randomUUID();
			localStorage.setItem(PARTICIPANT_KEY, created);
			return created;
		} catch {
			return crypto.randomUUID();
		}
	}

	const code = normalizeCode(page.params.code ?? '');
	const me = participantId();
	const poll = new LivePoll(code, me);
	const view = $derived(poll.view);
	let answers = $state<string[]>([]);
	let sending = $state(false);
	let failure = $state<string | null>(null);

	const current = $derived(view?.rounds[view.round]);
	const complete = $derived(
		!!view?.questions && answers.length === view.questions.length && answers.every(Boolean)
	);
	const percent = (share: number) => `${Math.round(share * 100)} %`;

	onMount(() => {
		void poll.send({ action: 'join', participantId: me }).catch(() => {});
	});

	// A new round of questions starts with empty answers; polls in between keep them.
	let answersRound = -1;
	$effect(() => {
		if (view?.phase !== 'questions' || view.round === answersRound) return;
		answersRound = view.round;
		answers = view.questions!.map(() => '');
	});

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (!view || !complete) return;
		sending = true;
		failure = null;
		try {
			await poll.send({
				action: 'answer',
				participantId: me,
				round: view.round,
				answers: answers.map((answer) => (answer === SKIP ? null : Number(answer)))
			});
		} catch (error) {
			failure = error instanceof Error ? error.message : 'Nicht gesendet.';
		} finally {
			sending = false;
		}
	}
</script>

<svelte:head>
	<title>Live-Demo {code} · Lector</title>
</svelte:head>

<main class="mx-auto flex min-h-svh max-w-lg flex-col gap-8 p-6">
	<header class="flex items-center justify-between">
		<Logo class="text-2xl" />
		<span class="font-mono text-sm tracking-widest text-muted-foreground">{code}</span>
	</header>

	{#if !view}
		<p class="text-muted-foreground">{poll.failure ?? 'Verbinde …'}</p>
	{:else if view.phase === 'lobby'}
		<section class="flex flex-col gap-3">
			<h1 class="font-heading text-3xl font-bold">Du bist dabei!</h1>
			<p class="text-muted-foreground">
				Gleich läuft vorne ein Text, Wort für Wort. Lies mit, danach erscheinen hier zwei Fragen
				dazu.
			</p>
			<p class="text-sm text-muted-foreground">
				{view.participants === 1 ? 'Eine Person ist' : `${view.participants} Personen sind`} dabei.
			</p>
		</section>
	{:else if view.phase === 'reading' && current}
		<section class="flex flex-col gap-3">
			<p class="text-sm text-muted-foreground">Runde {view.round + 1} von {view.rounds.length}</p>
			<h1 class="font-heading text-3xl font-bold">Schau nach vorn</h1>
			<p class="text-muted-foreground">
				„{current.title}“ läuft mit <strong class="text-foreground">{current.wpm} WPM</strong>. Die
				Fragen kommen danach hierher.
			</p>
		</section>
	{:else if view.phase === 'questions' && !view.submitted}
		<!-- The answers fill in an effect; binding to a missing one is not allowed. -->
		{#if view.questions && answers.length === view.questions.length}
			<form class="flex flex-col gap-8" onsubmit={submit}>
				<h1 class="font-heading text-2xl font-bold">Was ist hängen geblieben?</h1>
				{#each view.questions as question, index (question.prompt)}
					<fieldset class="flex flex-col gap-3">
						<legend class="mb-3 font-medium">{question.prompt}</legend>
						<RadioGroup.Root bind:value={answers[index]} name="q{index}">
							{#each question.options as option, optionIndex (option)}
								<div class="flex items-center gap-3">
									<RadioGroup.Item value={String(optionIndex)} id="q{index}-{optionIndex}" />
									<Label for="q{index}-{optionIndex}" class="py-1 font-normal">{option}</Label>
								</div>
							{/each}
							<div class="flex items-center gap-3">
								<RadioGroup.Item value={SKIP} id="q{index}-skip" />
								<Label for="q{index}-skip" class="py-1 font-normal text-muted-foreground">
									Weiß ich nicht
								</Label>
							</div>
						</RadioGroup.Root>
					</fieldset>
				{/each}
				{#if failure}<p class="text-sm text-destructive">{failure}</p>{/if}
				<Button type="submit" size="lg" disabled={!complete || sending}
					><ArrowRight />Absenden</Button
				>
			</form>
		{/if}
	{:else if view.phase === 'questions'}
		<section class="flex flex-col gap-3">
			<h1 class="font-heading text-3xl font-bold">Danke!</h1>
			<p class="text-muted-foreground">
				{view.answered} von {view.participants} haben geantwortet. Die Auswertung kommt gleich vorne.
			</p>
		</section>
	{:else}
		{@const latest = view.results.at(-1)}
		{@const own = view.mine?.find((item) => item.round === latest?.round)}
		<section class="flex flex-col gap-6">
			{#if view.phase === 'finished'}
				<h1 class="font-heading text-3xl font-bold">Geschafft!</h1>
			{:else if latest}
				<h1 class="font-heading text-3xl font-bold">Runde {latest.round + 1}: {latest.wpm} WPM</h1>
				{#if own && own.total}
					<p class="text-xl">Du hattest {own.right} von {own.total} richtig.</p>
				{:else}
					<p class="text-muted-foreground">Diese Runde hast du nicht beantwortet.</p>
				{/if}
			{/if}
			<ol class="flex flex-col divide-y rounded-lg border">
				{#each view.results as result (result.round)}
					{@const mine = view.mine?.find((item) => item.round === result.round)}
					<li class="flex items-center justify-between gap-4 px-4 py-3 text-sm">
						<span class="tabular-nums">{result.wpm} WPM</span>
						<span class="text-muted-foreground tabular-nums">
							du {mine?.total ? `${mine.right}/${mine.total}` : '–'} · Saal {percent(result.share)}
						</span>
					</li>
				{/each}
			</ol>
			{#if view.phase === 'finished'}
				<p class="text-muted-foreground">
					Wie schnell trägt dein eigenes Verständnis? Die Kalibrierung dauert etwa fünf Minuten.
				</p>
				<Button href="/kalibrierung" class="self-start">Selbst kalibrieren</Button>
			{:else}
				<p class="text-sm text-muted-foreground">Gleich geht es weiter.</p>
			{/if}
		</section>
	{/if}
</main>
