/** An API error with the server's German message. */
export class ApiError extends Error {
	constructor(
		message: string,
		readonly status: number
	) {
		super(message);
	}
}

/** Calls Lector's own API; JSON bodies are sent as JSON, everything else as is. */
export async function api<T>(
	path: string,
	init: RequestInit & { json?: unknown } = {}
): Promise<T> {
	const { json, ...rest } = init;
	const response = await fetch(path, {
		...rest,
		...(json !== undefined
			? {
					body: JSON.stringify(json),
					headers: { 'content-type': 'application/json', ...rest.headers }
				}
			: {})
	});
	if (!response.ok) {
		const body = (await response.json().catch(() => null)) as { message?: string } | null;
		throw new ApiError(body?.message ?? `Fehler ${response.status}`, response.status);
	}
	return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}
