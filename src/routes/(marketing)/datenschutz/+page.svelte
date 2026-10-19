<script lang="ts">
	import SiteFooter from '#lib/components/site-footer.svelte';
	import SiteHeader from '#lib/components/site-header.svelte';
	import { operator } from '#lib/legal.js';

	const heading = 'font-heading text-xl font-bold';
</script>

<svelte:head>
	<title>Datenschutz · Lector</title>
</svelte:head>

<SiteHeader prerendered />

<main class="mx-auto flex max-w-3xl flex-col gap-8 p-6 pb-16 [&_p]:leading-relaxed">
	<div class="flex flex-col gap-2">
		<h1 class="font-heading text-3xl font-bold">Datenschutzerklärung</h1>
		<p class="text-muted-foreground">
			Kurz gesagt: Ohne Konto bleiben deine Texte in deinem Browser. Wir verwenden keine Werbung,
			kein Tracking und keine Analysedienste.
		</p>
	</div>

	<section class="flex flex-col gap-2">
		<h2 class={heading}>Verantwortlich</h2>
		<p>
			{operator.name}, {operator.street}, {operator.city}<br />
			E-Mail:
			<a href="mailto:{operator.email}" class="underline underline-offset-4">{operator.email}</a>
		</p>
	</section>

	<section class="flex flex-col gap-2">
		<h2 class={heading}>Hosting bei Cloudflare</h2>
		<p>
			Lector läuft bei Cloudflare, Inc., 101 Townsend St., San Francisco, CA 94107, USA. Bei jedem
			Aufruf verarbeitet Cloudflare deine IP-Adresse und technische Angaben wie Browser und Uhrzeit,
			um die Seite auszuliefern und vor Angriffen zu schützen. Rechtsgrundlage ist unser
			berechtigtes Interesse an einem sicheren Betrieb (Art. 6 Abs. 1 lit. f DSGVO). Cloudflare ist
			nach dem EU-U.S. Data Privacy Framework zertifiziert, für die Übermittlung in die USA gilt
			damit der Angemessenheitsbeschluss der EU-Kommission (Art. 45 DSGVO).
		</p>
	</section>

	<section class="flex flex-col gap-2">
		<h2 class={heading}>Lesen ohne Konto</h2>
		<p>
			Texte, Lesefortschritt, Einstellungen und dein Leseprofil speichert Lector in deinem Browser
			(IndexedDB und Local Storage). Dateien liest dein Browser selbst aus; sie werden nicht zu uns
			hochgeladen. Löschen kannst du diese Daten in der Bibliothek oder über die Einstellungen
			deines Browsers.
		</p>
		<p>
			Importierst du einen Webartikel, schickt dein Browser die Adresse an unseren Server. Er lädt
			die Seite, gibt den Text zurück und speichert dabei nichts. Die fremde Seite sieht dabei
			Cloudflare als Besucher, nicht dich.
		</p>
	</section>

	<section class="flex flex-col gap-2">
		<h2 class={heading}>Konto</h2>
		<p>
			Für ein Konto speichern wir Name, E-Mail-Adresse, Passwort (nur als Hash) und deinen Tarif.
			Meldest du dich an, setzen wir ein Sitzungscookie und speichern zur Sitzung deine IP-Adresse
			und deinen Browser, damit wir Missbrauch erkennen können. Die Sitzung endet, wenn du dich
			abmeldest oder sie abläuft. Rechtsgrundlage ist die Bereitstellung des Kontos (Art. 6 Abs. 1
			lit. b DSGVO).
		</p>
		<p>
			Mit Pro liegen deine Texte, Lesefortschritt, Einstellungen, Quizantworten und dein Leseprofil
			im Konto, damit du sie auf jedem Gerät hast. Hochgeladene Dateien speichern wir in Cloudflare
			R2 in der EU, alles Übrige in der Datenbank Cloudflare D1.
		</p>
		<p>
			Wir speichern diese Daten, solange dein Konto besteht. Texte löschst du selbst in der
			Bibliothek. Möchtest du dein Konto mit allen Daten löschen, schreib uns eine E-Mail.
		</p>
	</section>

	<section class="flex flex-col gap-2">
		<h2 class={heading}>Live-Demo</h2>
		<p>
			Wer bei einer Live-Demo mitmacht, bekommt eine zufällige Kennung, die im Browser bleibt. Mit
			ihr speichern wir die Antworten auf die Quizfragen, ohne Namen oder andere Angaben zur Person.
			Wir löschen Live-Sitzungen nach der Präsentation.
		</p>
	</section>

	<section class="flex flex-col gap-2">
		<h2 class={heading}>Cookies und Speicher im Browser</h2>
		<p>
			Lector setzt nur das Sitzungscookie für angemeldete Konten und nutzt den Speicher im Browser
			für die oben genannten Daten. Beides ist für die Funktion nötig und braucht deshalb keine
			Einwilligung (§ 25 Abs. 2 Nr. 2 TDDDG). Schriften liefern wir selbst aus, ohne Dienste
			Dritter.
		</p>
	</section>

	<section class="flex flex-col gap-2">
		<h2 class={heading}>Deine Rechte</h2>
		<p>
			Du hast das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17),
			Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch (Art.
			21). Schreib uns dafür eine E-Mail. Außerdem kannst du dich bei einer
			Datenschutz-Aufsichtsbehörde beschweren (Art. 77 DSGVO).
		</p>
	</section>

	<p class="text-sm text-muted-foreground">Stand: Oktober 2026</p>
</main>

<SiteFooter />
