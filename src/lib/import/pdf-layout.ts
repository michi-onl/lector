/**
 * Turns the positioned text runs of a PDF into paragraphs. PDFs know glyphs and positions,
 * not paragraphs; these heuristics rebuild lines, drop running heads and page numbers, and
 * join lines into paragraphs. Fovea's column detection is left out: pdf.js returns runs in
 * content-stream order, which for most generated PDFs is already the reading order.
 */

/** A run of text as pdf.js reports it, in content-stream order. */
export interface PdfTextItem {
	text: string;
	x: number;
	/** Baseline, measured from the bottom of the page. */
	y: number;
	width: number;
	/** Font size; pdf.js reports it as the item's height. */
	size: number;
	endOfLine: boolean;
}

export interface PdfLine {
	text: string;
	x: number;
	y: number;
	width: number;
	size: number;
}

const DEFAULT_SIZE = 10;
/** Ends a line that may end a paragraph. */
const PARAGRAPH_END = /[.!?:…"“”»«)]$/u;

function percentile(values: number[], share: number): number | undefined {
	if (!values.length) return undefined;
	const sorted = values.toSorted((a, b) => a - b);
	return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * share))];
}

const median = (values: number[]) => percentile(values, 0.5);

export function linesFromItems(items: PdfTextItem[]): PdfLine[] {
	const lines: PdfLine[] = [];
	let current: PdfLine | null = null;
	let right = 0;
	for (const item of items) {
		const size: number = item.size || current?.size || DEFAULT_SIZE;
		// Superscripts and subscripts shift less than half a line and stay on it.
		if (current && Math.abs(item.y - current.y) >= Math.max(current.size, size) / 2) {
			lines.push(current);
			current = null;
		}
		if (item.text) {
			if (!current) {
				current = { text: item.text, x: item.x, y: item.y, width: item.width, size };
			} else {
				const gap = item.x - right;
				const space = gap > size * 0.15 && !/\s$/u.test(current.text) && !/^\s/u.test(item.text);
				current.text += (space ? ' ' : '') + item.text;
				current.width = Math.max(current.width, item.x + item.width - current.x);
				current.size = Math.max(current.size, size);
			}
			right = item.x + item.width;
		}
		if (item.endOfLine && current) {
			lines.push(current);
			current = null;
		}
	}
	if (current) lines.push(current);
	return lines
		.map((line) => ({ ...line, text: line.text.replace(/\s+/gu, ' ').trim() }))
		.filter((line) => line.text);
}

const PAGE_NUMBER =
	/^(?:(?:seite|page|s\.)\s*)?[-–—]?\s*\d{1,4}\s*[-–—]?(?:\s*(?:von|of|\/)\s*\d{1,4})?$/iu;

const runningKey = (text: string) =>
	text.toLowerCase().replace(/\d+/gu, '#').replace(/\s+/gu, ' ').trim();

/**
 * Drops page numbers at the top and bottom of a page, and lines there that recur on many
 * pages (running heads, footers), ignoring the numbers in them.
 */
export function removeRunningLines(pages: PdfLine[][]): PdfLine[][] {
	// Running heads and feet take the first and last two lines, on short pages one.
	const atEdge = (page: PdfLine[], index: number) => {
		const edge = page.length > 6 ? 2 : 1;
		return index < edge || index >= page.length - edge;
	};
	const counts = new Map<string, number>();
	for (const page of pages) {
		const keys = new Set(
			page.filter((_, index) => atEdge(page, index)).map((line) => runningKey(line.text))
		);
		for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
	}
	const threshold = Math.max(2, Math.ceil(pages.length * 0.4));
	return pages.map((page) =>
		page.filter(
			(line, index) =>
				!atEdge(page, index) ||
				(!PAGE_NUMBER.test(line.text) && (counts.get(runningKey(line.text)) ?? 0) < threshold)
		)
	);
}

/** Words after which a line-end hyphen is a German suspension hyphen („Lese- und …“). */
const SUSPENSION = /^(?:und|oder|bzw\.|bis|sowie|als|noch|wie)\b/u;

/** Joins two lines of one paragraph, undoing hyphenation at the line end. */
export function joinLines(before: string, after: string): string {
	if (before.endsWith('­')) return before.slice(0, -1) + after;
	if (/\p{L}-$/u.test(before) && /^\p{Ll}/u.test(after) && !SUSPENSION.test(after))
		return before.slice(0, -1) + after;
	return `${before} ${after}`;
}

/**
 * Groups lines into paragraphs. A paragraph ends at a clearly larger line gap, at a change of
 * font size (headings), or after a short line that ends a sentence. A paragraph that runs to
 * the bottom of a page continues on the next one.
 */
export function paragraphsFromPages(pages: PdfLine[][]): string[] {
	const paragraphs: string[] = [];
	let current = '';
	let continues = false;
	// Most lines of a text run the full width, so a high percentile is the full line width.
	const width =
		percentile(
			pages.flat().map((line) => line.width),
			0.8
		) ?? 0;
	const short = (line: PdfLine) => line.width < width * 0.75;
	for (const page of pages) {
		if (!page.length) continue;
		const gaps = page
			.slice(1)
			.map((line, index) => page[index].y - line.y)
			.filter((gap) => gap > 0);
		const bodySize = median(page.map((line) => line.size)) ?? DEFAULT_SIZE;
		const spacing = median(gaps) ?? bodySize * 1.2;
		for (const [index, line] of page.entries()) {
			const previous = page[index - 1];
			const breaks = previous
				? Math.abs(line.size - previous.size) > bodySize * 0.15 ||
					previous.y - line.y > spacing * 1.5 ||
					(short(previous) && PARAGRAPH_END.test(previous.text))
				: !continues;
			if (breaks && current) {
				paragraphs.push(current);
				current = '';
			}
			current = current ? joinLines(current, line.text) : line.text;
		}
		const last = page.at(-1)!;
		continues = !(short(last) && PARAGRAPH_END.test(last.text));
	}
	if (current) paragraphs.push(current);
	return paragraphs.map((paragraph) => paragraph.replaceAll('­', '').trim()).filter(Boolean);
}
