import { describe, expect, it } from 'vitest';
import {
	continuesInto,
	decideBoundary,
	endsClauseMark,
	endsSentenceMark,
	explainBoundaries,
	isSingleStatement,
	scanEnclosure,
	segmentBlock,
	segmentSentences,
	splitSentences,
	type BlockContext,
	type BoundaryEvidence,
	type EnclosureState,
	type Boundary
} from './sentences.js';

describe('sentence segmentation for extracted statements', () => {
	it('keeps abbreviations inside the sentence and still ends at the real sentence end', () => {
		expect(
			splitSentences(
				'Der Leiter prüfte das System. Deshalb fand er z. B. den Fehler. Danach sah er es auch.'
			)
		).toEqual([
			'Der Leiter prüfte das System.',
			'Deshalb fand er z. B. den Fehler.',
			'Danach sah er es auch.'
		]);
		// D.8 (strict titles): a title before a capitalized word is no confirmed continuation.
		// It splits, and every segment next to it is unreliable, so no question uses a fragment.
		expect(
			segmentSentences(
				'Dr. Meier prüfte das System. Deshalb fand er z. B. den Fehler. Prof. Kurz sah es auch.'
			)
		).toEqual([
			{ text: 'Dr.', reliable: false },
			{ text: 'Meier prüfte das System.', reliable: false },
			{ text: 'Deshalb fand er z. B. den Fehler.', reliable: false },
			{ text: 'Prof.', reliable: false },
			{ text: 'Kurz sah es auch.', reliable: false }
		]);
	});

	it('handles several abbreviation periods, compact forms and English abbreviations', () => {
		// Compact and spaced abbreviations stay inside their segment. "See" is no sentence
		// starter and "Mr." precedes a capital, so those boundaries are uncertain (D.8).
		expect(
			segmentSentences(
				'Das gilt d. h. immer, u. a. für Tests etc. im Labor. Es gilt z.B. auch hier. See e.g. the table. Mr. Smith agreed.'
			)
		).toEqual([
			{ text: 'Das gilt d. h. immer, u. a. für Tests etc. im Labor.', reliable: true },
			{ text: 'Es gilt z.B. auch hier.', reliable: false },
			{ text: 'See e.g. the table.', reliable: false },
			{ text: 'Mr.', reliable: false },
			{ text: 'Smith agreed.', reliable: false }
		]);
	});

	it('ends sentences before closing quotes and keeps ordinal numbers together', () => {
		expect(splitSentences('Sie rief „Ende.“ Dann war es still! Am 3. Mai kam er? Ja…')).toEqual([
			'Sie rief „Ende.“',
			'Dann war es still!',
			'Am 3. Mai kam er?',
			'Ja…'
		]);
	});

	it('omits trailing text without terminal punctuation', () => {
		expect(splitSentences('Ein ganzer Satz. ein abgebrochener Rest')).toEqual(['Ein ganzer Satz.']);
	});
});

describe('punctuation marks before closing characters', () => {
	it('recognizes terminal and clause punctuation followed by closing quotes or brackets', () => {
		for (const token of [
			'Ende.',
			'„Ende.“',
			'Ende!”',
			"end.'",
			'Ende?)',
			'(Ende.]',
			'»Ende.«',
			'Ende…'
		])
			expect(endsSentenceMark(token)).toBe(true);
		for (const token of ['„Hallo,“', 'Hallo,', 'semi;”', 'colon:)', '»oui,«', "tag,'"])
			expect(endsClauseMark(token)).toBe(true);
		for (const token of ['Hallo', '„Hallo“', 'Ende.x'])
			expect([endsSentenceMark(token), endsClauseMark(token)]).toEqual([false, false]);
	});
});

describe('sentence ends after numbers, single letters and "no" (N1)', () => {
	it('separates real sentence ends that look like abbreviations', () => {
		expect(
			splitSentences(
				'Das Museum öffnete wieder im Jahr 2021. Die Besucherzahl sank im Winter stark.'
			)
		).toEqual([
			'Das Museum öffnete wieder im Jahr 2021.',
			'Die Besucherzahl sank im Winter stark.'
		]);
		expect(splitSentences('Die Firma wuchs stark bis 2023. Sie stellte neue Leute ein.')).toEqual([
			'Die Firma wuchs stark bis 2023.',
			'Sie stellte neue Leute ein.'
		]);
		expect(splitSentences('The committee finally voted no. The city postponed it.')).toEqual([
			'The committee finally voted no.',
			'The city postponed it.'
		]);
		expect(splitSentences('Die Tabletten enthalten Vitamin C. Die Nachfrage stieg.')).toEqual([
			'Die Tabletten enthalten Vitamin C.',
			'Die Nachfrage stieg.'
		]);
	});

	it('keeps ordinals, numbered references and lower-case continuations together', () => {
		expect(
			splitSentences('Am 3. und 4. Mai kam der 2. Versuch. Siehe No. 5 und Fig. 3 im Anhang.')
		).toEqual(['Am 3. und 4. Mai kam der 2. Versuch.', 'Siehe No. 5 und Fig. 3 im Anhang.']);
		expect(splitSentences('Im 19. Jahrhundert wuchs die Stadt.')).toEqual([
			'Im 19. Jahrhundert wuchs die Stadt.'
		]);
	});
});

