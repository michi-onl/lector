import type { TextBlock } from '#lib/reader/index.js';
import {
	canonicalText,
	deriveTitle,
	emptyProgress,
	recordReading,
	sha256,
	sortEntries,
	wordCount,
	type LibraryEntry,
	type LibraryProgress,
	type NewDocument,
	type ReadingUpdate
} from './library.js';

/**
 * The local library in IndexedDB. Texts sit in their own store, like the extracted models in
 * R2, so the overview loads without them.
 */
const DATABASE = 'lector';
const VERSION = 1;

interface Content {
	id: string;
	blocks: TextBlock[];
}

export interface LibraryItem {
	entry: LibraryEntry;
	progress: LibraryProgress | undefined;
}

export interface OpenedDocument {
	entry: LibraryEntry;
	blocks: TextBlock[];
	progress: LibraryProgress;
}

let connection: Promise<IDBDatabase> | undefined;

function database(): Promise<IDBDatabase> {
	connection ??= new Promise((resolve, reject) => {
		const request = indexedDB.open(DATABASE, VERSION);
		request.onupgradeneeded = () => {
			const db = request.result;
			db.createObjectStore('documents', { keyPath: 'id' }).createIndex('sha256', 'sha256', {
				unique: true
			});
			db.createObjectStore('contents', { keyPath: 'id' });
			db.createObjectStore('progress', { keyPath: 'documentId' });
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
	connection.catch(() => (connection = undefined));
	return connection;
}

function done<T>(request: IDBRequest<T>): Promise<T> {
	return new Promise((resolve, reject) => {
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

function committed(transaction: IDBTransaction): Promise<void> {
	return new Promise((resolve, reject) => {
		transaction.oncomplete = () => resolve();
		transaction.onerror = () => reject(transaction.error);
		transaction.onabort = () => reject(transaction.error);
	});
}

export async function listLibrary(): Promise<LibraryItem[]> {
	const db = await database();
	const transaction = db.transaction(['documents', 'progress'], 'readonly');
	const [entries, progress] = await Promise.all([
		done<LibraryEntry[]>(transaction.objectStore('documents').getAll()),
		done<LibraryProgress[]>(transaction.objectStore('progress').getAll())
	]);
	const byDocument = new Map(progress.map((item) => [item.documentId, item]));
	return sortEntries(entries).map((entry) => ({ entry, progress: byDocument.get(entry.id) }));
}

/**
 * Stores pasted or imported text; a text already in the library returns its entry. The
 * original file stays out: the browser library keeps only the text.
 */
export async function addDocument({
	blocks,
	format,
	title,
	fileName,
	sourceUrl
}: NewDocument): Promise<LibraryEntry> {
	if (!blocks.length) throw new Error('Der Text ist leer.');
	const hash = await sha256(canonicalText(blocks));
	const db = await database();
	const existing = await done<LibraryEntry | undefined>(
		db.transaction('documents').objectStore('documents').index('sha256').get(hash)
	);
	if (existing) return existing;
	const now = new Date();
	const entry: LibraryEntry = {
		id: crypto.randomUUID(),
		title: title?.trim() || deriveTitle(blocks),
		format,
		sha256: hash,
		wordCount: wordCount(blocks),
		fileName: fileName ?? null,
		sourceUrl: sourceUrl ?? null,
		createdAt: now.toISOString(),
		lastOpenedAt: null
	};
	const transaction = db.transaction(['documents', 'contents', 'progress'], 'readwrite');
	transaction.objectStore('documents').add(entry);
	transaction.objectStore('contents').add({ id: entry.id, blocks } satisfies Content);
	transaction.objectStore('progress').add(emptyProgress(entry.id, now));
	await committed(transaction);
	return entry;
}

/** Loads a document for reading and marks it as opened, unless `mark` is false. */
export async function openDocument(id: string, mark = true): Promise<OpenedDocument | null> {
	const db = await database();
	const transaction = db.transaction(['documents', 'contents', 'progress'], 'readwrite');
	const [entry, content, progress] = await Promise.all([
		done<LibraryEntry | undefined>(transaction.objectStore('documents').get(id)),
		done<Content | undefined>(transaction.objectStore('contents').get(id)),
		done<LibraryProgress | undefined>(transaction.objectStore('progress').get(id))
	]);
	if (!entry || !content) return null;
	const opened = mark ? { ...entry, lastOpenedAt: new Date().toISOString() } : entry;
	transaction.objectStore('documents').put(opened);
	await committed(transaction);
	return { entry: opened, blocks: content.blocks, progress: progress ?? emptyProgress(id) };
}

/** Adds what was read; reading and writing in one transaction, so no save is lost. */
export async function recordProgress(
	documentId: string,
	update: ReadingUpdate,
	total: number
): Promise<void> {
	const db = await database();
	const transaction = db.transaction('progress', 'readwrite');
	const store = transaction.objectStore('progress');
	const saved = await done<LibraryProgress | undefined>(store.get(documentId));
	store.put(recordReading(saved ?? emptyProgress(documentId), update, total));
	await committed(transaction);
}

export async function removeDocument(id: string): Promise<void> {
	const db = await database();
	const transaction = db.transaction(['documents', 'contents', 'progress'], 'readwrite');
	for (const name of ['documents', 'contents', 'progress'])
		transaction.objectStore(name).delete(id);
	await committed(transaction);
}
