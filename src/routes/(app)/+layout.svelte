<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '#lib/components/ui/button/index.js';
	import Books from 'phosphor-svelte/lib/Books';
	import Gauge from 'phosphor-svelte/lib/Gauge';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	const links = [
		{ href: '/bibliothek', label: 'Bibliothek', icon: Books },
		{ href: '/kalibrierung', label: 'Kalibrierung', icon: Gauge }
	];

	const current = (href: string) =>
		page.url.pathname === href || page.url.pathname.startsWith(`${href}/`);
</script>

<div class="mx-auto flex min-h-svh max-w-3xl flex-col gap-8 p-6">
	<header class="flex items-center justify-between gap-4">
		<a href="/" class="font-heading text-2xl font-bold">Lect<span class="text-primary">o</span>r</a>
		<nav class="flex gap-1">
			{#each links as { href, label, icon: Icon } (href)}
				<Button
					variant={current(href) ? 'secondary' : 'ghost'}
					{href}
					aria-current={current(href) ? 'page' : undefined}
				>
					<Icon /><span class="max-sm:sr-only">{label}</span>
				</Button>
			{/each}
		</nav>
	</header>

	<main class="flex flex-col gap-8">
		{@render children()}
	</main>
</div>
