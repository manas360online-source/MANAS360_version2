import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { MegaPanel, MegaNavOption } from './MegaPanel';

type TabLabel =
  | 'I Need Support'
  | 'AI & Self-Help'
  | 'For Relationships'
  | 'For Professionals'
  | 'Learn & Grow';

interface TabConfig {
  label: TabLabel;
  items: MegaNavOption[];
}

interface MegaNavProps {
  tone?: 'dark' | 'light';
}

const tabs: TabConfig[] = [
  {
    label: 'I Need Support',
    items: [
      { icon: '🩺', title: 'Quick Check-In', description: 'Start with a brief guided check-in', route: '/checkin' },
      { icon: '🧠', title: 'Find a Therapist', description: 'Browse and connect with therapists', route: '/therapists' },
      { icon: '💊', title: 'See a Psychiatrist', description: 'Medical consultation options', route: '/psychiatry' },
      { icon: '🌱', title: 'Specialized Care', description: 'Focused support pathways', route: '/specialized' },
      { icon: '👥', title: 'Group Sessions', description: 'Shared support and healing groups', route: '/groups' },
      { icon: '🚨', title: 'Crisis Support', description: 'Immediate urgent support options', route: '/crisis' },
    ],
  },
  {
    label: 'AI & Self-Help',
    items: [
      { icon: '🤖', title: 'AI Room', description: 'Private AI-led support space', route: '/ai-room' },
      { icon: '🧕', title: 'Dr Meera AI', description: 'Guidance from Dr Meera AI', route: '/dr-meera' },
      { icon: '💬', title: 'Anytime Buddy', description: '24/7 companion support', route: '/buddy' },
      { icon: '🫧', title: 'Vent Buddy', description: 'A safe place to express feelings', route: '/vent' },
      { icon: '📞', title: 'Call & Talk', description: 'Voice support when needed', route: '/call' },
      { icon: '🎵', title: 'Sound Therapy', description: 'Calm sound-based relaxation', route: '/sound' },
      { icon: '📈', title: 'Mood Tracker', description: 'Track emotional trends daily', route: '/mood' },
      { icon: '🐾', title: 'Digital Pet', description: 'Gentle habit companion', route: '/pet' },
    ],
  },
  {
    label: 'For Relationships',
    items: [
      { icon: '💞', title: 'Couples', description: 'Support for partners', route: '/couples' },
      { icon: '🧑‍🍼', title: 'Concerned Parent', description: 'Guidance for caregivers', route: '/parent' },
      { icon: '🏠', title: 'Family Plan', description: 'Wellness support for families', route: '/family' },
      { icon: '🎓', title: 'Teen & Student', description: 'Support for young minds', route: '/teen' },
    ],
  },
  {
    label: 'For Professionals',
    items: [
      { icon: '🏢', title: 'Corporate Wellness', description: 'Employee mental wellness programs', route: '/corporate' },
      { icon: '🏫', title: 'Education Partner', description: 'Campus and school wellbeing solutions', route: '/education' },
      { icon: '🏥', title: 'Healthcare Partner', description: 'Clinical collaboration models', route: '/healthcare' },
      { icon: '🛡️', title: 'Insurance Partner', description: 'Integrated care partnerships', route: '/insurance' },
      { icon: '🏛️', title: 'Government Agency', description: 'Public mental health initiatives', route: '/gov' },
    ],
  },
  {
    label: 'Learn & Grow',
    items: [
      { icon: '📜', title: 'Certification Hub', description: 'Professional credential pathways', route: '/certifications' },
      { icon: '🧑‍⚕️', title: 'Join as Therapist', description: 'Become part of the MANAS360 network', route: '/join' },
      { icon: '📚', title: 'Psychoeducation', description: 'Learn practical wellbeing skills', route: '/learn' },
      { icon: '🏞️', title: 'Wellness Retreats', description: 'Restorative retreat experiences', route: '/retreats' },
      { icon: '🛍️', title: 'Wellness Shop', description: 'Tools and resources for wellbeing', route: '/shop' },
    ],
  },
];

