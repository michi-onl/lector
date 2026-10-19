<script lang="ts">
	import SiteHeader from '#lib/components/site-header.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<SiteHeader />

<main class="mx-auto flex max-w-3xl flex-col gap-8 p-6">
	{@render children()}
</main>
