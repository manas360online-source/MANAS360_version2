import React, { createContext, useContext, useCallback, useEffect, useRef } from 'react';
import useAuthToken from '../hooks/useAuthToken';

type AuthContextValue = {
  token: string | null;
  setToken: (t: string | null) => void;
  login: (t: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { token, setToken } = useAuthToken();

  const login = useCallback((t: string) => {
    setToken(t);
  }, [setToken]);

  const logout = useCallback(() => {
    setToken(null);
    localStorage.removeItem('accessToken');
  }, [setToken]);

  // automatic token refresh: decode JWT exp and schedule a refresh
  const refreshTimerRef = useRef<number | null>(null);
  function parseJwtExp(jwt: string | null): number | null {
    if (!jwt) return null;
    try {
      const parts = jwt.split('.');
      if (parts.length < 2) return null;
      const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const json = JSON.parse(decodeURIComponent(atob(payload).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join('')));
      if (typeof json.exp === 'number') return json.exp * 1000;
      return null;
    } catch (e) {
      return null;
    }
  }

  async function doRefresh() {
    try {
      const res = await fetch('/auth/refresh', { method: 'POST', credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.accessToken) {
        setToken(data.accessToken);
      }
    } catch (e) {
      // ignore; next schedule will retry
    }
  }

  useEffect(() => {
    // clear prior timer
    if (refreshTimerRef.current) {
      window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    if (!token) return;
    const exp = parseJwtExp(token);
    if (!exp) return;
    const now = Date.now();
    // schedule refresh 60s before expiry or immediately if expiry passed
    const msBefore = Math.max(0, exp - now - 60000);
    refreshTimerRef.current = window.setTimeout(() => {
      void doRefresh();
    }, msBefore) as unknown as number;

    return () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [token, setToken]);

  return <AuthContext.Provider value={{ token, setToken, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthProvider;
