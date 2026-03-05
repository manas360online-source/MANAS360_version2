import axios from 'axios';

const configuredBaseUrl =
	import.meta.env.VITE_API_BASE_URL?.trim() ||
	import.meta.env.VITE_API_URL?.trim() ||
	'http://localhost:3000/api';

export const http = axios.create({
	baseURL: configuredBaseUrl,
	withCredentials: true,
	headers: {
		'Content-Type': 'application/json',
	},
});
