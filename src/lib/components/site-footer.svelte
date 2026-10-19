<script lang="ts">
	import Logo from './logo.svelte';

	const columns = [
		{
			title: 'Lector',
			links: [
				{ href: '/bibliothek', label: 'Bibliothek' },
				{ href: '/kalibrierung', label: 'Kalibrierung' },
				{ href: '/preise', label: 'Preise' }
			]
		},
		{
			title: 'Konto',
			links: [
				{ href: '/anmelden', label: 'Anmelden' },
				{ href: '/registrieren', label: 'Registrieren' }
			]
		},
		{
			title: 'Präsentation',
			links: [
				{ href: '/praesentation', label: 'Team-Intro per RSVP' },
				{ href: '/live', label: 'Live-Demo mit Publikum' }
			]
		}
	];
</script>

<footer id="site-footer" class="bg-primary text-primary-foreground">
	<!-- The page sheet ends with rounded corners, as it starts below the header. -->
	<div class="h-4 rounded-b-2xl bg-background sm:rounded-b-3xl"></div>
	<!-- On phones the floating tab bar covers the bottom, so the footer reaches below it. -->
	<div
		class="mx-auto flex max-w-5xl flex-col gap-10 px-6 pt-12 pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:pb-12"
	>
		<div class="flex flex-col gap-10 sm:flex-row sm:justify-between">
			<div class="flex flex-col gap-2">
				<!-- The burgundy „o“ would vanish on the bar, so it turns pale rose here. -->
				<Logo class="text-2xl [&>span]:text-[oklch(0.82_0.09_15)]" />
				<p class="max-w-56 text-sm text-primary-foreground/75">Lesen, so schnell du verstehst.</p>
			</div>
			<nav aria-label="Fußzeile" class="grid grid-cols-2 gap-8 sm:grid-cols-3">
				{#each columns as column (column.title)}
					<div class="flex flex-col gap-3 text-sm">
						<h2 class="font-semibold">{column.title}</h2>
						<ul class="flex flex-col gap-2">
							{#each column.links as { href, label } (href)}
								<li>
									<a
										{href}
										class="text-primary-foreground/75 transition-colors hover:text-primary-foreground"
										>{label}</a
									>
								</li>
							{/each}
						</ul>
					</div>
				{/each}
			</nav>
		</div>
		<div
			class="flex flex-col gap-3 border-t border-primary-foreground/15 pt-6 text-sm text-primary-foreground/60 sm:flex-row sm:justify-between"
		>
			<p>© {new Date().getFullYear()} Lector · Robin, Timo, Magnus und Michi</p>
			<div class="flex gap-6">
				<a href="/impressum" class="transition-colors hover:text-primary-foreground">Impressum</a>
				<a href="/datenschutz" class="transition-colors hover:text-primary-foreground"
					>Datenschutz</a
				>
			</div>
		</div>
	</div>
</footer>

<style>
	/* A short page ends above the bottom of the window; the footer's colour fills the rest. */
	:global(html:has(#site-footer)) {
		background-color: var(--primary);
	}
</style>
