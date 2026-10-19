<script lang="ts">
	import { page } from '$app/state';
	import Books from 'phosphor-svelte/lib/Books';
	import Gauge from 'phosphor-svelte/lib/Gauge';
	import House from 'phosphor-svelte/lib/House';
	import Tag from 'phosphor-svelte/lib/Tag';
	import UserCircle from 'phosphor-svelte/lib/UserCircle';
	import { planOf, type SessionUser } from '#lib/plan.js';
	import Logo from './logo.svelte';

	/** A prerendered page doesn't know who is signed in, so it asks Better Auth in the browser. */
	let { prerendered = false }: { prerendered?: boolean } = $props();

	const links = [
		{ href: '/bibliothek', label: 'Bibliothek', icon: Books, paths: ['/bibliothek', '/lesen'] },
		{
			href: '/kalibrierung',
			label: 'Kalibrierung',
			short: 'Tempo',
			icon: Gauge,
			paths: ['/kalibrierung']
		},
		{ href: '/preise', label: 'Preise', icon: Tag, paths: ['/preise'] }
	];
	// The tab bar has no logo, so it leads home itself; its labels must fit a 360 px phone.
	const tabs: {
		href: string;
		label: string;
		short?: string;
		icon: typeof House;
		paths: string[];
	}[] = [{ href: '/', label: 'Start', icon: House, paths: [] }, ...links];

	// undefined while the prerendered page is still asking, so it doesn't flash „Anmelden“.
	let sessionUser = $state<SessionUser | null | undefined>(undefined);
	const user = $derived(prerendered ? sessionUser : page.data.user);

	$effect(() => {
		if (!prerendered) return;
		type Session = { user: Omit<SessionUser, 'plan'> & { plan?: string } } | null;
		fetch('/api/auth/get-session')
			.then((response) => (response.ok ? (response.json() as Promise<Session>) : null))
			.then((session) => {
				sessionUser = session && { ...session.user, plan: planOf(session.user) };
			})
			.catch(() => (sessionUser = null));
	});
	const accountPages = ['/konto', '/anmelden', '/registrieren'];
	const current = (href: string, paths: string[]) =>
		page.url.pathname === href || paths.some((path) => page.url.pathname.startsWith(path))
			? 'page'
			: undefined;
	const link =
		'rounded-lg px-3 py-2 text-primary-foreground/75 transition-colors hover:bg-black/10 hover:text-primary-foreground aria-[current=page]:bg-black/20 aria-[current=page]:text-primary-foreground';
	const solid =
		'rounded-lg bg-black/20 px-4 py-2 text-sm font-semibold transition-colors hover:bg-black/30 aria-[current=page]:bg-black/30';
	// Liquid Glass: the page shows through, blurred; solid when the system asks for less transparency.
	const glass =
		'border border-white/60 bg-background/70 shadow-[0_8px_32px_rgb(0_0_0/0.14)] backdrop-blur-xl backdrop-saturate-150 dark:border-white/10 dark:bg-background/60 [@media(prefers-reduced-transparency:reduce)]:bg-background';
</script>

<header class="sticky top-0 z-40 bg-primary text-primary-foreground">
	<div class="mx-auto flex h-16 max-w-5xl items-center gap-5 px-6">
		<a href="/" aria-label="Lector, zur Startseite">
			<!-- The burgundy „o“ would vanish on the bar, so it turns pale rose here. -->
			<Logo class="text-2xl [&>span]:text-[oklch(0.82_0.09_15)]" />
		</a>
		<nav aria-label="Hauptnavigation" class="hidden items-center gap-1 sm:flex">
			{#each links as { href, label, paths } (href)}
				<a {href} class={link} aria-current={current(href, paths)}>{label}</a>
			{/each}
		</nav>
		<div class="ml-auto flex items-center gap-2">
			{#if user}
				<a
					href="/konto"
					class="{solid} hidden items-center gap-1.5 sm:flex"
					aria-current={accountPages.includes(page.url.pathname) ? 'page' : undefined}
				>
					<span class="max-w-32 truncate">{user.name}</span>
					{#if user.plan === 'pro'}<span class="font-semibold text-[oklch(0.82_0.09_15)]">Pro</span
						>{/if}
				</a>
			{:else if user === null}
				<a
					href="/anmelden"
					class="{link} hidden sm:inline"
					aria-current={page.url.pathname === '/anmelden' ? 'page' : undefined}>Anmelden</a
				>
				<a
					href="/registrieren"
					class={solid}
					aria-current={page.url.pathname === '/registrieren' ? 'page' : undefined}>Registrieren</a
				>
			{/if}
		</div>
	</div>
	<!-- The page starts as a sheet with rounded corners laid over the bar. -->
	<div class="h-4 rounded-t-2xl bg-background sm:rounded-t-3xl"></div>
</header>

<nav
	id="tab-bar"
	aria-label="Hauptnavigation"
	class="fixed inset-x-0 bottom-0 z-50 flex items-center gap-2.5 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:hidden"
>
	<div class="{glass} flex flex-1 rounded-full p-1">
		{#each tabs as { href, label, short, icon: Icon, paths } (href)}
			<a
				{href}
				class="flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-full py-2 text-[0.6875rem] font-semibold text-foreground transition-colors aria-[current=page]:bg-foreground/8 aria-[current=page]:text-primary"
				aria-current={current(href, paths)}
			>
				<Icon weight="fill" class="size-6" />
				<span class="max-w-full truncate">{short ?? label}</span>
			</a>
		{/each}
	</div>
	<a
		href={user ? '/konto' : '/anmelden'}
		class="{glass} grid size-15 shrink-0 place-items-center rounded-full text-foreground aria-[current=page]:text-primary"
		aria-label={user ? 'Konto' : 'Anmelden'}
		aria-current={accountPages.includes(page.url.pathname) ? 'page' : undefined}
	>
		<UserCircle weight={user ? 'fill' : 'regular'} class="size-7" />
	</a>
</nav>

<style>
	/* Keeps the end of the page clear of the floating tab bar. */
	@media (width < 40rem) {
		:global(body:has(#tab-bar)) {
			padding-bottom: calc(5.5rem + env(safe-area-inset-bottom));
		}
	}
</style>
