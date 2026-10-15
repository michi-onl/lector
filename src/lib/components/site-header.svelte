<script lang="ts">
	import { page } from '$app/state';
	import Logo from './logo.svelte';

	const links = [
		{ href: '/lesen', label: 'Lesen' },
		{ href: '/bibliothek', label: 'Bibliothek' },
		{ href: '/kalibrierung', label: 'Kalibrierung' },
		{ href: '/preise', label: 'Preise' }
	];

	const user = $derived(page.data.user);
	const accountPages = ['/konto', '/anmelden', '/registrieren'];
</script>

<header class="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
	<a href="/" aria-label="Lector, zur Startseite"><Logo class="text-2xl" /></a>
	<nav aria-label="Hauptnavigation" class="-mx-3 flex flex-wrap items-center gap-1 text-sm">
		{#each links as link (link.href)}
			<a
				href={link.href}
				class="rounded-full px-3 py-1.5 transition-colors hover:bg-muted aria-[current=page]:bg-muted aria-[current=page]:font-medium"
				aria-current={page.url.pathname.startsWith(link.href) ? 'page' : undefined}
			>
				{link.label}
			</a>
		{/each}
		<a
			href={user ? '/konto' : '/anmelden'}
			class="ml-1 rounded-full border px-3 py-1.5 transition-colors hover:bg-muted aria-[current=page]:bg-muted aria-[current=page]:font-medium"
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
	</nav>
</header>
