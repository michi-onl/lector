import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { liveRounds, liveText } from '#lib/live/live.js';
import { liveAnswer } from './db/schema.js';
import {
	advanceLiveSession,
	createLiveSession,
	findLiveSession,
	joinLiveSession,
	liveView,
	submitLiveAnswers
} from './live.js';
import { addUser, testDb, type TestDb } from './testing.js';

const PHONE = 'phone-one';

let db: TestDb;
let code: string;

const current = async () => (await findLiveSession(db, code))!;
const next = async () => advanceLiveSession(db, await current());
const questions = async () => {
	await next();
	await next();
	return current();
};
const correctAnswers = () =>
	liveText(liveRounds([300, 600])[0]).questions.map((question) => question.correctIndex);

beforeEach(async () => {
	db = testDb();
	await addUser(db, 'host');
	code = await createLiveSession(db, 'host', [300, 600]);
});

describe('advanceLiveSession', () => {
	it('moves once when a double click sends the same state twice', async () => {
		const seen = await current();
		await advanceLiveSession(db, seen);
		await advanceLiveSession(db, seen);
		expect((await current()).phase).toBe('reading');
	});
});

describe('submitLiveAnswers', () => {
	it('stores answers only while the questions of that round are open', async () => {
		expect(await submitLiveAnswers(db, await current(), PHONE, 0, correctAnswers())).toBe('closed');
		const open = await questions();
		expect(await submitLiveAnswers(db, open, PHONE, 1, correctAnswers())).toBe('closed');
		expect(await submitLiveAnswers(db, open, PHONE, 0, correctAnswers())).toBe('saved');
	});

	it('rejects answers that do not fit the questions', async () => {
		const open = await questions();
		const count = correctAnswers().length;
		expect(await submitLiveAnswers(db, open, PHONE, 0, 'alle')).toBe('invalid');
		expect(await submitLiveAnswers(db, open, PHONE, 0, [0])).toBe('invalid');
		expect(await submitLiveAnswers(db, open, PHONE, 0, Array(count).fill(99))).toBe('invalid');
		expect(await submitLiveAnswers(db, open, PHONE, 0, Array(count).fill(-1))).toBe('invalid');
	});

	it('keeps the first submission and scores on the server', async () => {
		const open = await questions();
		const right = correctAnswers();
		await submitLiveAnswers(db, open, PHONE, 0, right);
		await submitLiveAnswers(
			db,
			open,
			PHONE,
			0,
			right.map(() => null)
		);
		const stored = await db.select().from(liveAnswer).where(eq(liveAnswer.sessionId, open.id));
		expect(stored).toHaveLength(right.length);
		expect(stored.every((answer) => answer.correct)).toBe(true);
	});
});

describe('liveView', () => {
	it('shows the text to the host only', async () => {
		await next();
		const reading = await current();
		expect((await liveView(db, reading, { userId: 'host' })).text).toBeTruthy();
		expect(await liveView(db, reading, { participantId: PHONE })).not.toHaveProperty('text');
	});

	it('never sends the right answer with the questions', async () => {
		const view = await liveView(db, await questions(), { participantId: PHONE });
		expect(view.questions?.length).toBeGreaterThan(0);
		expect(JSON.stringify(view.questions)).not.toContain('correctIndex');
	});

	it('counts phones and shows each its own result after the round', async () => {
		const open = await questions();
		await joinLiveSession(db, open, 'phone-two');
		await submitLiveAnswers(db, open, PHONE, 0, correctAnswers());
		const during = await liveView(db, open, { participantId: PHONE });
		expect(during).toMatchObject({ participants: 2, answered: 1, submitted: true, mine: [] });
		await next();
		const view = await liveView(db, await current(), { participantId: 'phone-two' });
		expect(view.mine).toEqual([{ round: 0, right: 0, total: 0 }]);
		const own = await liveView(db, await current(), { participantId: PHONE });
		const total = correctAnswers().length;
		expect(own.mine).toEqual([{ round: 0, right: total, total }]);
	});
});