describe('defensive single-statement check', () => {
	it('rejects candidates that hide a second sentence or sit at an uncertain boundary', () => {
		expect(isSingleStatement('Die Firma wuchs stark bis 2023. Sie stellte neue Leute ein')).toBe(
			false
		);
		expect(isSingleStatement('The committee voted no. The city postponed the project')).toBe(false);
		expect(isSingleStatement('Die Tabletten enthalten Vitamin C. Die Nachfrage stieg')).toBe(false);
		expect(isSingleStatement('Die Nachfrage stieg im Herbst stark an')).toBe(true);
	});

	it('accepts internal abbreviation periods as one statement', () => {
		for (const text of [
			'Der Leiter prüfte die Proben u. a. im Labor',
			'Deshalb fand er z. B. den Fehler, d. h. die Ursache etc. sofort',
			'Es gilt z.B. auch hier, see e.g. the table',
			'Am 3. Mai kam der 2. Versuch',
			'Das Werk lieferte Teile, Schrauben etc.'
		])
			expect(isSingleStatement(text)).toBe(true);
		// D.8 (strict titles): a title before a name is no longer a confirmed single statement.
		expect(isSingleStatement('Prof. Dr. Meier prüfte die Proben u. a. im Labor')).toBe(false);
	});

	it('marks both neighbours of an uncertain boundary as unreliable', () => {
		expect(
			segmentSentences(
				'Er lieferte Schrauben etc. Danach stiegen die Kosten deutlich. Das war gut.'
			)
		).toEqual([
			{ text: 'Er lieferte Schrauben etc.', reliable: false },
			{ text: 'Danach stiegen die Kosten deutlich.', reliable: false },
			{ text: 'Das war gut.', reliable: true }
		]);
	});
});

describe('ordinals and fragments are never certain statements (N2)', () => {
	it('marks an ambiguous number with a period as uncertain instead of a sentence end', () => {
		for (const text of [
			'Zur 3. Sitzung kamen viele Mitglieder.',
			'Seit 2. Klasse lernen die Kinder Englisch.',
			'In 2. Lesung beschloss der Rat das Gesetz.',
			'Nach 3. Runde führte das Team deutlich.',
			'Sein 2. Roman verkaufte sich gut.',
			'Ihr 4. Album erschien im Herbst.',
			'Er belegte 3. Platz im Rennen.',
			'Er wurde 3. Sieger im Rennen.'
		])
			expect(segmentSentences(text).every((segment) => !segment.reliable)).toBe(true);
	});

	it('keeps years as certain ends and dates or articled ordinals together', () => {
		expect(segmentSentences('Das Werk öffnete 2021. Die Leute kamen.')).toEqual([
			{ text: 'Das Werk öffnete 2021.', reliable: true },
			{ text: 'Die Leute kamen.', reliable: true }
		]);
		for (const text of ['Am 3. Mai kam er.', 'Der 2. Versuch gelang.', 'Er kam am 3. und 4. Mai.'])
			expect(segmentSentences(text)).toEqual([{ text, reliable: true }]);
	});

	it('treats a lower-case start as a fragment and distrusts the segment before it', () => {
		expect(
			segmentSentences('Er prüfte beide Teile insbes. alle Proben genau. Das war gut.')
		).toEqual([
			{ text: 'Er prüfte beide Teile insbes.', reliable: false },
			{ text: 'alle Proben genau.', reliable: false },
			{ text: 'Das war gut.', reliable: true }
		]);
		// A clause checked on its own may start in lower case.
		expect(isSingleStatement('weil eine Schicht Blätter die Erde bedeckte')).toBe(true);
	});
});

describe('unknown abbreviations before capitals or digits (N3)', () => {
	it('marks a suspicious period before a noun, name or digit as uncertain', () => {
		for (const text of [
			'Die Stadt investierte 5 Mio. Euro in Schulen.',
			'Der Konzern verlor 2 Mrd. Dollar an der Börse.',
			'Gestern prüfte Dipl.-Ing. Müller die Anlage.',
			'Das Gericht prüfte Art. 3 Grundgesetz genau.',
			'Die Anfrage bearbeitete die Abt. Finanzen schnell.',
			'The board met on Jan. 5 to vote.',
			'The Dept. Head approved the budget.'
		])
			expect(segmentSentences(text).every((segment) => !segment.reliable)).toBe(true);
	});

	it('keeps real sentence ends before a sentence starter certain (false-negative guard)', () => {
		for (const [text, first] of [
			['Er trank am Morgen Tee. Danach ging er los.', 'Er trank am Morgen Tee.'],
			['Wir waren im Zoo. Deshalb kamen wir spät.', 'Wir waren im Zoo.'],
			['Das war ganz neu. Deshalb staunten alle.', 'Das war ganz neu.'],
			['He felt quite ill. Therefore he stayed home.', 'He felt quite ill.'],
			['Die Strecke war 5 km. Die Zeit war kurz.', 'Die Strecke war 5 km.']
		])
			expect(segmentSentences(text)[0]).toEqual({ text: first, reliable: true });
		// A noun end before a noun start cannot be told apart from an abbreviation: uncertain.
		expect(segmentSentences('Er trank Tee. Milch mochte er nicht.')[0].reliable).toBe(false);
	});
});

describe('short abbreviations before lower case (D.4)', () => {
	it('keeps a short unlisted abbreviation inside its sentence', () => {
		expect(segmentSentences('Er prüfte beide Teile resp. alle Proben genau. Das war gut.')).toEqual(
			[
				{ text: 'Er prüfte beide Teile resp. alle Proben genau.', reliable: true },
				{ text: 'Das war gut.', reliable: true }
			]
		);
	});
});

describe('long lower-case abbreviations before capitals (N4)', () => {
	it('marks a long lower-case word before a non-starter capital as uncertain', () => {
		for (const text of [
			'Die Firma berechnet die jährl. Kosten für alle.',
			'Der Preis gilt einschl. Versand an die Kunden.',
			'Die Studie nennt die durchschn. Kosten pro Jahr.',
			'The survey reached approx. Forty households.'
		])
			expect(segmentSentences(text).every((segment) => !segment.reliable)).toBe(true);
	});

	it('keeps lower-case sentence ends before a sentence starter certain', () => {
		for (const [text, first] of [
			['Er hatte nur wenig Geld. Deshalb blieb er daheim.', 'Er hatte nur wenig Geld.'],
			['Der Tag war lang. Der nächste begann spät.', 'Der Tag war lang.'],
			['Die Arbeit war fertig. Sie ging nach Hause.', 'Die Arbeit war fertig.'],
			['He felt ill. Therefore he stayed home.', 'He felt ill.'],
			['The work was done. The team went home.', 'The work was done.']
		])
			expect(segmentSentences(text)[0]).toEqual({ text: first, reliable: true });
	});

	it('documents the false negative of a lower-case end before a noun start', () => {
		for (const text of [
			'Er kam gut an. Kinder winkten.',
			'Das funktionierte hervorragend. Kunden reagierten positiv.',
			'He performed well. Managers applauded.'
		])
			expect(segmentSentences(text)[0].reliable).toBe(false);
	});
});

