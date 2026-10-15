import {
	CALIBRATION_TEXTS,
	evaluateCalibration,
	passed,
	type CalibrationRun,
	type QuestionDepth,
	type StoredProfile
} from '#lib/calibration/index.js';
import { clampWpm } from '#lib/reader/settings.js';
import { and, asc, desc, eq, isNotNull } from 'drizzle-orm';
import type { Database } from './db/index.js';
import { calibration, measurement, readingProfile } from './db/schema.js';

const DEPTHS: QuestionDepth[] = ['recall', 'understanding', 'relation'];

/**
 * Checks runs sent by a browser against the calibration texts: known text, each text once,
 * counts that fit its questions. The depth is taken from the text, not from the request.
 */
export function parseRuns(value: unknown): CalibrationRun[] | null {
	if (!Array.isArray(value) || !value.length || value.length > CALIBRATION_TEXTS.length)
		return null;
	const runs: CalibrationRun[] = [];
	for (const item of value) {
		if (typeof item !== 'object' || item === null) return null;
		const { textId, wpm, correct, answered, skipped } = item as Record<string, unknown>;
		const text = CALIBRATION_TEXTS.find((candidate) => candidate.id === textId);
		const counts = [wpm, correct, answered, skipped];
		if (
			!text ||
			runs.some((run) => run.textId === text.id) ||
			!counts.every((count) => Number.isInteger(count) && (count as number) >= 0)
		)
			return null;
		const [speed, right, given, left] = counts as number[];
		if (clampWpm(speed) !== speed || right > given || given + left !== text.questions.length)
			return null;
		const depth = DEPTHS.filter((candidate) =>
			text.questions.some((question) => question.depth === candidate)
		).at(-1)!;
		runs.push({
			textId: text.id,
			wpm: speed,
			correct: right,
			answered: given,
			skipped: left,
			depth
		});
	}
	return runs;
}

/** Stable once three runs were understood; one or two make a developing profile. */
export function confidence(runs: CalibrationRun[]): 'insufficient' | 'developing' | 'stable' {
	const understood = runs.filter(passed).length;
	return understood >= 3 ? 'stable' : understood ? 'developing' : 'insufficient';
}

/**
 * Stores a calibration with its runs as measurements. Like the browser profile, only a
 * calibration that found a limit becomes the new profile.
 */
export async function saveCalibration(
	db: Database,
	userId: string,
	runs: CalibrationRun[],
	startedAt: Date
): Promise<StoredProfile | null> {
	const result = evaluateCalibration(runs);
	const now = new Date();
	const id = crypto.randomUUID();
	await db.batch([
		db.insert(calibration).values({ id, userId, startedAt, completedAt: now }),
		db.insert(measurement).values(
			runs.map((run) => ({
				userId,
				calibrationId: id,
				textId: run.textId,
				wpm: run.wpm,
				correct: run.correct,
				answered: run.answered,
				skipped: run.skipped,
				depth: run.depth,
				createdAt: now
			}))
		),
		...(result.targetWpm !== null
			? [
					db.insert(readingProfile).values({
						userId,
						calibrationId: id,
						targetWpm: result.targetWpm,
						comprehension: result.comprehension,
						confidence: confidence(runs),
						createdAt: now
					})
				]
			: [])
	]);
	return result.targetWpm !== null && result.comprehension !== null
		? {
				targetWpm: result.targetWpm,
				comprehension: result.comprehension,
				calibratedAt: now.toISOString()
			}
		: null;
}

export async function latestProfile(db: Database, userId: string): Promise<StoredProfile | null> {
	const row = await db
		.select()
		.from(readingProfile)
		.where(and(eq(readingProfile.userId, userId), isNotNull(readingProfile.targetWpm)))
		.orderBy(desc(readingProfile.createdAt))
		.get();
	if (row?.targetWpm == null || row.comprehension == null) return null;
	return {
		targetWpm: row.targetWpm,
		comprehension: row.comprehension,
		calibratedAt: row.createdAt.toISOString()
	};
}

/** Takes over the profile of the browser library, unless the account already has one. */
export async function importProfile(db: Database, userId: string, profile: StoredProfile) {
	if (await latestProfile(db, userId)) return false;
	await db.insert(readingProfile).values({
		userId,
		targetWpm: profile.targetWpm,
		comprehension: profile.comprehension,
		confidence: 'developing',
		createdAt: new Date(profile.calibratedAt)
	});
	return true;
}

/**
 * The „Quiz-Auswertung“ of Pro: every answer given, as comprehension per speed, and the
 * limit each calibration found.
 */
export async function evaluation(db: Database, userId: string) {
	const [measurements, profiles] = await Promise.all([
		db.select().from(measurement).where(eq(measurement.userId, userId)),
		db
			.select()
			.from(readingProfile)
			.where(and(eq(readingProfile.userId, userId), isNotNull(readingProfile.targetWpm)))
			.orderBy(asc(readingProfile.createdAt))
	]);
	const bySpeed = new Map<number, { correct: number; count: number }>();
	for (const row of measurements) {
		const point = bySpeed.get(row.wpm) ?? { correct: 0, count: 0 };
		point.correct += row.correct;
		point.count += row.answered + row.skipped;
		bySpeed.set(row.wpm, point);
	}
	return {
		curve: [...bySpeed]
			.filter(([, point]) => point.count > 0)
			.map(([wpm, point]) => ({ wpm, share: point.correct / point.count, count: point.count })),
		history: profiles.map((row) => ({
			targetWpm: row.targetWpm!,
			comprehension: row.comprehension,
			calibratedAt: row.createdAt.toISOString()
		})),
		calibrations: new Set(measurements.map((row) => row.calibrationId).filter(Boolean)).size
	};
}
