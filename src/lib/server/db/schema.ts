import { sql } from 'drizzle-orm';
import {
	check,
	index,
	integer,
	primaryKey,
	real,
	sqliteTable,
	text
} from 'drizzle-orm/sqlite-core';

const id = () =>
	text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID());
const timestamp = (name: string) => integer(name, { mode: 'timestamp_ms' });
const createdAt = () =>
	timestamp('created_at')
		.notNull()
		.$defaultFn(() => new Date());
const updatedAt = () =>
	timestamp('updated_at')
		.notNull()
		.$defaultFn(() => new Date())
		.$onUpdateFn(() => new Date());

// Better Auth core tables. The adapter finds them by export name and maps its field names to
// the property names, so both must stay as Better Auth defines them.

export const user = sqliteTable('user', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
	image: text('image'),
	createdAt: createdAt(),
	updatedAt: updatedAt(),
	/** Lector's tariff, an additional field of Better Auth (see `auth.ts`). */
	plan: text('plan', { enum: ['free', 'pro'] })
		.notNull()
		.default('free')
});

export const session = sqliteTable(
	'session',
	{
		id: text('id').primaryKey(),
		expiresAt: timestamp('expires_at').notNull(),
		token: text('token').notNull().unique(),
		createdAt: createdAt(),
		updatedAt: updatedAt(),
		ipAddress: text('ip_address'),
		userAgent: text('user_agent'),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' })
	},
	(table) => [index('session_user_idx').on(table.userId)]
);