describe('early-branch abbreviations pass the shared safety check (N5)', () => {
	it('treats a fixed abbreviation before a sentence starter as uncertain', () => {
		for (const text of [
			'The speech was given by Martin Luther King Jr. He spoke well.',
			'The shop stood on Baker St. The owner sold maps.',
			'Das Treffen findet am Fr. Die Gäste kommen um acht.',
			'Wir kommen morgen evtl. Die Kinder bleiben daheim.'
		])
			expect(segmentSentences(text).every((segment) => !segment.reliable)).toBe(true);
	});

	it('treats a reference abbreviation before a capitalized word as uncertain', () => {
		for (const text of [
			'Das Handbuch erklärt im Kap. Wartung alle Schritte.',
			'Die Skizze zeigt in Abb. Links das Gehäuse.',
			'Der Vertrag nennt in Nr. Sieben die Haftung.'
		])
			expect(segmentSentences(text).every((segment) => !segment.reliable)).toBe(true);
	});

	it('keeps references before digits and "no." before a starter; titles only unreliable', () => {
		for (const text of [
			'Der Vertrag regelt in Nr. 5 die Haftung.',
			'See Fig. 3 and No. 5 for details.'
		])
			expect(segmentSentences(text)).toEqual([{ text, reliable: true }]);
		// D.8 (strict titles): a title before a name is no confirmed continuation.
		for (const text of [
			'Gestern prüfte Dr. Müller die Anlage.',
			'Die Vorlesung hielt Prof. Kurz im Mai.'
		])
			expect(segmentSentences(text).every((segment) => !segment.reliable)).toBe(true);
		expect(segmentSentences('The committee voted no. The plan failed.')).toEqual([
			{ text: 'The committee voted no.', reliable: true },
			{ text: 'The plan failed.', reliable: true }
		]);
	});

	it('recognizes common sentence adverbs as sentence starters', () => {
		for (const [text, first] of [
			['Das Projekt startete langsam. Zunächst fehlten Mittel.', 'Das Projekt startete langsam.'],
			['Die Feier war gut geplant. Leider regnete es stark.', 'Die Feier war gut geplant.'],
			['Der Plan war gut. Allerdings fehlte das Geld.', 'Der Plan war gut.'],
			['The event was well planned. Unfortunately it rained.', 'The event was well planned.'],
			['The team worked hard. Meanwhile the costs rose.', 'The team worked hard.']
		])
			expect(segmentSentences(text)[0]).toEqual({ text: first, reliable: true });
	});
});

describe('sentence-end abbreviations and ellipses (N6, N7)', () => {
	it('treats a sentence-final-capable abbreviation before any capital as uncertain', () => {
		for (const text of [
			'The speech was given by Martin Luther King Jr. Historians quote it.',
			'The shop stood on Baker St. Tourists came often.',
			'Wir kommen morgen evtl. Kinder dürfen mit.',
			'Das Treffen ist am Fr. Gäste kommen um acht.'
		])
			expect(segmentSentences(text).every((segment) => !segment.reliable)).toBe(true);
		// Before lower case it still continues the sentence.
		expect(segmentSentences('Wir kommen evtl. etwas später an.')).toEqual([
			{ text: 'Wir kommen evtl. etwas später an.', reliable: true }
		]);
		// D.8 (N9): a digit is no positive evidence of a continuation ("am Fr. 20 Gäste kommen").
		expect(
			segmentSentences('Die Fahrt kostet ggf. 20 Euro mehr.').every((segment) => !segment.reliable)
		).toBe(true);
	});

	it('never joins titles to a capital or a sentence starter with certainty', () => {
		// D.8 (strict titles): names cannot be told from nouns, so title + name is uncertain.
		for (const text of [
			'Gestern prüfte Dr. Müller die Anlage.',
			'The chair was Mr. Smith on Monday.'
		])
			expect(segmentSentences(text).every((segment) => !segment.reliable)).toBe(true);
		for (const text of [
			'He became a Dr. The family was proud.',
			'The letter went to Mr. Today nobody reads it.'
		])
			expect(segmentSentences(text).every((segment) => !segment.reliable)).toBe(true);
	});

	it('runs ellipses through the shared check', () => {
		for (const text of [
			'Er dachte an ... Geld und Macht.',
			'Er dachte an … Geld und Macht.',
			'Die Stadt gab 5 Mio... Euro aus.'
		])
			expect(segmentSentences(text).every((segment) => !segment.reliable)).toBe(true);
		expect(segmentSentences('Er wusste nicht weiter... Dann ging er heim.')).toEqual([
			{ text: 'Er wusste nicht weiter...', reliable: true },
			{ text: 'Dann ging er heim.', reliable: true }
		]);
		expect(segmentSentences('She hesitated… Then she answered.')).toEqual([
			{ text: 'She hesitated…', reliable: true },
			{ text: 'Then she answered.', reliable: true }
		]);
		expect(segmentSentences('Er dachte an ... seine Kinder.')).toEqual([
			{ text: 'Er dachte an ... seine Kinder.', reliable: true }
		]);
	});
});

