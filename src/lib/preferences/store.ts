import { api } from '#lib/api.js';
import { loadProfile, type StoredProfile } from '#lib/calibration/profile.js';
import { appearanceFor, syncs, type Plan } from '#lib/plan.js';
import { parsePreferences, type Preferences } from './preferences.js';

export const PREFERENCES_KEY = 'lector.settings';

type PreferenceStorage = Pick<Storage, 'getItem' | 'setItem'>;

/**
 * The stored preferences; before the first save the speed comes from the calibration, so a
 * fresh calibration is what the first text starts with.
 */
export function loadLocalPreferences(storage: PreferenceStorage): Preferences {
	let stored: unknown = null;
	try {
		stored = JSON.parse(storage.getItem(PREFERENCES_KEY) ?? 'null');
	} catch {
		// Damaged data counts as none.
	}
	const preferences = parsePreferences(stored);
	if (stored === null) {
		const profile = loadProfile(storage);
		if (profile) preferences.targetWpm = profile.targetWpm;
	}
	return preferences;
}

export function saveLocalPreferences(storage: PreferenceStorage, preferences: Preferences) {
	storage.setItem(PREFERENCES_KEY, JSON.stringify(parsePreferences(preferences)));
}

/**
 * Preferences of the current person: Pro from the account, everyone else from this browser,
 * in the look the tariff allows.
 */
export async function loadPreferences(plan: Plan): Promise<Preferences> {
	if (!syncs(plan)) return appearanceFor(plan, loadLocalPreferences(localStorage));
	const stored = await api<Preferences | null>('/api/settings').catch(() => null);
	if (stored) return stored;
	const profile = await api<StoredProfile | null>('/api/profile').catch(() => null);
	return {
		...loadLocalPreferences(localStorage),
		...(profile && { targetWpm: profile.targetWpm })
	};
}

export async function savePreferences(plan: Plan, preferences: Preferences): Promise<void> {
	if (!syncs(plan)) return saveLocalPreferences(localStorage, preferences);
	await api('/api/settings', { method: 'PUT', json: preferences, keepalive: true });
}

/**
 * Saves preferences as they change, at most every `delay` ms; the account is not sent a
 * request for every step of a slider.
 */
export function preferenceSaver(plan: Plan, delay = 800) {
	let timer: ReturnType<typeof setTimeout> | undefined;
	let latest: Preferences | undefined;
	const flush = () => {
		clearTimeout(timer);
		timer = undefined;
		if (!latest) return;
		const preferences = latest;
		latest = undefined;
		savePreferences(plan, preferences).catch((error) =>
			console.error('Einstellungen nicht gespeichert', error)
		);
	};
	return {
		save(preferences: Preferences) {
			latest = preferences;
			if (!syncs(plan)) return flush();
			timer ??= setTimeout(flush, delay);
		},
		flush
	};
}
