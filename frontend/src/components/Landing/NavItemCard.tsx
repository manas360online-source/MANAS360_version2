import React from 'react';
import { Link } from 'react-router-dom';

interface NavItemCardProps {
  icon: string;
  title: string;
  description: string;
  route: string;
  onNavigate?: () => void;
  tone?: 'dark' | 'light';
}

export const NavItemCard: React.FC<NavItemCardProps> = ({
  icon,
  title,
  description,
  route,
  onNavigate,
  tone = 'dark',
}) => {
  const isLight = tone === 'light';

  return (
    <Link
      to={route}
      onClick={onNavigate}
      className={`group flex min-h-[64px] items-start gap-2 rounded-md border p-2 transition-all duration-[250ms] ease-out focus:outline-none focus:ring-2 focus:ring-gentle-blue/60 ${
        isLight
          ? 'border-calm-sage/20 bg-white/95 hover:bg-white'
          : 'border-calm-sage/25 bg-charcoal/80 hover:bg-charcoal/70'
      }`}
    >
      <span
        aria-hidden="true"
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border text-sm ${
          isLight
            ? 'border-calm-sage/25 bg-cream'
            : 'border-calm-sage/30 bg-charcoal'
        }`}
      >
        {icon}
      </span>
      <span className="flex flex-col text-left">
        <span className={`text-xs font-semibold leading-tight ${isLight ? 'text-charcoal' : 'text-cream'}`}>{title}</span>
        <span className={`mt-0.5 text-[11px] leading-snug ${isLight ? 'text-charcoal/70' : 'text-cream/70'}`}>{description}</span>
      </span>
    </Link>
  );
};

export default NavItemCard;
