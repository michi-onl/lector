<script lang="ts">
	import { page } from '$app/state';
	import AuthForm from '#lib/components/auth-form.svelte';
	import SiteHeader from '#lib/components/site-header.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
	const next = $derived(page.url.searchParams.get('weiter'));
</script>

<svelte:head>
	<title>Anmelden · Lector</title>
</svelte:head>

<main class="mx-auto flex min-h-svh max-w-3xl flex-col gap-10 p-6">
	<SiteHeader />
	<AuthForm mode="sign-in" {form}>
		{#snippet footer()}
			Noch kein Konto?&nbsp;
			<a
				href="/registrieren{next ? `?weiter=${encodeURIComponent(next)}` : ''}"
				class="text-foreground underline underline-offset-4">Konto anlegen</a
			>
		{/snippet}
	</AuthForm>
</main>
