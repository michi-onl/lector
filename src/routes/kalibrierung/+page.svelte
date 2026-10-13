<script lang="ts">
	import Reader from '#lib/components/reader/reader.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import * as RadioGroup from '#lib/components/ui/radio-group/index.js';
	import {
		CALIBRATION_LADDER,
		CALIBRATION_TEXTS,
		evaluateCalibration,
		loadProfile,
		nextWpm,
		passed,
		PRACTICE_TEXT,
		saveProfile,
		scoreRun,
		shuffled,
		type CalibrationResult,
		type CalibrationRun,
		type StoredProfile
	} from '#lib/calibration/index.js';
	import { DEFAULT_READING_SETTINGS, textBlocks } from '#lib/reader/index.js';
	import ArrowCounterClockwise from 'phosphor-svelte/lib/ArrowCounterClockwise';
	import ArrowRight from 'phosphor-svelte/lib/ArrowRight';
	import Check from 'phosphor-svelte/lib/Check';
	import Play from 'phosphor-svelte/lib/Play';
	import X from 'phosphor-svelte/lib/X';
	import { onMount } from 'svelte';

	type Step = 'intro' | 'practice' | 'practiced' | 'reading' | 'questions' | 'result';

	const PRACTICE_WPM = 200;
	/** Radio values are strings; this one stands for a skipped question. */
	const SKIP = 'skip';

	let step = $state<Step>('intro');
	let texts = $state.raw(CALIBRATION_TEXTS);
	let runs = $state.raw<CalibrationRun[]>([]);
	let answers = $state<string[]>([]);
	let result = $state.raw<CalibrationResult>();
	let saved = $state.raw<StoredProfile | null>(null);
	let previous = $state.raw<StoredProfile | null>(null);

	const wpm = $derived(nextWpm(runs));
	const text = $derived(texts[runs.length]);
	const complete = $derived(
		text && answers.length === text.questions.length && answers.every(Boolean)
	);

	onMount(() => {
		previous = loadProfile(localStorage);
	});

	function start(practice: boolean) {
		texts = shuffled(CALIBRATION_TEXTS);
		runs = [];
		result = undefined;
		saved = null;
		step = practice ? 'practice' : 'reading';
	}

	function askQuestions() {
		answers = text.questions.map(() => '');
		step = 'questions';
	}

	function submit(event: SubmitEvent) {
		event.preventDefault();
		if (!complete || wpm === null) return;
		const choices = answers.map((answer) => (answer === SKIP ? null : Number(answer)));
		runs = [...runs, scoreRun(text, wpm, choices)];
		if (nextWpm(runs) !== null) {
			step = 'reading';
			return;
		}
		result = evaluateCalibration(runs);
		saved = saveProfile(localStorage, result);
		if (saved) previous = saved;
		step = 'result';
	}

	const percent = (value: number) => `${Math.round(value * 100)} %`;
</script>

<svelte:head>
	<title>Kalibrierung · Lector</title>
</svelte:head>

