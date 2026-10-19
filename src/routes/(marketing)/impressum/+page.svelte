<script lang="ts">
	import SiteFooter from '#lib/components/site-footer.svelte';
	import SiteHeader from '#lib/components/site-header.svelte';
	import { operator } from '#lib/legal.js';
</script>

<svelte:head>
	<title>Impressum · Lector</title>
</svelte:head>

<SiteHeader prerendered />

<main class="mx-auto flex max-w-3xl flex-col gap-8 p-6 pb-16">
	<h1 class="font-heading text-3xl font-bold">Impressum</h1>

	<section class="flex flex-col gap-2">
		<h2 class="font-heading text-xl font-bold">Angaben gemäß § 5 DDG</h2>
		<p>
			{operator.name}<br />
			{operator.street}<br />
			{operator.city}
		</p>
	</section>

	<section class="flex flex-col gap-2">
		<h2 class="font-heading text-xl font-bold">Kontakt</h2>
		<p>
			E-Mail: <a href="mailto:{operator.email}" class="underline underline-offset-4"
				>{operator.email}</a
			>
		</p>
	</section>

	<section class="flex flex-col gap-2">
		<h2 class="font-heading text-xl font-bold">Über dieses Projekt</h2>
		<p class="text-muted-foreground">
			Lector ist ein Studienprojekt an der DHBW von Robin, Timo, Magnus und Michi. Die Seite zeigt
			einen Prototyp: Wir schließen keine Verträge und nehmen kein Geld, auch der Wechsel zu Pro
			kostet nichts.
		</p>
	</section>
</main>

<SiteFooter />
