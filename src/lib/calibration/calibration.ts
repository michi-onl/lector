import type { CalibrationText, QuestionDepth } from './texts.js';

/**
 * The speeds of a calibration, one text each, from ordinary reading speed up to the speed the
 * presentation ends with. The steps are wide enough that one text per step tells them apart.
 */
export const CALIBRATION_LADDER = [200, 300, 400, 500, 600, 700] as const;

/** One missed run can be a slip; the second one ends the calibration. */
export const ALLOWED_MISSES = 1;

/** One answer per question: the chosen option, or null for a skipped question. */
export type Answers = (number | null)[];

export interface CalibrationRun {
	textId: string;
	wpm: number;
	correct: number;
	answered: number;
	skipped: number;
	/** Deepest question depth asked, as `measurement.depth` stores it. */
	depth: QuestionDepth;
}

export interface CalibrationResult {
	/** The comprehension limit; null if no run passed. */
	targetWpm: number | null;
	/** Share of questions answered right up to and including the limit; null without a limit. */
	comprehension: number | null;
	runs: CalibrationRun[];
}

const DEPTHS: QuestionDepth[] = ['recall', 'understanding', 'relation'];

/** Scores one run. A skip is the answer „Weiß ich nicht“: not wrong, but not understood. */
export function scoreRun(text: CalibrationText, wpm: number, answers: Answers): CalibrationRun {
	if (answers.length !== text.questions.length)
		throw new Error('Every question needs an answer or a skip.');
	const answered = answers.filter((answer) => answer !== null).length;
	const correct = answers.filter(
		(answer, index) => answer === text.questions[index].correctIndex
	).length;
	const depth = DEPTHS.filter((candidate) =>
		text.questions.some((question) => question.depth === candidate)
	).at(-1);
	if (!depth) throw new Error('A calibration text needs questions.');
	return {
		textId: text.id,
		wpm,
		correct,
		answered,
		skipped: answers.length - answered,
		depth
	};
}

/** A run passes when every question is answered and right; with two questions that is 2 of 2. */
export function passed(run: CalibrationRun): boolean {
	return run.correct > 0 && run.correct === run.answered + run.skipped;
}

function misses(runs: CalibrationRun[]): number {
	return runs.filter((run) => !passed(run)).length;
}

/** The speed of the next run, or null when the calibration is over. */
export function nextWpm(runs: CalibrationRun[]): number | null {
	if (misses(runs) > ALLOWED_MISSES) return null;
	return CALIBRATION_LADDER[runs.length] ?? null;
}

/**
 * The comprehension limit: the fastest passed run before the calibration ended. Runs are
 * read on the rising ladder, so later runs are faster.
 */
export function evaluateCalibration(runs: CalibrationRun[]): CalibrationResult {
	const limit = runs.filter(passed).at(-1);
	if (!limit) return { targetWpm: null, comprehension: null, runs };
	const counted = runs.slice(0, runs.indexOf(limit) + 1);
	const asked = counted.reduce((sum, run) => sum + run.answered + run.skipped, 0);
	const correct = counted.reduce((sum, run) => sum + run.correct, 0);
	return { targetWpm: limit.wpm, comprehension: correct / asked, runs };
}

/**
 * Fisher–Yates with an injectable random source. Shuffling keeps a hard text from always
 * landing on the same speed.
 */
export function shuffled<T>(items: readonly T[], random: () => number = Math.random): T[] {
	const result = [...items];
	for (let index = result.length - 1; index > 0; index--) {
		const other = Math.floor(random() * (index + 1));
		[result[index], result[other]] = [result[other], result[index]];
	}
	return result;
}
