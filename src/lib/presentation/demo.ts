/**
 * The RSVP demo on the start page: one text whose speed rises while it plays, from about the
 * speed most people read at to well beyond it. The text describes what the reader sees, so
 * its claims must stay true for the speeds below.
 */
export const DEMO_TEXT =
	'Diesen Text liest du gerade mit Lector. Jedes Wort erscheint an derselben Stelle, deine Augen müssen nicht mehr wandern. Der farbige Buchstabe zeigt, wohin dein Blick fällt. Merkst du, wie das Tempo steigt? Lange Wörter wie Verständniskontrolle bleiben trotzdem etwas länger stehen, Satzenden auch. Inzwischen sind es mehr als doppelt so viele Wörter pro Minute wie am Anfang. Ob du noch alles verstehst, prüft Lector mit einem kurzen Quiz – und richtet das Tempo danach.';

export const DEMO_SPEED = { from: 250, to: 700 } as const;

/**
 * The speed at a word: an ease-in-out curve, so the rise starts and ends gently. Rounded to
 * 10 WPM, so the counter reads calmly and neighbouring words share their timing context.
 */
export function demoWpm(wordIndex: number, totalWords: number): number {
	const progress = totalWords > 1 ? Math.min(1, Math.max(0, wordIndex / (totalWords - 1))) : 0;
	const eased = progress * progress * (3 - 2 * progress);
	return Math.round((DEMO_SPEED.from + (DEMO_SPEED.to - DEMO_SPEED.from) * eased) / 10) * 10;
}
