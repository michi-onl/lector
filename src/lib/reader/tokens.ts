/**
 * One displayed token, prepared once for ORP selection and adaptive timing. Both read
 * the same normalisation and classification, so they never disagree about what a token is.
 */

export type TokenType = 'WORD' | 'NUMBER' | 'DATE_TIME' | 'URL_EMAIL' | 'TECHNICAL' | 'OTHER';
export type TextDirection = 'LTR' | 'RTL' | 'MIXED' | 'UNKNOWN';
/** The finer token classes Smart Timing distinguishes (start values in its config). */
export type SpecialToken =
	| 'simple-number'
	| 'complex-number'
	| 'date'
	| 'time'
	| 'abbreviation'
	| 'unit'
	| 'url'
	| 'email'
	| 'technical';
export type PunctuationClass =
	'comma' | 'colon' | 'semicolon' | 'dash' | 'period' | 'question' | 'exclamation' | 'interrobang';

export interface TokenShape {
	displayText: string;
	/** The token without outer punctuation; inner hyphens, apostrophes and dots stay. */
	coreText: string;
	displayGraphemes: string[];
	/** Index of the first core grapheme within `displayGraphemes`. */
	coreStart: number;
	coreGraphemes: string[];
	type: TokenType;
	special: SpecialToken | null;
	direction: TextDirection;
	/** The closing punctuation of the token as one class; combinations are their own class. */
	punctuation: PunctuationClass | null;
}

const segmenter =
	typeof Intl !== 'undefined' && 'Segmenter' in Intl
		? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
		: null;

/** Visible grapheme clusters; code points only where the runtime lacks Intl.Segmenter. */
export function graphemes(text: string): string[] {
	return segmenter
		? Array.from(segmenter.segment(text), (segment) => segment.segment)
		: Array.from(text);
}

const OUTER = /^[\p{P}\p{S}\p{Z}]$/u;
const RTL = /[\p{Script=Hebrew}\p{Script=Arabic}\p{Script=Syriac}\p{Script=Thaana}\p{Script=Nko}]/u;
const LTR =
	/[\p{Script=Latin}\p{Script=Greek}\p{Script=Cyrillic}\p{Script=Armenian}\p{Script=Georgian}]/u;
const UNIT =
	'(?:km|cm|mm|nm|µm|m|kg|mg|g|t|ml|l|km/h|m/s|m²|m³|°C|°F|K|Hz|kHz|MHz|GHz|kB|MB|GB|TB|kW|kWh|W|V|mA|A|dB|ms|s|min|h)';
const STANDALONE_UNITS = new Set([
	'km',
	'cm',
	'mm',
	'kg',
	'mg',
	'ml',
	'km/h',
	'm/s',
	'm²',
	'm³',
	'°C',
	'°F',
	'Hz',
	'kHz',
	'MHz',
	'GHz',
	'kB',
	'MB',
	'GB',
	'TB',
	'kW',
	'kWh',
	'mA',
	'dB'
]);

export function textDirection(text: string): TextDirection {
	const rtl = RTL.test(text);
	const ltr = LTR.test(text);
	return rtl && ltr ? 'MIXED' : rtl ? 'RTL' : ltr ? 'LTR' : 'UNKNOWN';
}

