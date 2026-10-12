import { endsSentenceMark, tokenBoundaries } from './sentences.js';
import { graphemes, shapeToken } from './tokens.js';
import type { ChunkSize } from './settings.js';

export type StructureBoundary = 'none' | 'sentence' | 'paragraph' | 'section' | 'chapter';

/** One block of extracted text, usually a paragraph or a heading. */
export interface TextBlock {
	id: string;
	text: string;
	sectionId: string;
	chapterId: string;
	boundaryAfter: StructureBoundary;
}

/** One frame of the reader: a single word, or two to three words in chunk mode. */
export interface PresentationUnit {
	id: string;
	blockId: string;
	/** The words shown together; their display times add up to the frame's time. */
	words: string[];
	text: string;
	/** Position of the first word in the whole text; stable across chunk sizes. */
	wordIndex: number;
	/** Character offset of the first word within its block. */
	offset: number;
	sentenceId: string;
	paragraphId: string;
	sectionId: string;
	chapterId: string;
	boundaryAfter: StructureBoundary;
}

/** Plain text (TXT import, text field): blank lines separate paragraphs, line breaks do not. */
export function textBlocks(text: string): TextBlock[] {
	return text
		.split(/\r?\n\s*\r?\n/u)
		.map((paragraph) => paragraph.replace(/\s+/gu, ' ').trim())
		.filter(Boolean)
		.map((paragraph, index) => ({
			id: `p${index}`,
			text: paragraph,
			sectionId: 'section',
			chapterId: 'chapter',
			boundaryAfter: 'paragraph'
		}));
}

/** A chunk stays short enough to read in one fixation. */
const MAX_CHUNK_GRAPHEMES = 20;

export function buildPresentation(
	blocks: TextBlock[],
	chunkSize: ChunkSize = 1
): PresentationUnit[] {
	const units: PresentationUnit[] = [];
	let sentenceNumber = 0;
	let wordIndex = 0;
	for (const block of blocks) {
		const matches = [...block.text.matchAll(/\S+/gu)];
		// A sentence mark is a sentence end unless the shared boundary evidence confirms that the
		// sentence goes on, as after "z. B.", "d. h." or "Prof.". Uncertain marks keep the
		// sentence pause.
		const boundaries = tokenBoundaries(block.text);
		let chunk: { text: string; offset: number; wordIndex: number }[] = [];
		let chunkGraphemes = 0;
		const flush = (boundaryAfter: StructureBoundary) => {
			if (!chunk.length) return;
			const [first] = chunk;
			units.push({
				id: `${block.id}:${first.wordIndex}`,
				blockId: block.id,
				words: chunk.map((word) => word.text),
				text: chunk.map((word) => word.text).join(' '),
				wordIndex: first.wordIndex,
				offset: first.offset,
				sentenceId: `sentence-${sentenceNumber}`,
				paragraphId: block.id,
				sectionId: block.sectionId,
				chapterId: block.chapterId,
				boundaryAfter
			});
			chunk = [];
			chunkGraphemes = 0;
		};
		for (const [index, match] of matches.entries()) {
			const text = match[0];
			const last = index === matches.length - 1;
			const endsSentence = endsSentenceMark(text) && boundaries[index] !== 'confirmed-continuation';
			const boundaryAfter = last
				? block.boundaryAfter === 'none' && endsSentence
					? 'sentence'
					: block.boundaryAfter
				: endsSentence
					? 'sentence'
					: 'none';
			const length = graphemes(text).length;
			if (chunk.length && chunkGraphemes + 1 + length > MAX_CHUNK_GRAPHEMES) flush('none');
			chunk.push({ text, offset: match.index, wordIndex: wordIndex++ });
			chunkGraphemes += (chunkGraphemes ? 1 : 0) + length;
			// Chunks never span a sentence end or a clause mark, so pauses stay where the text has them.
			if (
				chunk.length >= chunkSize ||
				boundaryAfter !== 'none' ||
				last ||
				shapeToken(text).punctuation
			)
				flush(boundaryAfter);
			if (endsSentence || last) sentenceNumber++;
		}
	}
	return units;
}

const BOUNDARY_DURATION_MS = {
	none: 0,
	sentence: 180,
	paragraph: 450,
	section: 2500,
	chapter: 5000
};

/** Only the highest boundary is represented; lower-level pauses never accumulate. */
export function boundaryDurationMs(unit: PresentationUnit): number {
	return BOUNDARY_DURATION_MS[unit.boundaryAfter];
}

/** The unit that shows a given word, e.g. after the chunk size changed. */
export function unitIndexForWord(units: PresentationUnit[], wordIndex: number): number {
	let found = 0;
	for (const [index, unit] of units.entries()) {
		if (unit.wordIndex > wordIndex) break;
		found = index;
	}
	return found;
}

export type JumpLevel = 'word' | 'sentence' | 'paragraph' | 'section' | 'chapter';
export function findJumpIndex(
	units: PresentationUnit[],
	index: number,
	direction: -1 | 1,
	level: JumpLevel
): number {
	if (!units.length) return 0;
	const current = Math.max(0, Math.min(units.length - 1, index));
	if (level === 'word') return Math.max(0, Math.min(units.length - 1, current + direction));
	const field = `${level}Id` as 'sentenceId' | 'paragraphId' | 'sectionId' | 'chapterId';
	const identity = units[current][field];
	if (direction === 1) {
		const next = units.findIndex(
			(unit, position) => position > current && unit[field] !== identity
		);
		return next < 0 ? units.length - 1 : next;
	}
	let start = current;
	while (start > 0 && units[start - 1][field] === identity) start--;
	if (start === 0 || start < current) return start;
	start--;
	while (start > 0 && units[start - 1][field] === units[start][field]) start--;
	return start;
}
