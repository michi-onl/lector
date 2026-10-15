import { api, ApiError } from '#lib/api.js';
import type { LibraryEntry, NewDocument, ReadingUpdate } from './library.js';
import type { LibraryItem, OpenedDocument } from './store.js';

/** The library of a Pro account, through the API; same shape as the browser library. */
export function listLibrary(): Promise<LibraryItem[]> {
	return api('/api/documents');
}

export async function addDocument(
	document: NewDocument
): Promise<{ entry: LibraryEntry; created: boolean }> {
	const { source, ...rest } = document;
	const form = new FormData();
	form.set('document', JSON.stringify(rest));
	if (source) form.set('source', source, document.fileName ?? 'original');
	return api('/api/documents', { method: 'POST', body: form });
}

export async function openDocument(id: string): Promise<OpenedDocument | null> {
	try {
		return await api<OpenedDocument>(`/api/documents/${id}`);
	} catch (error) {
		if (error instanceof ApiError && error.status === 404) return null;
		throw error;
	}
}

/** `keepalive` lets the last save go out while the page closes. */
export function recordProgress(documentId: string, update: ReadingUpdate): Promise<void> {
	return api(`/api/documents/${documentId}/progress`, {
		method: 'POST',
		json: update,
		keepalive: true
	});
}

export function removeDocument(id: string): Promise<void> {
	return api(`/api/documents/${id}`, { method: 'DELETE' });
}
