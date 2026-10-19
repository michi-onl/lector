<script lang="ts">
	import { page } from '$app/state';
	import Reader from '#lib/components/reader/reader.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import * as RadioGroup from '#lib/components/ui/radio-group/index.js';
	import {
		CALIBRATION_LADDER,
		CALIBRATION_TEXTS,
		evaluateCalibration,
		nextWpm,
		passed,
		PRACTICE_TEXT,
		scoreRun,
		shuffled,
		type CalibrationResult,
		type CalibrationRun,
		type StoredProfile
	} from '#lib/calibration/index.js';
	import { DEFAULT_PREFERENCES, type Preferences } from '#lib/preferences/preferences.js';
	import { loadProfileFor, storeCalibration } from '#lib/calibration/store.js';
	import { maximumWpm, planOf, syncs } from '#lib/plan.js';
	import { loadPreferences, savePreferences } from '#lib/preferences/store.js';
	import { textBlocks } from '#lib/reader/index.js';
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
	/** The profile before this calibration, to show how far the speed moved. */
	let before = $state.raw<StoredProfile | null>(null);
	/** The reader's look; speed and chunking are fixed so every calibration is comparable. */
	let appearance = $state.raw<Preferences>(DEFAULT_PREFERENCES);
	let startedAt = new Date();
	let saving = $state(false);
	let failed = $state(false);

	const plan = $derived(planOf(page.data.user));
	const limit = $derived(maximumWpm(plan));

	function settingsAt(targetWpm: number): Preferences {
		return { ...appearance, speedMode: 'adaptive', chunkSize: 1, targetWpm };
	}

	const wpm = $derived(nextWpm(runs));
	const text = $derived(texts[runs.length]);
	const complete = $derived(
		text && answers.length === text.questions.length && answers.every(Boolean)
	);

	onMount(() => {
		void loadProfileFor(plan).then((profile) => (previous = profile));
		void loadPreferences(plan).then((preferences) => (appearance = preferences));
	});

	function start(practice: boolean) {
		texts = shuffled(CALIBRATION_TEXTS);
		runs = [];
		result = undefined;
		saved = null;
		failed = false;
		startedAt = new Date();
		step = practice ? 'practice' : 'reading';
	}

	function askQuestions() {
		answers = text.questions.map(() => '');
		step = 'questions';
	}

	async function finish(finished: CalibrationResult) {
		result = finished;
		before = previous;
		step = 'result';
		saving = true;
		try {
			saved = await storeCalibration(plan, finished, startedAt);
			if (saved) {
				previous = saved;
				// The texts start at the new limit from now on.
				const preferences = await loadPreferences(plan);
				await savePreferences(plan, { ...preferences, targetWpm: saved.targetWpm });
			}
		} catch (error) {
			console.error(error);
			failed = true;
		} finally {
			saving = false;
		}
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
		void finish(evaluateCalibration(runs));
	}

	const percent = (value: number) => `${Math.round(value * 100)} %`;
</script>

<svelte:head>
	<title>Kalibrierung · Lector</title>
</svelte:head>

{#if step === 'reading' || step === 'questions'}
	<p class="-mb-4 text-sm text-muted-foreground">
		Text {runs.length + 1} von höchstens {CALIBRATION_LADDER.length}
	</p>
{/if}

{#if step === 'intro'}
	<section class="flex flex-col gap-4">
		<h1 class="font-heading text-3xl font-bold">Wie schnell trägt dein Verständnis?</h1>
		<p>
			Lector zeigt dir nacheinander kurze Texte und erhöht dabei das Tempo, von
			{CALIBRATION_LADDER[0]} bis höchstens {CALIBRATION_LADDER.at(-1)} Wörter pro Minute. Nach jedem
			Text beantwortest du zwei Fragen zum Inhalt. Hast du zweimal nicht genug verstanden, endet die Kalibrierung.
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
	<p class="text-muted-foreground">Probelauf mit {PRACTICE_WPM} WPM, ohne Wertung.</p>
	<Reader
		blocks={textBlocks(PRACTICE_TEXT)}
		settings={settingsAt(PRACTICE_WPM)}
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
			settings={settingsAt(wpm)}
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
				{#if before}
					{@const change = result.targetWpm - before.targetWpm}
					<p class="font-medium text-primary">
						{#if change > 0}
							{change} WPM schneller als bei deiner letzten Kalibrierung
						{:else if change < 0}
							{-change} WPM langsamer als bei deiner letzten Kalibrierung
						{:else}
							Genauso schnell wie bei deiner letzten Kalibrierung
						{/if}
						({before.targetWpm} WPM)
					</p>
				{/if}
				<p class="text-muted-foreground">
					{percent(result.comprehension)} der Fragen bis zu diesem Tempo richtig beantwortet.
					{#if result.targetWpm > limit}
						Lector Free liest bis {limit} WPM; mit
						<a href="/preise" class="underline underline-offset-4">Lector Pro</a> nutzt du dein volles
						Tempo.
					{:else}
						Lector startet deine Texte ab jetzt mit {result.targetWpm} WPM; du kannst das Tempo jederzeit
						ändern.
					{/if}
				</p>
			</div>
		{:else}
			<div class="flex flex-col gap-2">
				<h1 class="font-heading text-3xl font-bold">Noch keine Grenze gefunden</h1>
				<p class="text-muted-foreground">
					Schon bei {CALIBRATION_LADDER[0]} WPM war kein Text vollständig verstanden. Probiere es in Ruhe
					noch einmal{previous
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

		<p class="text-sm text-muted-foreground" aria-live="polite">
			{#if saving}
				Wird gespeichert …
			{:else if failed}
				<span class="text-destructive">Das Ergebnis ließ sich nicht speichern.</span>
			{:else if saved && syncs(plan)}
				Gespeichert in deinem Konto, mit allen Antworten für die
				<a href="/konto#auswertung" class="underline underline-offset-4">Auswertung</a>.
			{/if}
		</p>

		<div class="flex flex-wrap gap-3">
			{#if saved}
				<Button href="/bibliothek/neu"
					><Play />Mit {Math.min(saved.targetWpm, limit)} WPM lesen</Button
				>
			{/if}
			<Button variant={saved ? 'ghost' : 'default'} onclick={() => start(false)}>
				<ArrowCounterClockwise />Neu kalibrieren
			</Button>
		</div>
	</section>
{/if}