function punctuationOf(trailing: string): PunctuationClass | null {
	// Closing quotes and brackets do not change what the mark before them means. German closes
	// with “ (an initial-quote character), so every quote category counts.
	const marks = trailing.replace(/[\p{Pe}\p{Pf}\p{Pi}"'»«›‹]/gu, '');
	if (/\?!|!\?|‽/u.test(marks)) return 'interrobang';
	const last = marks.at(-1);
	if (last === '?') return 'question';
	if (last === '!') return 'exclamation';
	if (last === '.' || last === '…') return 'period';
	if (last === ';') return 'semicolon';
	if (last === ':') return 'colon';
	if (last === ',') return 'comma';
	if (last && /[\p{Pd}]/u.test(last)) return 'dash';
	return null;
}

function specialOf(core: string, display: string): SpecialToken | null {
	if (!core) return null;
	if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u.test(core)) return 'email';
	if (/^(?:https?:\/\/|www\.)\S+$/iu.test(core) || /^(?:[a-z0-9-]+\.)+[a-z]{2,}\/\S*$/iu.test(core))
		return 'url';
	if (
		/^\d{1,2}\.\d{1,2}\.\d{2,4}$/u.test(core) ||
		// "3.5." loses its closing dot to the outer punctuation; the dot after the core restores it.
		(/^\d{1,2}\.\d{1,2}$/u.test(core) && display.includes(`${core}.`)) ||
		/^\d{4}-\d{2}-\d{2}$/u.test(core) ||
		/^\d{1,2}\/\d{1,2}\/\d{2,4}$/u.test(core)
	)
		return 'date';
	if (/^\d{1,2}:\d{2}(?::\d{2})?(?:h|Uhr)?$/iu.test(core)) return 'time';
	if (
		new RegExp(`^[+−-]?\\d+(?:[.,]\\d+)?\\s?${UNIT}$`, 'u').test(core) ||
		STANDALONE_UNITS.has(core)
	)
		return 'unit';
	if (/^\d{1,4}$/u.test(core)) return 'simple-number';
	if (
		/^[+−-]?\d[\d.,'’\u202f]*(?:[%‰€$£]|[–-]\d[\d.,]*)?$/u.test(core) ||
		/^[+−-]?\d+\/\d+$/u.test(core) ||
		/^[%‰€$£]\d/u.test(core)
	)
		return /^v?\d+(?:\.\d+){2,}$/u.test(core) ? 'technical' : 'complex-number';
	if (/^\p{L}{1,4}(?:\.\p{L}{1,4})+$/u.test(core)) return 'abbreviation';
	// "und/oder" and "Lehrer/innen" are words, not paths.
	if (/^\p{L}+(?:\/\p{L}+)+$/u.test(core)) return null;
	if (
		/[_\\/=<>{}[\]#|~^]|::|->|=>|\(\)/u.test(core) ||
		/\p{Ll}\p{Lu}/u.test(core) ||
		(/\p{L}/u.test(core) && /\d/u.test(core)) ||
		/^v\d+(?:\.\d+)+$/u.test(core)
	)
		return 'technical';
	return null;
}

function typeOf(core: string, special: SpecialToken | null): TokenType {
	switch (special) {
		case 'simple-number':
		case 'complex-number':
		case 'unit':
			return /^[+−-]?\d/u.test(core) ? 'NUMBER' : 'WORD';
		case 'date':
		case 'time':
			return 'DATE_TIME';
		case 'url':
		case 'email':
			return 'URL_EMAIL';
		case 'technical':
			return 'TECHNICAL';
		default:
			return /\p{L}/u.test(core) ? 'WORD' : /\d/u.test(core) ? 'NUMBER' : 'OTHER';
	}
}

/**
 * Splits outer punctuation from the core, classifies the token and its direction. Pure and
 * deterministic: the same text always gives the same shape.
 */
export function shapeToken(displayText: string): TokenShape {
	const displayGraphemes = graphemes(displayText);
	let start = 0;
	let end = displayGraphemes.length;
	while (start < end && OUTER.test(displayGraphemes[start])) start++;
	while (end > start && OUTER.test(displayGraphemes[end - 1])) end--;
	// A token of punctuation alone (a dash, an ellipsis) keeps itself as core.
	if (start === end) {
		start = 0;
		end = displayGraphemes.length;
	}
	const coreGraphemes = displayGraphemes.slice(start, end);
	const coreText = coreGraphemes.join('');
	const special = specialOf(coreText, displayText);
	// A token of symbols alone ("–", "…") is its own punctuation; otherwise the marks after the core.
	const closing = /[\p{L}\p{N}]/u.test(coreText) ? displayGraphemes.slice(end).join('') : coreText;
	return {
		displayText,
		coreText,
		displayGraphemes,
		coreStart: start,
		coreGraphemes,
		type: typeOf(coreText, special),
		special,
		direction: textDirection(coreText),
		punctuation: punctuationOf(closing)
	};
}
