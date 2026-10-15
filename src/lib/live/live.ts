import { CALIBRATION_TEXTS, type CalibrationText } from '#lib/calibration/texts.js';
import { clampWpm } from '#lib/reader/settings.js';

/**
 * The live demo of the presentation: the presenter reads calibration texts on the projector
 * at rising speeds, the audience answers on their phones, the results form the speed-up
 * curve. Pure rules here; storage in `#lib/server/live.ts`.
 */
export type LivePhase = 'lobby' | 'reading' | 'questions' | 'results' | 'finished';

export interface LiveRound {
	textId: string;
	wpm: number;
}

/** Spec: reading at two speeds. Up to four make a finer curve. */
export const DEFAULT_LIVE_SPEEDS = [300, 600];
export const MAX_LIVE_ROUNDS = 4;

/** No 0/O, 1/I/L: the code is read off a projector. */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 5;

export function generateCode(random: () => number = Math.random): string {
	return Array.from(
		{ length: CODE_LENGTH },
		() => CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)]
	).join('');
}

/** What people type: case and spaces do not matter. */
export function normalizeCode(value: string): string {
	return value.toUpperCase().replace(/[^A-Z0-9]/gu, '');
}

/** Speeds from „300, 600“; null unless one to four speeds in the engine's range. */
export function parseSpeeds(value: string): number[] | null {
	const speeds = value
		.split(/[\s,;]+/u)
		.filter(Boolean)
		.map(Number);
	if (!speeds.length || speeds.length > MAX_LIVE_ROUNDS) return null;
	if (!speeds.every((speed) => Number.isInteger(speed) && clampWpm(speed) === speed)) return null;
	return speeds;
}

/** One calibration text per round, in the order of the texts. */
export function liveRounds(speeds: number[]): LiveRound[] {
	return speeds.map((wpm, index) => ({ textId: CALIBRATION_TEXTS[index].id, wpm }));
}

export function liveText(round: LiveRound): CalibrationText {
	const text = CALIBRATION_TEXTS.find((candidate) => candidate.id === round.textId);
	if (!text) throw new Error(`Unknown calibration text ${round.textId}`);
	return text;
}

/** The presenter's next step: read, ask, show the results, then the next round or the end. */
export function advance(
	phase: LivePhase,
	round: number,
	rounds: number
): { phase: LivePhase; round: number } {
	switch (phase) {
		case 'lobby':
			return { phase: 'reading', round: 0 };
		case 'reading':
			return { phase: 'questions', round };
		case 'questions':
			return { phase: 'results', round };
		case 'results':
			return round + 1 < rounds
				? { phase: 'reading', round: round + 1 }
				: { phase: 'finished', round };
		case 'finished':
			return { phase, round };
	}
}

/** Whether the results of a round are out, so its answers may be shown. */
export function revealed(phase: LivePhase, round: number, current: number): boolean {
	return round < current || (round === current && (phase === 'results' || phase === 'finished'));
}

export interface LiveAnswerRow {
	participantId: string;
	round: number;
	question: number;
	correct: boolean;
}

export interface RoundSummary {
	round: number;
	wpm: number;
	title: string;
	/** People who answered at least one question. */
	participants: number;
	/** Share of right answers; skips count as not understood. */
	share: number;
	answers: number;
	/** Share of right answers per question. */
	questions: { prompt: string; answer: string; share: number }[];
	/** People with every question right, the calibration's „verstanden“. */
	understood: number;
}

export function summarize(
	rounds: LiveRound[],
	answers: LiveAnswerRow[],
	upTo: number
): RoundSummary[] {
	return rounds.slice(0, upTo + 1).map((round, index) => {
		const text = liveText(round);
		const mine = answers.filter((answer) => answer.round === index);
		const people = new Map<string, { right: number; total: number }>();
		for (const answer of mine) {
			const person = people.get(answer.participantId) ?? { right: 0, total: 0 };
			person.total++;
			if (answer.correct) person.right++;
			people.set(answer.participantId, person);
		}
		const right = mine.filter((answer) => answer.correct).length;
		return {
			round: index,
			wpm: round.wpm,
			title: text.title,
			participants: people.size,
			share: mine.length ? right / mine.length : 0,
			answers: mine.length,
			questions: text.questions.map((question, questionIndex) => {
				const given = mine.filter((answer) => answer.question === questionIndex);
				return {
					prompt: question.prompt,
					answer: question.options[question.correctIndex],
					share: given.length ? given.filter((answer) => answer.correct).length / given.length : 0
				};
			}),
			understood: [...people.values()].filter((person) => person.right === text.questions.length)
				.length
		};
	});
}

/** What a screen polls: the projector (host) or a phone (participant). */
export interface LiveView {
	code: string;
	phase: LivePhase;
	round: number;
	rounds: { wpm: number; title: string }[];
	participants: number;
	/** People who have answered the current round. */
	answered: number;
	host: boolean;
	/** The current text, for the projector only. */
	text?: string;
	/** The current questions while they are asked, without the solution. */
	questions?: { prompt: string; options: string[] }[];
	/** The rounds whose results are out. */
	results: RoundSummary[];
	/** A participant's own results in those rounds, and whether the current round is done. */
	mine?: { round: number; right: number; total: number }[];
	submitted?: boolean;
}

/** A participant id is a random UUID the phone keeps; anything else is refused. */
export function validParticipant(value: unknown): value is string {
	return typeof value === 'string' && /^[A-Za-z0-9-]{8,64}$/u.test(value);
}
