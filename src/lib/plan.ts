import type { DocumentFormat } from '#lib/library/library.js';
import { MAXIMUM_WPM } from '#lib/reader/settings.js';

/**
 * The tariffs of the spec. The prototype takes no payment: an account switches to Pro on
 * its account page. Business/Edu is a sales conversation, not a plan in the app.
 */
export type Plan = 'free' | 'pro';

/** Spec: Free reads up to about 300 WPM, Pro is limited only by the engine. */
export const FREE_MAXIMUM_WPM = 300;

/** Free imports URLs and text (TXT files are text); PDF and DOCX are Pro. */
const PRO_FORMATS: readonly DocumentFormat[] = ['pdf', 'docx'];

export function planOf(user: { plan?: string | null } | null | undefined): Plan {
	return user?.plan === 'pro' ? 'pro' : 'free';
}

export function maximumWpm(plan: Plan): number {
	return plan === 'pro' ? MAXIMUM_WPM : FREE_MAXIMUM_WPM;
}

export function allowsFormat(plan: Plan, format: DocumentFormat): boolean {
	return plan === 'pro' || !PRO_FORMATS.includes(format);
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
