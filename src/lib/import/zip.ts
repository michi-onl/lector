import { ImportError } from './files.js';

/**
 * Reads files from a ZIP archive with the browser's own `DecompressionStream`, so EPUB import
 * needs no library. Enough for e-books: stored and deflated entries, no ZIP64, no encryption.
 */
export interface ZipArchive {
	names(): string[];
	/** The bytes of a file, or null if the archive has no such file. */
	read(name: string): Promise<Uint8Array | null>;
	text(name: string): Promise<string | null>;
}

interface ZipEntry {
	method: number;
	encrypted: boolean;
	compressedSize: number;
	size: number;
	headerOffset: number;
}

const END_OF_DIRECTORY = 0x06054b50;
const DIRECTORY_ENTRY = 0x02014b50;
const LOCAL_HEADER = 0x04034b50;
const STORED = 0;
const DEFLATED = 8;

const damaged = () =>
	new ImportError('Das E-Book lässt sich nicht öffnen; ist die Datei beschädigt?');

export function openZip(data: Uint8Array): ZipArchive {
	const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
	// The directory's end record closes the archive, followed only by a comment of up to 64 KB.
	let end = -1;
	for (let offset = data.length - 22; offset >= Math.max(0, data.length - 22 - 0xffff); offset--)
		if (view.getUint32(offset, true) === END_OF_DIRECTORY) {
			end = offset;
			break;
		}
	if (end < 0) throw damaged();
	const count = view.getUint16(end + 10, true);
	let offset = view.getUint32(end + 16, true);
	const decoder = new TextDecoder();
	const entries = new Map<string, ZipEntry>();
	for (let index = 0; index < count; index++) {
		if (offset + 46 > data.length || view.getUint32(offset, true) !== DIRECTORY_ENTRY)
			throw damaged();
		const nameLength = view.getUint16(offset + 28, true);
		const name = decoder.decode(data.subarray(offset + 46, offset + 46 + nameLength));
		entries.set(name, {
			encrypted: (view.getUint16(offset + 8, true) & 1) === 1,
			method: view.getUint16(offset + 10, true),
			compressedSize: view.getUint32(offset + 20, true),
			size: view.getUint32(offset + 24, true),
			headerOffset: view.getUint32(offset + 42, true)
		});
		offset +=
			46 + nameLength + view.getUint16(offset + 30, true) + view.getUint16(offset + 32, true);
	}

	async function read(name: string): Promise<Uint8Array | null> {
		const entry = entries.get(name);
		if (!entry) return null;
		if (entry.encrypted) throw new ImportError('Das E-Book ist verschlüsselt.');
		const header = entry.headerOffset;
		if (header + 30 > data.length || view.getUint32(header, true) !== LOCAL_HEADER) throw damaged();
		const start =
			header + 30 + view.getUint16(header + 26, true) + view.getUint16(header + 28, true);
		const compressed = data.subarray(start, start + entry.compressedSize);
		if (entry.method === STORED) return compressed;
		if (entry.method !== DEFLATED) throw damaged();
		return inflate(compressed, entry.size);
	}

	return {
		names: () => [...entries.keys()],
		read,
		async text(name) {
			const bytes = await read(name);
			return bytes && decoder.decode(bytes);
		}
	};
}

/** Stops at the size the directory states, so a forged entry cannot fill the memory. */
async function inflate(compressed: Uint8Array, size: number): Promise<Uint8Array> {
	const reader = new Blob([compressed.slice()])
		.stream()
		.pipeThrough(new DecompressionStream('deflate-raw'))
		.getReader();
	const output = new Uint8Array(size);
	let length = 0;
	try {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			if (length + value.length > size) throw damaged();
			output.set(value, length);
			length += value.length;
		}
	} catch (error) {
		await reader.cancel().catch(() => {});
		throw error instanceof ImportError ? error : damaged();
	}
	if (length !== size) throw damaged();
	return output;
}
