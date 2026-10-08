<script lang="ts">
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { Progress } from '#lib/components/ui/progress/index.js';
	import * as RadioGroup from '#lib/components/ui/radio-group/index.js';
	import { Separator } from '#lib/components/ui/separator/index.js';
	import { Slider } from '#lib/components/ui/slider/index.js';
	import { Switch } from '#lib/components/ui/switch/index.js';
	import ArrowCounterClockwise from 'phosphor-svelte/lib/ArrowCounterClockwise';
	import Check from 'phosphor-svelte/lib/Check';
	import FileDoc from 'phosphor-svelte/lib/FileDoc';
	import FilePdf from 'phosphor-svelte/lib/FilePdf';
	import Globe from 'phosphor-svelte/lib/Globe';
	import Moon from 'phosphor-svelte/lib/Moon';
	import Pause from 'phosphor-svelte/lib/Pause';
	import Play from 'phosphor-svelte/lib/Play';
	import UploadSimple from 'phosphor-svelte/lib/UploadSimple';
	import X from 'phosphor-svelte/lib/X';
	import { onMount } from 'svelte';

	// Theme toggle

	let dark = $state(false);

	// Start from the system setting; runs before the effect below.
	onMount(() => {
		dark =
			document.documentElement.classList.contains('dark') ||
			matchMedia('(prefers-color-scheme: dark)').matches;
	});

	$effect(() => {
		document.documentElement.classList.toggle('dark', dark);
		return () => document.documentElement.classList.remove('dark');
	});

	// RSVP reader

	const text =
		'Lesen soll nie der Engpass beim Lernen sein. Lector zeigt jeden Text Wort für Wort, genau so schnell, wie das eigene Verständnis es noch trägt. Ein kurzes Quiz prüft, ob der Inhalt angekommen ist, und kalibriert daran die Geschwindigkeit.';
	const words = text.split(' ');

	let wpm = $state(300);
	let index = $state(0);
	let playing = $state(false);

	const word = $derived(words[index]);
	const orp = $derived(orpIndex(word));

	function orpIndex(w: string) {
		const n = w.replace(/[^\p{L}\p{N}]/gu, '').length;
		if (n <= 1) return 0;
		if (n <= 5) return 1;
		if (n <= 9) return 2;
		if (n <= 13) return 3;
		return 4;
	}

	function delay(w: string) {
		let factor = 1;
		if (/[.!?]$/.test(w)) factor = 2;
		else if (/[,;:]$/.test(w)) factor = 1.5;
		else if (w.length > 8) factor = 1.3;
		return (60000 / wpm) * factor;
	}

	$effect(() => {
		if (!playing) return;
		const timer = setTimeout(() => {
			if (index < words.length - 1) index++;
			else playing = false;
		}, delay(word));
		return () => clearTimeout(timer);
	});

	function togglePlay() {
		if (!playing && index === words.length - 1) index = 0;
		playing = !playing;
	}

	function rewindSentence() {
		let i = index;
		if (i > 0 && /[.!?]$/.test(words[i - 1])) i--;
		while (i > 0 && !/[.!?]$/.test(words[i - 1])) i--;
		index = i;
	}

	// Quiz

	const answers = [
		{ value: 'a', label: 'Es zeigt Texte möglichst schnell an.' },
		{ value: 'b', label: 'Es misst, ob der Inhalt verstanden wurde.' },
		{ value: 'c', label: 'Es fasst Texte automatisch zusammen.' }
	];
	let answer = $state('');
	let checked = $state(false);

	// Library

	const library = [
		{
			title: 'So Much to Read, So Little Time',
			source: 'Rayner et al. 2016',
			icon: FilePdf,
			type: 'PDF',
			progress: 64
		},
		{
			title: 'Grundrechte, Art. 1–19 GG',
			source: 'Skript Staatsrecht',
			icon: FileDoc,
			type: 'DOCX',
			progress: 28
		},
		{
			title: 'Wie RSVP das Lesen verändert',
			source: 'zeit.de',
			icon: Globe,
			type: 'URL',
			progress: 100
		}
	];

	// Speed-up curve (sample data)

	const speeds = [200, 300, 400, 500, 600, 700, 800];
	const series = [
		{ name: 'Forschende', color: 'var(--chart-1)', values: [94, 93, 91, 87, 80, 70, 58] },
		{ name: 'Studierende', color: 'var(--chart-2)', values: [92, 90, 86, 79, 68, 55, 42] },
		{
			name: 'Juristinnen und Juristen',
			color: 'var(--chart-3)',
			values: [95, 92, 84, 72, 58, 44, 30]
		}
	];
	const threshold = 70;

	const W = 640;
	const H = 280;
	const m = { top: 16, right: 168, bottom: 40, left: 44 };
	const x = (wpm: number) => m.left + ((wpm - 200) / 600) * (W - m.left - m.right);
	const y = (pct: number) => m.top + (1 - pct / 100) * (H - m.top - m.bottom);
	const path = (values: number[]) =>
		values.map((v, i) => `${i ? 'L' : 'M'}${x(speeds[i])},${y(v)}`).join(' ');

	let hover = $state<number | null>(null);
	let svg: SVGSVGElement;

	function onPointerMove(e: PointerEvent) {
		const rect = svg.getBoundingClientRect();
		const vx = ((e.clientX - rect.left) / rect.width) * W;
		const wpm = 200 + ((vx - m.left) / (W - m.left - m.right)) * 600;
		const i = Math.round((wpm - 200) / 100);
		hover = i >= 0 && i < speeds.length ? i : null;
	}

	// Token swatches

	const swatches = [
		{ name: 'background', class: 'bg-background' },
		{ name: 'card', class: 'bg-card' },
		{ name: 'muted', class: 'bg-muted' },
		{ name: 'secondary', class: 'bg-secondary' },
		{ name: 'accent', class: 'bg-accent' },
		{ name: 'border', class: 'bg-border' },
		{ name: 'primary', class: 'bg-primary' },
		{ name: 'destructive', class: 'bg-destructive' },
		{ name: 'chart-1', class: 'bg-chart-1' },
		{ name: 'chart-2', class: 'bg-chart-2' },
		{ name: 'chart-3', class: 'bg-chart-3' },
		{ name: 'chart-4', class: 'bg-chart-4' },
		{ name: 'chart-5', class: 'bg-chart-5' }
	];
