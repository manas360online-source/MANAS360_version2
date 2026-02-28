import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export interface PatientLayoutProps {
  children: React.ReactNode;
}

/**
 * PatientLayout Component - Mental Wellness Optimized
 * 
 * Features:
 * - Calm, supportive navigation
 * - Soft colors and gentle transitions
 * - Clear hierarchy
 * - Mobile responsive
 */
export const PatientLayout: React.FC<PatientLayoutProps> = ({ children }) => {
  const location = useLocation();

  const navItems = [
    { path: '/patient/dashboard', label: 'Dashboard', icon: '🏠' },
    { path: '/patient/sessions', label: 'Sessions', icon: '💬' },
    { path: '/patient/find-therapist', label: 'Find Therapist', icon: '👨‍⚕️' },
    { path: '/patient/assessment', label: 'Assessment', icon: '📋' },
    { path: '/patient/profile', label: 'Profile', icon: '👤' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-wellness-bg">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-calm-sage/10 sticky top-0 z-40">
        <div className="container-safe">
          <div className="flex items-center justify-between py-4">
            {/* Logo */}
            <Link to="/" className="font-serif text-2xl text-wellness-text hover:opacity-80 transition-smooth">
              MANAS<span className="font-semibold text-calm-sage">360</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    px-4 py-2 rounded-full text-sm font-medium transition-smooth
                    ${isActive(item.path)
                      ? 'bg-calm-sage/20 text-calm-sage'
                      : 'text-wellness-text hover:bg-calm-sage/10'
                    }
                  `}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* User Menu */}
            <div className="flex items-center gap-3">
              <button className="p-2 rounded-full hover:bg-calm-sage/10 transition-smooth">
                <svg className="w-6 h-6 text-wellness-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          <nav className="md:hidden flex overflow-x-auto pb-2 gap-2 scrollbar-hide">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-smooth whitespace-nowrap
                  ${isActive(item.path)
                    ? 'bg-calm-sage/20 text-calm-sage'
                    : 'bg-wellness-surface text-wellness-text'
                  }
                `}
              >
                <span className="mr-2">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container-safe py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-wellness-surface border-t border-calm-sage/10 mt-16">
        <div className="container-safe py-8">
          <p className="text-center text-sm text-wellness-muted">
            © 2024 MANAS360 • Your mental wellness journey, supported every step.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PatientLayout;
