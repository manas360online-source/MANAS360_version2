import axios from 'axios';

const configuredBaseUrl = import.meta.env.VITE_API_URL?.trim();

export const http = axios.create({
	baseURL: configuredBaseUrl && configuredBaseUrl.length > 0 ? configuredBaseUrl : '/api',
	withCredentials: true,
	headers: {
		'Content-Type': 'application/json',
	},
});
