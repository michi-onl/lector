import { authMessage, createAuth, nextPath } from '#lib/server/auth.js';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
	if (locals.user) redirect(303, nextPath(url.searchParams.get('weiter'), '/konto'));
};

export const actions: Actions = {
	default: async ({ request, url }) => {
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const email = String(form.get('email') ?? '').trim();
		const password = String(form.get('password') ?? '');
		if (!name) return fail(400, { name, email, message: 'Wie sollen wir dich nennen?' });
		try {
			// Signs in right away; Better Auth sets the session cookie.
			await createAuth(url.origin).api.signUpEmail({
				body: { name, email, password },
				headers: request.headers
			});
		} catch (error) {
			const message = authMessage(error);
			if (!message) throw error;
			return fail(400, { name, email, message });
		}
		redirect(303, nextPath(url.searchParams.get('weiter'), '/konto'));
	}
};
