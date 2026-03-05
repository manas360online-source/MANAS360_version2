type Resp<T> = { data: T };

const configuredBase =
	import.meta.env.VITE_API_BASE_URL?.trim() ||
	import.meta.env.VITE_API_URL?.trim() ||
	'http://localhost:3000/api';

const joinUrl = (path: string): string => {
	if (path.startsWith('http://') || path.startsWith('https://')) return path;
	if (configuredBase.endsWith('/') && path.startsWith('/')) return `${configuredBase.slice(0, -1)}${path}`;
	if (!configuredBase.endsWith('/') && !path.startsWith('/')) return `${configuredBase}/${path}`;
	return `${configuredBase}${path}`;
};

const parseResponse = async <T = any>(res: Response): Promise<Resp<T>> => {
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		const message = data?.message || data?.error || `Request failed with status ${res.status}`;
		throw new Error(message);
	}
	return { data } as Resp<T>;
};

const client = {
	async get<T = any>(url: string) {
		const res = await fetch(joinUrl(url), { credentials: 'include' });
		return parseResponse<T>(res);
	},
	async post<T = any>(url: string, body?: any) {
		const res = await fetch(joinUrl(url), { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
		return parseResponse<T>(res);
	},
};

export default client;
