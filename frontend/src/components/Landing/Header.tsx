import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MegaNav } from './MegaNav';

export const Header: React.FC = () => {
  const [isAfterHero, setIsAfterHero] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const threshold = window.innerHeight * 0.72;
      setIsAfterHero(window.scrollY > threshold);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-0 pt-0 md:px-6 md:pt-4" role="banner">
      <div
        className={`mx-auto w-full max-w-6xl rounded-none p-2.5 shadow-soft-md backdrop-blur-sm transition-all duration-300 md:rounded-2xl md:px-4 ${
          isAfterHero
            ? 'border-y border-calm-sage/25 bg-cream/95 md:border'
            : 'border-y border-calm-sage/30 bg-charcoal/92 md:border'
        }`}
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Link
            to="/"
            className={`inline-flex min-h-[44px] items-center rounded-lg px-4 text-xl font-light tracking-wider focus:ring-2 focus:ring-gentle-blue/70 focus:ring-offset-2 md:text-2xl ${
              isAfterHero ? 'text-charcoal focus:ring-offset-cream' : 'text-cream focus:ring-offset-charcoal'
            }`}
            aria-label="MANAS360 home"
          >
            <span className="font-serif">
              MANAS<span className="font-semibold">360</span>
            </span>
          </Link>

          <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-2">
            <div className="flex items-center justify-center gap-2">
              <button type="button" className={`min-h-[44px] rounded-lg border px-4 text-sm font-semibold transition duration-300 ${
                isAfterHero
                  ? 'border-calm-sage/40 bg-white text-charcoal hover:bg-cream'
                  : 'border-calm-sage/35 bg-charcoal text-cream hover:bg-charcoal/80'
              }`}>
                EN
              </button>
              <button type="button" className={`min-h-[44px] rounded-lg border px-4 text-sm font-semibold transition duration-300 ${
                isAfterHero
                  ? 'border-calm-sage/40 bg-white text-charcoal hover:bg-cream'
                  : 'border-calm-sage/35 bg-charcoal text-cream hover:bg-charcoal/80'
              }`}>
                हिंदी
              </button>
            </div>

            <button type="button" className={`min-h-[44px] rounded-lg border px-5 text-sm font-semibold transition duration-300 ${
              isAfterHero
                ? 'border-calm-sage/45 bg-white text-charcoal hover:bg-cream'
                : 'border-calm-sage/45 bg-charcoal text-cream hover:bg-charcoal/80'
            }`}>
              Subscribe
            </button>

            <button type="button" className="min-h-[44px] rounded-lg bg-gradient-calm px-6 text-sm font-semibold text-charcoal shadow-soft-sm transition duration-300 hover:opacity-95">
              Create/Login
            </button>
          </div>
        </div>

        <MegaNav tone={isAfterHero ? 'light' : 'dark'} />
      </div>
    </header>
  );
};

export default Header;
