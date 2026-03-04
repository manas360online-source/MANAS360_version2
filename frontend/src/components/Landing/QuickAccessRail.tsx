import React from 'react';
import { useNavigate } from 'react-router-dom';

type QuickItem = {
  key: string;
  emoji: string;
  label: string;
  subtitle: string;
  ariaLabel: string;
  route?: string;
  badge?: string;
  tone?: 'purple' | 'rose' | 'teal' | 'orange' | 'blue' | 'green' | 'gold';
};

const quickGroups: { title: string; items: QuickItem[] }[] = [
  {
    title: 'PREMIUM THERAPY',
    items: [
      {
        key: 'video-therapy',
        emoji: '🎥',
        label: '1:1 Video Therapy',
        subtitle: 'Private sessions with verified therapists',
        ariaLabel: '1:1 video therapy quick access',
        tone: 'purple',
      },
      {
        key: 'meera',
        emoji: '👩‍⚕️',
        label: 'Dr. Meera AI',
        subtitle: 'AR therapy guide, 24/7 available',
        ariaLabel: 'Dr. Meera quick access',
        route: '/ai-chat',
        badge: 'AI',
        tone: 'rose',
      },
      {
        key: 'sound-healing',
        emoji: '🎵',
        label: 'Sound Healing',
        subtitle: 'Sleep, calm, focus — curated tracks',
        ariaLabel: 'Sound healing quick access',
        tone: 'teal',
      },
    ],
  },
  {
    title: 'RELATIONSHIPS',
    items: [
      {
        key: 'couples-therapy',
        emoji: '💑',
        label: 'Couples Therapy',
        subtitle: 'Reignite your connection together',
        ariaLabel: 'Couples therapy quick access',
        tone: 'rose',
      },
      {
        key: 'family-plan',
        emoji: '👨‍👩‍👧‍👦',
        label: 'Family Plan',
        subtitle: 'Care for 2–5 family members',
        ariaLabel: 'Family plan quick access',
        tone: 'orange',
      },
    ],
  },
  {
    title: 'SELF-HELP',
    items: [
      {
        key: 'nlp-coaching',
        emoji: '🧠',
        label: 'NLP Coaching',
        subtitle: 'Neuro-linguistic techniques for growth',
        ariaLabel: 'NLP coaching quick access',
        tone: 'purple',
      },
      {
        key: 'mood-analytics',
        emoji: '📊',
        label: 'Mood Analytics',
        subtitle: 'Track patterns, predict wellbeing',
        ariaLabel: 'Mood analytics quick access',
        badge: 'NEW',
        tone: 'blue',
      },
      {
        key: 'guided-journaling',
        emoji: '📝',
        label: 'Guided Journaling',
        subtitle: 'Daily prompts for self-reflection',
        ariaLabel: 'Guided journaling quick access',
        tone: 'green',
      },
      {
        key: 'sound',
        emoji: '🏔️',
        label: 'Wellness Retreats',
        subtitle: 'Rishikesh · Coorg · Goa',
        ariaLabel: 'Wellness retreats quick access',
        tone: 'gold',
      },
    ],
  },
];

const toneClassMap: Record<NonNullable<QuickItem['tone']>, string> = {
  purple: 'bg-violet-100 text-violet-700',
  rose: 'bg-rose-100 text-rose-700',
  teal: 'bg-teal-100 text-teal-700',
  orange: 'bg-orange-100 text-orange-700',
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-emerald-100 text-emerald-700',
  gold: 'bg-amber-100 text-amber-700',
};

export const QuickAccessRail: React.FC = () => {
  const navigate = useNavigate();

  return (
    <aside
      className="fixed left-0 top-1/2 z-[60] hidden -translate-y-1/2 md:block"
      aria-label="Quick access rail"
    >
      <div className="group w-14 overflow-hidden rounded-r-2xl border border-l-0 border-calm-sage/30 bg-[#F0FBFD]/95 py-2 shadow-soft-md backdrop-blur-sm transition-all duration-300 hover:w-56">
        {quickGroups.map((group, groupIndex) => (
          <div key={group.title} className="px-1.5">
            <p className="mb-1 mt-1 hidden truncate px-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-charcoal/65 group-hover:block">
              {group.title}
            </p>

            {group.items.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  if (item.route) navigate(item.route);
                }}
                className="relative inline-flex min-h-[42px] w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-charcoal transition duration-200 hover:bg-white/70"
                aria-label={item.ariaLabel}
                title={item.label}
              >
                {item.badge && (
                  <span className="absolute left-7 top-1 rounded bg-rose-500/90 px-1.5 py-0.5 text-[9px] font-semibold leading-none text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    {item.badge}
                  </span>
                )}

                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-base ${item.tone ? toneClassMap[item.tone] : 'bg-cream/10'}`}
                  aria-hidden="true"
                >
                  {item.emoji}
                </span>

                <span className="hidden min-w-0 group-hover:block">
                  <span className="block truncate text-xs font-semibold leading-4">{item.label}</span>
                  <span className="block truncate text-[10px] leading-4 text-charcoal/60">{item.subtitle}</span>
                </span>
              </button>
            ))}

            {groupIndex < quickGroups.length - 1 && (
              <div className="mx-2 my-1 h-px bg-calm-sage/20" aria-hidden="true" />
            )}
          </div>
        ))}
      </div>
    </aside>
  );
};

export default QuickAccessRail;
