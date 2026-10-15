<script lang="ts">
	import { cn } from '#lib/utils.js';

	/** The word mark: the „o“ is the fixation point (ORP), in burgundy. */
	let { class: className }: { class?: string } = $props();
</script>

<span class={cn('font-heading font-bold', className)}>Lect<span class="text-primary">o</span>r</span
>
