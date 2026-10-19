import { describe, expect, it } from 'vitest';
import {
	allowsFormat,
	appearanceFor,
	FREE_LIBRARY_SIZE,
	FREE_MAXIMUM_WPM,
	librarySize,
	maximumWpm,
	planOf,
	syncs
} from './plan.js';
import { DEFAULT_PREFERENCES, type Preferences } from './preferences/preferences.js';
import { MAXIMUM_WPM } from './reader/settings.js';

describe('plan', () => {
	it('treats visitors, unknown values and free accounts as Free', () => {
		expect(planOf(null)).toBe('free');
		expect(planOf({ plan: 'enterprise' })).toBe('free');
		expect(planOf({ plan: 'free' })).toBe('free');
		expect(planOf({ plan: 'pro' })).toBe('pro');
	});

	it('limits the speed of Free only', () => {
		expect(maximumWpm('free')).toBe(FREE_MAXIMUM_WPM);
		expect(maximumWpm('pro')).toBe(MAXIMUM_WPM);
	});

	it('keeps Word documents and e-books for Pro', () => {
		expect(
			['text', 'txt', 'url', 'pdf'].every((format) => allowsFormat('free', format as never))
		).toBe(true);
		expect(allowsFormat('free', 'docx')).toBe(false);
		expect(allowsFormat('free', 'epub')).toBe(false);
		expect(allowsFormat('pro', 'docx')).toBe(true);
		expect(allowsFormat('pro', 'epub')).toBe(true);
	});

	it('limits the library of Free only', () => {
		expect(librarySize('free')).toBe(FREE_LIBRARY_SIZE);
		expect(librarySize('pro')).toBe(Infinity);
	});

	it('gives Free the default font and background, but keeps its size', () => {
		const styled: Preferences = {
			...DEFAULT_PREFERENCES,
			font: 'mono',
			background: 'night',
			fontSize: 64
		};
		expect(appearanceFor('free', styled)).toEqual({ ...DEFAULT_PREFERENCES, fontSize: 64 });
		expect(appearanceFor('pro', styled)).toBe(styled);
	});

	it('syncs Pro only', () => {
		expect(syncs('free')).toBe(false);
		expect(syncs('pro')).toBe(true);
	});
});
