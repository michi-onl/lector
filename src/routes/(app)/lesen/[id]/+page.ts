import { openDocument } from '#lib/library/index.js';
import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	const opened = await openDocument(params.id);
	if (!opened) error(404, 'Dieser Text ist nicht in der Bibliothek.');
	return opened;
};
