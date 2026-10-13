export type QuestionDepth = 'recall' | 'understanding' | 'relation';

export interface CalibrationQuestion {
	id: string;
	prompt: string;
	options: string[];
	correctIndex: number;
	depth: QuestionDepth;
}
export interface CalibrationText {
	id: string;
	title: string;
	text: string;
	questions: CalibrationQuestion[];
}

/**
 * Original material, written for Fovea. Each text has about 110 words and two questions with
 * three options, so the runs are comparable and the order of the texts can change.
 */
export const PRACTICE_TEXT =
	'Beim Lesen zeigt Lector ein Wort nach dem anderen. Der hervorgehobene Buchstabe bleibt an einer festen Stelle. Du kannst jederzeit pausieren und in deinem eigenen Tempo fortfahren. Dieser kurze Probelauf wird nicht bewertet. Danach folgen unterschiedliche Texte und einige Fragen zu ihrem Inhalt. Es geht nicht darum, möglichst schnell zu sein, sondern ein angenehmes Tempo zu finden.';

export const CALIBRATION_TEXTS: CalibrationText[] = [
	{
		id: 'water',
		title: 'Wasser im Garten',
		text: 'In einem Gemeinschaftsgarten sammeln die Mitglieder Regenwasser in einer großen Tonne. Das Wasser wird über eine Rinne vom Dach eines Geräteschuppens geleitet. Ein feines Gitter hält Blätter zurück. Trotzdem kontrolliert die Gruppe den Behälter regelmäßig, damit der Zufluss frei bleibt. Während trockener Wochen reicht der Vorrat nicht für alle Beete. Deshalb gießen die Mitglieder zuerst junge Pflanzen, deren Wurzeln noch nicht tief in den Boden reichen. Größere Sträucher kommen länger ohne zusätzliches Wasser aus. Eine Schicht aus trockenen Blättern bedeckt die Erde zwischen den Pflanzen. Sie schützt den Boden vor direkter Sonne und bremst die Verdunstung. Der Garten braucht dadurch weniger Wasser, obwohl die Pflanzen weiterhin ausreichend versorgt werden.',
		questions: [
			{
				id: 'water-1',
				prompt: 'Warum werden junge Pflanzen zuerst gegossen?',
				options: [
					'Ihre Wurzeln erreichen tiefere Bodenschichten noch nicht.',
					'Sie verbrauchen grundsätzlich mehr Wasser als Sträucher.',
					'Sie stehen näher an der Regentonne.'
				],
				correctIndex: 0,
				depth: 'understanding'
			},
			{
				id: 'water-2',
				prompt: 'Wie hilft die Schicht aus trockenen Blättern?',
				options: [
					'Sie leitet Regen direkt vom Dach in die Beete.',
					'Sie vermindert den Wasserverlust des Bodens.',
					'Sie ersetzt die Kontrolle des Behälters.'
				],
				correctIndex: 1,
				depth: 'relation'
			}
		]
	},
	{
		id: 'library',
		title: 'Eine Bibliothek verändert sich',
		text: 'Eine kleine Stadtbibliothek hatte früher nur an drei Nachmittagen geöffnet. Berufstätige konnten sie deshalb oft nicht besuchen. Nach einer Befragung führte das Team einen zusätzlichen Abendtermin ein. Gleichzeitig richtete es einen Rückgabekasten am Eingang ein. Bücher lassen sich dort auch außerhalb der Öffnungszeiten zurückgeben. Der Kasten löst jedoch nicht jedes Problem, denn Beratung und Anmeldung sind weiterhin nur während der betreuten Zeiten möglich. Nach einigen Monaten stellte das Team fest, dass der Abendtermin regelmäßig genutzt wurde. Die Zahl verspäteter Rückgaben war ebenfalls gesunken. Statt alle Öffnungszeiten zu verlängern, behielt die Bibliothek die gezielten Änderungen bei. So konnte sie den Zugang verbessern, ohne ihre begrenzten Personalstunden auf zu viele Zeiten zu verteilen.',
		questions: [
			{
				id: 'library-1',
				prompt: 'Welches Problem löst der Rückgabekasten nicht?',
				options: [
					'Die Rückgabe am späten Abend.',
					'Die Rückgabe außerhalb betreuter Zeiten.',
					'Den Bedarf an persönlicher Beratung.'
				],
				correctIndex: 2,
				depth: 'understanding'
			},
			{
				id: 'library-2',
				prompt: 'Warum behielt die Bibliothek gezielte Änderungen bei?',
				options: [
					'Sie verbesserten den Zugang bei begrenzten Personalstunden.',
					'Der Abendtermin wurde kaum besucht.',
					'Persönliche Anmeldungen waren nicht mehr nötig.'
				],
				correctIndex: 0,
				depth: 'relation'
			}
		]
	},
	{
		id: 'bread',
		title: 'Der Weg des Brotes',
		text: 'Eine Bäckerei stellte jeden Morgen dieselbe Menge Brot her. An manchen Tagen war früh alles verkauft, an anderen blieb viel übrig. Die Inhaberin begann deshalb, die Verkäufe nach Wochentagen zu notieren. Nach mehreren Wochen erkannte sie wiederkehrende Unterschiede. Samstags wurden größere Brote häufiger gekauft, während unter der Woche kleinere gefragt waren. Sie passte die Mengen vorsichtig an, statt die Produktion nach einem einzelnen ungewöhnlichen Tag zu verändern. Für selten nachgefragte Sorten nahm sie Vorbestellungen an. Nicht verkauftes Brot wurde am Abend günstiger angeboten. Die neuen Abläufe verringerten die Reste, beseitigten sie aber nicht vollständig. Wetter und Veranstaltungen beeinflussten die Nachfrage weiterhin. Die Aufzeichnungen halfen vor allem dabei, regelmäßige Muster von zufälligen Schwankungen zu unterscheiden.',
		questions: [
			{
				id: 'bread-1',
				prompt: 'Warum änderte die Inhaberin die Produktion nicht nach einem einzelnen Tag?',
				options: [
					'Ein einzelner Tag kann eine zufällige Schwankung zeigen.',
					'Die Backöfen ließen keine Änderungen zu.',
					'Alle Brotsorten waren täglich gleich beliebt.'
				],
				correctIndex: 0,
				depth: 'understanding'
			},
			{
				id: 'bread-2',
				prompt: 'Welche Aussage beschreibt das Ergebnis?',
				options: [
					'Es blieben nie wieder Brote übrig.',
					'Die Reste wurden weniger, die Nachfrage blieb aber veränderlich.',
					'Vorbestellungen ersetzten den normalen Verkauf vollständig.'
				],
				correctIndex: 1,
				depth: 'relation'
			}
		]
	},
	{
		id: 'path',
		title: 'Ein Weg durch den Park',
		text: 'In einem Park führte ein gepflasterter Weg in einem weiten Bogen um eine Wiese. Viele Menschen nahmen stattdessen eine kurze Verbindung über das Gras. Nach Regen wurde diese Spur schlammig und immer breiter. Die Parkverwaltung wollte zunächst ein Verbotsschild aufstellen. Bei einer Beobachtung stellte sie jedoch fest, dass die Abkürzung zwei häufig genutzte Eingänge verband. Daraufhin wurde die Spur als schmaler, wasserdurchlässiger Weg befestigt. Der ursprüngliche Rundweg blieb erhalten, weil Spaziergänger ihn weiterhin gern nutzten. Die neue Verbindung verhinderte nicht jeden Tritt auf die Wiese, verringerte aber die beschädigte Fläche. Entscheidend war, das tatsächliche Verhalten zu verstehen. Die Planung berücksichtigte nun sowohl kurze Alltagswege als auch längere Spaziergänge durch den Park.',
		questions: [
			{
				id: 'path-1',
				prompt: 'Warum wurde die Abkürzung so häufig genutzt?',
				options: [
					'Der Rundweg war dauerhaft gesperrt.',
					'Sie verband zwei häufig genutzte Eingänge direkt.',
					'Sie war bereits gepflastert.'
				],
				correctIndex: 1,
				depth: 'recall'
			},
			{
				id: 'path-2',
				prompt: 'Warum blieb der ursprüngliche Rundweg erhalten?',
				options: [
					'Er erfüllte weiterhin einen anderen Nutzungszweck.',
					'Der neue Weg durfte nicht betreten werden.',
					'Die beschädigte Wiese wurde vollständig entfernt.'
				],
				correctIndex: 0,
				depth: 'understanding'
			}
		]
	},
	{
		id: 'repair',
		title: 'Gemeinsam reparieren',
		text: 'Ein Nachbarschaftstreff bietet einmal im Monat einen Reparaturnachmittag an. Besucher bringen defekte Alltagsgegenstände mit und untersuchen sie gemeinsam mit erfahrenen Helfern. Nicht jedes Gerät kann vor Ort repariert werden. Manchmal fehlt ein passendes Ersatzteil, manchmal wäre die Arbeit zu gefährlich. In solchen Fällen erklären die Helfer, welche nächsten Schritte sinnvoll sind. Der Treff verkauft keine neuen Geräte und verspricht keine erfolgreiche Reparatur. Trotzdem kommen viele Besucher wieder. Sie lernen, einfache Fehler zu erkennen und den Zustand eines Gegenstands besser einzuschätzen. Für den nächsten Termin führt das Team eine kurze Anmeldung ein. Dadurch kann es benötigtes Werkzeug vorbereiten und Wartezeiten verkürzen. Die Anmeldung dient der Planung, ersetzt aber nicht die Untersuchung des tatsächlichen Defekts.',
		questions: [
			{
				id: 'repair-1',
				prompt: 'Welchen Nutzen haben Besucher auch ohne erfolgreiche Reparatur?',
				options: [
					'Sie erhalten automatisch ein neues Gerät.',
					'Sie lernen, Fehler und den Zustand besser einzuschätzen.',
					'Sie müssen keine Ersatzteile mehr beschaffen.'
				],
				correctIndex: 1,
				depth: 'understanding'
			},
			{
				id: 'repair-2',
				prompt: 'Wozu dient die Anmeldung hauptsächlich?',
				options: [
					'Sie garantiert eine erfolgreiche Reparatur.',
					'Sie ersetzt die Untersuchung des Geräts.',
					'Sie erleichtert die Vorbereitung und verkürzt Wartezeiten.'
				],
				correctIndex: 2,
				depth: 'relation'
			}
		]
	},
	{
		id: 'market',
		title: 'Lieferungen auf dem Markt',
		text: 'Mehrere Stände auf einem Wochenmarkt erhielten ihre Waren bisher in einzelnen Lieferfahrzeugen. Die Fahrzeuge kamen oft gleichzeitig und blockierten die schmale Zufahrt. Die Händler vereinbarten deshalb unterschiedliche Anlieferzeiten. Empfindliche Lebensmittel wurden weiterhin früh gebracht, andere Waren etwas später. Zusätzlich teilten zwei benachbarte Stände eine Lieferung, weil sie beim gleichen Betrieb bestellten. Die neue Planung verringerte das Gedränge, verlangte aber zuverlässige Absprachen. Wenn eine Lieferung verspätet war, mussten die Händler kurzfristig reagieren. Sie hielten daher einen kleinen Zeitpuffer frei, statt alle Termine unmittelbar hintereinander zu legen. Nach einigen Wochen wurden die Abstände angepasst. Das Ziel war nicht, jede freie Minute zu füllen, sondern einen Ablauf zu schaffen, der auch mit gelegentlichen Verzögerungen zurechtkommt.',
		questions: [
			{
				id: 'market-1',
				prompt: 'Warum blieben kleine Zeitpuffer zwischen Lieferungen frei?',
				options: [
					'Damit gelegentliche Verspätungen aufgefangen werden konnten.',
					'Weil empfindliche Lebensmittel nicht mehr geliefert wurden.',
					'Weil die Zufahrt dauerhaft geschlossen war.'
				],
				correctIndex: 0,
				depth: 'understanding'
			},
			{
				id: 'market-2',
				prompt: 'Welche Änderung verringerte zusätzlich die Zahl einzelner Lieferungen?',
				options: [
					'Alle Händler bestellten nur noch einmal im Monat.',
					'Zwei benachbarte Stände teilten eine Lieferung.',
					'Der Markt verzichtete auf Zeitabsprachen.'
				],
				correctIndex: 1,
				depth: 'recall'
			}
		]
	}
];