<main class="mx-auto flex min-h-svh max-w-3xl flex-col gap-8 p-6">
	<header class="flex items-center justify-between gap-4">
		<a href="/" class="font-heading text-2xl font-bold">Lect<span class="text-primary">o</span>r</a>
		{#if step === 'reading' || step === 'questions'}
			<span class="text-sm text-muted-foreground">
				Text {runs.length + 1} von höchstens {CALIBRATION_LADDER.length}
			</span>
		{/if}
	</header>

	{#if step === 'intro'}
		<section class="flex flex-col gap-4">
			<h1 class="font-heading text-3xl font-bold">Wie schnell trägt dein Verständnis?</h1>
			<p>
				Du liest kurze Texte, jeden etwas schneller als den vorherigen – von {CALIBRATION_LADDER[0]}
				bis {CALIBRATION_LADDER.at(-1)} Wörtern pro Minute. Nach jedem Text folgen zwei Fragen zum Inhalt.
				Sobald das Verständnis zweimal nicht mehr reicht, ist die Kalibrierung vorbei.
			</p>
			<p class="text-muted-foreground">
				Das Tempo ist während eines Textes fest, pausieren kannst du jederzeit. Wenn du eine Antwort
				nicht weißt, wähle „Weiß ich nicht“ statt zu raten. Plane etwa fünf Minuten ein.
			</p>
			{#if previous}
				<p class="text-sm text-muted-foreground">
					Bisher kalibriert: {previous.targetWpm} WPM. Der Wert bleibt, bis eine neue Kalibrierung eine
					Grenze findet.
				</p>
			{/if}
			<div class="flex flex-wrap gap-3">
				<Button onclick={() => start(true)}><Play />Mit Probelauf beginnen</Button>
				<Button variant="ghost" onclick={() => start(false)}>Direkt messen</Button>
			</div>
		</section>
	{:else if step === 'practice'}
		<p class="text-muted-foreground">Probelauf mit {PRACTICE_WPM} WPM – wird nicht bewertet.</p>
		<Reader
			blocks={textBlocks(PRACTICE_TEXT)}
			settings={{ ...DEFAULT_READING_SETTINGS, targetWpm: PRACTICE_WPM }}
			locked
			oncomplete={() => (step = 'practiced')}
		/>
	{:else if step === 'practiced'}
		<section class="flex flex-col gap-4">
			<h1 class="font-heading text-3xl font-bold">So liest Lector.</h1>
			<p class="text-muted-foreground">
				Jetzt beginnt die Messung mit {CALIBRATION_LADDER[0]} WPM. Jeder Text startet erst, wenn du auf
				„Lesen“ tippst.
			</p>
			<div class="flex flex-wrap gap-3">
				<Button onclick={() => (step = 'reading')}><ArrowRight />Zum ersten Text</Button>
				<Button variant="ghost" onclick={() => (step = 'practice')}>
					<ArrowCounterClockwise />Probelauf wiederholen
				</Button>
			</div>
		</section>
	{:else if step === 'reading' && wpm !== null}
		<p class="text-muted-foreground">„{text.title}“ mit {wpm} WPM</p>
		{#key runs.length}
			<Reader
				blocks={textBlocks(text.text)}
				settings={{ ...DEFAULT_READING_SETTINGS, targetWpm: wpm }}
				locked
				oncomplete={askQuestions}
			/>
		{/key}
	{:else if step === 'questions'}
		<form class="flex flex-col gap-8" onsubmit={submit}>
			<h1 class="font-heading text-3xl font-bold">Was ist hängen geblieben?</h1>
			{#each text.questions as question, index (question.id)}
				<fieldset class="flex flex-col gap-3">
					<legend class="mb-3 font-medium">{question.prompt}</legend>
					<RadioGroup.Root bind:value={answers[index]} name={question.id}>
						{#each question.options as option, optionIndex (option)}
							<div class="flex items-center gap-3">
								<RadioGroup.Item value={String(optionIndex)} id="{question.id}-{optionIndex}" />
								<Label for="{question.id}-{optionIndex}" class="font-normal">{option}</Label>
							</div>
						{/each}
						<div class="flex items-center gap-3">
							<RadioGroup.Item value={SKIP} id="{question.id}-skip" />
							<Label for="{question.id}-skip" class="font-normal text-muted-foreground">
								Weiß ich nicht
							</Label>
						</div>
					</RadioGroup.Root>
				</fieldset>
			{/each}
			<Button type="submit" class="self-start" disabled={!complete}><ArrowRight />Weiter</Button>
		</form>
	{:else if step === 'result' && result}
		<section class="flex flex-col gap-6">
			{#if result.targetWpm !== null && result.comprehension !== null}
				<div class="flex flex-col gap-2">
					<p class="text-muted-foreground">Deine Verständnisgrenze</p>
					<p class="font-heading text-5xl font-bold">{result.targetWpm} WPM</p>
					<p class="text-muted-foreground">
						{percent(result.comprehension)} der Fragen bis zu diesem Tempo richtig beantwortet. Lector
						startet deine Texte ab jetzt mit {result.targetWpm} WPM; du kannst das Tempo jederzeit ändern.
					</p>
				</div>
			{:else}
				<div class="flex flex-col gap-2">
					<h1 class="font-heading text-3xl font-bold">Noch keine Grenze gefunden</h1>
					<p class="text-muted-foreground">
						Schon bei {CALIBRATION_LADDER[0]} WPM war kein Text vollständig verstanden. Probiere es in
						Ruhe noch einmal{previous
							? `; bis dahin bleibt dein bisheriges Tempo von ${previous.targetWpm} WPM`
							: ''}.
					</p>
				</div>
			{/if}

			<ol class="flex flex-col divide-y rounded-lg border">
				{#each result.runs as run (run.textId)}
					<li class="flex items-center justify-between gap-4 px-4 py-3">
						<span class="tabular-nums">{run.wpm} WPM</span>
						<span class="flex items-center gap-2 text-sm text-muted-foreground">
							{run.correct} von {run.answered + run.skipped} richtig
							{#if passed(run)}
								<Check class="text-primary" aria-label="verstanden" />
							{:else}
								<X aria-label="nicht verstanden" />
							{/if}
						</span>
					</li>
				{/each}
			</ol>

			<div class="flex flex-wrap gap-3">
				{#if saved}
					<Button href="/lesen"><Play />Mit {saved.targetWpm} WPM lesen</Button>
				{/if}
				<Button variant={saved ? 'ghost' : 'default'} onclick={() => start(false)}>
					<ArrowCounterClockwise />Neu kalibrieren
				</Button>
			</div>
		</section>
	{/if}
</main>
