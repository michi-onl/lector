import {
	canonicalText,
	deriveTitle,
	sha256,
	wordCount,
	type LibraryEntry,
	type LibraryProgress,
	type NewDocument,
	type ReadingUpdate
} from '#lib/library/library.js';
import { buildPresentation, type TextBlock } from '#lib/reader/index.js';
import { and, desc, eq, sql } from 'drizzle-orm';
import type { Database } from './db/index.js';
import { document, progress } from './db/schema.js';
import { documentKeys } from './storage.js';

/**
 * The library of a Pro account: rows in D1, texts and originals in R2. Positions are word
 * indices into the stored model, so the model carries the version of the code that built it.
 */
export const ANALYZER_VERSION = 'lector-1';

interface StoredModel {
	analyzerVersion: string;
	blocks: TextBlock[];
}

type DocumentRow = typeof document.$inferSelect;
type ProgressRow = typeof progress.$inferSelect;

const iso = (date: Date | null) => date?.toISOString() ?? null;

function toEntry(row: DocumentRow): LibraryEntry {
	return {
		id: row.id,
		title: row.title,
		format: row.format,
		sha256: row.sha256 ?? '',
		wordCount: row.wordCount,
		fileName: row.fileName,
		sourceUrl: row.sourceUrl,
		hasSource: row.sourceKey !== null,
		createdAt: row.createdAt.toISOString(),
		lastOpenedAt: iso(row.lastOpenedAt)
	};
}

function toProgress(row: ProgressRow): LibraryProgress {
	return {
		documentId: row.documentId,
		position: row.position,
		maxPosition: row.maxPosition,
		wordMs: row.wordMs,
		wordPresentations: row.wordPresentations,
		completedAt: iso(row.completedAt),
		updatedAt: row.updatedAt.toISOString()
	};
}

const owned = (userId: string, id: string) => and(eq(document.id, id), eq(document.userId, userId));

export async function listDocuments(db: Database, userId: string) {
	const rows = await db
		.select({ document, progress })
		.from(document)
		.leftJoin(progress, eq(progress.documentId, document.id))
		.where(eq(document.userId, userId))
		.orderBy(desc(sql`coalesce(${document.lastOpenedAt}, ${document.createdAt})`));
	return rows.map((row) => ({
		entry: toEntry(row.document),
		progress: row.progress ? toProgress(row.progress) : undefined
	}));
}

/** Stores a text, and its original if given; the same text is stored once per account. */
export async function createDocument(
	db: Database,
	bucket: R2Bucket,
	userId: string,
	input: Omit<NewDocument, 'source'> & { source?: File }
): Promise<{ entry: LibraryEntry; created: boolean }> {
	const hash = await sha256(canonicalText(input.blocks));
	const existing = await db
		.select()
		.from(document)
		.where(and(eq(document.userId, userId), eq(document.sha256, hash)))
		.get();
	if (existing) return { entry: toEntry(existing), created: false };

	const id = crypto.randomUUID();
	const keys = documentKeys(userId, id);
	const model: StoredModel = { analyzerVersion: ANALYZER_VERSION, blocks: input.blocks };
	await bucket.put(keys.model, JSON.stringify(model), {
		httpMetadata: { contentType: 'application/json' }
	});
	if (input.source)
		await bucket.put(keys.source, await input.source.arrayBuffer(), {
			httpMetadata: { contentType: input.source.type || 'application/octet-stream' }
		});
	const now = new Date();
	const [[row]] = await db.batch([
		db
			.insert(document)
			.values({
				id,
				userId,
				title: input.title?.trim().slice(0, 300) || deriveTitle(input.blocks),
				format: input.format,
				fileName: input.fileName?.slice(0, 300) ?? null,
				sourceUrl: input.sourceUrl?.slice(0, 2000) ?? null,
				byteLength: input.source?.size ?? null,
				sha256: hash,
				sourceKey: input.source ? keys.source : null,
				modelKey: keys.model,
				analyzerVersion: ANALYZER_VERSION,
				wordCount: wordCount(input.blocks),
				unitCount: buildPresentation(input.blocks).length,
				createdAt: now,
				updatedAt: now
			})
			.returning(),
		db.insert(progress).values({ documentId: id, updatedAt: now })
	]);
	return { entry: toEntry(row), created: true };
}

/** Loads a text for reading and marks it as opened. */
export async function openDocument(db: Database, bucket: R2Bucket, userId: string, id: string) {
	const row = await db
		.update(document)
		.set({ lastOpenedAt: new Date() })
		.where(owned(userId, id))
		.returning()
		.get();
	if (!row) return null;
	const [object, saved] = await Promise.all([
		bucket.get(row.modelKey),
		db.select().from(progress).where(eq(progress.documentId, id)).get()
	]);
	if (!object) return null;
	const model = await object.json<StoredModel>();
	return {
		entry: toEntry(row),
		blocks: model.blocks,
		progress: saved
			? toProgress(saved)
			: toProgress({
					documentId: id,
					position: 0,
					maxPosition: 0,
					wordMs: 0,
					wordPresentations: 0,
					completedAt: null,
					updatedAt: row.createdAt
				})
	};
}

export async function readSource(db: Database, bucket: R2Bucket, userId: string, id: string) {
	const row = await db.select().from(document).where(owned(userId, id)).get();
	if (!row?.sourceKey) return null;
	const object = await bucket.get(row.sourceKey);
	return object ? { row, object } : null;
}

export async function deleteDocument(db: Database, bucket: R2Bucket, userId: string, id: string) {
	const row = await db.delete(document).where(owned(userId, id)).returning().get();
	if (!row) return false;
	await bucket.delete([row.modelKey, ...(row.sourceKey ? [row.sourceKey] : [])]);
	return true;
}

/**
 * Adds what was read, in one statement, so two devices or overlapping saves never lose time:
 * the counters grow in SQL, not from a value read earlier. Same rules as `recordReading`.
 */
export async function recordProgress(
	db: Database,
	userId: string,
	id: string,
	update: ReadingUpdate
): Promise<boolean> {
	const row = await db
		.select({ wordCount: document.wordCount })
		.from(document)
		.where(owned(userId, id))
		.get();
	if (!row) return false;
	const total = row.wordCount;
	const position = update.completed ? total : Math.max(0, Math.min(total, update.wordIndex));
	const now = new Date();
	await db.batch([
		db.insert(progress).values({ documentId: id, updatedAt: now }).onConflictDoNothing(),
		db
			.update(progress)
			.set({
				position,
				maxPosition: sql`max(${progress.maxPosition}, ${position})`,
				wordMs: sql`${progress.wordMs} + ${update.activeMs}`,
				wordPresentations: sql`${progress.wordPresentations} + ${update.words}`,
				...(position >= total
					? { completedAt: sql`coalesce(${progress.completedAt}, ${now.getTime()})` }
					: {}),
				updatedAt: now
			})
			.where(eq(progress.documentId, id))
	]);
	return true;
}