describe('positive boundary reliability (D.8)', () => {
	it('states every boundary as confirmed end, confirmed continuation or uncertain', () => {
		expect(segmentSentences('Er kam. Dann ging er.')).toEqual([
			{ text: 'Er kam.', reliable: true },
			{ text: 'Dann ging er.', reliable: true }
		]);
	});

	it('never confirms a continuation into a digit without positive evidence (N9)', () => {
		for (const text of [
			'The speech was given by King Jr. 1963 was a turning point.',
			'Das Treffen ist am Fr. 20 Gäste kommen.',
			'The shop stood on Baker St. 2019 was its best year.',
			'The rule began in the U.K. 2019 was the first year.'
		])
			expect(segmentSentences(text).every((segment) => !segment.reliable)).toBe(true);
		for (const text of ['See No. 5 and Fig. 3 for details.', 'Er kam am 3. Mai an.'])
			expect(segmentSentences(text)).toEqual([{ text, reliable: true }]);
	});

	it('treats a title before a capitalized word as uncertain (N8, strict)', () => {
		for (const text of [
			'Nach der Forschung wurde er Dr. Kollegen gratulierten ihm.',
			'Gestern prüfte Dr. Müller die Anlage.',
			'The chair was Mr. Smith on Monday.'
		])
			expect(segmentSentences(text).every((segment) => !segment.reliable)).toBe(true);
		// Before lower case or another title the continuation is still confirmed.
		for (const text of ['Er wurde Dr. med. und blieb.', 'Die Rede hielt Prof. Dr. med. im Mai.'])
			expect(segmentSentences(text)).toEqual([{ text, reliable: true }]);
	});

	it('keeps compact lower-case abbreviations internal but not upper-case initials', () => {
		expect(segmentSentences('Es gilt z.B. Kinder und e.g. Adults.')).toEqual([
			{ text: 'Es gilt z.B. Kinder und e.g. Adults.', reliable: true }
		]);
		expect(
			segmentSentences('It was tested in the U.S. Growth slowed.').every(
				(segment) => !segment.reliable
			)
		).toBe(true);
	});
});

/** Every combination of evidence the central decision can receive (D.9, D.10). */
const EVIDENCE_SPACE: BoundaryEvidence[] = (
	['none', 'period', 'exclamation', 'question', 'ellipsis', 'edge'] as const
).flatMap((mark) =>
	[false, true].flatMap((bracketed) =>
		[false, true].flatMap((enclosed) =>
			(
				[null, 'ordinary', 'short', 'unit', 'internal', 'abbreviation', 'reference'] as const
			).flatMap((word) =>
				(['none', 'starter', 'label', 'embedded', 'lower', 'digit', 'other'] as const).flatMap(
					(next) =>
						(['within', 'soft', 'hard'] as const).map((block) => ({
							mark,
							bracketed,
							enclosed,
							word,
							next,
							block
						}))
				)
			)
		)
	)
);
const endEvidence = (e: BoundaryEvidence) =>
	!e.bracketed &&
	(e.mark === 'exclamation' ||
		e.mark === 'question' ||
		(e.mark === 'period' && e.word === 'ordinary'));
const continuationEvidence = (e: BoundaryEvidence) =>
	e.bracketed ||
	e.enclosed ||
	e.word === 'internal' ||
	e.word === 'abbreviation' ||
	e.word === 'reference' ||
	e.next === 'lower' ||
	e.next === 'label' ||
	e.next === 'embedded';
/**
 * Evidence that text can produce: a word only for a period, nothing after the document end,
 * a following token inside a block, and the document start ('edge') only before the first
 * token, where nothing is open or bracketed.
 */
const consistent = (e: BoundaryEvidence) =>
	(e.word !== null) === (e.mark === 'period') &&
	(e.mark === 'edge'
		? e.block === 'hard' && e.next !== 'none' && !e.enclosed
		: e.block !== 'hard' || e.next === 'none') &&
	(e.block !== 'within' || e.next !== 'none') &&
	((e.mark !== 'none' && e.mark !== 'period' && e.mark !== 'edge') || !e.bracketed);
/** Every consistent boundary after a token with a terminal mark (no mark is no boundary). */
const decisions = (filter: (e: BoundaryEvidence) => boolean) =>
	EVIDENCE_SPACE.filter(
		(e) => consistent(e) && e.mark !== 'none' && e.mark !== 'edge' && filter(e)
	).map((evidence) => ({
		evidence,
		boundary: decideBoundary(evidence)
	}));

