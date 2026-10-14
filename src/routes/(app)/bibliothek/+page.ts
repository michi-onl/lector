import { listLibrary } from '#lib/library/index.js';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => ({ items: await listLibrary() });
