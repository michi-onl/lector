import type { NewDocument } from '#lib/library/library.js';
import { readdirSync, readFileSync } from 'node:fs';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { getDb } from './db/index.js';
import { user } from './db/schema.js';

/**
 * Test doubles for D1 and R2, for specs only. D1 is SQLite with the real migrations, so the
 * queries, constraints and cascades under test are the ones that ship.
 */
export function testDb() {
	const sqlite = new DatabaseSync(':memory:');
	for (const file of readdirSync('migrations')
		.filter((name) => name.endsWith('.sql'))
		.sort())
		sqlite.exec(readFileSync(`migrations/${file}`, 'utf8'));

	const statement = (query: string, params: SQLInputValue[] = []) => ({
		bind: (...next: SQLInputValue[]) => statement(query, next),
		all: async () => ({ results: sqlite.prepare(query).all(...params), success: true }),
		run: async () => ({ results: sqlite.prepare(query).all(...params), success: true }),
		raw: async () => {
			const prepared = sqlite.prepare(query);
			prepared.setReturnArrays(true);
			return prepared.all(...params);
		}
	});
	const d1 = {
		prepare: (query: string) => statement(query),
		// D1 runs a batch as one transaction.
		batch: async (statements: ReturnType<typeof statement>[]) => {
			sqlite.exec('begin');
			try {
				const results = [];
				for (const item of statements) results.push(await item.all());
				sqlite.exec('commit');
				return results;
			} catch (cause) {
				sqlite.exec('rollback');
				throw cause;
			}
		}
	};
	return getDb(d1 as unknown as D1Database);
}

export type TestDb = ReturnType<typeof testDb>;

export async function addUser(db: TestDb, id: string, plan: 'free' | 'pro' = 'pro') {
	await db.insert(user).values({ id, name: id, email: `${id}@lector.example`, plan });
	return id;
}

/** A pasted text of one paragraph, as the library receives it. */
export function pastedText(text: string): Omit<NewDocument, 'source'> {
	const blocks: NewDocument['blocks'] = [
		{ id: 'b1', text, sectionId: 's1', chapterId: 'c1', boundaryAfter: 'paragraph' }
	];
	return { blocks, format: 'text' };
}

export interface TestBucket extends R2Bucket {
	objects: Map<string, string>;
}

/** An R2 bucket in memory; `pageSize` makes `list` paginate like the real one. */
export function testBucket(pageSize = 1000): TestBucket {
	const objects = new Map<string, string>();
	const bucket = {
		objects,
		put: async (key: string, value: string | ArrayBuffer) => {
			objects.set(key, typeof value === 'string' ? value : new TextDecoder().decode(value));
		},
		get: async (key: string) => {
			const value = objects.get(key);
			return value === undefined
				? null
				: { json: async () => JSON.parse(value), text: async () => value };
		},
		delete: async (keys: string | string[]) => {
			for (const key of [keys].flat()) objects.delete(key);
		},
		list: async ({ prefix = '', cursor }: { prefix?: string; cursor?: string } = {}) => {
			const keys = [...objects.keys()]
				.filter((key) => key.startsWith(prefix) && (!cursor || key > cursor))
				.sort();
			const page = keys.slice(0, pageSize);
			const truncated = keys.length > pageSize;
			return {
				objects: page.map((key) => ({ key })),
				truncated,
				...(truncated ? { cursor: page.at(-1) } : {})
			};
		}
	};
	return bucket as unknown as TestBucket;
}
