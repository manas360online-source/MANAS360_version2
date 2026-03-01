import React, { useState } from 'react';
import { PhoneCall, Bot, HeartPulse, ChevronRight, ChevronLeft } from 'lucide-react';

const quickItems = [
  { icon: PhoneCall, label: 'IVR', ariaLabel: 'IVR quick access' },
  { icon: Bot, label: 'Dr. Meera', ariaLabel: 'Dr. Meera AI quick access' },
  { icon: HeartPulse, label: 'Buddy', ariaLabel: 'Support buddy quick access' },
];

export const QuickAccessRail: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <aside
      className="fixed left-3 top-1/2 z-40 hidden -translate-y-1/2 md:block"
      aria-label="Quick access rail"
    >
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="absolute -right-4 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-calm-sage/20 bg-charcoal text-cream shadow-soft-xs transition duration-300 hover:bg-charcoal/85"
          aria-label={isOpen ? 'Hide quick access' : 'Show quick access'}
          aria-expanded={isOpen}
        >
          {isOpen ? (
            <ChevronLeft className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>

        {isOpen ? (
          <div className="flex flex-col gap-1.5 rounded-xl border border-calm-sage/20 bg-charcoal/95 p-1.5 shadow-soft-md backdrop-blur-sm">
            {quickItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-lg px-2.5 text-xs font-medium text-cream transition duration-200 hover:bg-cream/10"
                  aria-label={item.ariaLabel}
                >
                  <Icon className="h-4 w-4 text-calm-sage" strokeWidth={1.8} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-calm-sage/20 bg-charcoal/95 px-2.5 text-xs font-medium text-cream shadow-soft-xs backdrop-blur-sm"
            aria-label="Show quick access"
          >
            <HeartPulse className="h-4 w-4 text-calm-sage" strokeWidth={1.8} />
          </button>
        )}
      </div>
    </aside>
  );
};

export default QuickAccessRail;
