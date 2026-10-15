import {
	advance,
	generateCode,
	liveRounds,
	liveText,
	revealed,
	summarize,
	type LiveView
} from '#lib/live/live.js';
import { and, eq } from 'drizzle-orm';
import type { Database } from './db/index.js';
import { liveAnswer, liveParticipant, liveSession } from './db/schema.js';

type Session = typeof liveSession.$inferSelect;

export async function createLiveSession(
	db: Database,
	hostId: string,
	speeds: number[]
): Promise<string> {
	// Codes are short, so a collision is possible; a few attempts are plenty.
	for (let attempt = 0; attempt < 5; attempt++) {
		const code = generateCode();
		const created = await db
			.insert(liveSession)
			.values({ code, hostId, rounds: liveRounds(speeds) })
			.onConflictDoNothing()
			.returning()
			.get();
		if (created) return created.code;
	}
	throw new Error('No free live session code');
}

export function findLiveSession(db: Database, code: string) {
	return db.select().from(liveSession).where(eq(liveSession.code, code)).get();
}

/**
 * Moves to the next phase. The update only applies to the phase it started from, so a
 * double click on the projector moves on once.
 */
export async function advanceLiveSession(db: Database, session: Session) {
	const next = advance(session.phase, session.round, session.rounds.length);
	await db
		.update(liveSession)
		.set({ ...next, updatedAt: new Date() })
		.where(
			and(
				eq(liveSession.id, session.id),
				eq(liveSession.phase, session.phase),
				eq(liveSession.round, session.round)
			)
		);
}

export async function joinLiveSession(db: Database, session: Session, participantId: string) {
	await db
		.insert(liveParticipant)
		.values({ sessionId: session.id, participantId })
		.onConflictDoNothing();
}

/**
 * Stores the answers of one round. Only while its questions are open, and only once: a
 * second submission changes nothing.
 */
export async function submitLiveAnswers(
	db: Database,
	session: Session,
	participantId: string,
	round: number,
	choices: unknown
): Promise<'saved' | 'closed' | 'invalid'> {
	if (session.phase !== 'questions' || session.round !== round) return 'closed';
	const text = liveText(session.rounds[round]);
	if (
		!Array.isArray(choices) ||
		choices.length !== text.questions.length ||
		!choices.every(
			(choice, index) =>
				choice === null ||
				(Number.isInteger(choice) && choice >= 0 && choice < text.questions[index].options.length)
		)
	)
		return 'invalid';
	await joinLiveSession(db, session, participantId);
	await db
		.insert(liveAnswer)
		.values(
			(choices as (number | null)[]).map((choice, question) => ({
				sessionId: session.id,
				participantId,
				round,
				question,
				choice,
				correct: choice === text.questions[question].correctIndex
			}))
		)
		.onConflictDoNothing();
	return 'saved';
}

export async function liveView(
	db: Database,
	session: Session,
	viewer: { userId?: string; participantId?: string }
): Promise<LiveView> {
	const [participants, answers] = await Promise.all([
		db
			.select({ id: liveParticipant.participantId })
			.from(liveParticipant)
			.where(eq(liveParticipant.sessionId, session.id)),
		db
			.select({
				participantId: liveAnswer.participantId,
				round: liveAnswer.round,
				question: liveAnswer.question,
				correct: liveAnswer.correct
			})
			.from(liveAnswer)
			.where(eq(liveAnswer.sessionId, session.id))
	]);
	const host = viewer.userId === session.hostId;
	const text = liveText(session.rounds[session.round]);
	const shown = session.rounds
		.map((_, round) => round)
		.filter((round) => revealed(session.phase, round, session.round));
	const current = answers.filter((answer) => answer.round === session.round);
	const view: LiveView = {
		code: session.code,
		phase: session.phase,
		round: session.round,
		rounds: session.rounds.map((round) => ({ wpm: round.wpm, title: liveText(round).title })),
		participants: participants.length,
		answered: new Set(current.map((answer) => answer.participantId)).size,
		host,
		results: shown.length ? summarize(session.rounds, answers, shown.at(-1)!) : []
	};
	if (host && session.phase === 'reading') view.text = text.text;
	if (session.phase === 'questions')
		view.questions = text.questions.map(({ prompt, options }) => ({ prompt, options }));
	if (viewer.participantId) {
		const own = answers.filter((answer) => answer.participantId === viewer.participantId);
		view.submitted = own.some((answer) => answer.round === session.round);
		view.mine = shown.map((round) => {
			const given = own.filter((answer) => answer.round === round);
			return {
				round,
				right: given.filter((answer) => answer.correct).length,
				total: given.length
			};
		});
	}
	return view;
}
