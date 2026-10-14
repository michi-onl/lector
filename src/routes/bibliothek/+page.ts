import { listLibrary } from '#lib/library/index.js';
import type { PageLoad } from './$types';

// The free tier's library lives in IndexedDB, so the page only renders in the browser.
export const ssr = false;

export const load: PageLoad = async () => ({ items: await listLibrary() });
