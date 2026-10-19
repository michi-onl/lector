<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import SiteHeader from '#lib/components/site-header.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { CODE_LENGTH, DEFAULT_LIVE_SPEEDS, normalizeCode } from '#lib/live/live.js';
	import ArrowRight from 'phosphor-svelte/lib/ArrowRight';
	import PresentationChart from 'phosphor-svelte/lib/PresentationChart';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let code = $state('');

	function join(event: SubmitEvent) {
		event.preventDefault();
		void goto(`/live/${normalizeCode(code)}`);
	}
</script>

<svelte:head>
	<title>Live-Demo · Lector</title>
</svelte:head>

<SiteHeader />

<main class="mx-auto flex max-w-3xl flex-col gap-8 p-6">
	<div class="flex flex-col gap-1">
		<h1 class="font-heading text-3xl font-bold">Live-Demo</h1>
		<p class="text-muted-foreground">
			Vorne läuft ein Text in wachsendem Tempo, das Publikum beantwortet die Fragen auf dem Handy,
			und die Speed-up-Kurve entsteht live.
		</p>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>Mitmachen</Card.Title>
			<Card.Description
				>Den QR-Code scannen oder den Code von der Leinwand eingeben.</Card.Description
			>
		</Card.Header>
		<Card.Content>
			<form class="flex flex-col gap-3 sm:flex-row" onsubmit={join}>
				<Label for="code" class="sr-only">Code</Label>
				<Input
					id="code"
					bind:value={code}
					placeholder="Code"
					autocomplete="off"
					autocapitalize="characters"
					class="font-mono tracking-widest uppercase"
					maxlength={CODE_LENGTH + 2}
				/>
				<Button type="submit" disabled={normalizeCode(code).length !== CODE_LENGTH}>
					<ArrowRight />Beitreten
				</Button>
			</form>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Live-Demo leiten</Card.Title>
			<Card.Description>
				Für die Präsentation: Jede Runde zeigt einen Kalibrierungstext in eigenem Tempo.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if data.user}
				<form method="POST" class="flex flex-col gap-3" use:enhance>
					<Label for="speeds">Tempo der Runden in WPM</Label>
					<div class="flex flex-col gap-3 sm:flex-row">
						<Input
							id="speeds"
							name="speeds"
							value={form?.speeds ?? DEFAULT_LIVE_SPEEDS.join(', ')}
							inputmode="numeric"
						/>
						<Button type="submit"><PresentationChart />Starten</Button>
					</div>
					<p class="text-sm {form?.message ? 'text-destructive' : 'text-muted-foreground'}">
						{form?.message ?? 'Ein bis vier Runden; für die Präsentation sind zwei vorgesehen.'}
					</p>
				</form>
			{:else}
				<Button href="/anmelden?weiter=/live" variant="secondary">Zum Leiten anmelden</Button>
			{/if}
		</Card.Content>
	</Card.Root>
</main>
