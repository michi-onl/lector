import { clampWpm } from '#lib/reader/index.js';
import type { CalibrationResult } from './calibration.js';

/**
 * The reading profile of the free tier lives in the browser, like its library. Accounts will
 * store the same result in D1 (`calibration`, `measurement`, `reading_profile`).
 */
export interface StoredProfile {
	targetWpm: number;
	comprehension: number;
	calibratedAt: string;
}

export const PROFILE_KEY = 'lector.profile';

type ProfileStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** Only a result with a limit becomes the profile; otherwise the previous one stays. */
export function saveProfile(
	storage: ProfileStorage,
	result: CalibrationResult,
	now = new Date()
): StoredProfile | null {
	if (result.targetWpm === null || result.comprehension === null) return null;
	const profile: StoredProfile = {
		targetWpm: result.targetWpm,
		comprehension: result.comprehension,
		calibratedAt: now.toISOString()
	};
	storage.setItem(PROFILE_KEY, JSON.stringify(profile));
	return profile;
}

/** Anything unreadable counts as no profile. */
export function loadProfile(storage: ProfileStorage): StoredProfile | null {
	try {
		const value: unknown = JSON.parse(storage.getItem(PROFILE_KEY) ?? 'null');
		if (typeof value !== 'object' || value === null) return null;
		const { targetWpm, comprehension, calibratedAt } = value as Record<string, unknown>;
		if (
			typeof targetWpm !== 'number' ||
			clampWpm(targetWpm) !== targetWpm ||
			typeof comprehension !== 'number' ||
			!(comprehension >= 0 && comprehension <= 1) ||
			typeof calibratedAt !== 'string' ||
			Number.isNaN(Date.parse(calibratedAt))
		)
			return null;
		return { targetWpm, comprehension, calibratedAt };
	} catch {
		return null;
	}
}
