import { beforeEach, describe, expect, it } from 'vitest';
import { document, progress } from './db/schema.js';
import { eq } from 'drizzle-orm';
import {
	createDocument,
	deleteDocument,
	listDocuments,
	openDocument,
	readSource,
	recordProgress
} from './library.js';
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
	bucket = testBucket();
	await addUser(db, 'ada');
	await addUser(db, 'bob');
});

describe('createDocument', () => {
	it('stores the same text once per account, but separately for each account', async () => {
		const first = await createDocument(db, bucket, 'ada', text('Eins zwei drei'));
		const again = await createDocument(db, bucket, 'ada', text('Eins zwei drei'));
		const other = await createDocument(db, bucket, 'bob', text('Eins zwei drei'));
		expect(first.created).toBe(true);
		expect(again).toEqual({ entry: first.entry, created: false });
		expect(other.created).toBe(true);
		expect(other.entry.id).not.toBe(first.entry.id);
	});

	it('keeps text and original under the prefix of the account', async () => {
		const { entry } = await createDocument(db, bucket, 'ada', {
			...text('Eins zwei'),
			source: new File(['original'], 'a.txt', { type: 'text/plain' })
		});
		expect(entry.hasSource).toBe(true);
		expect([...bucket.objects.keys()].sort()).toEqual([
			`users/ada/documents/${entry.id}/model.json`,
			`users/ada/documents/${entry.id}/source`
		]);
	});
});

describe('another account', () => {
	let id: string;

	beforeEach(async () => {
		const { entry } = await createDocument(db, bucket, 'ada', {
			...text('Geheimer Text von Ada'),
			source: new File(['original'], 'a.txt')
		});
		id = entry.id;
	});

	it('neither lists nor opens a text', async () => {
		expect(await listDocuments(db, 'bob')).toEqual([]);
		expect(await openDocument(db, bucket, 'bob', id)).toBeNull();
		expect(await readSource(db, bucket, 'bob', id)).toBeNull();
	});

	it('neither changes nor deletes a text', async () => {
		const update = { wordIndex: 2, activeMs: 100, words: 2, completed: false };
		expect(await recordProgress(db, 'bob', id, update)).toBe(false);
		expect(await deleteDocument(db, bucket, 'bob', id)).toBe(false);
		const opened = await openDocument(db, bucket, 'ada', id);
		expect(opened?.progress.position).toBe(0);
		expect(bucket.objects.size).toBe(2);
	});
});

describe('recordProgress', () => {
	it('adds up time and words, and keeps the furthest position', async () => {
		const { entry } = await createDocument(db, bucket, 'ada', text('Eins zwei drei vier fünf'));
		await recordProgress(db, 'ada', entry.id, {
			wordIndex: 4,
			activeMs: 1000,
			words: 4,
			completed: false
		});
		await recordProgress(db, 'ada', entry.id, {
			wordIndex: 1,
			activeMs: 500,
			words: 1,
			completed: false
		});
		const opened = await openDocument(db, bucket, 'ada', entry.id);
		expect(opened?.progress).toMatchObject({
			position: 1,
			maxPosition: 4,
			wordMs: 1500,
			wordPresentations: 5,
			completedAt: null
		});
	});

	it('clamps positions to the text and marks the end once', async () => {
		const { entry } = await createDocument(db, bucket, 'ada', text('Eins zwei'));
		const end = { wordIndex: 99, activeMs: 1, words: 1, completed: false };
		await recordProgress(db, 'ada', entry.id, end);
		const first = (await openDocument(db, bucket, 'ada', entry.id))?.progress;
		expect(first?.position).toBe(2);
		expect(first?.completedAt).not.toBeNull();
		await recordProgress(db, 'ada', entry.id, { ...end, wordIndex: 0, completed: true });
		const second = (await openDocument(db, bucket, 'ada', entry.id))?.progress;
		expect(second?.completedAt).toBe(first?.completedAt);
	});
});

describe('deleteDocument', () => {
	it('removes rows, progress and objects', async () => {
		const { entry } = await createDocument(db, bucket, 'ada', {
			...text('Eins zwei'),
			source: new File(['original'], 'a.txt')
		});
		expect(await deleteDocument(db, bucket, 'ada', entry.id)).toBe(true);
		expect(bucket.objects.size).toBe(0);
		expect(await db.select().from(document).where(eq(document.id, entry.id))).toEqual([]);
		expect(await db.select().from(progress).where(eq(progress.documentId, entry.id))).toEqual([]);
	});
});
