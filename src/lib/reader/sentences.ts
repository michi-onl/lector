/**
 * Sentence segmentation, ported unchanged from Fovea (commit 773385a). References such as
 * (D.10) or (N6) point to Fovea's internal segmentation spec.
 */
/** Closing quotes and brackets that may follow punctuation without ending its role. */
const CLOSING = `"'“”„‘’»«›‹)\\]`;
const SENTENCE_END = new RegExp(`[.!?…][${CLOSING}]*$`, 'u');
const CLAUSE_END = new RegExp(`[,;:][${CLOSING}]*$`, 'u');
const OPENING = /^["'“”„‘’»«›‹([]+/u;
const TRAILING = new RegExp(`[${CLOSING}]+$`, 'u');

/** Terminal punctuation, also when a closing quote or bracket follows it ("„Ende.“"). */
export const endsSentenceMark = (token: string): boolean => SENTENCE_END.test(token);
/** Comma, semicolon or colon, also before a closing quote or bracket ("„Hallo,“"). */
export const endsClauseMark = (token: string): boolean => CLAUSE_END.test(token);

/**
 * Titles precede a name, but a name cannot be told from a noun locally ("Dr. Müller" vs.
 * "wurde er Dr. Kollegen …", N8): they continue only before lower case or another title.
 */
const TITLES = new Set(['dr', 'prof', 'hr', 'mr', 'mrs', 'ms']);
/** Connecting abbreviations never end a sentence: positive evidence of a continuation. */
const CONNECTING = new Set(['bzw', 'ca', 'vgl', 'inkl', 'zzgl', 'bspw', 'sog']);
/**
 * Can also end a sentence ("King Jr.", "Baker St.", "am Fr.", "kommen evtl."): they continue
 * only before lower case, never before a capital or a digit (N6, N9).
 */
const SENTENCE_FINAL_CAPABLE = new Set(['jr', 'sr', 'st', 'fr', 'evtl', 'ggf', 'vs']);
const ABBREVIATIONS = new Set([...TITLES, ...CONNECTING, ...SENTENCE_FINAL_CAPABLE]);
/**
 * May end a sentence or continue it, often before a (capitalized German) noun. Followed by a
 * capital, the boundary is uncertain. A short, fixed list; unlisted abbreviations are caught
 * by the lower-case fragment check in segmentSentences.
 */
const OPEN_ENDED = new Set([
	'etc',
	'usw',
	'gem',
	'bzgl',
	'ggü',
	'lt',
	'abs',
	'jh',
	'chr',
	'hrsg',
	'bd',
	'insb',
	'allg',
	'mind',
	'zzt',
	'tel'
]);
/** Established references that continue the sentence before a digit ("No. 5", "Fig. 3"). */
const NUMBERED = new Set(['no', 'nr', 'fig', 'abb', 'kap', 'vol']);
/**
 * Reference words that introduce a number, a label or a title ("Kap. 4", "Vol. II", "Kap.
 * „Die Wartung“"). Without a continuing digit they stay reference evidence (D.10, K1): a
 * title after them starts with a sentence starter without starting a sentence. Only a
 * lower-case form without a digit is an ordinary word ("voted no.").
 */
const REFERENCES = new Set(
	'no nr fig abb kap vol abschn ch chap sec sect tab anl anh app appx art ziff par pp rn fn anm bsp'.split(
		' '
	)
);
/** Words after which a number with a period is certainly an ordinal ("am 3.", "der 2."). */
const ORDINAL_CONTEXT = new Set([
	'am',
	'im',
	'vom',
	'zum',
	'beim',
	'der',
	'die',
	'das',
	'den',
	'dem',
	'des'
]);
/**
 * Closed-class words that typically open a sentence (articles, pronouns, connectives,
 * frequent adverbs and prepositions). After a real sentence end one of these usually
 * follows; after an abbreviation usually a noun, a name or a digit does.
 */
const SENTENCE_STARTERS = new Set(
	(
		'Der Die Das Den Dem Des Ein Eine Einen Einem Einer Er Sie Es Wir Ihr Ich Du Man ' +
		'Dies Diese Dieser Dieses Jeder Jede Jedes Alle Viele Einige Kein Keine Sein Seine ' +
		'Ihre Unser Unsere Dann Danach Dabei Damit Darum Deshalb Deswegen Folglich Daher ' +
		'Dadurch Doch Aber Und Oder Auch Außerdem Jedoch Trotzdem Somit Also Zudem Heute ' +
		'Gestern Später Seitdem Nun Hier Dort So Wenn Als Weil Da Obwohl Nachdem Bevor ' +
		'Während Warum Wie Was Wer Wo Im Am In Auf Mit Nach Bei Seit Zunächst Leider Allerdings ' +
		'The A An This That These Those He She It We They I You There Then Therefore ' +
		'Consequently However But And Or Also So Thus Hence As After Before When While ' +
		'Because Although If Yet Still Now Here Its His Her Their Our My Many Some Most All Unfortunately Meanwhile Today'
	).split(' ')
);
const MONTHS =
	/^(Januar|Jänner|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember|January|February|March|May|June|July|October|December)\b/u;

const stemOf = (token: string) =>
	token.replace(OPENING, '').replace(TRAILING, '').replace(/\.$/u, '');
const bareWord = (token: string | undefined) =>
	(token ?? '')
		.replace(OPENING, '')
		.replace(/[.,;:!?…]+$/u, '')
		.replace(TRAILING, '');

/** A token that, by itself, is an abbreviation whose period is part of it (never a year). */
export function isAbbreviation(token: string): boolean {
	const core = token.replace(OPENING, '').replace(TRAILING, '');
	if (!core.endsWith('.') || core.endsWith('..')) return false;
	const stem = core.slice(0, -1);
	const lower = stem.toLocaleLowerCase();
	return (
		/^\p{Ll}$/u.test(stem) ||
		/^(\p{L}\.)+\p{L}$/u.test(stem) ||
		ABBREVIATIONS.has(lower) ||
		OPEN_ENDED.has(lower)
	);
}

/** Complete initials that only ever continue a sentence ("z. B.", "d. h.", "e.g.", "i.e."). */
const NEVER_FINAL_INITIALS = new Set(['zb', 'dh', 'eg', 'ie']);
/** Words that follow a reference label ("Vol. I of …", "Anl. A des …"), not a sentence start. */
const LABEL_FOLLOWERS = new Set(
	'of in on to and or see des der die das den dem und oder von zu im am siehe'.split(' ')
);
/** How far a quoted or bracketed title after a boundary is followed ("„Die Wartung“ …"). */
const EMBEDDED_LOOKAHEAD = 8;

/**
 * The outcome for a boundary (D.8). Only decideBoundary produces one (D.9): every rule and
 * list below contributes evidence, and no single piece of evidence decides on its own.
 */
export type Boundary = 'confirmed-end' | 'confirmed-continuation' | 'uncertain';

/**
 * What the word before a period suggests:
 * - 'ordinary': a plain word or a year; a period after it suggests an end.
 * - 'short': a short lower-case word ("aus.", "resp."); an end or an abbreviation.
 * - 'unit': a short word after a number ("5 Mio."); like 'short', but no end at the text end.
 * - 'internal': never ends a sentence ("bzw.", "z. B.", "No. 5", "am 3. Mai").
 * - 'abbreviation': may end or continue a sentence (titles, "Jr.", "etc.", "u. a.", "U.S.",
 *   words without a vowel such as "Pkt." or "Hrsg.").
 * - 'reference': a reference word without its number ("Kap.", "Vol.", "Abschn."); a label or a
 *   title may follow (D.10, K1).
 */
export type WordEvidence =
	'ordinary' | 'short' | 'unit' | 'internal' | 'abbreviation' | 'reference';

/**
 * The token after a boundary:
 * - 'label': a sentence starter that is part of a reference ("Vol. I of …", "Fig. A shows …").
 * - 'embedded': a quoted or bracketed phrase that the sentence continues after
 *   ("„Die Wartung“ alle Schritte", "\"The Basics\" of the guide").
 * - 'none': nothing follows (document end).
 */
export type NextEvidence = 'none' | 'starter' | 'label' | 'embedded' | 'lower' | 'digit' | 'other';

/** Observations around one boundary (D.9, D.10); only decideBoundary turns them into a Boundary. */
export interface BoundaryEvidence {
	/** The mark after the token; 'edge' is the start of the document before its first token. */
	mark: 'none' | 'period' | 'exclamation' | 'question' | 'ellipsis' | 'edge';
	/**
	 * "!", "?" or an ellipsis closes a bracket ("(!)", "(wirklich?)", "(...)"): it belongs to an
	 * insertion. A bracketed period ("(endlich.)") closes a sentence like any other period.
	 */
	bracketed: boolean;
	/** A quotation or bracket opened before the boundary is still open after it (D.10, K2). */
	enclosed: boolean;
	/** Only for a period; null for every other mark. */
	word: WordEvidence | null;
	next: NextEvidence;
	/**
	 * 'within' a text block; 'soft': the next token starts another text block (paragraph, page,
	 * or text after a heading, D.10); 'hard': the document ends.
	 */
	block: 'within' | 'soft' | 'hard';
}

/**
 * The single reliability decision (D.9). End and continuation are each confirmed only by
 * positive evidence and only without contrary evidence; conflicts stay uncertain.
 */
export function decideBoundary(evidence: BoundaryEvidence): Boundary {
	const { mark, bracketed, enclosed, word, next, block } = evidence;
	// The document start opens a sentence, unless the text begins mid-sentence.
	if (mark === 'edge') return next === 'lower' || enclosed ? 'uncertain' : 'confirmed-end';
	// No mark is no boundary inside a block; across blocks the sentence is cut off.
	if (mark === 'none') return block === 'within' ? 'confirmed-continuation' : 'uncertain';
	// A mark inside brackets ('(!)', '(...)') belongs to an insertion, not to the sentence.
	const strongMark = mark === 'exclamation' || mark === 'question';
	const suggestsEnd = !bracketed && (strongMark || (mark === 'period' && word === 'ordinary'));
	const suggestsContinuation =
		bracketed ||
		enclosed ||
		word === 'internal' ||
		word === 'abbreviation' ||
		word === 'reference' ||
		next === 'lower' ||
		next === 'label' ||
		next === 'embedded';
	// An end needs a following sentence starter, or the end of the document after a mark that
	// can close a sentence there (not after an abbreviation, a reference, a number or a unit).
	const endsText = block === 'hard' && (word === null || word === 'ordinary' || word === 'short');
	if ((next === 'starter' || endsText) && !suggestsContinuation) return 'confirmed-end';
	// A continuation needs lower case after it or a word that never ends a sentence; it never
	// crosses a block, since a statement is taken from one block only.
	const continues = next === 'lower' || word === 'internal';
	if (continues && !suggestsEnd && next !== 'starter' && block === 'within')
		return 'confirmed-continuation';
	return 'uncertain';
}

const coreOf = (token: string | undefined) =>
	(token ?? '').replace(OPENING, '').replace(TRAILING, '');
const WORD_END = new RegExp(`[.${CLOSING}]+$`, 'u');

/** Evidence from the word before a period; lists and patterns suggest, never decide. */
function wordEvidence(
	previous: string | undefined,
	token: string,
	next: string | undefined
): WordEvidence {
	// The word itself, without a quoted or bracketed sentence end ("„Ende.“.", "(endlich.).").
	const stem = coreOf(token).replace(WORD_END, '');
	const lower = stem.toLocaleLowerCase();
	// A single letter: inside a chain of initials ("z. B.", "J. R. R."), completing a pair
	// ("z. B." never ends, "u. a." / "o. Ä." / "v. H." may) or standing alone ("Vitamin C.").
	if (/^\p{L}$/u.test(stem)) {
		if (/^\p{L}\.$/u.test(coreOf(next))) return 'internal';
		const initial = coreOf(previous);
		if (/^\p{L}\.$/u.test(initial))
			return NEVER_FINAL_INITIALS.has(`${initial[0]}${stem}`.toLocaleLowerCase())
				? 'internal'
				: 'abbreviation';
		return 'abbreviation';
	}
	// Initials in one token ("z.B.", "e.g.", "a.m.", "U.S.").
	if (/^(\p{L}\.)+\p{L}$/u.test(stem))
		return NEVER_FINAL_INITIALS.has(stem.replaceAll('.', '').toLocaleLowerCase())
			? 'internal'
			: 'abbreviation';
	// A title followed by another title ("Prof. Dr.") is a title chain.
	if (TITLES.has(lower))
		return coreOf(next).endsWith('.') && TITLES.has(stemOf(next ?? '').toLocaleLowerCase())
			? 'internal'
			: 'abbreviation';
	if (CONNECTING.has(lower)) return 'internal';
	if (SENTENCE_FINAL_CAPABLE.has(lower) || OPEN_ENDED.has(lower)) return 'abbreviation';
	// A reference before a digit continues ("No. 5", "Fig. 3"). Without one it stays reference
	// evidence (K1); only the lower-case word "no." is ordinary ("voted no.").
	if (REFERENCES.has(lower)) {
		// Only the established numbered references continue before a digit; the others stay
		// reference evidence there too ("Art. 3" remains uncertain, as before).
		if (/^\d/u.test(coreOf(next)) && NUMBERED.has(lower)) return 'internal';
		return /^\p{Lu}/u.test(stem) || /^\d/u.test(coreOf(next)) ? 'reference' : 'ordinary';
	}
	if (/^\d+$/u.test(stem)) {
		// Only a year ("im Jahr 2021.") may end a sentence after a number.
		if (/^\d{4,}$/u.test(stem)) return 'ordinary';
		// Dates and ordinals after an article stay together ("am 3. Mai", "der 2. Versuch").
		if (MONTHS.test(next ?? '') || ORDINAL_CONTEXT.has(bareWord(previous).toLocaleLowerCase()))
			return 'internal';
		return 'abbreviation';
	}
	// Unlisted abbreviations (N3, N4): an inner period ("Dipl.-Ing."), a short word after a
	// number ("5 Mio.") or a short lower-case word ("resp.", but also "aus.").
	if (stem.includes('.')) return 'abbreviation';
	if (/^\p{L}{1,4}$/u.test(stem)) {
		// After a cardinal ("5 Mio.", "3.5 km."), not after a date ("am 4. Mai.").
		if (/^\d+([.,]\d+)*$/u.test(coreOf(previous)) && !MONTHS.test(stem)) return 'unit';
	}
	// A word without a vowel is an abbreviation, never a word that ends a sentence ("Pkt.",
	// "Hrsg.", "Std."), whether listed or not.
	if (/^\p{L}{2,}$/u.test(stem) && !/[aeiouyäöüàáâéèêíìîóòôúùû]/iu.test(stem))
		return 'abbreviation';
	if (/^\p{Ll}\p{L}{0,3}$/u.test(stem)) return 'short';
	return 'ordinary';
}

const OPENS_QUOTE = /^["'„‚“‘«»([]/u;
const CLOSES_QUOTE = /["'“”‘’»«)\]]$/u;

/**
 * Whether the phrase opened by `next` is embedded in the sentence: it closes within a few
 * tokens without punctuation of its own, and the sentence goes on in lower case ("„Die
 * Wartung“ alle Schritte", "\"The Basics\" of the guide"). Direct speech closes with a mark
 * or a comma ("„Die Zeit ist um“, sagte sie") and is not embedded.
 */
function embeddedPhrase(following: string[]): boolean {
	if (!OPENS_QUOTE.test(following[0] ?? '')) return false;
	for (const [index, token] of following.slice(0, EMBEDDED_LOOKAHEAD).entries()) {
		if (!CLOSES_QUOTE.test(token.replace(/[.,;:!?…]+$/u, ''))) continue;
		// Punctuation inside or right after the closing quote marks speech, not a title.
		if (/[.,;:!?…]/u.test(token.replace(/[\p{L}\p{N}\s-]+/gu, '').replace(/^["'„‚“‘«»([]+/u, '')))
			return false;
		return /^\p{Ll}/u.test((following[index + 1] ?? '').replace(OPENING, ''));
	}
	return false;
}

/** Evidence from the tokens after a boundary; a starter token alone is not a sentence start. */
function nextEvidence(token: string, following: string[]): NextEvidence {
	const [next, afterNext] = following;
	if (next === undefined) return 'none';
	const start = next.replace(OPENING, '');
	if (/^\p{Ll}/u.test(start)) return 'lower';
	if (/^\d/u.test(start)) return 'digit';
	if (embeddedPhrase(following)) return 'embedded';
	const word = bareWord(next);
	if (!SENTENCE_STARTERS.has(word)) return 'other';
	// "A" and "I" are also labels: after a short capitalized reference word ("Vol.", "Fig.",
	// "Appx."), with punctuation of their own ("I.", "A,") or before a label follower ("of").
	if (/^(\p{Lu}|[IVXLC]+)$/u.test(word)) {
		const reference = /^\p{Lu}\p{Ll}{0,4}$/u.test(stemOf(token));
		const punctuated = coreOf(next) !== word;
		const follower = afterNext === undefined || !/^\p{L}/u.test(afterNext.replace(OPENING, ''));
		if (reference || punctuated || follower || LABEL_FOLLOWERS.has(bareWord(afterNext)))
			return 'label';
	}
	return 'starter';
}

/**
 * Open quotations and brackets, as a stack of the closers they expect (D.10, K2). Only local
 * balance: a German „ closes with “, an English “ with ”, straight quotes open at a word start
 * and close at a word end, and an apostrophe inside a word ("don't", "geht's") is ignored.
 * It is text-flow state (D.11): callers carry it from block to block (scanEnclosure).
 */
export type EnclosureState = readonly string[];
/**
 * The state after text of unconfirmed order or membership that may have opened or closed a
 * quotation (D.13): treated as open, and never closed by any mark.
 */
export const UNKNOWN_ENCLOSURE: EnclosureState = ['?'];
type Enclosure = string[];
/**
 * An apostrophe at a word start that elides, not quotes: before a digit ("'90s", "‘20") or in
 * a fixed elision ("'s", "'em", "'cause", "'til", "'tis", "'twas"). It never opens a
 * quotation, so it cannot leave the rest of a document open (D.11).
 */
const ELISION = /^(\d|(s|em|cause|til|tis|twas)(?![\p{L}\p{N}]))/iu;

/**
 * `closerAhead`: a single closing quote follows later in the same block. An elision-shaped
 * opener ("'90 people came. …'", "'Til the end …'") then opens a real quotation (D.12, F3);
 * without one it stays an elision ("the '90s").
 */
function enclose(
	stack: Enclosure,
	token: string,
	closerAhead = false,
	unmatched?: string[]
): Enclosure {
	const next = [...stack];
	const close = (closer: string) => {
		const at = next.lastIndexOf(closer);
		if (at >= 0) next.splice(at);
		else unmatched?.push(closer);
		return at >= 0;
	};
	const chars = [...token];
	for (const [index, char] of chars.entries()) {
		// At the word start (only other openers before it) or the word end (no letter after it).
		const first = /^["'„‚“‘«»([]*$/u.test(chars.slice(0, index).join(''));
		const last = !/[\p{L}\p{N}]/u.test(chars.slice(index + 1).join(''));
		if (char === '„') next.push('“');
		else if (char === '‚') next.push('‘');
		else if (char === '(') next.push(')');
		else if (char === '[') next.push(']');
		else if (char === ')' || char === ']' || char === '”') close(char);
		// “ and ‘ open English quotations at a word start and close German ones at a word end;
		// the position decides, not the stack (D.12, F3: “The Model” inside „…“).
		else if (char === '“') {
			if (first && !last) next.push('”');
			else if (last) close('“');
		} else if (char === '‘') {
			const elision = !closerAhead && ELISION.test(chars.slice(index + 1).join(''));
			if (first && !last && !elision) next.push('’');
			else if (last) close('‘');
		} else if (char === '’') {
			if (last) close('’');
		} else if (char === '»' || char === '«') {
			if (next.includes(char)) close(char);
			else if (first) next.push(char === '»' ? '«' : '»');
			else if (last) unmatched?.push(char);
		} else if (char === '"' || char === "'") {
			const elision = char === "'" && !closerAhead && ELISION.test(chars.slice(index + 1).join(''));
			if (last && next.includes(char)) close(char);
			else if (first && !last && !elision) next.push(char);
			// A straight double quote at a word end with nothing to close closes something earlier.
			else if (char === '"' && last && !first) unmatched?.push(char);
		}
	}
	return next;
}

/** The enclosure after every token of a text, starting from `initial`. */
function enclosures(tokens: string[], initial: EnclosureState, unmatched?: string[]): Enclosure[] {
	// Whether a single closing quote (at a word end) follows each token in this block.
	const closerAhead = tokens.map(() => false);
	for (let index = tokens.length - 2; index >= 0; index--)
		closerAhead[index] =
			closerAhead[index + 1] || /[\p{L}\p{N}.,;:!?…]['’][^\p{L}\p{N}]*$/u.test(tokens[index + 1]);
	const states: Enclosure[] = [];
	let state = [...initial];
	for (const [index, token] of tokens.entries())
		states.push((state = enclose(state, token, closerAhead[index], unmatched)));
	return states;
}

/**
 * The enclosure state after a block of text, from the state before it (D.11). Text without
 * quotation marks or brackets leaves the state unchanged; nothing but a closing mark closes.
 */
export function scanEnclosure(text: string, state: EnclosureState = []): EnclosureState {
	return enclosures(tokensOf(text), state).at(-1) ?? [...state];
}

/**
 * The balance of quotation marks and brackets of a text after `state` (D.14): the closing
 * marks that nothing opened (the text continues a quotation begun before it) and the
 * marks still open after it (a quotation that goes on after it).
 */
export function enclosureBalance(
	text: string,
	state: EnclosureState = []
): { unmatched: string[]; open: EnclosureState } {
	const unmatched: string[] = [];
	const open = enclosures(tokensOf(text), state, unmatched).at(-1) ?? [...state];
	return { unmatched, open };
}

/** Collects the evidence for the boundary after a token; decides nothing. */
function boundaryEvidence(
	previous: string | undefined,
	token: string,
	following: string[],
	enclosed: boolean,
	block: BoundaryEvidence['block']
): BoundaryEvidence {
	const core = coreOf(token);
	const mark = !endsSentenceMark(token)
		? 'none'
		: /(\.\.|…)$/u.test(core)
			? 'ellipsis'
			: core.endsWith('.')
				? 'period'
				: core.endsWith('?')
					? 'question'
					: 'exclamation';
	return {
		mark,
		bracketed:
			mark !== 'none' && mark !== 'period' && /[)\]]/u.test(token.match(TRAILING)?.[0] ?? ''),
		enclosed,
		word: mark === 'period' ? wordEvidence(previous, token, following[0]) : null,
		next: nextEvidence(token, following),
		block
	};
}

export interface SentenceSegment {
	text: string;
	/**
	 * True only if both boundaries are confirmed ends (decideBoundary) and no lower-case start
	 * marks a fragment.
	 */
	reliable: boolean;
}

/**
 * The neighbouring text blocks in reading order (D.9, D.10). A block boundary is only
 * structural evidence: `before`/`after` hold the neighbouring text, whose tokens and open
 * quotations decide the boundary like any other. Undefined means the document edge; a
 * heading is not an edge (its detection may be a font-size guess), so callers pass the text
 * beyond it.
 */
export interface BlockContext {
	before?: string;
	after?: string;
	/**
	 * Quotations and brackets open before this block, carried along the whole text flow
	 * (D.11). Omitted, it is derived from `before` alone, which suits an isolated text only.
	 */
	enclosure?: EnclosureState;
	/**
	 * A neighbour exists but its link to this block is not confirmed reading order (D.13): the
	 * block boundary on that side has no confirming evidence and stays uncertain.
	 */
	uncertainBefore?: boolean;
	uncertainAfter?: boolean;
}

/**
 * Small, local segmentation for extracting whole statements. Uncertain boundaries split
 * but mark both neighbours unreliable, so callers can drop them instead of guessing.
 * Trailing text without terminal punctuation is not a complete statement and is omitted.
 */
export function segmentSentences(text: string, context: BlockContext = {}): SentenceSegment[] {
	return segmentBlock(text, context).segments;
}

/**
 * segmentSentences plus the enclosure state after the block, for callers that carry the
 * state through a text flow of any length (D.11).
 */
export function segmentBlock(
	text: string,
	context: BlockContext = {}
): { segments: SentenceSegment[]; enclosureAfter: EnclosureState } {
	const { segments, enclosureAfter } = splitAtBoundaries(text, context);
	// A sentence never starts in lower case: such a segment was cut after an unlisted
	// abbreviation or begins mid-sentence, so neither it nor the one before is reliable.
	for (const [index, segment] of segments.entries())
		if (/^\p{Ll}/u.test(segment.text.replace(OPENING, ''))) {
			segment.reliable = false;
			if (index > 0) segments[index - 1].reliable = false;
		}
	return { segments, enclosureAfter };
}

const tokensOf = (text: string) => text.split(/\s+/u).filter(Boolean);

/** One decided boundary: the token before it ('' for a block start) and all its evidence. */
export interface BoundaryDecision {
	token: string;
	evidence: BoundaryEvidence;
	boundary: Boundary;
}

/**
 * Decides the start of a block and the boundary after every token with a terminal mark,
 * each from its complete evidence (D.10). The start is decided like every other boundary:
 * at the document edge, or from the last token of the previous block (H).
 */
function decideBlock(
	text: string,
	context: BlockContext
): {
	own: string[];
	start: BoundaryDecision | null;
	marks: (BoundaryDecision | null)[];
	enclosureAfter: EnclosureState;
} {
	const previousBlock = context.before === undefined ? [] : tokensOf(context.before);
	const before = previousBlock.slice(-2);
	const own = tokensOf(text);
	const after =
		context.after === undefined || context.uncertainAfter
			? []
			: tokensOf(context.after).slice(0, EMBEDDED_LOOKAHEAD + 1);
	const tokens = [...before, ...own, ...after];
	const start = before.length;
	// Quotations and brackets still open before this block stay open here: the carried
	// text-flow state (D.11), or for an isolated text the state after its previous block.
	const opened = context.enclosure ?? enclosures(previousBlock, []).at(-1) ?? [];
	const states = enclosures(own, opened);
	const decision = (token: string, evidence: BoundaryEvidence): BoundaryDecision => ({
		token,
		evidence,
		boundary: decideBoundary(evidence)
	});
	const startDecision = context.uncertainBefore
		? decision('', {
				mark: 'none',
				bracketed: false,
				enclosed: opened.length > 0,
				word: null,
				next: nextEvidence('', own),
				block: 'soft'
			})
		: context.before === undefined
			? decision('', {
					mark: 'edge',
					bracketed: false,
					enclosed: false,
					word: null,
					next: nextEvidence('', own),
					block: 'hard'
				})
			: start > 0
				? decision(
						tokens[start - 1],
						boundaryEvidence(
							tokens[start - 2],
							tokens[start - 1],
							tokens.slice(start),
							opened.length > 0,
							'soft'
						)
					)
				: null;
	const marks = own.map((token, index) => {
		if (!endsSentenceMark(token)) return null;
		const block =
			index < own.length - 1
				? 'within'
				: context.after === undefined && !context.uncertainAfter
					? 'hard'
					: 'soft';
		const at = start + index;
		return decision(
			token,
			boundaryEvidence(
				tokens[at - 1],
				token,
				block === 'hard' ? [] : tokens.slice(at + 1),
				states[index].length > 0,
				block
			)
		);
	});
	return { own, start: startDecision, marks, enclosureAfter: states.at(-1) ?? [...opened] };
}

/**
 * The decided boundary after every whitespace-separated token of a block, or null where a
 * token ends no sentence (F). The reader's sentence units use the same evidence as the
 * comprehension checks instead of a second rule: "z. B." or "Prof." continue a sentence.
 */
export function tokenBoundaries(text: string, context: BlockContext = {}): (Boundary | null)[] {
	return decideBlock(text, context).marks.map((mark) => mark?.boundary ?? null);
}

/** The decisions behind segmentSentences, for inspection and tests (D.10, P12). */
export function explainBoundaries(text: string, context: BlockContext = {}): BoundaryDecision[] {
	const { start, marks } = decideBlock(text, context);
	return [start, ...marks].filter((item): item is BoundaryDecision => item !== null);
}

/**
 * Local textual evidence that the text of one block goes on directly in the next (D.15),
 * independent of where the blocks lie. Either the first block breaks off inside a sentence
 * and the next one goes on in lower case, or the first block ends a sentence, as the
 * boundary evidence decides from both sides, and the next one begins a new sentence of the
 * same text: in upper case and with a sentence starter, as for any sentence start. A label
 * of its own ("Info:", "Abbildung 3:") or a digit (a footnote number) is no sentence start.
 * Anything else, such as a cut sentence followed by a capital, a colon before a new block
 * or a sentence end inside an open quotation, is no evidence: the blocks may belong
 * together, but nothing in the text shows it.
 */
export function continuesInto(before: string, after: string): boolean {
	const last = tokensOf(before).at(-1);
	const following = tokensOf(after);
	if (last === undefined || following.length === 0) return false;
	const start = following[0].replace(OPENING, '');
	if (!endsSentenceMark(last)) return /^\p{Ll}/u.test(start);
	if (!/^\p{Lu}/u.test(start)) return false;
	return explainBoundaries(before, { after }).at(-1)?.boundary === 'confirmed-end';
}

function splitAtBoundaries(
	text: string,
	context: BlockContext
): { segments: SentenceSegment[]; enclosureAfter: EnclosureState } {
	const { own, start, marks, enclosureAfter } = decideBlock(text, context);
	// A block without a previous token (an empty neighbour) has an unconfirmed start.
	let reliable = start?.boundary === 'confirmed-end';
	const segments: SentenceSegment[] = [];
	let current: string[] = [];
	for (const [index, token] of own.entries()) {
		current.push(token);
		const boundary = marks[index]?.boundary;
		if (boundary === undefined || boundary === 'confirmed-continuation') continue;
		// A segment is reliable only if both of its boundaries are confirmed ends.
		segments.push({ text: current.join(' '), reliable: reliable && boundary === 'confirmed-end' });
		current = [];
		reliable = boundary === 'confirmed-end';
	}
	return { segments, enclosureAfter };
}

export const splitSentences = (text: string): string[] =>
	segmentSentences(text).map((segment) => segment.text);

/**
 * Defensive check for a statement used on its own (cause, consequence, option): it must
 * be exactly one sentence without a second or uncertain sentence end inside. Its outer
 * boundaries are decided in context by segmentSentences (a clause such as "weil die Erde …"
 * ends at a comma), so only the inner boundaries count here.
 */
export function isSingleStatement(text: string): boolean {
	const trimmed = text.trim();
	const closed = endsSentenceMark(trimmed) ? trimmed : `${trimmed}.`;
	const { segments } = splitAtBoundaries(closed, {});
	return segments.length === 1 && segments[0].text === closed;
}
