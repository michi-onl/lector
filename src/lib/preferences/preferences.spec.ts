import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES, FONT_SIZE, parsePreferences } from './preferences.js';
import { loadLocalPreferences, PREFERENCES_KEY, saveLocalPreferences } from './store.js';
import { PROFILE_KEY } from '#lib/calibration/profile.js';

function memoryStorage(items: Record<string, string> = {}) {
	const map = new Map(Object.entries(items));
	return {
		getItem: (key: string) => map.get(key) ?? null,
		setItem: (key: string, value: string) => void map.set(key, value)
	};
}

describe('parsePreferences', () => {
	it('keeps valid preferences', () => {
		const preferences = {
			speedMode: 'fixed',
			targetWpm: 450,
			chunkSize: 2,
			font: 'mono',
			fontSize: 64,
			background: 'night'
		} as const;
		expect(parsePreferences(preferences)).toEqual(preferences);
	});

	it('replaces invalid fields with defaults and clamps numbers', () => {
		expect(
			parsePreferences({
				speedMode: 'turbo',
				targetWpm: 5000,
				chunkSize: 7,
				font: 'comic',
				fontSize: 400,
				background: 42
			})
		).toEqual({
			...DEFAULT_PREFERENCES,
			targetWpm: 1000,
			fontSize: FONT_SIZE.max
		});
	});

	it('reads anything else as the defaults', () => {
		expect(parsePreferences(null)).toEqual(DEFAULT_PREFERENCES);
		expect(parsePreferences('serif')).toEqual(DEFAULT_PREFERENCES);
	});
});

describe('local preferences', () => {
	it('start at the calibrated speed before the first save', () => {
		const storage = memoryStorage({
			[PROFILE_KEY]: JSON.stringify({
				targetWpm: 400,
				comprehension: 0.9,
				calibratedAt: '2026-10-13T10:00:00.000Z'
			})
		});
		expect(loadLocalPreferences(storage).targetWpm).toBe(400);
	});

	it('round-trip and then ignore the profile', () => {
		const storage = memoryStorage({
			[PROFILE_KEY]: JSON.stringify({
				targetWpm: 400,
				comprehension: 0.9,
				calibratedAt: '2026-10-13T10:00:00.000Z'
			})
		});
		saveLocalPreferences(storage, { ...DEFAULT_PREFERENCES, targetWpm: 250, background: 'sepia' });
		expect(loadLocalPreferences(storage)).toEqual({
			...DEFAULT_PREFERENCES,
			targetWpm: 250,
			background: 'sepia'
		});
	});

	it('survive damaged data', () => {
		expect(loadLocalPreferences(memoryStorage({ [PREFERENCES_KEY]: '{' }))).toEqual(
			DEFAULT_PREFERENCES
		);
	});
});
