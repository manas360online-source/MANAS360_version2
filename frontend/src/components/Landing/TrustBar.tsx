import React from 'react';
import { ShieldCheck, UserCheck, HeartHandshake, Timer } from 'lucide-react';

const trustItems = [
  {
    icon: ShieldCheck,
    label: '100% Confidential',
    color: 'text-calm-sage',
    bg: 'bg-calm-sage/10',
  },
  {
    icon: UserCheck,
    label: 'Licensed Therapists',
    color: 'text-gentle-blue',
    bg: 'bg-gentle-blue/10',
  },
  {
    icon: HeartHandshake,
    label: 'Zero Judgment',
    color: 'text-soft-lavender',
    bg: 'bg-soft-lavender/10',
  },
  {
    icon: Timer,
    label: '60-Second Check',
    color: 'text-accent-coral',
    bg: 'bg-accent-coral/10',
  },
];

export const TrustBar: React.FC = () => {
  return (
    <section className="py-4 md:py-6" aria-label="Trust indicators">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {trustItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="flex items-center gap-3 rounded-2xl border border-calm-sage/10 bg-white/80 px-4 py-4 shadow-soft-xs backdrop-blur-sm transition-shadow duration-300 hover:shadow-soft-sm"
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.bg}`}
              >
                <Icon className={`h-5 w-5 ${item.color}`} strokeWidth={1.8} />
              </div>
              <span className="text-sm font-semibold leading-tight text-charcoal">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default TrustBar;
