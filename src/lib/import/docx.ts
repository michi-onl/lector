import { ImportError } from './files.js';

/** Extracts the paragraphs of a Word document in the browser with mammoth. */
export async function extractDocx(data: Uint8Array<ArrayBuffer>): Promise<string[]> {
	const { default: mammoth } = await import('mammoth');
	try {
		const { value } = await mammoth.extractRawText({ arrayBuffer: data.slice().buffer });
		// mammoth ends every paragraph with a blank line.
		return value.split(/\n\s*\n/u);
	} catch {
		throw new ImportError('Das Word-Dokument lässt sich nicht lesen; ist die Datei beschädigt?');
	}
}
