import { describe, expect, it } from 'vitest';
import { DEMO_SPEED, DEMO_TEXT, demoWpm } from './demo.js';

const words = DEMO_TEXT.split(/\s+/u);

describe('demo speed', () => {
	it('runs from the start speed to the end speed', () => {
		expect(demoWpm(0, words.length)).toBe(DEMO_SPEED.from);
		expect(demoWpm(words.length - 1, words.length)).toBe(DEMO_SPEED.to);
	});

	it('never slows down', () => {
		const speeds = words.map((_, index) => demoWpm(index, words.length));
		expect(speeds).toEqual(speeds.toSorted((a, b) => a - b));
	});

	it('has more than doubled when the text says so', () => {
		const index = words.indexOf('Inzwischen');
		expect(demoWpm(index, words.length)).toBeGreaterThan(2 * DEMO_SPEED.from);
	});
});
