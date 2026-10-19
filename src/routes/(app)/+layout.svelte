<script lang="ts">
	import SiteHeader from '#lib/components/site-header.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<main class="mx-auto flex min-h-svh max-w-3xl flex-col gap-8 p-6">
	<SiteHeader />
	{@render children()}
</main>
