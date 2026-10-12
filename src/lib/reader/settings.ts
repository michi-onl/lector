export type SpeedMode = 'adaptive' | 'fixed';
/** Words per frame; 1 is classic RSVP, 2–3 is chunk mode. */
export type ChunkSize = 1 | 2 | 3;

export interface ReadingSettings {
	speedMode: SpeedMode;
	targetWpm: number;
	chunkSize: ChunkSize;
}

/**
 * The engine's range. The Free limit of about 300 WPM is a tariff rule on top of it; the
 * presentation opens at 700 WPM, so Pro needs head room beyond that.
 */
export const MINIMUM_WPM = 100;
export const MAXIMUM_WPM = 1000;

export const DEFAULT_READING_SETTINGS: ReadingSettings = {
	speedMode: 'adaptive',
	targetWpm: 300,
	chunkSize: 1
};

export function clampWpm(wpm: number): number {
	if (!Number.isFinite(wpm)) return DEFAULT_READING_SETTINGS.targetWpm;
	return Math.min(MAXIMUM_WPM, Math.max(MINIMUM_WPM, Math.round(wpm)));
}
