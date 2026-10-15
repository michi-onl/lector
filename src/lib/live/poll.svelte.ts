import { api } from '#lib/api.js';
import type { LiveView } from './live.js';

/**
 * Keeps a live view fresh by polling: a few dozen phones every 1.5 s are no load for D1,
 * and polling needs no Durable Object. Create it during component initialisation; it stops
 * with the component and once the demo is finished.
 */
export class LivePoll {
	view = $state.raw<LiveView | null>(null);
	failure = $state<string | null>(null);
	readonly #path: string;
	readonly #query: string;

	constructor(code: string, participantId?: string, interval = 1500) {
		this.#path = `/api/live/${code}`;
		this.#query = participantId ? `?p=${encodeURIComponent(participantId)}` : '';
		$effect(() => {
			let timer: ReturnType<typeof setTimeout> | undefined;
			let stopped = false;
			const tick = async () => {
				await this.refresh();
				if (!stopped && this.view?.phase !== 'finished') timer = setTimeout(tick, interval);
			};
			void tick();
			return () => {
				stopped = true;
				clearTimeout(timer);
			};
		});
	}

	async refresh() {
		try {
			this.view = await api<LiveView>(`${this.#path}${this.#query}`);
			this.failure = null;
		} catch (error) {
			this.failure = error instanceof Error ? error.message : 'Keine Verbindung.';
		}
	}

	/** Sends an action and shows its effect right away instead of at the next poll. */
	async send(body: Record<string, unknown>) {
		await api(this.#path, { method: 'POST', json: body });
		await this.refresh();
	}
}
