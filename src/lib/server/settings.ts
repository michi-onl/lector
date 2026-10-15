import { parsePreferences, type Preferences } from '#lib/preferences/preferences.js';
import { eq } from 'drizzle-orm';
import type { Database } from './db/index.js';
import { readingSettings } from './db/schema.js';

/** The reader preferences of a Pro account; null before the first save. */
export async function loadSettings(db: Database, userId: string): Promise<Preferences | null> {
	const row = await db
		.select()
		.from(readingSettings)
		.where(eq(readingSettings.userId, userId))
		.get();
	if (!row) return null;
	return parsePreferences({
		speedMode: row.adaptive ? 'adaptive' : 'fixed',
		targetWpm: row.targetWpm,
		chunkSize: row.chunkSize,
		font: row.font,
		fontSize: row.fontSizePx,
		background: row.background
	});
}

export async function saveSettings(db: Database, userId: string, value: unknown) {
	const preferences = parsePreferences(value);
	const row = {
		targetWpm: preferences.targetWpm,
		adaptive: preferences.speedMode === 'adaptive',
		chunkSize: preferences.chunkSize,
		font: preferences.font,
		fontSizePx: preferences.fontSize,
		background: preferences.background,
		updatedAt: new Date()
	};
	await db
		.insert(readingSettings)
		.values({ userId, ...row })
		.onConflictDoUpdate({ target: readingSettings.userId, set: row });
	return preferences;
}
