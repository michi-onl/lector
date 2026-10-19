import { DOMParser as Linkedom } from 'linkedom';
import { describe, expect, it } from 'vitest';
import { extractEpub } from './epub.js';
import { detectFormat, ImportError } from './files.js';
import { blocksFromChapters } from './index.js';

const encoder = new TextEncoder();
/** linkedom stands in for the browser's parser; its types differ only in name. */
const parser = new Linkedom() as unknown as DOMParser;

async function deflate(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
	const stream = new Blob([bytes.slice()])
		.stream()
		.pipeThrough(new CompressionStream('deflate-raw'));
	return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** A ZIP as e-book tools write it: `mimetype` first and stored, the rest deflated. */
async function zip(files: [name: string, content: string][]): Promise<Uint8Array> {
	const locals: Uint8Array<ArrayBuffer>[] = [];
	const directory: Uint8Array<ArrayBuffer>[] = [];
	let offset = 0;
	for (const [index, [name, content]] of files.entries()) {
		const nameBytes = encoder.encode(name);
		const raw = encoder.encode(content);
		const stored = index === 0;
		const data = stored ? raw : await deflate(raw);
		const local = new Uint8Array(30 + nameBytes.length + data.length);
		const header = new DataView(local.buffer);
		header.setUint32(0, 0x04034b50, true);
		header.setUint16(8, stored ? 0 : 8, true);
		header.setUint32(18, data.length, true);
		header.setUint32(22, raw.length, true);
		header.setUint16(26, nameBytes.length, true);
		local.set(nameBytes, 30);
		local.set(data, 30 + nameBytes.length);
		const entry = new Uint8Array(46 + nameBytes.length);
		const view = new DataView(entry.buffer);
		view.setUint32(0, 0x02014b50, true);
		view.setUint16(10, stored ? 0 : 8, true);
		view.setUint32(20, data.length, true);
		view.setUint32(24, raw.length, true);
		view.setUint16(28, nameBytes.length, true);
		view.setUint32(42, offset, true);
		entry.set(nameBytes, 46);
		locals.push(local);
		directory.push(entry);
		offset += local.length;
	}
	const size = directory.reduce((sum, entry) => sum + entry.length, 0);
	const end = new Uint8Array(22);
	const view = new DataView(end.buffer);
	view.setUint32(0, 0x06054b50, true);
	view.setUint16(8, files.length, true);
	view.setUint16(10, files.length, true);
	view.setUint32(12, size, true);
	view.setUint32(16, offset, true);
	return new Uint8Array(await new Blob([...locals, ...directory, end]).arrayBuffer());
}

const CONTAINER = `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
	<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`;

const PACKAGE = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
	<metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Die Verwandlung</dc:title></metadata>
	<manifest>
		<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
		<item id="eins" href="Text/kapitel%201.xhtml" media-type="application/xhtml+xml"/>
		<item id="zwei" href="Text/kapitel2.xhtml" media-type="application/xhtml+xml"/>
		<item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>
	</manifest>
	<spine><itemref idref="nav"/><itemref idref="cover" linear="no"/><itemref idref="zwei"/><itemref idref="eins"/></spine>
</package>`;

const chapter = (body: string) => `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
	<head><title>Kapitel</title><style>p { margin: 0 }</style></head>
	<body>${body}</body>
</html>`;

async function book(extra: [string, string][] = []) {
	return zip([
		['mimetype', 'application/epub+zip'],
		['META-INF/container.xml', CONTAINER],
		['OEBPS/content.opf', PACKAGE],
		['OEBPS/nav.xhtml', chapter('<nav><ol><li>Inhalt</li></ol></nav>')],
		['OEBPS/cover.xhtml', chapter('<p>Umschlag</p>')],
		[
			'OEBPS/Text/kapitel 1.xhtml',
			chapter(
				'<h1>Erstes Kapitel</h1><p>Als Gregor <i>Samsa</i> erwachte,<a epub:type="noteref" href="#n1">1</a> fand er sich verwandelt.</p><span epub:type="pagebreak">12</span><div>Lose Zeile<p>Innen</p></div><aside epub:type="footnote" id="n1">Eine Fußnote.</aside>'
			)
		],
		['OEBPS/Text/kapitel2.xhtml', chapter('<p>Zuerst<br/>dies.</p>')],
		...extra
	]);
}

describe('extractEpub', () => {
	it('reads the chapters in spine order, without navigation, notes and page numbers', async () => {
		const epub = await extractEpub(await book(), parser);
		expect(epub.title).toBe('Die Verwandlung');
		expect(epub.chapters).toEqual([
			['Zuerst dies.'],
			[
				'Erstes Kapitel',
				'Als Gregor Samsa erwachte, fand er sich verwandelt.',
				'Lose Zeile',
				'Innen'
			]
		]);
	});

	it('refuses e-books with DRM', async () => {
		const encryption = `<encryption xmlns="urn:oasis:names:tc:opendocument:xmlns:container" xmlns:enc="http://www.w3.org/2001/04/xmlenc#">
			<enc:EncryptedData><enc:CipherData><enc:CipherReference URI="OEBPS/Text/kapitel2.xhtml"/></enc:CipherData></enc:EncryptedData>
		</encryption>`;
		await expect(
			extractEpub(await book([['META-INF/encryption.xml', encryption]]), parser)
		).rejects.toThrow(/DRM/u);
	});

	it('rejects files that are not ZIP archives', async () => {
		await expect(extractEpub(encoder.encode('kein Buch'), parser)).rejects.toThrow(ImportError);
	});
});

describe('blocksFromChapters', () => {
	it('keeps each chapter apart and ends it with a chapter boundary', () => {
		const blocks = blocksFromChapters([['Eins.', 'Zwei.'], ['Drei.']]);
		expect(
			blocks.map(({ id, chapterId, boundaryAfter }) => [id, chapterId, boundaryAfter])
		).toEqual([
			['c0p0', 'c0', 'paragraph'],
			['c0p1', 'c0', 'chapter'],
			['c1p0', 'c1', 'chapter']
		]);
	});
});

describe('detectFormat', () => {
	it('recognises an EPUB by its first file, whatever its name', async () => {
		const head = (await book()).subarray(0, 1024);
		expect(detectFormat('buch.epub', head)).toBe('epub');
		expect(detectFormat('buch.zip', head)).toBe('epub');
	});

	it('still needs the name for a DOCX', () => {
		const head = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
		expect(detectFormat('brief.docx', head)).toBe('docx');
		expect(detectFormat('archiv.zip', head)).toBeNull();
	});
});