export const MegaNav: React.FC<MegaNavProps> = ({ tone = 'dark' }) => {
  const [activeTab, setActiveTab] = useState<TabLabel | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);

  const activeItems = useMemo(
    () => tabs.find((tab) => tab.label === activeTab)?.items ?? [],
    [activeTab]
  );

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setActiveTab(null);
      }
    };

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveTab(null);
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEsc);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleDesktopEnter = (tab: TabLabel) => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setActiveTab(tab);
  };

  const handleDesktopLeave = () => {
    closeTimerRef.current = window.setTimeout(() => {
      setActiveTab(null);
    }, 120);
  };

  const isLight = tone === 'light';
  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <div ref={rootRef} className="relative" onMouseLeave={handleDesktopLeave}>
      <nav className={`mt-2 hidden items-center justify-between gap-0.5 border-t px-0.5 pt-1.5 md:flex ${isLight ? 'border-calm-sage/12' : 'border-cream/10'}`} aria-label="Mega navigation tabs">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.label;

          return (
            <button
              key={tab.label}
              type="button"
              onMouseEnter={() => handleDesktopEnter(tab.label)}
              onFocus={() => handleDesktopEnter(tab.label)}
              onClick={() => setActiveTab(isActive ? null : tab.label)}
              className={`min-h-[36px] flex-1 whitespace-nowrap rounded-md px-2.5 py-1.5 text-[13px] font-medium tracking-wide transition-all duration-[250ms] ease-out ${
                isActive
                  ? isLight
                    ? 'bg-calm-sage/10 text-charcoal'
                    : 'bg-cream/10 text-cream'
                  : isLight
                    ? 'text-charcoal/70 hover:bg-calm-sage/5 hover:text-charcoal'
                    : 'text-cream/70 hover:bg-cream/5 hover:text-cream'
              }`}
              aria-expanded={isActive}
              aria-controls={`panel-${tab.label}`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      <div
        onMouseEnter={() => {
          if (closeTimerRef.current) {
            window.clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
          }
        }}
        className={`absolute left-1/2 top-full z-40 hidden w-screen -translate-x-1/2 px-2 pt-1 transition-all duration-[250ms] ease-out md:block ${
          activeTab ? 'pointer-events-auto opacity-100 translate-y-0' : 'pointer-events-none opacity-0 -translate-y-2'
        }`}
      >
        {activeTab ? (
          <div id={`panel-${activeTab}`} className="mx-auto w-full max-w-5xl">
            <MegaPanel items={activeItems} onNavigate={() => setActiveTab(null)} tone={tone} />
          </div>
        ) : null}
      </div>

      <div className="mt-2 flex justify-start md:hidden">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className={`inline-flex min-h-[36px] items-center rounded-md border px-2.5 py-1 transition-all duration-[250ms] ease-out ${
            isLight
              ? 'border-calm-sage/35 bg-white/95 text-charcoal hover:bg-cream'
              : 'border-calm-sage/35 bg-charcoal/92 text-cream hover:bg-charcoal/75'
          }`}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-left-drawer"
          aria-label="Open sidebar menu"
        >
          <span aria-hidden="true" className="inline-flex h-4 w-4 flex-col justify-between">
            <span className={`h-0.5 w-4 rounded ${isLight ? 'bg-charcoal' : 'bg-cream'}`} />
            <span className={`h-0.5 w-4 rounded ${isLight ? 'bg-charcoal' : 'bg-cream'}`} />
            <span className={`h-0.5 w-4 rounded ${isLight ? 'bg-charcoal' : 'bg-cream'}`} />
          </span>
        </button>
      </div>

      {/* Portal: render mobile drawer at document.body so it escapes the header stacking context */}
      {createPortal(
        <div
          id="mobile-left-drawer"
          className={`fixed inset-0 z-[9999] transition-opacity duration-300 md:hidden ${
            mobileMenuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
          }`}
          aria-label="Mobile mega navigation sidebar"
        >
          <div
            className="absolute inset-0 z-0 bg-charcoal/40 backdrop-blur-[2px]"
            onClick={closeMobileMenu}
            aria-hidden="true"
          />

          <aside
            className={`absolute inset-y-0 left-0 z-10 w-[85%] max-w-sm overflow-y-auto border-r border-calm-sage/15 px-3 pb-6 pt-4 shadow-soft-lg transition-transform duration-300 ease-out will-change-transform ${
              isLight ? 'bg-cream' : 'bg-charcoal'
            } ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
            onClick={(event) => event.stopPropagation()}
            aria-modal="true"
            role="dialog"
          >
              <div className="mb-4 flex items-center justify-between">
                <span className={`font-serif text-lg font-light ${isLight ? 'text-charcoal' : 'text-cream'}`}>
                  MANAS<span className="font-semibold">360</span>
                </span>
                <button
                  type="button"
                  onClick={closeMobileMenu}
                  className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-200 ${
                    isLight ? 'text-charcoal/60 hover:bg-charcoal/5 hover:text-charcoal' : 'text-cream/60 hover:bg-cream/10 hover:text-cream'
                  }`}
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {tabs.map((tab) => (
                  <section key={tab.label}>
                    <h3 className={`mb-1.5 px-1 text-[11px] font-bold uppercase tracking-widest ${
                      isLight ? 'text-charcoal/40' : 'text-cream/40'
                    }`}>
                      {tab.label}
                    </h3>
                    <MegaPanel items={tab.items} onNavigate={closeMobileMenu} mobile tone={tone} />
                  </section>
                ))}
              </div>
          </aside>
        </div>,
        document.body,
      )}
    </div>
  );
};

export default MegaNav;