describe('boundary evidence invariants (D.9)', () => {
	it('covers the whole evidence space with a single decision', () => {
		expect(EVIDENCE_SPACE).toHaveLength(3528);
		expect(decisions(() => true)).toHaveLength(336);
		const outcomes = new Set<Boundary>(EVIDENCE_SPACE.map(decideBoundary));
		expect(outcomes).toEqual(new Set(['confirmed-end', 'confirmed-continuation', 'uncertain']));
	});

	it('treats a token without a terminal mark as no boundary, and as cut off across blocks', () => {
		for (const evidence of EVIDENCE_SPACE.filter((e) => consistent(e) && e.mark === 'none'))
			expect(decideBoundary(evidence)).toBe(
				evidence.block === 'within' ? 'confirmed-continuation' : 'uncertain'
			);
	});

	it('P1: no single source forces reliability against contrary evidence', () => {
		for (const { evidence, boundary } of decisions(() => true)) {
			if (boundary === 'confirmed-end') expect(continuationEvidence(evidence)).toBe(false);
			if (boundary === 'confirmed-continuation') {
				expect(endEvidence(evidence)).toBe(false);
				expect(evidence.next).not.toBe('starter');
			}
		}
		// Adding contrary evidence to a confirmed end never keeps it confirmed.
		for (const { evidence } of decisions((e) => decideBoundary(e) === 'confirmed-end'))
			for (const contrary of [
				{ next: 'lower' as const },
				{ next: 'label' as const },
				{ next: 'embedded' as const },
				{ enclosed: true },
				...(evidence.mark === 'period'
					? [
							{ word: 'abbreviation' as const },
							{ word: 'internal' as const },
							{ word: 'reference' as const }
						]
					: [{ bracketed: true }])
			])
				expect(decideBoundary({ ...evidence, ...contrary })).not.toBe('confirmed-end');
	});

	it('P2: a block boundary alone confirms no sentence end', () => {
		for (const { evidence, boundary } of decisions((e) => e.block === 'soft'))
			if (boundary === 'confirmed-end') expect(evidence.next).toBe('starter');
		for (const { evidence, boundary } of decisions((e) => e.block === 'hard'))
			if (boundary === 'confirmed-end') {
				expect(evidence.mark).not.toBe('none');
				expect(['unit', 'internal', 'abbreviation', 'reference']).not.toContain(evidence.word);
			}
		for (const { boundary } of decisions((e) => e.block !== 'within'))
			expect(boundary).not.toBe('confirmed-continuation');
	});

	it('P3: a starter token that is part of a reference confirms no sentence end', () => {
		for (const { boundary } of decisions((e) => e.next === 'label'))
			expect(boundary).not.toBe('confirmed-end');
		for (const text of [
			'The method is described in Vol. I of the handbook.',
			'The pump is shown in Fig. A of the manual.',
			'The pump is shown in Fig. A shows the valve.',
			'The full data is listed in Appx. A of the report.',
			'The story is told in Part I. The sequel came later.'
		])
			expect(segmentSentences(text).every((segment) => !segment.reliable)).toBe(true);
		// A real sentence start with "I" or "A" still confirms the end before it.
		expect(segmentSentences('The storm lasted all night. I went home early.')).toEqual([
			{ text: 'The storm lasted all night.', reliable: true },
			{ text: 'I went home early.', reliable: true }
		]);
		expect(segmentSentences('The old plant closed in spring. A new factory opened.')).toEqual([
			{ text: 'The old plant closed in spring.', reliable: true },
			{ text: 'A new factory opened.', reliable: true }
		]);
	});

	it('P4: a continuation pattern alone confirms no continuation against end context', () => {
		for (const { evidence, boundary } of decisions((e) => e.word === 'internal'))
			if (evidence.next === 'starter' || evidence.block !== 'within')
				expect(boundary).not.toBe('confirmed-continuation');
		for (const text of [
			'Beteiligt waren Siemens, Bosch u. a. Experten erwarten weitere Partner.',
			'Im Keller lagen Kisten, Bretter o. Ä. Kinder spielten dort oft.',
			'Die Zinsen steigen um drei v. H. Kunden zahlen dann mehr.',
			'The train left at 8 a.m. Passengers waited long.',
			'Viele Gruppen nutzen das Angebot z. B. Die Kinder kommen oft.'
		])
			expect(segmentSentences(text).every((segment) => !segment.reliable)).toBe(true);
		// Before lower case, or for a pattern that never ends a sentence, it still continues.
		for (const text of [
			'Der Leiter prüfte u. a. die Proben im Labor.',
			'Viele Gruppen, z. B. Kinder und Senioren, profitieren davon.',
			'Many groups, e.g. children and seniors, benefit from it.'
		])
			expect(segmentSentences(text)).toEqual([{ text, reliable: true }]);
	});

	it('P5: "!" and "?" inside an insertion confirm no sentence end', () => {
		for (const { boundary } of decisions((e) => e.bracketed))
			expect(boundary).not.toBe('confirmed-end');
		for (const text of [
			'Der Manager verdiente damals 5 Millionen (!) Euro im Jahr.',
			'Der Autor des Briefes (?) Bernhard schrieb ihn im Winter.',
			'Die Firma nannte das Angebot einmalig [sic!] Kunden glaubten das nicht.',
			'The report was published by Yahoo! Finance in March.',
			'Das war eine riesige Überraschung! Kinder feierten bis spät.'
		])
			expect(segmentSentences(text).every((segment) => !segment.reliable)).toBe(true);
		// An insertion before lower case stays inside its sentence; plain "!" and "?" still end.
		for (const text of [
			'Er verdiente 5 Millionen Euro (!) pro Jahr.',
			'Das Ergebnis (...) war am Ende eindeutig.'
		])
			expect(segmentSentences(text)).toEqual([{ text, reliable: true }]);
		expect(segmentSentences('Er ging sofort nach Hause! Danach schlief er lange.')).toEqual([
			{ text: 'Er ging sofort nach Hause!', reliable: true },
			{ text: 'Danach schlief er lange.', reliable: true }
		]);
		expect(segmentSentences('Warum tat er das nur? Er erklärte es später.')).toEqual([
			{ text: 'Warum tat er das nur?', reliable: true },
			{ text: 'Er erklärte es später.', reliable: true }
		]);
	});
});

describe('block boundaries are evidence, not sentence boundaries (D.9, S4)', () => {
	const lastReliable = (text: string, after?: string) =>
		segmentSentences(text, { after }).at(-1)?.reliable;
	const firstReliable = (text: string, before?: string) =>
		segmentSentences(text, { before })[0]?.reliable;

	it('confirms a block boundary only with sentence-end evidence from both sides', () => {
		for (const [text, after] of [
			['Die Stadt investierte rund 5 Mio.', 'Euro in neue Schulen.'],
			['Die Anlage prüfte gestern Dr.', 'Müller mit seinem Team.'],
			['Viele profitieren davon, z. B.', 'Kinder und Senioren.'],
			['Die Firma berechnet die jährl.', 'Kosten ganz neu.'],
			['Die Sitzung fand statt am 3.', 'Mai im großen Saal.'],
			['Der Manager verdiente 5 Millionen (!)', 'Euro im Jahr.'],
			['The method is described in Vol.', 'I of the handbook.'],
			['Beteiligt waren Siemens, Bosch u. a.', 'Experten erwarten mehr.'],
			['Das war für alle eine Überraschung!', 'Kinder feierten lange.'],
			['Die Produktion wuchs im Jahr stark.', 'Kunden bestellten mehr.'],
			['Er dachte die ganze Zeit an ...', 'seine Familie.'],
			['Die Produktion wuchs im ganzen', 'Jahr stark an.']
		] as const) {
			expect(lastReliable(text, after)).not.toBe(true);
			expect(firstReliable(after, text)).toBe(false);
		}
		for (const [text, after] of [
			['Die Produktion wuchs im Jahr stark.', 'Die Kunden bestellten mehr.'],
			['Das war für alle eine Überraschung!', 'Deshalb feierten alle lange.'],
			['Warum schloss die Stadt die Brücke?', 'Die Stützen waren gerissen.'],
			['Er wusste lange nicht weiter...', 'Dann ging er nach Hause.'],
			['Das Museum öffnete wieder im Jahr 2021.', 'Die Besucher kamen.']
		] as const) {
			expect(lastReliable(text, after)).toBe(true);
			expect(firstReliable(after, text)).toBe(true);
		}
	});

	it('ends a text at a structural break only after a mark that can close a sentence there', () => {
		for (const text of ['Er kam nach Hause.', 'Das war toll!', 'Wer war das?', 'Er ging raus.'])
			expect(lastReliable(text)).toBe(true);
		for (const text of [
			'Die Stadt investierte rund 5 Mio.',
			'Die Anlage prüfte gestern Dr.',
			'Er lieferte Schrauben etc.',
			'Die Sitzung fand statt am 3.',
			'Der Manager verdiente 5 Millionen (!)'
		])
			expect(lastReliable(text)).toBe(false);
	});

	it('still treats a lower-case start after a structural break as a fragment', () => {
		expect(segmentSentences('stark an, weil die Nachfrage stieg.')).toEqual([
			{ text: 'stark an, weil die Nachfrage stieg.', reliable: false }
		]);
	});
});

