import type { StructureBoundary, TextBlock } from '#lib/reader/index.js';

/**
 * The library of the free tier lives in the browser. Entries and progress mirror the D1
 * tables `document` and `progress`, so an account can take them over field by field.
 */
export type DocumentFormat = 'pdf' | 'docx' | 'txt' | 'url' | 'text';

export const FORMAT_LABELS: Record<DocumentFormat, string> = {
	pdf: 'PDF',
	docx: 'Word',
	txt: 'Textdatei',
	url: 'Webartikel',
	text: 'Eingefügter Text'
};

export interface LibraryEntry {
	id: string;
	title: string;
	format: DocumentFormat;
	/** SHA-256 of the text; the same text is stored only once. */
	sha256: string;
	wordCount: number;
	/** Original file name; absent for URL imports and pasted text. */
	fileName?: string | null;
	sourceUrl?: string | null;
	/** Whether the account keeps the original file for download. */
	hasSource?: boolean;
	createdAt: string;
	lastOpenedAt: string | null;
}

/** A text on its way into the library: pasted, or extracted from a file or web page. */
export interface NewDocument {
	blocks: TextBlock[];
	format: DocumentFormat;
	title?: string;
	fileName?: string;
	sourceUrl?: string;
	/** The original file; only an account's library keeps it. */
	source?: Blob;
}

/** Positions are word indices: they stay valid when the chunk size changes. */
export interface LibraryProgress {
	documentId: string;
	position: number;
	maxPosition: number;
	/** Time words were on screen, rereads included. */
	wordMs: number;
	/** Words presented, rereads included; with `wordMs` the effective WPM. */
	wordPresentations: number;
	completedAt: string | null;
	updatedAt: string;
}

/** What the reader reports since the last update. */
export interface ReadingUpdate {
	wordIndex: number;
	completed: boolean;
	activeMs: number;
	words: number;
}

/** Updates collected between two saves: the last position, the time and words summed. */
export function mergeUpdates(earlier: ReadingUpdate | null, later: ReadingUpdate): ReadingUpdate {
	if (!earlier) return later;
	return {
		...later,
		activeMs: earlier.activeMs + later.activeMs,
		words: earlier.words + later.words
	};
}

const TITLE_LENGTH = 60;

export function wordCount(blocks: TextBlock[]): number {
	return blocks.reduce((sum, block) => sum + (block.text.match(/\S+/gu)?.length ?? 0), 0);
}

/** The first sentence of the text, shortened at a word boundary. */
export function deriveTitle(blocks: TextBlock[]): string {
	const first = blocks[0]?.text.trim() ?? '';
	const sentence = first.match(/^.+?[.!?…](?=\s|$)/u)?.[0] ?? first;
	if (sentence.length <= TITLE_LENGTH) return sentence || 'Ohne Titel';
	const cut = sentence.slice(0, TITLE_LENGTH + 1);
	const space = cut.lastIndexOf(' ');
	return `${(space > TITLE_LENGTH / 2 ? cut.slice(0, space) : cut.slice(0, TITLE_LENGTH)).replace(/[\s,;:–-]+$/u, '')} …`;
}

export async function sha256(text: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
	return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** The text as the library compares it: the blocks, not their incidental whitespace. */
export function canonicalText(blocks: TextBlock[]): string {
	return blocks.map((block) => block.text).join('\n\n');
}

export function emptyProgress(documentId: string, now = new Date()): LibraryProgress {
	return {
		documentId,
		position: 0,
		maxPosition: 0,
		wordMs: 0,
		wordPresentations: 0,
		completedAt: null,
		updatedAt: now.toISOString()
	};
}

/** Adds what was read; the first completion is kept, later rereads do not move it. */
export function recordReading(
	progress: LibraryProgress,
	update: ReadingUpdate,
	total: number,
	now = new Date()
): LibraryProgress {
	const position = update.completed ? total : Math.max(0, Math.min(total, update.wordIndex));
	return {
		...progress,
		position,
		maxPosition: Math.max(progress.maxPosition, position),
		wordMs: progress.wordMs + Math.max(0, update.activeMs),
		wordPresentations: progress.wordPresentations + Math.max(0, update.words),
		completedAt: progress.completedAt ?? (position >= total ? now.toISOString() : null),
		updatedAt: now.toISOString()
	};
}

/** Where reading resumes: the last position, or the start once the text was read to the end. */
export function resumePosition(progress: LibraryProgress, total: number): number {
	return progress.position >= total ? 0 : progress.position;
}

export function progressShare(progress: LibraryProgress | undefined, total: number): number {
	if (!progress || total <= 0) return 0;
	return Math.min(1, progress.position / total);
}

/** Most recently opened first; never opened entries by the time they were added. */
export function sortEntries(entries: LibraryEntry[]): LibraryEntry[] {
	const time = (entry: LibraryEntry) => Date.parse(entry.lastOpenedAt ?? entry.createdAt);
	return entries.toSorted((a, b) => time(b) - time(a));
}

/** What an account may store per text: about a thousand pages. */
export const MAX_TEXT_CHARACTERS = 5_000_000;

const FORMATS: readonly DocumentFormat[] = ['pdf', 'docx', 'txt', 'url', 'text'];
const BOUNDARIES: readonly StructureBoundary[] = [
	'none',
	'sentence',
	'paragraph',
	'section',
	'chapter'
];

export function parseFormat(value: unknown): DocumentFormat | null {
	return FORMATS.includes(value as DocumentFormat) ? (value as DocumentFormat) : null;
}

/** Checks text blocks sent by a browser; null if anything is off or the text is too long. */
export function parseBlocks(value: unknown): TextBlock[] | null {
	if (!Array.isArray(value) || !value.length) return null;
	const blocks: TextBlock[] = [];
	let characters = 0;
	for (const item of value) {
		if (typeof item !== 'object' || item === null) return null;
		const { id, text, sectionId, chapterId, boundaryAfter } = item as Record<string, unknown>;
		if (
			typeof id !== 'string' ||
			typeof text !== 'string' ||
			typeof sectionId !== 'string' ||
			typeof chapterId !== 'string' ||
			!BOUNDARIES.includes(boundaryAfter as StructureBoundary)
		)
			return null;
		characters += text.length;
		if (characters > MAX_TEXT_CHARACTERS) return null;
		blocks.push({
			id,
			text,
			sectionId,
			chapterId,
			boundaryAfter: boundaryAfter as StructureBoundary
		});
	}
	return blocks;
}

export function parseReadingUpdate(value: unknown): ReadingUpdate | null {
	if (typeof value !== 'object' || value === null) return null;
	const { wordIndex, completed, activeMs, words } = value as Record<string, unknown>;
	const count = (number: unknown) =>
		typeof number === 'number' && Number.isFinite(number) && number >= 0;
	if (!count(wordIndex) || !count(activeMs) || !count(words) || typeof completed !== 'boolean')
		return null;
	return {
		wordIndex: Math.trunc(wordIndex as number),
		completed,
		activeMs: Math.round(activeMs as number),
		words: Math.trunc(words as number)
	};
}
