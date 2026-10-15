<script lang="ts" module>
	export interface CurvePoint {
		wpm: number;
		/** Share of answers that were right, 0–1. */
		share: number;
		/** Answers behind the share. */
		count: number;
	}
</script>

<script lang="ts">
	/**
	 * The speed-up curve: comprehension over reading speed. One series, so the heading of the
	 * surrounding section names it and there is no legend. Dots answer hover; the table below
	 * carries every value, also for keyboards and screen readers.
	 */
	let {
		points,
		marker,
		label = 'Verständnis nach Lesetempo'
	}: {
		points: CurvePoint[];
		/** A vertical reference, e.g. the calibrated limit. */
		marker?: { wpm: number; label: string };
		label?: string;
	} = $props();

	const HEIGHT = 260;
	const MARGIN = { top: 16, right: 24, bottom: 36, left: 44 };

	let width = $state(600);
	let active = $state<number | null>(null);

	const sorted = $derived(points.toSorted((a, b) => a.wpm - b.wpm));
	const domain = $derived.by(() => {
		const values = [...sorted.map((point) => point.wpm), ...(marker ? [marker.wpm] : [])];
		const low = Math.floor((Math.min(...values, 200) - 50) / 100) * 100;
		const high = Math.ceil((Math.max(...values, 400) + 50) / 100) * 100;
		return [Math.max(0, low), high] as const;
	});
	const ticks = $derived.by(() => {
		const [low, high] = domain;
		const step = high - low > 800 ? 200 : 100;
		const result: number[] = [];
		for (let value = Math.ceil(low / step) * step; value <= high; value += step) result.push(value);
		return result;
	});
	const plotWidth = $derived(Math.max(1, width - MARGIN.left - MARGIN.right));
	const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
	const x = (wpm: number) =>
		MARGIN.left + ((wpm - domain[0]) / (domain[1] - domain[0])) * plotWidth;
	const y = (share: number) => MARGIN.top + (1 - share) * plotHeight;
	const path = $derived(
		sorted.map((point, index) => `${index ? 'L' : 'M'}${x(point.wpm)},${y(point.share)}`).join(' ')
	);
	const percent = (share: number) => `${Math.round(share * 100)} %`;
	const last = $derived(sorted.at(-1));
</script>

<figure class="flex flex-col gap-3">
	<div class="relative" bind:clientWidth={width}>
		<svg
			{width}
			height={HEIGHT}
			viewBox="0 0 {width} {HEIGHT}"
			role="group"
			aria-label={label}
			class="overflow-visible text-xs"
		>
			{#each [0, 0.25, 0.5, 0.75, 1] as share (share)}
				<line
					x1={MARGIN.left}
					x2={width - MARGIN.right}
					y1={y(share)}
					y2={y(share)}
					class="stroke-border"
					stroke-width="1"
				/>
				<text
					x={MARGIN.left - 8}
					y={y(share)}
					text-anchor="end"
					dominant-baseline="middle"
					class="fill-muted-foreground tabular-nums">{percent(share)}</text
				>
			{/each}
			{#each ticks as tick (tick)}
				<text
					x={x(tick)}
					y={HEIGHT - MARGIN.bottom + 18}
					text-anchor="middle"
					class="fill-muted-foreground tabular-nums">{tick}</text
				>
			{/each}
			<text x={width - MARGIN.right} y={HEIGHT - 2} text-anchor="end" class="fill-muted-foreground"
				>Wörter pro Minute</text
			>

			{#if marker}
				<line
					x1={x(marker.wpm)}
					x2={x(marker.wpm)}
					y1={MARGIN.top}
					y2={MARGIN.top + plotHeight}
					class="stroke-muted-foreground"
					stroke-width="1"
				/>
				<!-- Below the limit comprehension is high, so the lower left of the line stays free. -->
				<text
					x={x(marker.wpm) - 6}
					y={MARGIN.top + plotHeight - 8}
					text-anchor="end"
					class="fill-foreground">{marker.label}</text
				>
			{/if}

			<path
				d={path}
				fill="none"
				class="stroke-primary"
				stroke-width="2"
				stroke-linejoin="round"
				stroke-linecap="round"
			/>
			{#each sorted as point, index (point.wpm)}
				<circle
					cx={x(point.wpm)}
					cy={y(point.share)}
					r={active === index ? 6 : 5}
					class="fill-primary stroke-card"
					stroke-width="2"
				/>
				<!-- The hit target is larger than the dot. -->
				<circle
					cx={x(point.wpm)}
					cy={y(point.share)}
					r="16"
					fill="transparent"
					role="img"
					aria-label="{point.wpm} WPM: {percent(point.share)} richtig, {point.count} Antworten"
					class="cursor-pointer"
					onpointerenter={() => (active = index)}
					onpointerleave={() => (active = null)}
				/>
			{/each}
			{#if last && active === null}
				<text
					x={x(last.wpm)}
					y={y(last.share) - 12}
					text-anchor="middle"
					class="fill-foreground font-medium tabular-nums">{percent(last.share)}</text
				>
			{/if}
		</svg>

		{#if active !== null && sorted[active]}
			{@const point = sorted[active]}
			<div
				class="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border bg-popover px-3 py-2 text-xs whitespace-nowrap text-popover-foreground shadow-sm"
				style:left="{x(point.wpm)}px"
				style:top="{y(point.share) - 12}px"
			>
				<div class="font-medium tabular-nums">{point.wpm} WPM</div>
				<div class="text-muted-foreground">
					{percent(point.share)} richtig · {point.count} Antworten
				</div>
			</div>
		{/if}
	</div>

	<details class="text-sm">
		<summary class="cursor-pointer text-muted-foreground">Als Tabelle anzeigen</summary>
		<table class="mt-2 w-full text-left tabular-nums">
			<thead class="text-muted-foreground">
				<tr
					><th class="py-1 font-normal">Tempo</th><th class="font-normal">Richtig</th><th
						class="font-normal">Antworten</th
					></tr
				>
			</thead>
			<tbody>
				{#each sorted as point (point.wpm)}
					<tr class="border-t">
						<td class="py-1">{point.wpm} WPM</td>
						<td>{percent(point.share)}</td>
						<td>{point.count}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</details>
</figure>
