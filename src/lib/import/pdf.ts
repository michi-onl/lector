import { ImportError, MAX_PDF_PAGES } from './files.js';
import {
	linesFromItems,
	paragraphsFromPages,
	removeRunningLines,
	type PdfLine
} from './pdf-layout.js';

/** Extracts the text of a PDF in the browser with pdf.js and its own worker. */
export async function extractPdf(
	data: Uint8Array,
	onprogress?: (page: number, pages: number) => void
): Promise<{ title: string | null; paragraphs: string[] }> {
	// The legacy build polyfills recent JavaScript (e.g. `Map#getOrInsertComputed`) that the
	// current build of pdf.js assumes and many browsers still lack.
	const [pdfjs, worker] = await Promise.all([
		import('pdfjs-dist/legacy/build/pdf.mjs'),
		import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')
	]);
	pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
	// pdf.js takes the buffer over; the caller keeps the original for upload.
	const task = pdfjs.getDocument({ data: data.slice() });
	let pdf;
	try {
		pdf = await task.promise;
	} catch (error) {
		if (error instanceof Error && error.name === 'PasswordException')
			throw new ImportError('Das PDF ist passwortgeschützt.');
		throw new ImportError('Das PDF lässt sich nicht öffnen; ist die Datei beschädigt?');
	}
	try {
		if (pdf.numPages > MAX_PDF_PAGES)
			throw new ImportError(`Das PDF hat mehr als ${MAX_PDF_PAGES} Seiten.`);
		const metadata = await pdf.getMetadata().catch(() => null);
		const pages: PdfLine[][] = [];
		for (let number = 1; number <= pdf.numPages; number++) {
			onprogress?.(number, pdf.numPages);
			const page = await pdf.getPage(number);
			const content = await page.getTextContent();
			pages.push(
				linesFromItems(
					content.items.flatMap((item) =>
						'str' in item
							? [
									{
										text: item.str,
										x: item.transform[4],
										y: item.transform[5],
										width: item.width,
										size: item.height,
										endOfLine: item.hasEOL
									}
								]
							: []
					)
				)
			);
			page.cleanup();
		}
		const info = metadata?.info as { Title?: unknown } | undefined;
		const title = typeof info?.Title === 'string' && info.Title.trim() ? info.Title.trim() : null;
		return { title, paragraphs: paragraphsFromPages(removeRunningLines(pages)) };
	} finally {
		await task.destroy();
	}
}
