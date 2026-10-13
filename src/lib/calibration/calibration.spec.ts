import { describe, expect, it } from 'vitest';
import {
	CALIBRATION_LADDER,
	evaluateCalibration,
	nextWpm,
	passed,
	scoreRun,
	shuffled,
	type CalibrationRun
} from './calibration.js';
import { loadProfile, PROFILE_KEY, saveProfile } from './profile.js';
import { CALIBRATION_TEXTS } from './texts.js';

const [water] = CALIBRATION_TEXTS;

/** Runs on the ladder with the given correct counts out of two answered questions. */
function runs(...correct: number[]): CalibrationRun[] {
	return correct.map((count, index) => ({
		textId: CALIBRATION_TEXTS[index].id,
		wpm: CALIBRATION_LADDER[index],
		correct: count,
		answered: 2,
		skipped: 0,
		depth: 'relation'
	}));
}

function memoryStorage(initial: Record<string, string> = {}) {
	const items = new Map(Object.entries(initial));
	return {
		getItem: (key: string) => items.get(key) ?? null,
		setItem: (key: string, value: string) => void items.set(key, value)
	};
}

describe('calibration texts', () => {
	it('has one distinct text with valid questions per ladder step', () => {
		expect(CALIBRATION_TEXTS.length).toBe(CALIBRATION_LADDER.length);
		expect(new Set(CALIBRATION_TEXTS.map((text) => text.id)).size).toBe(CALIBRATION_TEXTS.length);
		for (const text of CALIBRATION_TEXTS)
			for (const question of text.questions) {
				expect(question.options[question.correctIndex], question.id).toBeDefined();
				expect(new Set(question.options).size, question.id).toBe(question.options.length);
			}
	});
});

describe('scoreRun', () => {
	it('counts right answers and keeps skipped questions apart', () => {
		const right = water.questions.map((question) => question.correctIndex);
		expect(scoreRun(water, 300, right)).toEqual({
			textId: 'water',
			wpm: 300,
			correct: 2,
			answered: 2,
			skipped: 0,
			depth: 'relation'
		});
		expect(scoreRun(water, 300, [right[0], null])).toMatchObject({
			correct: 1,
			answered: 1,
			skipped: 1
		});
	});

	it('rejects answers that do not match the questions', () => {
		expect(() => scoreRun(water, 300, [0])).toThrow();
	});
});

describe('passed', () => {
	it('needs every question answered and right', () => {
		expect(passed(runs(2)[0])).toBe(true);
		expect(passed(runs(1)[0])).toBe(false);
		expect(passed({ ...runs(1)[0], answered: 1, skipped: 1 })).toBe(false);
		expect(passed({ ...runs(0)[0], answered: 0, skipped: 2 })).toBe(false);
	});
});

describe('nextWpm', () => {
	it('climbs the ladder and forgives one miss', () => {
		expect(nextWpm([])).toBe(200);
		expect(nextWpm(runs(2, 2))).toBe(400);
		expect(nextWpm(runs(2, 1, 2))).toBe(500);
	});

	it('ends at the second miss or at the top of the ladder', () => {
		expect(nextWpm(runs(2, 1, 2, 0))).toBeNull();
		expect(nextWpm(runs(2, 2, 2, 2, 2, 2))).toBeNull();
	});
});

describe('evaluateCalibration', () => {
	it('takes the fastest passed run as the limit', () => {
		expect(evaluateCalibration(runs(2, 2, 2, 1, 0))).toMatchObject({
			targetWpm: 400,
			comprehension: 1
		});
		// Comprehension covers every run up to the limit, the forgiven miss included.
		expect(evaluateCalibration(runs(2, 1, 2, 0))).toMatchObject({
			targetWpm: 400,
			comprehension: 5 / 6
		});
		expect(evaluateCalibration(runs(2, 2, 2, 2, 2, 2)).targetWpm).toBe(700);
	});

	it('gives no limit when no run passed', () => {
		expect(evaluateCalibration(runs(1, 0))).toMatchObject({
			targetWpm: null,
			comprehension: null
		});
	});
});

describe('shuffled', () => {
	it('permutes without changing the input', () => {
		const items = [1, 2, 3, 4];
		const result = shuffled(items, () => 0);
		expect(result).toEqual([2, 3, 4, 1]);
		expect(items).toEqual([1, 2, 3, 4]);
		expect([...shuffled(items)].sort()).toEqual(items);
	});
});

describe('stored profile', () => {
	const now = new Date('2026-10-13T12:00:00Z');

	it('round-trips a result with a limit', () => {
		const storage = memoryStorage();
		const saved = saveProfile(storage, evaluateCalibration(runs(2, 2, 1, 0)), now);
		expect(saved).toEqual({
			targetWpm: 300,
			comprehension: 1,
			calibratedAt: '2026-10-13T12:00:00.000Z'
		});
		expect(loadProfile(storage)).toEqual(saved);
	});

	it('keeps the previous profile when there is no limit', () => {
		const storage = memoryStorage();
		saveProfile(storage, evaluateCalibration(runs(2)), now);
		expect(saveProfile(storage, evaluateCalibration(runs(0, 1)), now)).toBeNull();
		expect(loadProfile(storage)?.targetWpm).toBe(200);
	});

	it('ignores missing, broken or out-of-range values', () => {
		expect(loadProfile(memoryStorage())).toBeNull();
		for (const value of [
			'{',
			'42',
			JSON.stringify({ targetWpm: 5000, comprehension: 1, calibratedAt: now.toISOString() }),
			JSON.stringify({ targetWpm: 300, comprehension: 2, calibratedAt: now.toISOString() }),
			JSON.stringify({ targetWpm: 300, comprehension: 1, calibratedAt: 'gestern' })
		])
			expect(loadProfile(memoryStorage({ [PROFILE_KEY]: value })), value).toBeNull();
	});
});
