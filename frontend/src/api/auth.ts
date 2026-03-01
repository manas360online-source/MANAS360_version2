import type { AxiosError } from 'axios';
import { http } from '../lib/http';

interface ApiEnvelope<T> {
	success: boolean;
	message?: string;
	data: T;
}

export interface AuthUser {
	id: string;
	email: string | null;
	phone: string | null;
	role: string;
	firstName?: string | null;
	lastName?: string | null;
	emailVerified?: boolean;
	phoneVerified?: boolean;
	mfaEnabled?: boolean;
}

export interface LoginPayload {
	identifier: string;
	password: string;
}

export interface RegisterPayload {
	email: string;
	password: string;
	name?: string;
}

export const getApiErrorMessage = (error: unknown, fallback = 'Request failed'): string => {
	const axiosError = error as AxiosError<{ message?: string }>;
	return axiosError.response?.data?.message ?? fallback;
};

export const login = async (payload: LoginPayload): Promise<AuthUser> => {
	const response = await http.post<ApiEnvelope<{ user: AuthUser; sessionId: string }>>('/auth/login', payload);
	return response.data.data.user;
};

export const register = async (payload: RegisterPayload): Promise<void> => {
	await http.post<ApiEnvelope<{ userId: string; email: string; message: string }>>('/auth/register', payload);
};

export const me = async (): Promise<AuthUser> => {
	const response = await http.get<ApiEnvelope<AuthUser>>('/auth/me');
	return response.data.data;
};

const getCookieValue = (cookieName: string): string | null => {
	const escaped = cookieName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
	return match ? decodeURIComponent(match[1]) : null;
};

export const logout = async (): Promise<void> => {
	const csrfCookieName = import.meta.env.VITE_CSRF_COOKIE_NAME || 'csrf_token';
	const csrfToken = getCookieValue(csrfCookieName);

	await http.post('/auth/logout', {}, {
		headers: csrfToken ? { 'x-csrf-token': csrfToken } : undefined,
	});
};
