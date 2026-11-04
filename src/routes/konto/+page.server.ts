import { planOf } from '#lib/plan.js';
import { authMessage, createAuth } from '#lib/server/auth.js';
import { evaluation } from '#lib/server/calibration.js';
import { getDb } from '#lib/server/db/index.js';
import { user } from '#lib/server/db/schema.js';
import { fail, redirect } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(303, '/anmelden?weiter=/konto');
	return {
		evaluation:
			planOf(locals.user) === 'pro' ? await evaluation(getDb(env.DB), locals.user.id) : null
	};
};

export const actions: Actions = {
	/** The prototype takes no payment: switching the tariff is one click. */
	plan: async ({ locals, request }) => {
		if (!locals.user) redirect(303, '/anmelden?weiter=/konto');
		const plan = (await request.formData()).get('plan');
		if (plan !== 'free' && plan !== 'pro') return fail(400, { message: 'Unbekannter Tarif.' });
		await getDb(env.DB)
			.update(user)
			.set({ plan, updatedAt: new Date() })
			.where(eq(user.id, locals.user.id));
		return { plan };
	},
	/** Removes the account with everything in D1 and R2, confirmed with the password. */
	loeschen: async ({ locals, request, url }) => {
		if (!locals.user) redirect(303, '/anmelden?weiter=/konto');
		const password = String((await request.formData()).get('password') ?? '');
		if (!password) return fail(400, { deleteMessage: 'Bitte gib dein Passwort ein.' });
		try {
			await createAuth(url.origin).api.deleteUser({
				body: { password },
				headers: request.headers
			});
		} catch (error) {
			const deleteMessage = authMessage(error);
			if (!deleteMessage) throw error;
			return fail(400, { deleteMessage });
		}
		redirect(303, '/');
	},
	abmelden: async ({ request, url }) => {
		await createAuth(url.origin).api.signOut({ headers: request.headers });
		redirect(303, '/');
	}
};
