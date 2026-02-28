import React from 'react';

type NavItem = {
  id: string;
  label: string;
  href?: string;
  icon?: React.ReactNode;
};

const items: NavItem[] = [
  { id: 'sessions', label: 'Sessions', href: '/therapist/sessions' },
  { id: 'calendar', label: 'Calendar', href: '/therapist/calendar' },
  { id: 'analytics', label: 'Analytics', href: '/therapist/analytics' },
  { id: 'settings', label: 'Settings', href: '/therapist/settings' },
];

type Props = {
  open: boolean;
  onClose: () => void;
};

const Sidebar: React.FC<Props> = ({ open, onClose }) => {
  const containerRef = React.useRef<HTMLElement | null>(null);

  // focus first focusable item when opening
  React.useEffect(() => {
    if (open && containerRef.current) {
      const focusable = containerRef.current.querySelector<HTMLElement>('a,button, [tabindex]:not([tabindex="-1"])');
      focusable?.focus();
    }
  }, [open]);

  // close on Escape
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <aside
      ref={containerRef as any}
      className={`fixed inset-y-0 left-0 z-40 w-64 md:static transform transition-transform duration-200 bg-white dark:bg-slate-800 border-r border-slate-100 dark:border-slate-700 ${
        open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}
      aria-hidden={!open}
      aria-label="Primary navigation"
      role="navigation"
    >
      <div className="h-full flex flex-col">
        <div className="px-4 py-5 border-b dark:border-slate-700">
          <div className="text-lg font-semibold">Therapist</div>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-auto" aria-label="Therapist sections">
          {items.map((it) => (
            <a
              key={it.id}
              href={it.href}
              onClick={onClose}
              className="block px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {it.label}
            </a>
          ))}
        </nav>
        <div className="p-4 border-t dark:border-slate-700">
          <button className="w-full px-3 py-2 rounded-md bg-slate-50 dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">Profile</button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
