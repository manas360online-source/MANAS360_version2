import React, { useState } from 'react';

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
          className="absolute -right-4 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md border border-calm-sage/35 bg-charcoal text-cream shadow-soft-sm transition duration-300 hover:bg-charcoal/85"
          aria-label={isOpen ? 'Hide quick access' : 'Show quick access'}
          aria-expanded={isOpen}
        >
          <span className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>›</span>
        </button>

        {isOpen ? (
          <div className="flex flex-col gap-2 rounded-xl border border-calm-sage/35 bg-charcoal/95 p-2 shadow-soft-md">
            <button
              type="button"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg px-3 text-xs font-semibold text-cream transition duration-300 hover:bg-charcoal/80"
              aria-label="IVR quick access"
            >
              <span aria-hidden="true">📞</span>
              <span>IVR</span>
            </button>
            <button
              type="button"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg px-3 text-xs font-semibold text-cream transition duration-300 hover:bg-charcoal/80"
              aria-label="Dr. Meera quick access"
            >
              <span aria-hidden="true">👩‍⚕️</span>
              <span>Dr. Meera</span>
            </button>
            <button
              type="button"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg px-3 text-xs font-semibold text-cream transition duration-300 hover:bg-charcoal/80"
              aria-label="Budd quick access"
            >
              <span aria-hidden="true">🫂</span>
              <span>Budd</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-calm-sage/35 bg-charcoal/95 px-3 text-xs font-semibold text-cream shadow-soft-sm"
            aria-label="Show quick access"
          >
            <span aria-hidden="true">🫂</span>
            <span>Quick</span>
          </button>
        )}
      </div>
    </aside>
  );
};

export default QuickAccessRail;
