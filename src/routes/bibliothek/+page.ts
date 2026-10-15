import { libraryFor } from '#lib/library/index.js';
import { planOf } from '#lib/plan.js';
import { loadPreferences } from '#lib/preferences/store.js';
import type { PageLoad } from './$types';

// The library of Free lives in IndexedDB, so the page only renders in the browser.
export const ssr = false;

export const load: PageLoad = async ({ parent }) => {
	const plan = planOf((await parent()).user);
	const [items, preferences] = await Promise.all([libraryFor(plan).list(), loadPreferences(plan)]);
	return { plan, items, wpm: preferences.targetWpm };
};
