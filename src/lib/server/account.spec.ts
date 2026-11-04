import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { document, measurement, calibration, user, session, account } from './db/schema.js';
import { exportAccount, exportStream } from './export.js';
import { createDocument } from './library.js';
import { createLiveSession } from './live.js';
import { deleteUserObjects } from './storage.js';
import {
	addUser,
	pastedText as text,
	testBucket,
	testDb,
	type TestBucket,
	type TestDb
} from './testing.js';

let db: TestDb;
let bucket: TestBucket;

beforeEach(async () => {
	db = testDb();
	bucket = testBucket(2);
	await addUser(db, 'ada');
	await addUser(db, 'bob');
});

const download = async (userId: string) =>
	JSON.parse(await new Response(exportStream(exportAccount(db, bucket, userId))).text());

describe('exportAccount', () => {
	beforeEach(async () => {
		await createDocument(db, bucket, 'ada', text('Text von Ada'));
		await createDocument(db, bucket, 'bob', text('Text von Bob'));
		await db.insert(account).values({
			id: 'cred',
			accountId: 'ada',
			providerId: 'credential',
			userId: 'ada',
			password: 'geheimer-hash'
		});
		await db.insert(session).values({
			id: 's1',
			token: 'geheimes-token',
			userId: 'ada',
			ipAddress: '203.0.113.7',
			expiresAt: new Date(Date.now() + 1000)
		});
	});

	it('contains the account with its texts and nothing of others', async () => {
		const data = await download('ada');
		expect(data.account).toMatchObject({ id: 'ada', email: 'ada@lector.example', plan: 'pro' });
		expect(data.documents).toHaveLength(1);
		expect(data.documents[0].blocks[0].text).toBe('Text von Ada');
		expect(data.documents[0].progress.position).toBe(0);
		expect(JSON.stringify(data)).not.toContain('Text von Bob');
	});

	it('leaves out credentials, storage keys and tokens', async () => {
		const raw = JSON.stringify(await download('ada'));
		expect(raw).toContain('203.0.113.7');
		expect(raw).not.toContain('geheimer-hash');
		expect(raw).not.toContain('geheimes-token');
		expect(raw).not.toContain('modelKey');
	});

	it('is valid JSON for an account without any texts', async () => {
		await addUser(db, 'new');
		expect((await download('new')).documents).toEqual([]);
	});
});

describe('deleting an account', () => {
	it('removes all objects of the user across pages, and only theirs', async () => {
		for (const name of ['a', 'b', 'c', 'd', 'e'])
			await createDocument(db, bucket, 'ada', text(`Text ${name}`));
		await createDocument(db, bucket, 'bob', text('Text von Bob'));
		await deleteUserObjects(bucket, 'ada');
		expect([...bucket.objects.keys()].every((key) => key.startsWith('users/bob/'))).toBe(true);
		expect(bucket.objects.size).toBe(1);
	});

	it('does not touch a user whose id merely starts the same', async () => {
		await addUser(db, 'adam');
		await createDocument(db, bucket, 'adam', text('Text von Adam'));
		await deleteUserObjects(bucket, 'ada');
		expect(bucket.objects.size).toBe(1);
	});

	it('takes every row of the account with it in D1', async () => {
		await createDocument(db, bucket, 'ada', text('Text'));
		await createLiveSession(db, 'ada', [300]);
		const [run] = await db.insert(calibration).values({ userId: 'ada' }).returning();
		await db
			.insert(measurement)
			.values({ userId: 'ada', calibrationId: run.id, wpm: 300, correct: 1, answered: 2 });
		await db.delete(user).where(eq(user.id, 'ada'));
		expect(await db.select().from(document).where(eq(document.userId, 'ada'))).toEqual([]);
		expect(await db.select().from(measurement).where(eq(measurement.userId, 'ada'))).toEqual([]);
		expect((await db.select().from(document)).length).toBe(0);
		expect((await db.select().from(user)).map((row) => row.id)).toEqual(['bob']);
	});
});
