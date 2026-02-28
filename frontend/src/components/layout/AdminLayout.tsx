import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export interface AdminLayoutProps {
  children: React.ReactNode;
}

/**
 * AdminLayout Component - Mental Wellness Optimized
 * 
 * Features:
 * - Clean, organized design
 * - Clear admin navigation
 * - Professional but calm aesthetics
 * - Mobile responsive
 */
export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const location = useLocation();

  const navItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/admin/users', label: 'Users', icon: '👥' },
    { path: '/admin/therapists', label: 'Therapists', icon: '👨‍⚕️' },
    { path: '/admin/verification', label: 'Verification', icon: '✓' },
    { path: '/admin/revenue', label: 'Revenue', icon: '💰' },
    { path: '/admin/subscriptions', label: 'Subscriptions', icon: '📦' },
    { path: '/admin/settings', label: 'Settings', icon: '⚙️' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-wellness-bg">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-soft-lavender/10 sticky top-0 z-40">
        <div className="container-safe">
          <div className="flex items-center justify-between py-4">
            {/* Logo */}
            <Link to="/" className="font-serif text-2xl text-wellness-text hover:opacity-80 transition-smooth">
              MANAS<span className="font-semibold text-soft-lavender">360</span>
              <span className="ml-3 text-xs bg-soft-lavender/20 text-soft-lavender px-3 py-1 rounded-full">Admin</span>
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
                      ? 'bg-soft-lavender/20 text-soft-lavender'
                      : 'text-wellness-text hover:bg-soft-lavender/10'
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
              <button className="p-2 rounded-full hover:bg-soft-lavender/10 transition-smooth">
                <svg className="w-6 h-6 text-wellness-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
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
                    ? 'bg-soft-lavender/20 text-soft-lavender'
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
      <footer className="bg-wellness-surface border-t border-soft-lavender/10 mt-16">
        <div className="container-safe py-8">
          <p className="text-center text-sm text-wellness-muted">
            © 2024 MANAS360 • Platform Administration
          </p>
        </div>
      </footer>
    </div>
  );
};

export default AdminLayout;