const allUnreliable = (text: string, context?: BlockContext) =>
	segmentSentences(text, context).every((segment) => !segment.reliable);

describe('complete boundary evidence (D.10)', () => {
	it('P8: a sentence starter alone confirms no end after a reference', () => {
		for (const { evidence, boundary } of decisions(
			(e) => e.word === 'reference' || e.next === 'embedded'
		))
			expect(boundary, JSON.stringify(evidence)).not.toBe('confirmed-end');
		// K1: a title after a reference word starts with a starter but not a sentence.
		for (const text of [
			'Die Einzelheiten beschreibt Kap. „Die Kalibrierung“ ausführlich.',
			'Die Formeln stehen in Abschn. „Die Messung“ des Handbuchs.',
			'The setup is explained in Ch. "The Basics" of the guide.',
			'The model is described in Sec. The Model of the paper.',
			'The letters were printed in Vol. The Late Years of the edition.',
			'Der Chor sang zuletzt Nr. „Der Mond ist aufgegangen“ aus dem Buch.',
			'Den Aufbau zeigt Abb. „Die Pumpe im Schnitt“ sehr genau.',
			'The layout is shown in Fig. "The Pump" of the manual.',
			'Siehe hierzu Abschn. Die Methode im Anhang.',
			// Unlisted abbreviations: only the embedded quoted title is evidence here.
			'Die Details beschreibt das Handb. „Die Wartung“ ausführlich.',
			'The setup is covered in Suppl. "The Basics" of the kit.'
		])
			expect(allUnreliable(text), text).toBe(true);
		// A reference with its number, and the ordinary lower-case word "no.", are unchanged.
		for (const text of ['Die Einzelheiten beschreibt Kap. 4 ausführlich.', 'See Fig. 3 below.'])
			expect(segmentSentences(text)).toEqual([{ text, reliable: true }]);
		expect(segmentSentences('The committee voted no. The city waited.')).toEqual([
			{ text: 'The committee voted no.', reliable: true },
			{ text: 'The city waited.', reliable: true }
		]);
	});

	it('P9: a block start alone is no confirmed boundary', () => {
		// Only the document edge confirms a start without a previous token.
		for (const evidence of EVIDENCE_SPACE.filter((e) => consistent(e) && e.mark === 'edge'))
			expect(decideBoundary(evidence)).toBe(
				evidence.next === 'lower' ? 'uncertain' : 'confirmed-end'
			);
		// After another block, the start is decided from that block's last token.
		for (const before of [
			'Die Stadt investierte rund 5 Mio.',
			'Die Anlage prüfte gestern Dr.',
			'Die Wahl findet statt am 14.',
			'Er dachte die ganze Zeit an ...',
			'Die Brücke über den',
			'Das stand in Kap.',
			'Er sagte: „Wir haben alles versucht.',
			''
		])
			expect(segmentSentences('Euro in neue Schulen und Kitas.', { before })[0].reliable).toBe(
				false
			);
		expect(
			segmentSentences('Die Kunden bestellten mehr.', { before: 'Das Werk wuchs stark.' })
		).toEqual([{ text: 'Die Kunden bestellten mehr.', reliable: true }]);
		expect(explainBoundaries('Die Kunden bestellten mehr.')[0].evidence.mark).toBe('edge');
	});

	it('P11: an open quotation or bracket prevents a confirmed end inside it', () => {
		for (const { evidence, boundary } of decisions((e) => e.enclosed))
			expect(boundary, JSON.stringify(evidence)).not.toBe('confirmed-end');
		for (const text of [
			'Der Sprecher sagte: „Wir haben ... Die Kunden warten schon lange“, weil er nervös war.',
			'The spokesman said: "We have ... The customers are waiting", because he was nervous.',
			'The spokesman said: “We have ... The customers are waiting”, because he was nervous.',
			"He wrote: 'We lost. The fans are angry', because the match was bad.",
			'Sie rief: „Halt! Die Brücke ist gesperrt“, weil das Wasser stieg.',
			'Der Plan (war er gut? Die Kritiker zweifelten) scheiterte am Ende.',
			'Das Zitat [sehr alt! Die Quelle fehlt] stammt aus Rom.',
			'Er sagte: »Wir kommen. Die Zeit drängt«, und ging.'
		])
			expect(allUnreliable(text), text).toBe(true);
		// A quotation or bracket closed before the next sentence leaves the end confirmed.
		expect(segmentSentences('Er rief laut „Feuer!“ Die Nachbarn rannten hinaus.')).toEqual([
			{ text: 'Er rief laut „Feuer!“', reliable: true },
			{ text: 'Die Nachbarn rannten hinaus.', reliable: true }
		]);
		expect(
			segmentSentences('Der Trainer sagte: „Wir haben verloren.“ Deshalb trainierten alle.')
		).toEqual([
			{ text: 'Der Trainer sagte: „Wir haben verloren.“', reliable: true },
			{ text: 'Deshalb trainierten alle.', reliable: true }
		]);
		// Apostrophes inside or at the end of words open nothing.
		expect(segmentSentences("It wasn't easy. Therefore the coach didn't rest.")).toEqual([
			{ text: "It wasn't easy.", reliable: true },
			{ text: "Therefore the coach didn't rest.", reliable: true }
		]);
		expect(segmentSentences("So geht's nicht. Deshalb änderte er den Plan.")).toEqual([
			{ text: "So geht's nicht.", reliable: true },
			{ text: 'Deshalb änderte er den Plan.', reliable: true }
		]);
		// A quotation left open by the previous block keeps the next block's start unconfirmed.
		expect(
			segmentSentences('Die Kunden warten schon lange.“ Deshalb ging er.', {
				before: 'Er sagte: „Wir haben alles versucht.'
			})[0].reliable
		).toBe(false);
	});

	it('P12: no evidence collapses to an ordinary word before the decision', () => {
		// Every listed abbreviation and reference keeps its class before a sentence starter.
		for (const word of [
			'Kap',
			'Nr',
			'No',
			'Vol',
			'Fig',
			'Abb',
			'Abschn',
			'Ch',
			'Chap',
			'Sec',
			'Sect',
			'Tab',
			'Anl',
			'Anh',
			'App',
			'Appx',
			'Art',
			'Ziff',
			'Par',
			'Etc',
			'Bzgl',
			'Hrsg',
			'Jr',
			'Dr',
			'Prof',
			'Pkt',
			'Std',
			'Mrd'
		]) {
			const [, decision] = explainBoundaries(`Das steht so in ${word}. Die Leute lasen es.`);
			expect(decision.evidence.word, word).not.toBe('ordinary');
			expect(decision.boundary, word).not.toBe('confirmed-end');
		}
		// Quote, bracket and embedded-title evidence reach the decision unchanged.
		const [, embedded] = explainBoundaries('Siehe Kap. „Die Wartung“ genau.');
		expect(embedded.evidence).toMatchObject({ word: 'reference', next: 'embedded' });
		const [, enclosed] = explainBoundaries('Er sagte: „Wir kommen. Die Zeit drängt.“');
		expect(enclosed.evidence.enclosed).toBe(true);
		const [, bracketed] = explainBoundaries('Er zahlte (!) Euro.');
		expect(bracketed.evidence.bracketed).toBe(true);
	});
});

