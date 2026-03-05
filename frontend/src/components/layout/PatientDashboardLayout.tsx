import { useEffect, useState } from 'react';
import {
  Bell,
  CalendarDays,
  FileText,
  HeartPulse,
  Home,
  LifeBuoy,
  LogOut,
  Menu,
  MessageSquare,
  Search,
  Settings2,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const mainNavItems = [
  { to: '/patient/dashboard', label: 'Dashboard', icon: Home },
  { to: '/patient/assessments', label: 'Assessment', icon: HeartPulse },
  { to: '/patient/providers', label: 'Find Therapist', icon: Search },
  { to: '/patient/sessions', label: 'My Sessions', icon: CalendarDays, badge: '1 upcoming' },
];

const wellnessNavItems = [
  { to: '/patient/messages', label: 'Dr. Meera', icon: MessageSquare, badge: 'AI' },
  { to: '/patient/assessments', label: 'CBT Exercises', icon: FileText },
  { to: '/patient/mood', label: 'Mood Tracker', icon: HeartPulse },
  { to: '/patient/progress', label: 'My Progress', icon: Sparkles },
  { to: '/patient/support', label: 'Sound Therapy', icon: LifeBuoy },
  { to: '/patient/support', label: 'Group Sessions', icon: CalendarDays },
];

const supportNavItems = [
  { to: '/crisis', label: 'Crisis Support', icon: LifeBuoy },
  { to: '/patient/support', label: 'Help Center', icon: LifeBuoy },
];

const bottomNavItems = [
  { to: '/patient/dashboard', label: 'Dashboard', icon: Home },
  { to: '/patient/sessions', label: 'Sessions', icon: CalendarDays },
  { to: '/patient/providers', label: 'Find Therapist', icon: Search },
  { to: '/patient/messages', label: 'Messages', icon: MessageSquare },
  { to: '/patient/settings', label: 'Settings', icon: User },
];

type NavItem = {
  to: string;
  label: string;
  icon: any;
  badge?: string;
};

export default function PatientDashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const userName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || user?.email || 'Patient';
  const initials = userName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'PT';

  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  const handleLogout = async () => {
    await logout();
    navigate('/auth/login', { replace: true });
  };

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (mobileSidebarOpen || profileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileSidebarOpen, profileMenuOpen]);

  useEffect(() => {
    if (!profileMenuOpen) return;
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setProfileMenuOpen(false);
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [profileMenuOpen]);

  const renderNavSection = (heading: string, items: NavItem[]) => (
    <div>
      <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-ink-400">{heading}</p>
      <div className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.to);

          return (
            <Link
              key={`${heading}-${item.to}-${item.label}`}
              to={item.to}
              className={`flex min-h-[42px] items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                active
                  ? 'bg-[#E8EFE6] font-semibold text-sage-700'
                  : 'text-ink-600 hover:bg-surface-hover hover:text-ink-700'
              }`}
            >
              <Icon className={`h-[18px] w-[18px] ${active ? 'text-sage-500' : 'text-ink-400'}`} />
              <span>{item.label}</span>
              {item.badge && (
                <span
                  className={`ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    item.badge === 'AI'
                      ? 'bg-calm-sage text-white'
                      : item.badge === 'Premium'
                        ? 'bg-warm-terracotta/15 text-warm-terracotta'
                        : 'bg-calm-sage/15 text-calm-sage'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-charcoal">
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="mx-auto flex w-full max-w-[1600px]">
        <aside
          className={`fixed left-0 top-0 z-50 flex h-full w-64 flex-col border-r border-calm-sage/15 bg-[#F5F3F0] transition-transform duration-300 lg:sticky lg:z-20 lg:translate-x-0 ${
            mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex h-16 items-center justify-between border-b border-calm-sage/15 px-5">
            <Link to="/patient/dashboard" className="inline-flex items-center gap-2 font-display text-lg font-bold text-sage-800">
              <img
                src="/Untitled.png"
                alt="MANAS360 logo"
                className="h-8 w-8 rounded-lg object-cover"
              />
              MANAS360
            </Link>

            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-charcoal/60 hover:bg-calm-sage/10 lg:hidden"
              onClick={() => setMobileSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label="Patient dashboard navigation">
            {renderNavSection('Main', mainNavItems)}
            {renderNavSection('Wellness Tools', wellnessNavItems)}
            {renderNavSection('Support', supportNavItems)}
          </nav>

          <div className="border-t border-calm-sage/15 p-4">
            <div className="flex items-center gap-3 rounded-xl bg-white/80 p-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-warm-terracotta/25 text-xs font-semibold text-warm-terracotta">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-charcoal">{userName}</p>
                <p className="text-[11px] text-charcoal/55">Patient Account</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="mt-2 inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl border border-calm-sage/20 bg-white px-3 text-sm font-medium text-charcoal/80 transition hover:bg-calm-sage/10"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </aside>

        <div className="flex min-h-screen w-full flex-1 flex-col lg:ml-0">
          <header className="sticky top-0 z-30 flex h-16 items-center border-b border-ink-100 bg-white/80 px-3 backdrop-blur-lg sm:px-4 lg:px-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-charcoal/70 hover:bg-calm-sage/10 lg:hidden"
                onClick={() => setMobileSidebarOpen(true)}
                aria-label="Open sidebar"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-2">
                <p className="font-display text-lg font-bold leading-none text-ink-800">Dashboard</p>
                <p className="-mt-0.5 hidden text-[11px] leading-none text-ink-400 sm:block">{todayLabel}</p>
              </div>
            </div>

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/crisis')}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100"
                >
                  <LifeBuoy className="h-4 w-4" />
                  <span className="hidden sm:inline">Crisis Support</span>
                  <span className="sm:hidden">🆘</span>
                </button>

                <Link
                  to="/patient/notifications"
                  className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 transition hover:bg-ink-50"
                  aria-label="Open notifications"
                >
                  <Bell className="h-4 w-4" />
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />
                </Link>

                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-charcoal/60 transition hover:bg-calm-sage/10"
                  aria-label="Logout"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setProfileMenuOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg p-1 pr-2 transition hover:bg-calm-sage/10"
                  aria-label="Open profile menu"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-warm-terracotta/25 text-xs font-semibold text-warm-terracotta">
                    {initials}
                  </div>
                </button>
            </div>
          </header>

          <main className="w-full flex-1 px-3 py-4 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
            <Outlet />
          </main>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-calm-sage/20 bg-[#FAFAF8]/98 px-2 py-1.5 lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`inline-flex min-h-[46px] flex-col items-center justify-center rounded-lg px-1 text-[10px] font-medium ${
                  active ? 'bg-calm-sage/20 text-charcoal' : 'text-charcoal/70'
                }`}
              >
                <Icon className="mb-0.5 h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {profileMenuOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-start justify-end bg-charcoal/20 p-3 pt-16 backdrop-blur-sm sm:p-4 sm:pt-20"
          onClick={() => setProfileMenuOpen(false)}
        >
          <div
            className="w-full max-w-xs rounded-2xl border border-calm-sage/20 bg-[#F5F3F0]/95 p-3 shadow-soft-sm"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Profile menu"
          >
            <div className="mb-2 flex items-center gap-3 rounded-xl bg-white/85 px-3 py-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-warm-terracotta/25 text-xs font-semibold text-warm-terracotta">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-charcoal">{userName}</p>
                <p className="text-[11px] text-charcoal/55">Patient Account</p>
              </div>
            </div>

            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen(false);
                  navigate('/patient/profile');
                }}
                className="flex min-h-[42px] w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-charcoal/80 transition hover:bg-calm-sage/10 hover:text-charcoal"
              >
                <User className="h-[18px] w-[18px] text-charcoal/50" />
                <span>My Profile</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen(false);
                  navigate('/patient/settings');
                }}
                className="flex min-h-[42px] w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-charcoal/80 transition hover:bg-calm-sage/10 hover:text-charcoal"
              >
                <Settings2 className="h-[18px] w-[18px] text-charcoal/50" />
                <span>Settings</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen(false);
                  navigate('/patient/support');
                }}
                className="flex min-h-[42px] w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-charcoal/80 transition hover:bg-calm-sage/10 hover:text-charcoal"
              >
                <LifeBuoy className="h-[18px] w-[18px] text-charcoal/50" />
                <span>Help & Support</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen(false);
                  void handleLogout();
                }}
                className="flex min-h-[42px] w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-charcoal/80 transition hover:bg-calm-sage/10 hover:text-charcoal"
              >
                <LogOut className="h-[18px] w-[18px] text-charcoal/50" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
