import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export interface TherapistLayoutProps {
  children: React.ReactNode;
}

/**
 * TherapistLayout Component - Mental Wellness Optimized
 * 
 * Features:
 * - Professional yet warm design
 * - Clear navigation for therapist workflows
 * - Soft, trustworthy aesthetics
 * - Mobile responsive
 */
export const TherapistLayout: React.FC<TherapistLayoutProps> = ({ children }) => {
  const location = useLocation();

  const navItems = [
    { path: '/therapist/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/therapist/sessions', label: 'Sessions', icon: '💬' },
    { path: '/therapist/leads', label: 'Leads', icon: '👥' },
    { path: '/therapist/earnings', label: 'Earnings', icon: '💰' },
    { path: '/therapist/analytics', label: 'Analytics', icon: '📈' },
    { path: '/therapist/profile', label: 'Profile', icon: '👤' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-wellness-bg">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gentle-blue/10 sticky top-0 z-40">
        <div className="container-safe">
          <div className="flex items-center justify-between py-4">
            {/* Logo */}
            <Link to="/" className="font-serif text-2xl text-wellness-text hover:opacity-80 transition-smooth">
              MANAS<span className="font-semibold text-gentle-blue">360</span>
              <span className="ml-3 text-xs bg-gentle-blue/20 text-gentle-blue px-3 py-1 rounded-full">Therapist</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    px-4 py-2 rounded-full text-sm font-medium transition-smooth
                    ${isActive(item.path)
                      ? 'bg-gentle-blue/20 text-gentle-blue'
                      : 'text-wellness-text hover:bg-gentle-blue/10'
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
              <button className="p-2 rounded-full hover:bg-gentle-blue/10 transition-smooth">
                <svg className="w-6 h-6 text-wellness-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          <nav className="lg:hidden flex overflow-x-auto pb-2 gap-2 scrollbar-hide">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-smooth whitespace-nowrap
                  ${isActive(item.path)
                    ? 'bg-gentle-blue/20 text-gentle-blue'
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
      <footer className="bg-wellness-surface border-t border-gentle-blue/10 mt-16">
        <div className="container-safe py-8">
          <p className="text-center text-sm text-wellness-muted">
            © 2024 MANAS360 • Empowering therapists to make a difference.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default TherapistLayout;
