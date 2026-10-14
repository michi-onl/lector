import { textBlocks } from '#lib/reader/index.js';
import { describe, expect, it } from 'vitest';
import {
	canonicalText,
	deriveTitle,
	emptyProgress,
	mergeUpdates,
	progressShare,
	recordReading,
	resumePosition,
	sha256,
	sortEntries,
	wordCount,
	type LibraryEntry
} from './library.js';

const start = new Date('2026-10-13T10:00:00Z');
const later = new Date('2026-10-13T10:05:00Z');

function entry(id: string, createdAt: string, lastOpenedAt: string | null = null): LibraryEntry {
	return { id, title: id, format: 'text', sha256: id, wordCount: 10, createdAt, lastOpenedAt };
}

describe('deriveTitle', () => {
	it('takes the first sentence', () => {
		expect(deriveTitle(textBlocks('Lesen ist schön. Und schnell.\n\nZweiter Absatz.'))).toBe(
			'Lesen ist schön.'
		);
	});

	it('does not stop at abbreviations inside a word', () => {
		expect(deriveTitle(textBlocks('Version 2.5 ist da'))).toBe('Version 2.5 ist da');
	});

	it('shortens long sentences at a word boundary', () => {
		const title = deriveTitle(
			textBlocks(
				'Beim normalen Lesen springen die Augen in kurzen Sprüngen über die Zeile, und zwischen den Sprüngen ruhen sie.'
			)
		);
		expect(title).toBe('Beim normalen Lesen springen die Augen in kurzen Sprüngen …');
		expect(title.length).toBeLessThanOrEqual(62);
	});

	it('names empty text', () => {
		expect(deriveTitle([])).toBe('Ohne Titel');
	});
});

describe('wordCount and canonicalText', () => {
	it('counts words over all blocks', () => {
		expect(wordCount(textBlocks('Eins zwei drei.\n\nVier –  fünf.'))).toBe(6);
	});

	it('ignores incidental whitespace, so the same text hashes the same', async () => {
		const a = canonicalText(textBlocks('Eins  zwei.\n\n\nDrei\nvier.'));
		const b = canonicalText(textBlocks(' Eins zwei.\r\n\r\nDrei vier. '));
		expect(a).toBe(b);
		expect(await sha256(a)).toBe(await sha256(b));
		expect(await sha256(a)).toMatch(/^[0-9a-f]{64}$/u);
	});
});

describe('recordReading', () => {
	it('accumulates reading time and words', () => {
		let progress = emptyProgress('doc', start);
		progress = recordReading(
			progress,
			{ wordIndex: 4, completed: false, activeMs: 900, words: 4 },
			10,
			start
		);
		progress = recordReading(
			progress,
			{ wordIndex: 2, completed: false, activeMs: 300, words: 1 },
			10,
			later
		);
		expect(progress).toEqual({
			documentId: 'doc',
			position: 2,
			maxPosition: 4,
			wordMs: 1200,
			wordPresentations: 5,
			completedAt: null,
			updatedAt: later.toISOString()
		});
	});

	it('marks the first completion and keeps it on rereads', () => {
		let progress = recordReading(
			emptyProgress('doc', start),
			{ wordIndex: 9, completed: true, activeMs: 0, words: 1 },
			10,
			start
		);
		expect(progress.position).toBe(10);
		expect(progress.completedAt).toBe(start.toISOString());
		progress = recordReading(
			progress,
			{ wordIndex: 3, completed: false, activeMs: 0, words: 0 },
			10,
			later
		);
		expect(progress.completedAt).toBe(start.toISOString());
		expect(progress.maxPosition).toBe(10);
	});

	it('clamps positions and negative counters', () => {
		const progress = recordReading(
			emptyProgress('doc', start),
			{ wordIndex: 99, completed: false, activeMs: -5, words: -1 },
			10,
			start
		);
		expect(progress).toMatchObject({ position: 10, wordMs: 0, wordPresentations: 0 });
	});
});

describe('mergeUpdates', () => {
	it('keeps the last position and sums time and words', () => {
		const first = { wordIndex: 3, completed: false, activeMs: 400, words: 2 };
		expect(mergeUpdates(null, first)).toBe(first);
		expect(mergeUpdates(first, { wordIndex: 5, completed: true, activeMs: 100, words: 1 })).toEqual(
			{
				wordIndex: 5,
				completed: true,
				activeMs: 500,
				words: 3
			}
		);
	});
});

describe('resumePosition and progressShare', () => {
	it('resumes where reading stopped and starts over after the end', () => {
		const progress = { ...emptyProgress('doc', start), position: 4 };
		expect(resumePosition(progress, 10)).toBe(4);
		expect(resumePosition({ ...progress, position: 10 }, 10)).toBe(0);
	});

	it('gives the share read', () => {
		expect(progressShare(undefined, 10)).toBe(0);
		expect(progressShare({ ...emptyProgress('doc', start), position: 5 }, 10)).toBe(0.5);
		expect(progressShare(emptyProgress('doc', start), 0)).toBe(0);
	});
});

describe('sortEntries', () => {
	it('puts the most recently opened or added first', () => {
		const sorted = sortEntries([
			entry('old', '2026-10-01T00:00:00Z', '2026-10-02T00:00:00Z'),
			entry('new', '2026-10-12T00:00:00Z'),
			entry('opened', '2026-09-01T00:00:00Z', '2026-10-13T00:00:00Z')
		]);
		expect(sorted.map((item) => item.id)).toEqual(['opened', 'new', 'old']);
	});
});
