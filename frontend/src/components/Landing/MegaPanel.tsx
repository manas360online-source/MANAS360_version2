import React from 'react';
import { Link } from 'react-router-dom';

export interface MegaNavOption {
  icon: string;
  title: string;
  description: string;
  route: string;
}

interface MegaPanelProps {
  items: MegaNavOption[];
  onNavigate?: () => void;
  mobile?: boolean;
  tone?: 'dark' | 'light';
}

export const MegaPanel: React.FC<MegaPanelProps> = ({ items, onNavigate, mobile = false, tone = 'dark' }) => {
  const isLight = tone === 'light';

  return (
    <div
      className={`w-full ${isLight ? 'bg-cream' : 'bg-charcoal/96'} ${
        mobile
          ? 'rounded-lg p-2 shadow-soft-sm'
          : 'rounded-b-xl border-t-0 p-3 shadow-soft-sm'
      } ${
        isLight ? 'border border-calm-sage/25' : 'border border-calm-sage/30'
      }`}
    >
      <ul className={`grid ${mobile ? 'grid-cols-1' : 'grid-cols-4'} gap-x-3 gap-y-1.5`}>
        {items.map((item) => (
          <li key={item.route}>
            <Link
              to={item.route}
              onClick={onNavigate}
              className={`group flex items-start gap-2 rounded-md px-1.5 py-1.5 text-left transition-colors duration-[200ms] focus:outline-none focus:ring-2 focus:ring-gentle-blue/60 ${
                isLight ? 'hover:bg-white/80' : 'hover:bg-charcoal/80'
              }`}
            >
              <span
                aria-hidden="true"
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-sm text-xs leading-none ${
                  isLight ? 'bg-calm-sage/15 text-charcoal/80' : 'bg-calm-sage/20 text-cream/85'
                }`}
              >
                {item.icon}
              </span>
              <span className="min-w-0">
                <span className={`block text-xs font-semibold leading-tight ${isLight ? 'text-charcoal' : 'text-cream'}`}>{item.title}</span>
                <span className={`block truncate text-[11px] leading-snug ${isLight ? 'text-charcoal/65' : 'text-cream/65'}`}>{item.description}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MegaPanel;
