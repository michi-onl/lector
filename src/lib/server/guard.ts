import { planOf, syncs } from '#lib/plan.js';
import { error } from '@sveltejs/kit';

type Locals = Pick<App.Locals, 'user'>;

export function requireUser(locals: Locals) {
	if (!locals.user) error(401, 'Bitte melde dich an.');
	return locals.user;
}

/** Library, settings and profile in the account are Pro: Free keeps them in the browser. */
export function requirePro(locals: Locals) {
	const user = requireUser(locals);
	if (!syncs(planOf(user))) error(403, 'Diese Funktion gehört zu Lector Pro.');
	return user;
}
