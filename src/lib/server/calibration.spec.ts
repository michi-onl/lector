import { CALIBRATION_TEXTS, scoreRun } from '#lib/calibration/index.js';
import { describe, expect, it } from 'vitest';
import { confidence, parseRuns } from './calibration.js';

const [first, second, third] = CALIBRATION_TEXTS;
const right = (text: (typeof CALIBRATION_TEXTS)[number]) =>
	text.questions.map((question) => question.correctIndex);

describe('parseRuns', () => {
	it('accepts runs as the calibration scores them', () => {
		const runs = [scoreRun(first, 200, right(first)), scoreRun(second, 300, [null, null])];
		expect(parseRuns(JSON.parse(JSON.stringify(runs)))).toEqual(runs);
	});

	it('takes the depth from the text, not the request', () => {
		const run = { ...scoreRun(first, 200, right(first)), depth: 'recall' };
		expect(parseRuns([run])?.[0].depth).toBe(scoreRun(first, 200, right(first)).depth);
	});

	it('rejects unknown texts, repeated texts and counts that do not fit', () => {
		const run = scoreRun(first, 200, right(first));
		expect(parseRuns([{ ...run, textId: 'unknown' }])).toBeNull();
		expect(parseRuns([run, run])).toBeNull();
		expect(parseRuns([{ ...run, correct: 3 }])).toBeNull();
		expect(parseRuns([{ ...run, skipped: 1 }])).toBeNull();
		expect(parseRuns([{ ...run, wpm: 5000 }])).toBeNull();
		expect(parseRuns([])).toBeNull();
	});
});

describe('confidence', () => {
	it('grows with understood runs', () => {
		const pass = (text: (typeof CALIBRATION_TEXTS)[number], wpm: number) =>
			scoreRun(text, wpm, right(text));
		expect(confidence([scoreRun(first, 200, [null, null])])).toBe('insufficient');
		expect(confidence([pass(first, 200)])).toBe('developing');
		expect(confidence([pass(first, 200), pass(second, 300), pass(third, 400)])).toBe('stable');
	});
});
