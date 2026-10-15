import type { DocumentFormat } from '#lib/library/library.js';
import { textBlocks, type TextBlock } from '#lib/reader/index.js';
import {
	decodeText,
	detectFormat,
	ImportError,
	MAX_FILE_BYTES,
	titleFromFileName,
	type FileFormat
} from './files.js';

export * from './files.js';

/**
 * What an import hands to the library. Extraction runs in the browser: Workers have little
 * memory and CPU time per request, and Free needs no server for its library.
 */
export interface ImportedDocument {
	title: string;
	format: DocumentFormat;
	blocks: TextBlock[];
	fileName?: string;
	sourceUrl?: string;
	/** The original file; Pro keeps it in R2. */
	source?: Blob;
}

export function blocksFromParagraphs(paragraphs: string[]): TextBlock[] {
	return textBlocks(paragraphs.join('\n\n'));
}

/** Reads only the first bytes, so an unsupported file is rejected before it is loaded. */
export async function fileFormat(file: File): Promise<FileFormat> {
	const head = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
	const format = detectFormat(file.name, head);
	if (!format) throw new ImportError('Lector liest PDF, Word (DOCX) und Textdateien (TXT).');
	return format;
}

export async function importFile(
	file: File,
	onprogress?: (page: number, pages: number) => void
): Promise<ImportedDocument> {
	if (file.size > MAX_FILE_BYTES)
		throw new ImportError(`Die Datei ist größer als ${MAX_FILE_BYTES / 1024 / 1024} MB.`);
	const format = await fileFormat(file);
	const data = new Uint8Array(await file.arrayBuffer());
	let title: string | null = null;
	let blocks: TextBlock[];
	if (format === 'pdf') {
		const { extractPdf } = await import('./pdf.js');
		const pdf = await extractPdf(data, onprogress);
		title = pdf.title;
		blocks = blocksFromParagraphs(pdf.paragraphs);
	} else if (format === 'docx') {
		const { extractDocx } = await import('./docx.js');
		blocks = blocksFromParagraphs(await extractDocx(data));
	} else {
		blocks = textBlocks(decodeText(data));
	}
	if (!blocks.length)
		throw new ImportError(
			format === 'pdf'
				? 'Das PDF enthält keinen auslesbaren Text, vermutlich ist es ein Scan. Texterkennung (OCR) kommt in einer späteren Version.'
				: 'Die Datei enthält keinen Text.'
		);
	return {
		title: title ?? titleFromFileName(file.name),
		format,
		blocks,
		fileName: file.name,
		source: file
	};
}
