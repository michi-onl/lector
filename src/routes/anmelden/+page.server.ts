import { authMessage, createAuth, nextPath } from '#lib/server/auth.js';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
	if (locals.user) redirect(303, nextPath(url.searchParams.get('weiter')));
};

export const actions: Actions = {
	default: async ({ request, url }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '').trim();
		const password = String(form.get('password') ?? '');
		try {
			await createAuth(url.origin).api.signInEmail({
				body: { email, password },
				headers: request.headers
			});
		} catch (error) {
			const message = authMessage(error);
			if (!message) throw error;
			return fail(400, { email, message });
		}
		redirect(303, nextPath(url.searchParams.get('weiter')));
	}
};
