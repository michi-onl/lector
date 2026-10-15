import { loadProfileFor } from '#lib/calibration/store.js';
import { libraryFor } from '#lib/library/index.js';
import { planOf } from '#lib/plan.js';
import { loadPreferences } from '#lib/preferences/store.js';
import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

// The library of Free lives in IndexedDB, so the page only renders in the browser.
export const ssr = false;

export const load: PageLoad = async ({ params, parent }) => {
	const plan = planOf((await parent()).user);
	const [opened, preferences, profile] = await Promise.all([
		libraryFor(plan).open(params.id),
		loadPreferences(plan),
		loadProfileFor(plan)
	]);
	if (!opened) error(404, 'Dieser Text ist nicht in der Bibliothek.');
	return { plan, document: opened, preferences, profile };
};
