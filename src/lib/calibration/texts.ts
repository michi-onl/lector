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
	'Beim Lesen zeigt dir Lector ein Wort nach dem anderen. Der farbig markierte Buchstabe bleibt dabei immer an derselben Stelle. Du kannst jederzeit kurz anhalten und in deiner eigenen Geschwindigkeit weiterlesen. Keine Sorge, denn Dieser erste Durchgang dient nur zum Ausprobieren und wird nicht gewertet. Danach erwarten dich verschiedene kurze Texte mit jeweils ein paar Fragen. Es geht hier nicht um Rekorde, sondern darum, deinen ganz eigenen, angenehmen Lesefluss zu finden.';

export const CALIBRATION_TEXTS: CalibrationText[] = [
	{
		id: 'water',
		title: 'Wasser im Garten',
		text: 'Im Gemeinschaftsgarten fangen alle gemeinsam Regenwasser auf. Eine Dachrinne am Geräteschuppen leitet es direkt in eine große Tonne, geschützt durch ein feines Gitter gegen Laub. Regelmäßiges Nachsehen gehört trotzdem dazu, damit nichts verstopft. Wenn der Sommer richtig trocken wird, reicht das Wasser nicht für alles. Dann bekommen zuerst die jungen Pflänzchen etwas ab, weil deren Wurzeln noch nicht tief genug in die Erde reichen. Alte Sträucher halten die Durststrecke besser durch. Zwischen den Beeten verteilt die Gruppe eine dicke Schicht aus trockenem Laub. Sie schirmt den Boden vor der brennenden Sonne ab und verhindert, dass die Feuchtigkeit verpufft. So sparen sie jede Menge Wasser, ohne dass die Ernte leidet.',
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
		text: 'Die kleine Stadtbibliothek hatte lange Zeit nur an drei Nachmittagen auf. Wer voll berufstätig war, stand praktisch vor verschlossener Tür. Nach einer Umfrage öffnete das Team einen festen Abend in der Woche und stellte draußen eine Rückgabebox auf. Seitdem kann man Bücher auch mitten in der Nacht einwerfen. Das löst natürlich nicht alles: Wer einen Ausweis braucht oder eine Frage hat, muss weiterhin zu den Servicezeiten kommen. Der Test zahlte sich schnell aus. Die Abende waren gut besucht, und weniger Bücher kamen verspätet zurück. Statt die Öffnungszeiten planlos aufzublähen, blieb die Bibliothek bei diesen gezielten Schritten. So wurde der Service spürbar besser, ohne das knappe Personal zu überlasten.',
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
		text: 'Früher backte die Bäckerei jeden Morgen dieselbe Menge. Mal war das Regal mittags leergefegt, mal blieb viel zu viel übrig. Irgendwann begann die Chefin, die Verkäufe genau nach Wochentagen festzuhalten. Schon bald zeigte sich ein klares Bild: Samstags griffen die Leute fast nur zu großen Laiben, während unter der Woche kleine Brote gefragt waren. Sie korrigierte die Mengen schrittweise, statt sich von einzelnen Ausreißertagen verrückt machen zu lassen. Exotische Brote gab es fortan auf Vorbestellung, und Reste wurden abends günstiger abgegeben. Zwar blieb das Wetter immer noch unberechenbar, aber die Reste schrumpften spürbar. Die Notizen halfen ihr einfach, echte Trends von reinem Zufall zu trennen.',
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
		text: 'Der gepflasterte Weg im Park führte in einem weiten Bogen um die große Wiese. Kaum jemand hielt sich daran: Fast alle nahmen die direkte Abkürzung querfeldein. Nach jedem Regenschauer verwandelte sich das Gras dort in eine matschige Schneise. Zuerst wollte die Parkverwaltung ein Verbotsschild aufstellen. Als sie genauer hinsah, merkte sie aber, dass der Trampelpfad zwei wichtige Haupteingänge auf kürzestem Weg verband. Also befestigte die Stadt die Spur kurzerhand mit wasserdurchlässigem Kies. Der Rundweg blieb trotzdem bestehen, weil viele dort in Ruhe spazieren wollten. Der Rasen leidet seitdem kaum noch. Manchmal ist es eben besser, Wege dort anzulegen, wo Menschen sowieso entlanglaufen.',
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
		text: 'Im Nachbarschaftstreff gibt es einmal im Monat ein Reparatur-Café. Leute bringen ihre kaputten Toaster oder Lampen mit und schrauben zusammen mit erfahrenen Tüftlern daran herum. Nicht alles lässt sich direkt retten. Mal fehlt ein seltenes Teil, mal wäre der Eingriff schlicht zu gefährlich. Die Helfer erklären dann ehrlich, was man als Nächstes tun kann. Neue Geräte verkaufen sie nicht, und ein Versprechen gibt es ohnehin nicht. Viele kommen trotzdem immer wieder, weil man lernt, Fehler selbst aufzuspüren. Ab dem nächsten Treffen muss man sich kurz vorab anmelden. So kann das Team passendes Werkzeug bereitlegen und lange Schlangen vermeiden. Den Schraubenzieher ersetzt der Terminplaner am Ende natürlich trotzdem nicht.',
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
		text: 'Bisher bekam fast jeder Marktstand seine Ware mit einem eigenen Transporter geliefert. Morgens standen sich die Fahrer oft gegenseitig in der engen Zufahrt im Weg. Die Händler setzten sich schließlich zusammen und staffelten die Ankunftszeiten: Frisches Gemüse und Fleisch kommen weiterhin ganz früh, haltbare Waren erst danach. Zwei Nachbarstände taten sich sogar zusammen und teilen sich jetzt eine Fahrt vom selben Großhändler. Das Chaos lichtete sich schnell, brauchte aber Disziplin. Um nicht bei jeder kleinen Panne ins Schwimmen zu geraten, planten sie bewusste Puffer ein, statt die Ladezeiten nahtlos aneinanderzureihen. Ein funktionierender Marktmorgen braucht schließlich Spielraum, wenn mal jemand im Stau steht.',
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
