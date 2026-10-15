import { describe, expect, it } from 'vitest';
import { allowsFormat, FREE_MAXIMUM_WPM, maximumWpm, planOf, syncs } from './plan.js';
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

	it('keeps PDF and DOCX for Pro', () => {
		expect(['text', 'txt', 'url'].every((format) => allowsFormat('free', format as never))).toBe(
			true
		);
		expect(allowsFormat('free', 'pdf')).toBe(false);
		expect(allowsFormat('free', 'docx')).toBe(false);
		expect(allowsFormat('pro', 'pdf')).toBe(true);
	});

	it('syncs Pro only', () => {
		expect(syncs('free')).toBe(false);
		expect(syncs('pro')).toBe(true);
	});
});
