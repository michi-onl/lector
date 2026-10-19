<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Alert from '#lib/components/ui/alert/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import WarningCircle from 'phosphor-svelte/lib/WarningCircle';
	import type { Snippet } from 'svelte';

	/** Sign-in and sign-up share this form; sign-up adds the name. */
	let {
		mode,
		form,
		footer
	}: {
		mode: 'sign-in' | 'sign-up';
		form: { name?: string; email?: string; message?: string } | null;
		footer: Snippet;
	} = $props();

	let pending = $state(false);
</script>

<Card.Root class="w-full max-w-md self-center">
	<Card.Header>
		<Card.Title class="font-heading text-2xl">
			{mode === 'sign-in' ? 'Anmelden' : 'Konto anlegen'}
		</Card.Title>
		<Card.Description>
			{mode === 'sign-in'
				? 'Mit deinem Lector-Konto.'
				: 'Das Konto kostet nichts. Mit Lector Pro findest du darin deine Texte, deinen Lesefortschritt und die Auswertung deiner Kalibrierungen, auf jedem Gerät.'}
		</Card.Description>
	</Card.Header>
	<Card.Content>
		<form
			method="POST"
			class="flex flex-col gap-4"
			use:enhance={() => {
				pending = true;
				return async ({ update }) => {
					await update();
					pending = false;
				};
			}}
		>
			{#if mode === 'sign-up'}
				<div class="flex flex-col gap-2">
					<Label for="name">Name</Label>
					<Input id="name" name="name" autocomplete="name" required value={form?.name ?? ''} />
				</div>
			{/if}
			<div class="flex flex-col gap-2">
				<Label for="email">E-Mail-Adresse</Label>
				<Input
					id="email"
					name="email"
					type="email"
					autocomplete="email"
					required
					value={form?.email ?? ''}
				/>
			</div>
			<div class="flex flex-col gap-2">
				<Label for="password">Passwort</Label>
				<Input
					id="password"
					name="password"
					type="password"
					autocomplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
					minlength={mode === 'sign-up' ? 8 : undefined}
					required
				/>
			</div>
			{#if form?.message}
				<Alert.Root variant="destructive">
					<WarningCircle />
					<Alert.Description>{form.message}</Alert.Description>
				</Alert.Root>
			{/if}
			<Button type="submit" disabled={pending}>
				{mode === 'sign-in' ? 'Anmelden' : 'Konto anlegen'}
			</Button>
		</form>
	</Card.Content>
	<Card.Footer class="text-sm text-muted-foreground">
		{@render footer()}
	</Card.Footer>
</Card.Root>
