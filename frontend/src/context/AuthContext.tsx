import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  login as loginApi,
  logout as logoutApi,
  me as meApi,
  register as registerApi,
  type AuthUser,
} from '../api/auth';

export type AppRole = 'patient' | 'therapist' | 'psychiatrist' | 'coach' | 'admin';

const normalizeRole = (value: unknown): AppRole | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.toLowerCase();
  if (normalized === 'patient' || normalized === 'therapist' || normalized === 'psychiatrist' || normalized === 'coach' || normalized === 'admin') {
    return normalized;
  }

  return null;
};

export const getDefaultRouteForRole = (role: unknown): string => {
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === 'admin') return '/admin/login';
  if (normalizedRole === 'therapist' || normalizedRole === 'psychiatrist' || normalizedRole === 'coach') return '/therapist/analytics';
  return '/dashboard';
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<AuthUser>;
  register: (email: string, password: string, name: string, role: 'patient' | 'therapist' | 'psychiatrist' | 'coach') => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const hasCheckedInitialAuthRef = useRef(false);

  const hasSessionHint = useCallback((): boolean => {
    if (typeof document === 'undefined') {
      return false;
    }

    const csrfCookieName = (import.meta.env.VITE_CSRF_COOKIE_NAME || 'csrf_token').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?:^|; )${csrfCookieName}=`).test(document.cookie);
  }, []);

  const checkAuth = useCallback(async () => {
    if (!hasSessionHint()) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const currentUser = await meApi();
      setUser(currentUser);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
 	}, [hasSessionHint]);

  useEffect(() => {
    if (hasCheckedInitialAuthRef.current) {
      return;
    }

    hasCheckedInitialAuthRef.current = true;
    void checkAuth();
  }, [checkAuth]);

  const login = useCallback(async (identifier: string, password: string) => {
    const loggedInUser = await loginApi({ identifier, password });
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const register = useCallback(async (email: string, password: string, name: string, role: 'patient' | 'therapist' | 'psychiatrist' | 'coach') => {
    await registerApi({ email, password, name, role });
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutApi();
    } catch {
      // keep frontend state consistent even if backend session already expired
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      checkAuth,
    }),
    [user, loading, login, register, logout, checkAuth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthProvider;
