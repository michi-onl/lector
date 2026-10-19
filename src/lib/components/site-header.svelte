<script lang="ts">
	import { page } from '$app/state';
	import Logo from './logo.svelte';

	/** A prerendered page doesn't know who is signed in, so it links to the app instead of the account. */
	let { prerendered = false }: { prerendered?: boolean } = $props();

	const links = [
		{ href: '/bibliothek', label: 'Bibliothek', paths: ['/bibliothek', '/lesen'] },
		{ href: '/kalibrierung', label: 'Kalibrierung', paths: ['/kalibrierung'] },
		{ href: '/preise', label: 'Preise', paths: ['/preise'] }
	];

	const user = $derived(page.data.user);
	const accountPages = ['/konto', '/anmelden', '/registrieren'];
	const shown = $derived(prerendered ? links.filter((link) => link.href !== '/bibliothek') : links);
	const link =
		'rounded-full px-3 py-1.5 transition-colors hover:bg-muted aria-[current=page]:bg-muted aria-[current=page]:font-medium';
</script>

<header class="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
	<a href="/" aria-label="Lector, zur Startseite"><Logo class="text-2xl" /></a>
	<nav aria-label="Hauptnavigation" class="-mx-3 flex flex-wrap items-center gap-1 text-sm">
		{#each shown as { href, label, paths } (href)}
			<a
				{href}
				class={link}
				aria-current={paths.some((path) => page.url.pathname.startsWith(path)) ? 'page' : undefined}
			>
				{label}
			</a>
		{/each}
		{#if prerendered}
			<a href="/bibliothek" class="ml-1 border {link}">Zur Bibliothek</a>
		{:else}
			<a
				href={user ? '/konto' : '/anmelden'}
				class="ml-1 border {link}"
				aria-current={accountPages.includes(page.url.pathname) ? 'page' : undefined}
			>
				{#if user}
					{user.name}{#if user.plan === 'pro'}<span class="ml-1.5 font-semibold text-primary"
							>Pro</span
						>{/if}
				{:else}
					Anmelden
				{/if}
			</a>
		{/if}
	</nav>
</header>