</script>

<svelte:head>
	<title>Theme – Lector</title>
</svelte:head>

<div class="mx-auto flex max-w-6xl flex-col gap-6 p-6">
	<header class="flex items-center justify-between gap-4">
		<div class="flex items-baseline gap-3">
			<span class="font-heading text-3xl font-bold">Lect<span class="text-primary">o</span>r</span>
			<span class="text-sm text-muted-foreground">Theme-Beispiel</span>
		</div>
		<div class="flex items-center gap-2">
			<Moon class="size-4 text-muted-foreground" />
			<Label for="dark">Dunkel</Label>
			<Switch id="dark" bind:checked={dark} />
		</div>
	</header>

	<div class="grid gap-6 lg:grid-cols-3">
		<!-- Reader -->
		<Card.Root class="lg:col-span-2">
			<Card.Header>
				<Card.Title>Leseengine</Card.Title>
				<Card.Description
					>ORP-Hervorhebung, adaptive Geschwindigkeit und Satz-Rewind</Card.Description
				>
				<Card.Action>
					<Badge variant="secondary">{wpm} WPM</Badge>
				</Card.Action>
			</Card.Header>
			<Card.Content class="flex flex-col gap-6">
				<div class="relative rounded-lg bg-muted py-14">
					<div class="absolute top-4 left-1/2 h-4 w-px bg-border"></div>
					<div class="absolute bottom-4 left-1/2 h-4 w-px bg-border"></div>
					<div class="grid grid-cols-[1fr_auto_1fr] font-heading text-5xl">
						<span class="text-right whitespace-pre">{word.slice(0, orp)}</span>
						<span class="text-primary">{word[orp]}</span>
						<span class="whitespace-pre">{word.slice(orp + 1)}</span>
					</div>
				</div>
				<Progress value={((index + 1) / words.length) * 100} />
				<div class="flex flex-wrap items-center gap-4">
					<Button onclick={togglePlay}>
						{#if playing}<Pause />Pause{:else}<Play />Lesen{/if}
					</Button>
					<Button variant="outline" onclick={rewindSentence}>
						<ArrowCounterClockwise />Satzanfang
					</Button>
					<div class="flex min-w-48 flex-1 items-center gap-3">
						<Label class="shrink-0 text-muted-foreground">Tempo</Label>
						<Slider type="single" bind:value={wpm} min={150} max={800} step={10} />
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Quiz -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Kalibrierungs-Quiz</Card.Title>
				<Card.Description>Frage 2 von 5 · gelesen mit {wpm} WPM</Card.Description>
			</Card.Header>
			<Card.Content class="flex flex-col gap-4">
				<p class="font-medium">Was unterscheidet Lector von anderen RSVP-Readern?</p>
				<RadioGroup.Root bind:value={answer} onValueChange={() => (checked = false)}>
					{#each answers as a (a.value)}
						<div class="flex items-center gap-3">
							<RadioGroup.Item value={a.value} id="answer-{a.value}" />
							<Label for="answer-{a.value}" class="font-normal">{a.label}</Label>
						</div>
					{/each}
				</RadioGroup.Root>
			</Card.Content>
			<Card.Footer class="flex items-center justify-between gap-3">
				<Button variant="secondary" disabled={!answer} onclick={() => (checked = true)}
					>Prüfen</Button
				>
				{#if checked && answer === 'b'}
					<Badge><Check />Richtig</Badge>
				{:else if checked}
					<Badge variant="destructive"><X />Leider falsch</Badge>
				{/if}
			</Card.Footer>
		</Card.Root>

		<!-- Speed-up curve -->
		<Card.Root class="lg:col-span-2">
			<Card.Header>
				<Card.Title>Speed-up-Kurve</Card.Title>
				<Card.Description>Verständnis je Lesegeschwindigkeit · Beispieldaten</Card.Description>
			</Card.Header>
			<Card.Content class="flex flex-col gap-3">
				<div class="flex flex-wrap gap-4 text-sm text-muted-foreground">
					{#each series as s (s.name)}
						<span class="flex items-center gap-2">
							<span class="h-0.5 w-4 rounded-full" style:background={s.color}></span>{s.name}
						</span>
					{/each}
				</div>
				<div class="relative">
					<svg
						bind:this={svg}
						viewBox="0 0 {W} {H}"
						class="w-full touch-none text-xs"
						role="img"
						aria-label="Liniendiagramm: Verständnis in Prozent je Wörter pro Minute"
						onpointermove={onPointerMove}
						onpointerleave={() => (hover = null)}
					>
						{#each [0, 25, 50, 75, 100] as t (t)}
							<line x1={m.left} x2={W - m.right} y1={y(t)} y2={y(t)} class="stroke-border" />
							<text
								x={m.left - 8}
								y={y(t)}
								dy="0.32em"
								text-anchor="end"
								class="fill-muted-foreground"
							>
								{t}&nbsp;%
							</text>
						{/each}
						{#each speeds as s (s)}
							<text
								x={x(s)}
								y={H - m.bottom + 18}
								text-anchor="middle"
								class="fill-muted-foreground">{s}</text
							>
						{/each}
						<text
							x={(m.left + W - m.right) / 2}
							y={H - 4}
							text-anchor="middle"
							class="fill-muted-foreground"
						>
							Wörter pro Minute
						</text>

						<line
							x1={m.left}
							x2={W - m.right}
							y1={y(threshold)}
							y2={y(threshold)}
							class="stroke-muted-foreground"
							stroke-dasharray="4 4"
						/>
						<text x={m.left + 6} y={y(threshold) + 16} class="fill-muted-foreground">
							Verständnisgrenze {threshold}&nbsp;%
						</text>

						{#if hover !== null}
							<line
								x1={x(speeds[hover])}
								x2={x(speeds[hover])}
								y1={m.top}
								y2={H - m.bottom}
								class="stroke-muted-foreground"
							/>
						{/if}

						{#each series as s (s.name)}
							<path
								d={path(s.values)}
								fill="none"
								stroke={s.color}
								stroke-width="2"
								stroke-linejoin="round"
							/>
							<circle
								cx={x(speeds.at(-1)!)}
								cy={y(s.values.at(-1)!)}
								r="4"
								fill={s.color}
								class="stroke-card"
								stroke-width="2"
							/>
							<text
								x={x(speeds.at(-1)!) + 10}
								y={y(s.values.at(-1)!)}
								dy="0.32em"
								class="fill-foreground"
							>
								{s.name}
							</text>
							{#if hover !== null}
								<circle
									cx={x(speeds[hover])}
									cy={y(s.values[hover])}
									r="4"
									fill={s.color}
									class="stroke-card"
									stroke-width="2"
								/>
							{/if}
						{/each}
					</svg>

					{#if hover !== null}
						<div
							class="pointer-events-none absolute top-2 rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md"
							style:left="{(x(speeds[hover]) / W) * 100}%"
							style:transform="translateX({hover > 3 ? 'calc(-100% - 12px)' : '12px'})"
						>
							<div class="mb-1 font-medium">{speeds[hover]} WPM</div>
							{#each series as s (s.name)}
								<div class="flex items-center gap-2 whitespace-nowrap">
									<span class="size-2 rounded-full" style:background={s.color}></span>
									<span class="text-muted-foreground">{s.name}</span>
									<span class="ml-auto pl-3 tabular-nums">{s.values[hover]}&nbsp;%</span>
								</div>
							{/each}
						</div>
					{/if}
				</div>
				<details class="text-sm">
					<summary class="cursor-pointer text-muted-foreground">Als Tabelle anzeigen</summary>
					<table class="mt-2 w-full tabular-nums">
						<thead class="text-muted-foreground">
							<tr>
								<th class="py-1 text-left font-normal">WPM</th>
								{#each series as s (s.name)}<th class="py-1 text-right font-normal">{s.name}</th
									>{/each}
							</tr>
						</thead>
						<tbody>
							{#each speeds as sp, i (sp)}
								<tr class="border-t">
									<td class="py-1">{sp}</td>
									{#each series as s (s.name)}<td class="py-1 text-right">{s.values[i]}&nbsp;%</td
										>{/each}
								</tr>
							{/each}
						</tbody>
					</table>
				</details>
			</Card.Content>
		</Card.Root>

		<!-- Import -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Importieren</Card.Title>
				<Card.Description>Webartikel per Link oder Dokument hochladen</Card.Description>
			</Card.Header>
			<Card.Content class="flex flex-col gap-4">
				<div class="flex flex-col gap-2">
					<Label for="url">Artikel-URL</Label>
					<div class="flex gap-2">
						<Input id="url" placeholder="https://…" />
						<Button>Laden</Button>
					</div>
				</div>
				<Separator />
				<button
					class="flex flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
				>
					<UploadSimple class="size-6" />
					PDF, DOCX oder TXT hierher ziehen
				</button>
				<div class="flex flex-wrap gap-2">
					<Badge>Pro</Badge>
					<Badge variant="secondary">Free</Badge>
					<Badge variant="outline">Beta</Badge>
					<Badge variant="destructive">Fehler</Badge>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Library -->
		<Card.Root class="lg:col-span-2">
			<Card.Header>
				<Card.Title>Bibliothek</Card.Title>
				<Card.Description>Gespeicherte Inhalte mit Lesefortschritt</Card.Description>
			</Card.Header>
			<Card.Content class="flex flex-col">
				{#each library as item, i (item.title)}
					{#if i}<Separator />{/if}
					<div class="flex items-center gap-4 py-3">
						<item.icon class="size-6 shrink-0 text-primary" />
						<div class="flex min-w-0 flex-1 flex-col gap-1.5">
							<div class="flex items-center gap-2">
								<span class="truncate font-medium">{item.title}</span>
								<Badge variant="outline">{item.type}</Badge>
							</div>
							<span class="text-sm text-muted-foreground">{item.source}</span>
							<Progress value={item.progress} class="max-w-xs" />
						</div>
						<Button variant={item.progress === 100 ? 'ghost' : 'outline'} size="sm">
							{item.progress === 100 ? 'Erneut lesen' : 'Weiterlesen'}
						</Button>
					</div>
				{/each}
			</Card.Content>
		</Card.Root>

		<!-- Tokens -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Farben</Card.Title>
				<Card.Description>Theme-Tokens aus layout.css</Card.Description>
			</Card.Header>
			<Card.Content class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
				{#each swatches as s (s.name)}
					<div class="flex items-center gap-2">
						<span class="size-5 shrink-0 rounded-md border {s.class}"></span>
						<code class="text-muted-foreground">{s.name}</code>
					</div>
				{/each}
			</Card.Content>
			<Card.Footer class="flex flex-wrap gap-2">
				<Button size="sm">Primär</Button>
				<Button size="sm" variant="secondary">Sekundär</Button>
				<Button size="sm" variant="ghost">Ghost</Button>
				<Button size="sm" variant="destructive">Löschen</Button>
			</Card.Footer>
		</Card.Root>
	</div>
</div>
