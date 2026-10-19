import { librarySize, syncs, type Plan } from '#lib/plan.js';
import type { LibraryEntry, NewDocument, ReadingUpdate } from './library.js';
import * as remote from './remote.js';
import * as local from './store.js';

export * from './library.js';
export type { LibraryItem, OpenedDocument } from './store.js';

/** One interface over both libraries: Pro in the account, everyone else in this browser. */
export interface Library {
	list(): Promise<local.LibraryItem[]>;
	add(document: NewDocument): Promise<LibraryEntry>;
	open(id: string): Promise<local.OpenedDocument | null>;
	record(documentId: string, update: ReadingUpdate, total: number): Promise<void>;
	remove(id: string): Promise<void>;
}

const browserLibrary = (size: number): Library => ({
	list: local.listLibrary,
	add: (document) => local.addDocument(document, size),
	open: (id) => local.openDocument(id),
	record: local.recordProgress,
	remove: local.removeDocument
});

const accountLibrary: Library = {
	list: remote.listLibrary,
	add: async (document) => (await remote.addDocument(document)).entry,
	open: remote.openDocument,
	record: (documentId, update) => remote.recordProgress(documentId, update),
	remove: remote.removeDocument
};

export function libraryFor(plan: Plan): Library {
	return syncs(plan) ? accountLibrary : browserLibrary(librarySize(plan));
}

/**
 * Copies the browser library into the account after an upgrade, with progress. Texts the
 * account already has are skipped, so running it twice adds nothing.
 */
export async function transferLibrary(
	onprogress?: (done: number, total: number) => void
): Promise<number> {
	const items = await local.listLibrary();
	let added = 0;
	for (const [index, { entry }] of items.entries()) {
		onprogress?.(index, items.length);
		const opened = await local.openDocument(entry.id, false);
		if (!opened) continue;
		const { created, entry: stored } = await remote.addDocument({
			blocks: opened.blocks,
			format: entry.format,
			title: entry.title,
			fileName: entry.fileName ?? undefined,
			sourceUrl: entry.sourceUrl ?? undefined
		});
		if (!created) continue;
		added++;
		const { progress } = opened;
		if (progress.position || progress.wordPresentations)
			await remote.recordProgress(stored.id, {
				wordIndex: progress.position,
				completed: progress.completedAt !== null,
				activeMs: progress.wordMs,
				words: progress.wordPresentations
			});
	}
	onprogress?.(items.length, items.length);
	return added;
}
