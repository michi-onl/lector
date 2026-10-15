import {
	clampWpm,
	DEFAULT_READING_SETTINGS,
	type ChunkSize,
	type ReadingSettings
} from '#lib/reader/settings.js';

/** „Optische Anpassung“ of the spec: how the reader stage looks. */
export type ReaderFont = 'serif' | 'sans' | 'mono';
export type ReaderBackground = 'cream' | 'white' | 'sepia' | 'night';

export interface Appearance {
	font: ReaderFont;
	fontSize: number;
	background: ReaderBackground;
}

/** Everything the reader remembers between texts; mirrors the D1 table `reading_settings`. */
export type Preferences = ReadingSettings & Appearance;

export const FONT_SIZE = { min: 28, max: 96, step: 4 } as const;

export const DEFAULT_PREFERENCES: Preferences = {
	...DEFAULT_READING_SETTINGS,
	font: 'serif',
	fontSize: 48,
	background: 'cream'
};

export const FONTS: Record<ReaderFont, { label: string; class: string }> = {
	serif: { label: 'Serif', class: 'font-heading' },
	sans: { label: 'Sans', class: 'font-sans' },
	mono: { label: 'Mono', class: 'font-mono' }
};

/**
 * Stage colours. `focus` colours the ORP letter and stays burgundy, the logo colour, on every
 * background; on night it is lightened to keep its contrast.
 */
export const BACKGROUNDS: Record<
	ReaderBackground,
	{ label: string; background: string; foreground: string; focus: string; guide: string }
> = {
	cream: {
		label: 'Creme',
		background: 'oklch(0.945 0.018 80)',
		foreground: 'oklch(0.235 0.025 25)',
		focus: 'oklch(0.43 0.145 15)',
		guide: 'oklch(0.85 0.025 75)'
	},
	white: {
		label: 'Weiß',
		background: 'oklch(1 0 0)',
		foreground: 'oklch(0.2 0.01 25)',
		focus: 'oklch(0.43 0.145 15)',
		guide: 'oklch(0.88 0.005 75)'
	},
	sepia: {
		label: 'Sepia',
		background: 'oklch(0.89 0.045 75)',
		foreground: 'oklch(0.3 0.045 50)',
		focus: 'oklch(0.42 0.14 20)',
		guide: 'oklch(0.78 0.05 70)'
	},
	night: {
		label: 'Nacht',
		background: 'oklch(0.185 0.018 25)',
		foreground: 'oklch(0.92 0.015 84)',
		focus: 'oklch(0.7 0.14 15)',
		guide: 'oklch(0.35 0.02 25)'
	}
};

const SPEED_MODES = ['adaptive', 'fixed'] as const;
const CHUNK_SIZES = [1, 2, 3] as const;

function oneOf<T>(options: readonly T[], value: unknown, fallback: T): T {
	return options.includes(value as T) ? (value as T) : fallback;
}

/**
 * Reads stored preferences field by field: what is missing or invalid takes the default, so
 * old or damaged data never breaks the reader.
 */
export function parsePreferences(value: unknown): Preferences {
	const stored = (typeof value === 'object' && value !== null ? value : {}) as Record<
		string,
		unknown
	>;
	const fontSize = Number(stored.fontSize);
	return {
		speedMode: oneOf(SPEED_MODES, stored.speedMode, DEFAULT_PREFERENCES.speedMode),
		targetWpm:
			typeof stored.targetWpm === 'number'
				? clampWpm(stored.targetWpm)
				: DEFAULT_PREFERENCES.targetWpm,
		chunkSize: oneOf<ChunkSize>(CHUNK_SIZES, stored.chunkSize, DEFAULT_PREFERENCES.chunkSize),
		font: oneOf(Object.keys(FONTS) as ReaderFont[], stored.font, DEFAULT_PREFERENCES.font),
		fontSize: Number.isFinite(fontSize)
			? Math.min(FONT_SIZE.max, Math.max(FONT_SIZE.min, Math.round(fontSize)))
			: DEFAULT_PREFERENCES.fontSize,
		background: oneOf(
			Object.keys(BACKGROUNDS) as ReaderBackground[],
			stored.background,
			DEFAULT_PREFERENCES.background
		)
	};
}
