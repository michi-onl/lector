import { defineConfig } from 'drizzle-kit';

// Only generates SQL; Wrangler applies it with `wrangler d1 migrations apply`.
export default defineConfig({
	dialect: 'sqlite',
	schema: './src/lib/server/db/schema.ts',
	out: './migrations'
});
