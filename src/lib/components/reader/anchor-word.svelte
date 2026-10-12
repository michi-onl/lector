<script lang="ts" module>
	let measuringContext:
		CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null | undefined;

	/** A text measuring context for the real reader font; null where the runtime has none. */
	function measuring() {
		if (measuringContext === undefined) {
			try {
				measuringContext =
					typeof OffscreenCanvas !== 'undefined'
						? new OffscreenCanvas(1, 1).getContext('2d')
						: document.createElement('canvas').getContext('2d');
			} catch {
				measuringContext = null;
			}
		}
		return measuringContext;
	}
</script>

<script lang="ts">
	import { alignmentOffset, graphemes, selectOrp, shapeToken } from '#lib/reader/index.js';
	import { cn } from '#lib/utils.js';

	/**
	 * The centre of the ORP letter stays on a fixed anchor. The letter is chosen from widths
	 * measured in the font actually rendered; long words are scaled down around the anchor,
	 * never split. Without measurements the word is centred safely.
	 */
	let { word, class: className }: { word: string; class?: string } = $props();

	let stage = $state<HTMLSpanElement>();
	let text = $state<HTMLSpanElement>();
	let focus = $state<HTMLSpanElement>();
	let measured = $state<{ word: string; index: number }>();
	let layout = $state({ scale: 1, offset: 0 });

	const display = $derived(graphemes(word));
	const fallback = $derived(selectOrp(word).orpGraphemeIndex);
	const index = $derived(measured?.word === word ? measured.index : fallback);

	function measure() {
		if (!stage || !text || !focus) return;
		// Typography may change (font loading, size): measure again every time.
		const style = getComputedStyle(text);
		const context = measuring();
		let chosen = fallback;
		if (context && style.fontFamily) {
			context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
			const core = shapeToken(word).coreGraphemes;
			chosen = selectOrp(
				word,
				(count) => context.measureText(core.slice(0, count).join('')).width
			).orpGraphemeIndex;
		}
		if (chosen !== index) {
			measured = { word, index: chosen };
			return;
		}
		const orpLeft = focus.offsetLeft - text.offsetLeft;
		const orpWidth = focus.offsetWidth;
		const leftExtent = orpLeft + orpWidth / 2;
		const half = Math.max(0, stage.clientWidth / 2 - 24);
		const scale = Math.min(1, half / Math.max(1, leftExtent, text.offsetWidth - leftExtent));
		layout = { scale, offset: alignmentOffset(orpLeft, orpWidth) };
	}

	$effect(measure);

	$effect(() => {
		if (!stage) return;
		let active = true;
		const observer = new ResizeObserver(() => measure());
		observer.observe(stage);
		void document.fonts.ready.then(() => active && measure());
		return () => {
			active = false;
			observer.disconnect();
		};
	});
</script>

<!-- One named image for assistive technology, deliberately not a live region: announcing
every word during playback would drown out the reader. -->
<span
	bind:this={stage}
	class={cn('relative block h-[1.6em] w-full overflow-hidden', className)}
	role="img"
	aria-label={word}
>
	<span
		class="absolute top-0 left-1/2 leading-[1.6em] whitespace-pre"
		style:transform="scale({layout.scale})"
		style:transform-origin="0 50%"
		aria-hidden="true"
	>
		<span
			bind:this={text}
			class="inline-block"
			style:transform="translateX({layout.offset}px)"
			dir="auto"
			><span>{display.slice(0, index).join('')}</span><span bind:this={focus} class="text-primary"
				>{display[index] ?? ''}</span
			><span>{display.slice(index + 1).join('')}</span></span
		>
	</span>
</span>
