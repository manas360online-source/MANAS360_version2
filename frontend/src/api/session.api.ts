import client from './client';

export const listTemplateVersions = async (templateId: string) => {
	const res = await client.get(`/cbt-sessions/templates/${templateId}/history`);
	return res.data;
};

export const duplicateTemplateVersion = async (templateId: string, versionId: string, publish = false) => {
	const res = await client.post(`/cbt-sessions/templates/${templateId}/versions/${versionId}/duplicate`, { publish });
	return res.data;
};

export const compareTemplateVersions = async (templateId: string, v1: number, v2: number) => {
	const res = await client.get(`/cbt-sessions/templates/${templateId}/versions/compare?v1=${v1}&v2=${v2}`);
	return res.data;
};

export const listLibrary = async (params: { q?: string; tags?: string[]; visibility?: string; page?: number; limit?: number }) => {
	const qp = [] as string[];
	if (params.q) qp.push(`q=${encodeURIComponent(params.q)}`);
	if (params.tags && params.tags.length) qp.push(`tags=${encodeURIComponent(params.tags.join(','))}`);
	if (params.visibility) qp.push(`visibility=${encodeURIComponent(params.visibility)}`);
	if (params.page) qp.push(`page=${params.page}`);
	if (params.limit) qp.push(`limit=${params.limit}`);
	const url = `/cbt-sessions/library${qp.length ? '?' + qp.join('&') : ''}`;
	const res = await client.get(url);
	return res.data;
};

export const cloneLibraryTemplate = async (templateId: string, opts?: { makePrivate?: boolean; title?: string }) => {
	const res = await client.post('/cbt-sessions/library/clone', { templateId, ...opts });
	return res.data;
};
