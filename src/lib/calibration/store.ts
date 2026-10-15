import { api } from '#lib/api.js';
import { syncs, type Plan } from '#lib/plan.js';
import type { CalibrationResult } from './calibration.js';
import { loadProfile, saveProfile, type StoredProfile } from './profile.js';

/** The reading profile: Pro from the account, everyone else from this browser. */
export async function loadProfileFor(plan: Plan): Promise<StoredProfile | null> {
	if (!syncs(plan)) return loadProfile(localStorage);
	return api<StoredProfile | null>('/api/profile').catch(() => null);
}

/**
 * Keeps a finished calibration. Pro stores every run as a measurement for the evaluation;
 * the browser keeps only the resulting profile.
 */
export async function storeCalibration(
	plan: Plan,
	result: CalibrationResult,
	startedAt: Date
): Promise<StoredProfile | null> {
	if (!syncs(plan)) return saveProfile(localStorage, result);
	return api<StoredProfile | null>('/api/calibrations', {
		method: 'POST',
		json: { runs: result.runs, startedAt: startedAt.toISOString() }
	});
}
