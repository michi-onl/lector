import { desc, eq } from 'drizzle-orm';
import type { Database } from './db/index.js';
import {
	calibration,
	document,
	liveSession,
	measurement,
	progress,
	readingProfile,
	readingSettings,
	session,
	user
} from './db/schema.js';

/**
 * Everything stored about an account, for download (Art. 15 and 20 DSGVO), as pieces of one
 * JSON document. Texts come from R2 one at a time, so a large library fits the Worker's memory.
 * Password hashes and session tokens stay out: they are credentials, not the person's data.
 */
export async function* exportAccount(
	db: Database,
	bucket: R2Bucket,
	userId: string
): AsyncGenerator<string> {
	const [account, settings, sessions, calibrations, measurements, profiles, liveSessions, rows] =
		await Promise.all([
			db
				.select({
					id: user.id,
					name: user.name,
					email: user.email,
					emailVerified: user.emailVerified,
					plan: user.plan,
					createdAt: user.createdAt
				})
				.from(user)
				.where(eq(user.id, userId))
				.get(),
			db.select().from(readingSettings).where(eq(readingSettings.userId, userId)).get(),
			db
				.select({
					createdAt: session.createdAt,
					expiresAt: session.expiresAt,
					ipAddress: session.ipAddress,
					userAgent: session.userAgent
				})
				.from(session)
				.where(eq(session.userId, userId)),
			db.select().from(calibration).where(eq(calibration.userId, userId)),
			db.select().from(measurement).where(eq(measurement.userId, userId)),
			db
				.select()
				.from(readingProfile)
				.where(eq(readingProfile.userId, userId))
				.orderBy(desc(readingProfile.createdAt)),
			db
				.select({
					code: liveSession.code,
					rounds: liveSession.rounds,
					phase: liveSession.phase,
					createdAt: liveSession.createdAt
				})
				.from(liveSession)
				.where(eq(liveSession.hostId, userId)),
			db
				.select({ document, progress })
				.from(document)
				.leftJoin(progress, eq(progress.documentId, document.id))
				.where(eq(document.userId, userId))
		]);

	const head = JSON.stringify({
		exportedAt: new Date(),
		account,
		settings: settings ?? null,
		sessions,
		calibrations,
		measurements,
		profiles,
		liveSessions
	});
	yield `${head.slice(0, -1)},"documents":[`;
	for (const [index, row] of rows.entries()) {
		const { modelKey, sourceKey, ...fields } = row.document;
		const model = await bucket.get(modelKey);
		const blocks = model ? (await model.json<{ blocks: unknown }>()).blocks : null;
		yield (index ? ',' : '') +
			JSON.stringify({ ...fields, hasSource: sourceKey !== null, progress: row.progress, blocks });
	}
	yield ']}';
}

export function exportStream(pieces: AsyncGenerator<string>): ReadableStream<Uint8Array> {
	const encoder = new TextEncoder();
	return new ReadableStream({
		async pull(controller) {
			const { done, value } = await pieces.next();
			if (done) controller.close();
			else controller.enqueue(encoder.encode(value));
		},
		async cancel() {
			await pieces.return(undefined);
		}
	});
}
