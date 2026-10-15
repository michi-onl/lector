/** Formats a file import can produce; URLs and pasted text come in elsewhere. */
export type FileFormat = 'pdf' | 'docx' | 'txt';

export const MAX_FILE_BYTES = 50 * 1024 * 1024;
export const MAX_PDF_PAGES = 1000;

export const ACCEPTED_FILES = [
	'.pdf',
	'.docx',
	'.txt',
	'application/pdf',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'text/plain'
].join(',');

/** A message for the person importing, in German. */
export class ImportError extends Error {}

const startsWith = (bytes: Uint8Array, signature: number[]) =>
	signature.every((byte, index) => bytes[index] === byte);

/**
 * The format from the first bytes, so a renamed file is read as what it is. A DOCX is a ZIP
 * archive; the name tells it apart from other Office files and plain ZIPs.
 */
export function detectFormat(name: string, head: Uint8Array): FileFormat | null {
	const extension = name.toLowerCase().match(/\.([a-z0-9]+)$/u)?.[1];
	if (startsWith(head, [0x25, 0x50, 0x44, 0x46, 0x2d])) return 'pdf';
	if (startsWith(head, [0x50, 0x4b, 0x03, 0x04])) return extension === 'docx' ? 'docx' : null;
	// Plain text has no signature; it must at least be free of NUL bytes.
	if ((extension === 'txt' || extension === 'text' || extension === 'md') && !head.includes(0))
		return 'txt';
	return null;
}

/** UTF-8 where valid (with or without BOM), otherwise the usual Windows encoding. */
export function decodeText(bytes: Uint8Array): string {
	try {
		return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
	} catch {
		return new TextDecoder('windows-1252').decode(bytes);
	}
}

/** The file name without directory and extension, as the title of an imported file. */
export function titleFromFileName(name: string): string {
	const base = name.split(/[/\\]/u).at(-1) ?? name;
	return (
		base
			.replace(/\.[a-z0-9]{1,5}$/iu, '')
			.replace(/[_]+/gu, ' ')
			.trim() || 'Ohne Titel'
	);
}