describe('persistent enclosure state (D.11)', () => {
	const OPENER = 'Der Sprecher sagte: „Wir haben alles versucht.';
	const PLAIN = 'Wir kamen am Abend spät nach Hause und waren müde';
	/** Carries the state through blocks the way a text flow does. */
	const flow = (blocks: string[]) => {
		let state: EnclosureState = [];
		return blocks.map((text, index) => {
			const result = segmentBlock(text, {
				before: blocks[index - 1],
				after: blocks[index + 1],
				enclosure: state
			});
			state = result.enclosureAfter;
			return result;
		});
	};

	it('P13: an open enclosure survives any number of blocks until its closing mark', () => {
		for (const middle of [0, 1, 3, 10]) {
			const blocks = [
				OPENER,
				...Array<string>(middle).fill(PLAIN),
				'Die Kunden warten. Die Firma schweigt“ heute.'
			];
			const results = flow(blocks);
			for (const result of results.slice(0, -1)) expect(result.enclosureAfter).toEqual(['“']);
			// Inside the quotation nothing is reliable; after its closing mark the state is empty.
			expect(results.at(-1)!.segments.every((segment) => !segment.reliable)).toBe(true);
			expect(results.at(-1)!.enclosureAfter).toEqual([]);
		}
		// Brackets and nested enclosures are carried the same way.
		expect(scanEnclosure('Das Werk (seit 1850 in Familienhand.')).toEqual([')']);
		expect(scanEnclosure('Er sagte: „Das Werk (seit 1850')).toEqual(['“', ')']);
		expect(scanEnclosure('in Familienhand) blieb es.', ['“', ')'])).toEqual(['“']);
		expect(scanEnclosure('[Hinweis: siehe oben', ['“'])).toEqual(['“', ']']);
	});

	it('P14: a block without quotation marks or brackets leaves the state unchanged', () => {
		for (const state of [[], ['“'], ['“', ')'], ["'"], [']']] as EnclosureState[])
			for (const text of [
				PLAIN,
				'Er ging. Sie kam! Wer? Niemand ...',
				'5 Mio. Euro, z. B. im Jahr 2021.'
			])
				expect(scanEnclosure(text, state)).toEqual(state);
	});

	it('P16: a block, page or section boundary does not reset the state', () => {
		const [first, second, third] = flow([
			OPENER,
			PLAIN,
			'Die Kunden warten. Die Firma schweigt heute.'
		]);
		expect(first.enclosureAfter).toEqual(['“']);
		expect(second.enclosureAfter).toEqual(['“']);
		expect(third.segments.every((segment) => !segment.reliable)).toBe(true);
		// Without the carried state its second sentence would look like an ordinary sentence.
		expect(
			segmentSentences('Die Kunden warten. Die Firma schweigt heute.', { before: PLAIN })[1]
				.reliable
		).toBe(true);
	});

	it('P17: after the closing mark the normal evidence model applies again', () => {
		const results = flow([
			OPENER,
			PLAIN,
			'und blieben.“ Die Kunden bestellten mehr. Deshalb wuchs die Firma.'
		]);
		expect(results[2].segments).toEqual([
			{ text: 'und blieben.“', reliable: false },
			{ text: 'Die Kunden bestellten mehr.', reliable: true },
			{ text: 'Deshalb wuchs die Firma.', reliable: true }
		]);
		// A quotation closing exactly at a block end leaves the next block unaffected.
		const closedAtEnd = flow([OPENER, 'und blieben.“', 'Die Kunden bestellten mehr.']);
		expect(closedAtEnd[1].enclosureAfter).toEqual([]);
		expect(closedAtEnd[2].segments).toEqual([
			{ text: 'Die Kunden bestellten mehr.', reliable: true }
		]);
	});

	it('keeps elisions and apostrophes from opening a quotation', () => {
		for (const text of [
			"The band was famous in the '90s.",
			'The band was famous in the ‘90s.',
			"It's hard. We don't know.",
			"So geht's nicht.",
			"The client's deadline passed.",
			"Rock 'n' roll was loud.",
			"We'll see 'em later.",
			"Wait 'til dawn."
		])
			expect(scanEnclosure(text), text).toEqual([]);
		expect(segmentSentences("The band was famous in the '90s. The fans still love it.")).toEqual([
			{ text: "The band was famous in the '90s.", reliable: true },
			{ text: 'The fans still love it.', reliable: true }
		]);
		// A real single quotation still opens and is carried on.
		expect(scanEnclosure("He said: 'We lost. The fans left.")).toEqual(["'"]);
	});
});

