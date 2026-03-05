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
  desktopGridClass?: 'grid-cols-3' | 'grid-cols-4' | 'grid-cols-5' | 'grid-cols-6';
  fullBleedDesktop?: boolean;
}

export const MegaPanel: React.FC<MegaPanelProps> = ({
  items,
  onNavigate,
  mobile = false,
  tone = 'dark',
  desktopGridClass = 'grid-cols-4',
  fullBleedDesktop = false,
}) => {
  const isLight = tone === 'light';

  return (
    <div
      className={`w-full ${isLight ? 'bg-cream' : 'bg-[#075869]'} ${
        mobile
          ? 'rounded-lg p-2 shadow-soft-sm'
          : fullBleedDesktop
            ? 'rounded-none border-y border-t-0 px-4 py-3 shadow-soft-sm md:px-6 lg:px-10'
            : 'rounded-b-xl border-t-0 p-3 shadow-soft-sm'
      } ${
        isLight ? 'border border-calm-sage/25' : 'border border-calm-sage/30'
      }`}
    >
      <ul className={`grid ${mobile ? 'grid-cols-1' : desktopGridClass} gap-x-3 gap-y-1.5`}>
        {items.map((item, index) => (
          <li key={`${item.route}-${item.title}-${index}`}>
            <Link
              to={item.route}
              onClick={onNavigate}
              className={`group flex items-start gap-2 rounded-md border border-transparent px-1.5 py-1.5 text-left transition-all duration-[200ms] focus:outline-none focus:ring-2 focus:ring-gentle-blue/60 ${
                isLight
                  ? 'hover:border-gentle-blue/45 hover:bg-white/80 hover:shadow-[0_0_14px_rgba(157,173,190,0.18)]'
                  : 'hover:border-gentle-blue/45 hover:bg-[#0C7C8A]/25 hover:shadow-[inset_0_-2px_0_rgba(157,173,190,0.7),0_0_12px_rgba(157,173,190,0.15)]'
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
