/**
 * The opening of the presentation (SPEC.md): the team introduces itself by RSVP, first at
 * 300, then 500, then 700 WPM. Edit the texts here; each segment plays at its own speed.
 */
export const INTRO_SEGMENTS = [
	{
		wpm: 300,
		text: 'Guten Tag! Sie lesen gerade mit 300 Wörtern pro Minute. Das ist ungefähr so schnell, wie die meisten Menschen ohnehin lesen.'
	},
	{
		wpm: 500,
		text: 'Jetzt sind es 500. Wir sind das Team hinter Lector: Michi und Timo haben die Leseengine gebaut und die Inhalte geschrieben, Robin und Magnus kümmern sich um Marketing und Finanzen.'
	},
	{
		wpm: 700,
		text: 'Und das hier sind 700 Wörter pro Minute. Haben Sie noch alles verstanden? Genau das misst Lector – und liest so schnell, wie Ihr Verständnis es trägt.'
	}
] as const;
