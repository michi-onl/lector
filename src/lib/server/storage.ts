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
