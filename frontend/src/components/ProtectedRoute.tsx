import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
	const { isAuthenticated, loading } = useAuth();
	const location = useLocation();

	if (loading) {
		return <div className="p-6 text-center text-slate-600">Checking authentication...</div>;
	}

	if (!isAuthenticated) {
		const redirectPath = `${location.pathname}${location.search}`;
		return <Navigate to="/auth/login" replace state={{ from: redirectPath }} />;
	}

	return <>{children}</>;
}
