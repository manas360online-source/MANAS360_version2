type Resp<T> = { data: T };

const base = '/api';

const client = {
	async get<T = any>(url: string) {
		const res = await fetch(base + url, { credentials: 'same-origin' });
		const data = await res.json();
		return { data } as Resp<T>;
	},
	async post<T = any>(url: string, body?: any) {
		const res = await fetch(base + url, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
		const data = await res.json();
		return { data } as Resp<T>;
	},
};

export default client;
