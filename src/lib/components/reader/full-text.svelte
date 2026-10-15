<script lang="ts">
	import { blockWords, type TextBlock } from '#lib/reader/index.js';

	let {
		blocks,
		current,
		onseek
	}: {
		blocks: TextBlock[];
		/** The words on screen in the reader, or null once the text is read. */
		current: { wordIndex: number; length: number } | null;
		onseek: (wordIndex: number) => void;
	} = $props();

	const paragraphs = $derived(blockWords(blocks));
	let container: HTMLDivElement;

	// Keep the current word in view, scrolling only the panel and not the page.
	$effect(() => {
		if (!current) return;
		const word = container.querySelector<HTMLElement>(`[data-word="${current.wordIndex}"]`);
		if (!word) return;
		const top = word.offsetTop;
		const bottom = top + word.offsetHeight;
		if (top < container.scrollTop || bottom > container.scrollTop + container.clientHeight)
			container.scrollTop = top - container.clientHeight / 3;
	});

	function seek(event: MouseEvent) {
		const word = (event.target as HTMLElement).closest<HTMLElement>('[data-word]');
		if (word) onseek(Number(word.dataset.word));
	}
</script>

<!-- Words are not focusable, so Space keeps playing and pausing; the keyboard jumps by sentence. -->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div
	bind:this={container}
	class="relative flex max-h-96 flex-col gap-4 overflow-y-auto rounded-lg border p-5 leading-relaxed"
	onclick={seek}
>
	{#each paragraphs as { block, words } (block.id)}
		<p>
			{#each words as word (word.wordIndex)}
				{@const active =
					current !== null &&
					word.wordIndex >= current.wordIndex &&
					word.wordIndex < current.wordIndex + current.length}
				<span
					data-word={word.wordIndex}
					class={[
						'cursor-pointer rounded-sm hover:bg-muted',
						active && 'bg-primary text-primary-foreground hover:bg-primary'
					]}>{word.text}</span
				>
				<!-- eslint-disable-next-line svelte/no-useless-mustaches -- Svelte trims a plain space at the end of a block. -->
				{' '}
			{/each}
		</p>
	{/each}
</div>
