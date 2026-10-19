import { ImportError } from './files.js';
import { openZip, type ZipArchive } from './zip.js';

type Parser = Pick<DOMParser, 'parseFromString'>;

/** An e-book's text: one list of paragraphs per chapter file, in reading order. */
export interface EpubText {
	title: string | null;
	chapters: string[][];
}

/** Elements that end a paragraph; everything else is inline and joins the running text. */
const BLOCKS = new Set([
	'address',
	'article',
	'aside',
	'blockquote',
	'body',
	'dd',
	'div',
	'dl',
	'dt',
	'figcaption',
	'figure',
	'footer',
	'h1',
	'h2',
	'h3',
	'h4',
	'h5',
	'h6',
	'header',
	'hr',
	'li',
	'main',
	'ol',
	'p',
	'pre',
	'section',
	'table',
	'td',
	'th',
	'tr',
	'ul'
]);
const SKIPPED = new Set(['head', 'math', 'nav', 'noscript', 'script', 'style', 'svg', 'template']);
/** Footnotes and page markers would interrupt the sentence they sit in. */
const SKIPPED_TYPES = /\b(?:noteref|footnote|endnote|rearnote|pagebreak)\b/u;

/** Browsers drop the prefix of `dc:title`, linkedom keeps it. */
const nameOf = (element: Element) => element.localName.split(':').at(-1)!.toLowerCase();

function elements(root: Document | Element, name: string): Element[] {
	return [...root.querySelectorAll('*')].filter((element) => nameOf(element) === name);
}

function parseXml(parser: Parser, text: string): Document {
	const document = parser.parseFromString(text, 'application/xml');
	if (document.querySelector('parsererror')) throw damaged();
	return document;
}

const damaged = () =>
	new ImportError('Das E-Book lässt sich nicht lesen; ist die Datei beschädigt?');

/** A path inside the archive, from an address relative to the file that names it. */
function resolve(base: string, href: string): string {
	const url = new URL(href, `https://epub.invalid/${base}`);
	return decodeURIComponent(url.pathname.slice(1));
}

/** The paragraphs of a chapter file, without markup, notes and page numbers. */
export function paragraphsOf(document: Document): string[] {
	const paragraphs: string[] = [];
	let text = '';
	const flush = () => {
		const paragraph = text.replace(/\s+/gu, ' ').trim();
		if (paragraph) paragraphs.push(paragraph);
		text = '';
	};
	const walk = (node: Node) => {
		for (const child of node.childNodes) {
			if (child.nodeType === 3) text += child.textContent;
			if (child.nodeType !== 1) continue;
			const element = child as Element;
			const name = nameOf(element);
			if (SKIPPED.has(name) || SKIPPED_TYPES.test(element.getAttribute('epub:type') ?? ''))
				continue;
			if (name === 'br') {
				text += ' ';
				continue;
			}
			const block = BLOCKS.has(name);
			if (block) flush();
			walk(element);
			if (block) flush();
		}
	};
	walk(document.querySelector('body') ?? document.documentElement);
	flush();
	return paragraphs;
}

async function packagePath(zip: ZipArchive, parser: Parser): Promise<string> {
	const container = await zip.text('META-INF/container.xml');
	if (container === null) throw damaged();
	const path = elements(parseXml(parser, container), 'rootfile')[0]?.getAttribute('full-path');
	if (!path) throw damaged();
	return path;
}

/** Files an encryption.xml lists; fonts are often obfuscated, which does not matter here. */
async function encryptedPaths(zip: ZipArchive, parser: Parser): Promise<Set<string>> {
	const encryption = await zip.text('META-INF/encryption.xml');
	if (encryption === null) return new Set();
	return new Set(
		elements(parseXml(parser, encryption), 'cipherreference').flatMap((reference) => {
			const uri = reference.getAttribute('URI');
			return uri ? [resolve('', uri)] : [];
		})
	);
}

/** Extracts the text of an EPUB 2 or 3 in the browser, chapter by chapter. */
export async function extractEpub(
	data: Uint8Array,
	parser: Parser = new DOMParser()
): Promise<EpubText> {
	const zip = openZip(data);
	const path = await packagePath(zip, parser);
	const opf = await zip.text(path);
	if (opf === null) throw damaged();
	const pack = parseXml(parser, opf);
	const manifest = new Map(
		elements(pack, 'item').map((item) => [
			item.getAttribute('id'),
			{
				path: resolve(path, item.getAttribute('href') ?? ''),
				type: item.getAttribute('media-type') ?? '',
				properties: item.getAttribute('properties') ?? ''
			}
		])
	);
	const documents = elements(pack, 'itemref')
		.filter((reference) => reference.getAttribute('linear') !== 'no')
		.flatMap((reference) => manifest.get(reference.getAttribute('idref')) ?? [])
		.filter(
			(item) =>
				/^(?:application\/xhtml\+xml|text\/html)$/u.test(item.type) &&
				!/\bnav\b/u.test(item.properties)
		);
	const encrypted = await encryptedPaths(zip, parser);
	if (documents.some((item) => encrypted.has(item.path)))
		throw new ImportError(
			'Das E-Book ist kopiergeschützt (DRM). Lector liest E-Books ohne Kopierschutz.'
		);

	const chapters: string[][] = [];
	for (const item of documents) {
		const markup = await zip.text(item.path);
		if (markup === null) continue;
		let document = parser.parseFromString(markup, 'application/xhtml+xml');
		// Not every e-book is well-formed XHTML; the HTML parser forgives what XML does not.
		if (document.querySelector('parsererror'))
			document = parser.parseFromString(markup, 'text/html');
		const paragraphs = paragraphsOf(document);
		if (paragraphs.length) chapters.push(paragraphs);
	}
	const title = elements(pack, 'title')[0]?.textContent?.replace(/\s+/gu, ' ').trim();
	return { title: title || null, chapters };
}
