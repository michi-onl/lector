/**
 * R2 keys of one document: the uploaded original and the model extracted in the browser. All
 * objects of a user share one prefix, so deleting an account can remove them together; D1's
 * cascade does not reach R2.
 */
export function documentKeys(userId: string, documentId: string) {
	const prefix = `${userPrefix(userId)}documents/${documentId}/`;
	return { source: `${prefix}source`, model: `${prefix}model.json` };
}

export function userPrefix(userId: string) {
	return `users/${userId}/`;
}

/** Removes every object of a user, page by page; R2 lists and deletes up to 1,000 at a time. */
export async function deleteUserObjects(bucket: R2Bucket, userId: string) {
	let cursor: string | undefined;
	for (;;) {
		const page = await bucket.list({ prefix: userPrefix(userId), cursor });
		if (page.objects.length) await bucket.delete(page.objects.map((object) => object.key));
		if (!page.truncated) return;
		cursor = page.cursor;
	}
}