export const account = sqliteTable(
	'account',
	{
		id: text('id').primaryKey(),
		accountId: text('account_id').notNull(),
		providerId: text('provider_id').notNull(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		accessToken: text('access_token'),
		refreshToken: text('refresh_token'),
		idToken: text('id_token'),
		accessTokenExpiresAt: timestamp('access_token_expires_at'),
		refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
		scope: text('scope'),
		password: text('password'),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(table) => [index('account_user_idx').on(table.userId)]
);

export const verification = sqliteTable(
	'verification',
	{
		id: text('id').primaryKey(),
		identifier: text('identifier').notNull(),
		value: text('value').notNull(),
		expiresAt: timestamp('expires_at').notNull(),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(table) => [index('verification_identifier_idx').on(table.identifier)]
);

// Library and progress. The free tier keeps its library in the browser; these tables hold
// what belongs to an account.

/**
 * An imported text. Extraction runs in the browser; the original file and the extracted model
 * live in R2 under the stored keys.
 */
export const document = sqliteTable(
	'document',
	{
		id: id(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		title: text('title').notNull(),
		format: text('format', { enum: ['pdf', 'docx', 'epub', 'txt', 'url', 'text'] }).notNull(),
		/** Original file name; null for URL imports and pasted text. */
		fileName: text('file_name'),
		sourceUrl: text('source_url'),
		language: text('language'),
		byteLength: integer('byte_length'),
		sha256: text('sha256'),
		/** R2 key of the original; null where there is no file. */
		sourceKey: text('source_key'),
		/** R2 key of the extracted document model (JSON). */
		modelKey: text('model_key').notNull(),
		/** Positions are word indices into the model, whose tokenization depends on this version. */
		analyzerVersion: text('analyzer_version').notNull(),
		wordCount: integer('word_count').notNull(),
		unitCount: integer('unit_count').notNull(),
		createdAt: createdAt(),
		updatedAt: updatedAt(),
		lastOpenedAt: timestamp('last_opened_at')
	},
	(table) => [index('document_user_opened_idx').on(table.userId, table.lastOpenedAt)]
);

/** Reading progress of one document; counters accumulate over all reading sessions. */
export const progress = sqliteTable(
	'progress',
	{
		documentId: text('document_id')
			.primaryKey()
			.references(() => document.id, { onDelete: 'cascade' }),
		position: integer('position').notNull().default(0),
		maxPosition: integer('max_position').notNull().default(0),
		/** Time words were on screen, rereads included. */
		wordMs: integer('word_ms').notNull().default(0),
		/** Words presented, rereads included; with `wordMs` the effective WPM. */
		wordPresentations: integer('word_presentations').notNull().default(0),
		completedAt: timestamp('completed_at'),
		updatedAt: updatedAt()
	},
	(table) => [
		check('progress_position_check', sql`${table.position} >= 0 and ${table.maxPosition} >= 0`)
	]
);

export const readingSettings = sqliteTable(
	'reading_settings',
	{
		userId: text('user_id')
			.primaryKey()
			.references(() => user.id, { onDelete: 'cascade' }),
		targetWpm: integer('target_wpm').notNull().default(240),
		/** Smart Timing on, or every word at the base time. */
		adaptive: integer('adaptive', { mode: 'boolean' }).notNull().default(true),
		chunkSize: integer('chunk_size').notNull().default(1),
		font: text('font').notNull().default('sans'),
		fontSizePx: integer('font_size_px').notNull().default(48),
		background: text('background').notNull().default('cream'),
		updatedAt: updatedAt()
	},
	(table) => [
		check('reading_settings_wpm_check', sql`${table.targetWpm} > 0`),
		check('reading_settings_chunk_check', sql`${table.chunkSize} between 1 and 3`)
	]
);

// Calibration and comprehension.

export const calibration = sqliteTable(
	'calibration',
	{
		id: id(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		startedAt: timestamp('started_at')
			.notNull()
			.$defaultFn(() => new Date()),
		completedAt: timestamp('completed_at')
	},
	(table) => [index('calibration_user_idx').on(table.userId)]
);

/**
 * Quiz answers at one speed: a calibration run or the questions within a document. The
 * speed-up curve and the profile are derived from these.
 */
export const measurement = sqliteTable(
	'measurement',
	{
		id: id(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		calibrationId: text('calibration_id').references(() => calibration.id, {
			onDelete: 'cascade'
		}),
		documentId: text('document_id').references(() => document.id, { onDelete: 'set null' }),
		/** Calibration text the run used. */
		textId: text('text_id'),
		wpm: integer('wpm').notNull(),
		correct: integer('correct').notNull(),
		answered: integer('answered').notNull(),
		skipped: integer('skipped').notNull().default(0),
		/** Deepest question depth asked. */
		depth: text('depth', { enum: ['recall', 'understanding', 'relation'] }),
		createdAt: createdAt()
	},
	(table) => [
		index('measurement_user_created_idx').on(table.userId, table.createdAt),
		index('measurement_calibration_idx').on(table.calibrationId),
		check(
			'measurement_counts_check',
			sql`${table.correct} >= 0 and ${table.correct} <= ${table.answered} and ${table.skipped} >= 0`
		)
	]
);

/** Immutable profile versions; the newest is the current one. */
export const readingProfile = sqliteTable(
	'reading_profile',
	{
		id: id(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		calibrationId: text('calibration_id').references(() => calibration.id, {
			onDelete: 'set null'
		}),
		/** Null while the evidence is insufficient. */
		targetWpm: integer('target_wpm'),
		comprehension: real('comprehension'),
		confidence: text('confidence', { enum: ['insufficient', 'developing', 'stable'] }).notNull(),
		createdAt: createdAt()
	},
	(table) => [index('reading_profile_user_created_idx').on(table.userId, table.createdAt)]
);

// Live demo: the audience answers the quiz on their phones while the presenter reads.

/** One audience session; the phase moves forward only, driven by the presenter. */
export const liveSession = sqliteTable(
	'live_session',
	{
		id: id(),
		/** What the audience scans or types; short and without look-alike characters. */
		code: text('code').notNull().unique(),
		hostId: text('host_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		/** Calibration text and speed of every round, in order. */
		rounds: text('rounds', { mode: 'json' }).$type<{ textId: string; wpm: number }[]>().notNull(),
		round: integer('round').notNull().default(0),
		phase: text('phase', { enum: ['lobby', 'reading', 'questions', 'results', 'finished'] })
			.notNull()
			.default('lobby'),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(table) => [index('live_session_host_idx').on(table.hostId)]
);

/** A phone in the audience, known only by a random id it keeps in its browser. */
export const liveParticipant = sqliteTable(
	'live_participant',
	{
		sessionId: text('session_id')
			.notNull()
			.references(() => liveSession.id, { onDelete: 'cascade' }),
		participantId: text('participant_id').notNull(),
		joinedAt: timestamp('joined_at')
			.notNull()
			.$defaultFn(() => new Date())
	},
	(table) => [primaryKey({ columns: [table.sessionId, table.participantId] })]
);

/** One answer per participant and question; a skip („Weiß ich nicht“) has no choice. */
export const liveAnswer = sqliteTable(
	'live_answer',
	{
		sessionId: text('session_id')
			.notNull()
			.references(() => liveSession.id, { onDelete: 'cascade' }),
		participantId: text('participant_id').notNull(),
		round: integer('round').notNull(),
		question: integer('question').notNull(),
		choice: integer('choice'),
		correct: integer('correct', { mode: 'boolean' }).notNull(),
		createdAt: createdAt()
	},
	(table) => [
		primaryKey({
			columns: [table.sessionId, table.participantId, table.round, table.question]
		})
	]
);
