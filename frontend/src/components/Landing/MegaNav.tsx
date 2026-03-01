import React, { useEffect, useMemo, useRef, useState } from 'react';
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

  return (
    <div ref={rootRef} className="relative" onMouseLeave={handleDesktopLeave}>
      <nav className={`hidden items-center justify-between gap-1 border-t px-1 pt-1 md:flex ${isLight ? 'border-calm-sage/25' : 'border-calm-sage/30'}`} aria-label="Mega navigation tabs">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.label;

          return (
            <button
              key={tab.label}
              type="button"
              onMouseEnter={() => handleDesktopEnter(tab.label)}
              onFocus={() => handleDesktopEnter(tab.label)}
              onClick={() => setActiveTab(isActive ? null : tab.label)}
              className={`min-h-[36px] flex-1 whitespace-nowrap rounded-t-md px-2 py-1 text-xs font-semibold transition-all duration-[250ms] ease-out ${
                isActive
                  ? isLight
                    ? 'border-b-2 border-calm-sage bg-white text-charcoal'
                    : 'border-b-2 border-calm-sage bg-charcoal/80 text-cream'
                  : isLight
                    ? 'border-b-2 border-transparent text-charcoal hover:bg-white/75'
                    : 'border-b-2 border-transparent text-cream hover:bg-charcoal/65'
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

      <div className="mt-2 max-h-[calc(100vh-170px)] space-y-2 overflow-y-auto pr-1 md:hidden" aria-label="Mobile mega navigation accordion">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.label;

          return (
            <section key={tab.label} className={`rounded-xl border px-2 py-1 ${isLight ? 'border-calm-sage/30 bg-white/95' : 'border-calm-sage/35 bg-charcoal/92'}`}>
              <button
                type="button"
                onClick={() => setActiveTab(isActive ? null : tab.label)}
                className={`flex min-h-[44px] w-full items-center justify-between rounded-lg px-3 text-left text-sm font-semibold transition-all duration-[250ms] ease-out ${
                  isActive
                    ? isLight
                      ? 'bg-cream border-b-2 border-calm-sage text-charcoal'
                      : 'bg-charcoal border-b-2 border-calm-sage text-cream'
                    : isLight
                      ? 'text-charcoal hover:bg-cream/80'
                      : 'text-cream hover:bg-charcoal/75'
                }`}
                aria-expanded={isActive}
                aria-controls={`mobile-panel-${tab.label}`}
              >
                <span>{tab.label}</span>
                <span aria-hidden="true" className={`transition-transform duration-[250ms] ${isActive ? 'rotate-180' : ''}`}>
                  ▾
                </span>
              </button>

              <div
                id={`mobile-panel-${tab.label}`}
                className={`overflow-hidden transition-all duration-[250ms] ease-out ${
                  isActive ? 'max-h-[1200px] opacity-100 py-2' : 'max-h-0 opacity-0'
                }`}
              >
                <MegaPanel items={tab.items} onNavigate={() => setActiveTab(null)} mobile tone={tone} />
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};

export default MegaNav;