describe('quotation direction from the word position (D.12, F3)', () => {
	it('opens an English quotation inside a German one instead of closing it', () => {
		expect(scanEnclosure('Er sagte: „Ich las “The Model” gestern.')).toEqual(['“']);
		expect(
			segmentSentences('Er sagte: „Ich las “The Model” gestern. Die Kunden warten lange“ heute.')
		).toEqual([
			{ text: 'Er sagte: „Ich las “The Model” gestern.', reliable: false },
			{ text: 'Die Kunden warten lange“ heute.', reliable: false }
		]);
		// A German closing mark at a word end still closes; an English quotation still works.
		expect(scanEnclosure('Er sagte: „Wir kommen.“ Dann ging er.')).toEqual([]);
		expect(scanEnclosure('He said: “We come.” Then he left.')).toEqual([]);
		expect(scanEnclosure('Sie rief ‚Halt!‘ und lief.')).toEqual([]);
		expect(scanEnclosure('He said ‘Stop!’ and ran.')).toEqual([]);
	});

	it('treats an elision-shaped opener as a quotation when its closing quote follows', () => {
		for (const text of [
			"He wrote: '90 people came. The customers are waiting', because he was nervous.",
			'He wrote: ‘90 fans came. The team lost’, because the match was bad.',
			"She sang: 'Til the end. The night is long', because she was sad.",
			"He wrote: 'S is for safety. The customers are waiting', because he was nervous."
		])
			expect(
				segmentSentences(text).every((segment) => !segment.reliable),
				text
			).toBe(true);
		// Without a closing quote in the block it stays an elision.
		expect(scanEnclosure("The band was famous in the '90s. The fans still love it.")).toEqual([]);
		expect(scanEnclosure("We will see 'em later. Wait 'til dawn.")).toEqual([]);
	});
});

describe('local textual continuity between blocks (D.15)', () => {
	const CASES: [string, string, string, boolean][] = [
		[
			'cut sentence, lower-case rest',
			'The report was published last year by',
			'the Guardian in London.',
			true
		],
		[
			'cut sentence, capital next block',
			'The report was published last year by',
			'The Guardian in London, because readers asked.',
			false
		],
		[
			'cut German sentence, capital noun',
			'Die Kunden bestellten mehr, weil die',
			'Nachfrage im Land stieg.',
			false
		],
		['cut after a comma', 'Die Kunden bestellten mehr,', 'weil die Nachfrage stieg.', true],
		['colon before a new block', 'Die Ziele lauten:', 'Die Stadt baut einen Radweg.', false],
		['colon before a list item in lower case', 'Die Ziele lauten:', 'erstens ein Radweg.', true],
		[
			'semicolon before a capital',
			'Die Stadt plante lange;',
			'Die Arbeiten begannen im Mai.',
			false
		],
		['dash before a capital', 'Die Stadt plante lange –', 'Die Arbeiten begannen im Mai.', false],
		[
			'heading-like fragment before text',
			'Kapitel 3 Die neue Brücke',
			'Die Stadt baute sie im Mai.',
			false
		],
		[
			'sentence end, new sentence',
			'Die Stadt baute im Frühjahr einen Radweg.',
			'Die Kunden bestellten mehr als geplant.',
			true
		],
		[
			'sentence end, sentence with a colon',
			'Die Stadt baute im Frühjahr einen Radweg.',
			'Der Sprecher sagte: „Wir haben alles versucht.“',
			true
		],
		[
			'sentence end, label of a box',
			'Die Stadt baute im Frühjahr einen Radweg.',
			'Info: Die Anlage ist alt.',
			false
		],
		[
			'sentence end, numbered caption',
			'Die Stadt baute im Frühjahr einen Radweg.',
			'Abbildung 3: Die Pumpe im Schnitt.',
			false
		],
		[
			'sentence end, footnote number',
			'Die Stadt baute im Frühjahr einen Radweg.',
			'1 Vgl. Handbuch der Stadtwerke, 2019.',
			false
		],
		[
			'sentence end, lower case',
			'Die Stadt baute im Frühjahr einen Radweg.',
			'und dann kam der Winter.',
			false
		],
		[
			'abbreviation at the end',
			'Die Einzelheiten beschreibt ausführlich Kap.',
			'Die Kalibrierung der Geräte.',
			false
		],
		[
			'sentence end inside an open quotation',
			'Der Sprecher sagte: „Wir haben alles versucht.',
			'Die Kunden warten lange.',
			false
		],
		[
			'closed quotation, new sentence',
			'Der Sprecher sagte: „Wir haben alles versucht.“',
			'Die Kunden warten lange.',
			true
		],
		[
			'caption fragment before text',
			'Abbildung 3: Die Pumpe im',
			'Die Stadt baute sie im Mai.',
			false
		]
	];
	for (const [name, before, after, expected] of CASES)
		it(`${name}: ${expected ? 'continues' : 'no evidence'}`, () => {
			expect(continuesInto(before, after)).toBe(expected);
		});
});
