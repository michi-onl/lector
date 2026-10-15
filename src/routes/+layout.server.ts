import { planOf, type SessionUser } from '#lib/plan.js';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => {
	const user: SessionUser | null = locals.user
		? {
				id: locals.user.id,
				name: locals.user.name,
				email: locals.user.email,
				plan: planOf(locals.user)
			}
		: null;
	return { user };
};
