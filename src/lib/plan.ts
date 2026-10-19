import type { DocumentFormat } from '#lib/library/library.js';
import { DEFAULT_PREFERENCES, type Appearance } from '#lib/preferences/preferences.js';
import { MAXIMUM_WPM } from '#lib/reader/settings.js';

/**
 * The tariffs of the spec. The prototype takes no payment: an account switches to Pro on
 * its account page. Business/Edu is a sales conversation, not a plan in the app.
 */
export type Plan = 'free' | 'pro';

/** Spec: Free reads up to about 300 WPM, Pro is limited only by the engine. */
export const FREE_MAXIMUM_WPM = 300;

/** Free imports text, TXT files, web articles and PDFs; Word documents and e-books are Pro. */
const PRO_FORMATS: readonly DocumentFormat[] = ['docx', 'epub'];

/** The browser library of Free holds this many texts; the account library of Pro has no limit. */
export const FREE_LIBRARY_SIZE = 3;

export function planOf(user: { plan?: string | null } | null | undefined): Plan {
	return user?.plan === 'pro' ? 'pro' : 'free';
}

export function maximumWpm(plan: Plan): number {
	return plan === 'pro' ? MAXIMUM_WPM : FREE_MAXIMUM_WPM;
}

export function allowsFormat(plan: Plan, format: DocumentFormat): boolean {
	return plan === 'pro' || !PRO_FORMATS.includes(format);
}

export function librarySize(plan: Plan): number {
	return plan === 'pro' ? Infinity : FREE_LIBRARY_SIZE;
}

/** Free reads in Lector's own look; the other fonts and backgrounds are Pro. Size is free. */
export function allowsStyles(plan: Plan): boolean {
	return plan === 'pro';
}

export function appearanceFor<T extends Appearance>(plan: Plan, appearance: T): T {
	if (allowsStyles(plan)) return appearance;
	return {
		...appearance,
		font: DEFAULT_PREFERENCES.font,
		background: DEFAULT_PREFERENCES.background
	};
}

/**
 * Pro keeps library, progress, settings and reading profile in the account, so every device
 * sees them. Everyone else keeps them in this browser, account or not.
 */
export function syncs(plan: Plan): boolean {
	return plan === 'pro';
}

/** What pages know about the signed-in person. */
export interface SessionUser {
	id: string;
	name: string;
	email: string;
	plan: Plan;
}
