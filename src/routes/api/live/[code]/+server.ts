import { normalizeCode, validParticipant } from '#lib/live/live.js';
import { getDb } from '#lib/server/db/index.js';
import {
	advanceLiveSession,
	findLiveSession,
	joinLiveSession,
	liveView,
	submitLiveAnswers
} from '#lib/server/live.js';
import { error, json } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import type { RequestHandler } from './$types';

async function session(code: string) {
	const found = await findLiveSession(getDb(env.DB), normalizeCode(code));
	if (!found) error(404, 'Diese Live-Demo gibt es nicht.');
	return found;
}

/** Polled by the projector and the phones; `?p=` names the phone. */
export const GET: RequestHandler = async ({ locals, params, url }) => {
	const participant = url.searchParams.get('p');
	return json(
		await liveView(getDb(env.DB), await session(params.code), {
			userId: locals.user?.id,
			participantId: validParticipant(participant) ? participant : undefined
		}),
		{ headers: { 'cache-control': 'no-store' } }
	);
};

export const POST: RequestHandler = async ({ locals, params, request }) => {
	const db = getDb(env.DB);
	const found = await session(params.code);
	const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
	switch (body?.action) {
		case 'advance':
			if (locals.user?.id !== found.hostId) error(403, 'Nur die Leitung schaltet weiter.');
			await advanceLiveSession(db, found);
			break;
		case 'join':
			if (!validParticipant(body.participantId)) error(400, 'Unbekanntes Gerät.');
			await joinLiveSession(db, found, body.participantId);
			break;
		case 'answer': {
			if (!validParticipant(body.participantId)) error(400, 'Unbekanntes Gerät.');
			const result = await submitLiveAnswers(
				db,
				found,
				body.participantId,
				Number(body.round),
				body.answers
			);
			if (result === 'closed') error(409, 'Die Fragen dieser Runde sind schon geschlossen.');
			if (result === 'invalid') error(400, 'Bitte beantworte jede Frage.');
			break;
		}
		default:
			error(400, 'Unbekannte Aktion.');
	}
	return new Response(null, { status: 204 });
};
