import { loadProfile } from '#lib/calibration/profile.js';
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
