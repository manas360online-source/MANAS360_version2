import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
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
    <header className="fixed inset-x-0 top-0 z-50" role="banner">
      <div
        className={`w-full px-4 py-3 transition-all duration-500 md:px-6 lg:px-10 ${
          isAfterHero
            ? 'border-b border-calm-sage/15 bg-cream/97 shadow-soft-md backdrop-blur-md'
            : 'bg-charcoal/80 backdrop-blur-sm'
        }`}
      >
        {/* Top row: brand + actions */}
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link
            to="/"
            className={`group inline-flex items-center gap-2 rounded-lg px-1 py-1 text-lg font-light tracking-wide transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-gentle-blue/60 focus:ring-offset-2 md:text-xl lg:text-2xl ${
              isAfterHero
                ? 'text-charcoal focus:ring-offset-cream'
                : 'text-cream focus:ring-offset-charcoal'
            }`}
            aria-label="MANAS360 home"
          >
            <Sparkles
              className={`h-5 w-5 transition-colors duration-300 ${
                isAfterHero ? 'text-calm-sage' : 'text-calm-sage/80'
              }`}
            />
            <span className="font-serif">
              MANAS<span className="font-semibold">360</span>
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/subscribe"
              className={`hidden rounded-full px-4 py-2 text-xs font-medium tracking-wide transition-all duration-300 sm:inline-flex md:text-sm ${
                isAfterHero
                  ? 'text-charcoal/75 hover:text-charcoal'
                  : 'text-cream/75 hover:text-cream'
              }`}
            >
              Subscribe
            </Link>

            <Link
              to="/auth/login"
              className={`inline-flex min-h-[36px] items-center justify-center rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide transition-all duration-300 md:min-h-[40px] md:px-5 md:text-sm ${
                isAfterHero
                  ? 'bg-charcoal text-cream hover:bg-charcoal/90'
                  : 'bg-cream text-charcoal hover:bg-white'
              }`}
            >
              Login / Signup
            </Link>
          </div>
        </div>

        {/* Navigation */}
        <MegaNav tone={isAfterHero ? 'light' : 'dark'} />
      </div>
    </header>
  );
};

export default Header;
