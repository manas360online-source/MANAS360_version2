import React from 'react';
import { MessageCircle, Brain, CalendarCheck } from 'lucide-react';

const steps = [
  {
    number: 1,
    icon: MessageCircle,
    title: 'Tell Us How You Feel',
    description:
      'Answer a few simple questions about what you\'re experiencing. It takes just 60 seconds — no clinical jargon, just honest conversation.',
  },
  {
    number: 2,
    icon: Brain,
    title: 'Get Personalized Clarity',
    description:
      'Receive an evidence-based snapshot of your emotional wellbeing. Understand whether it\'s anxiety, depression, stress, or something else entirely.',
  },
  {
    number: 3,
    icon: CalendarCheck,
    title: 'Connect with Your Therapist',
    description:
      'We\'ll match you with a licensed therapist who specializes in exactly what you need. Book your first session starting at just ₹500.',
  },
];

export const HowItWorks: React.FC = () => {
  return (
    <section className="py-16 md:py-20" aria-labelledby="how-title">
      <div className="mx-auto max-w-2xl text-center">
        <span className="mb-3 inline-block text-sm font-semibold uppercase tracking-widest text-calm-sage">
          How It Works
        </span>
        <h2
          id="how-title"
          className="font-serif text-3xl font-light text-charcoal md:text-4xl lg:text-5xl"
        >
          Three steps to feeling better
        </h2>
        <p className="mt-3 text-base text-charcoal/60">
          No signup walls. No waiting rooms. Start healing today.
        </p>
      </div>

      <div className="relative mt-12 grid grid-cols-1 gap-8 md:mt-14 md:grid-cols-3 md:gap-6">
        {/* Connector line (desktop only) */}
        <div
          aria-hidden="true"
          className="absolute left-[16.67%] right-[16.67%] top-12 hidden h-[2px] bg-gradient-to-r from-calm-sage/30 via-gentle-blue/30 to-calm-sage/30 md:block"
        />

        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <article
              key={step.number}
              className="relative rounded-2xl border border-calm-sage/10 bg-white/90 p-8 text-center shadow-soft-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-soft-md"
            >
              {/* Number badge */}
              <div className="relative mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-calm text-white shadow-soft-sm">
                <Icon className="h-6 w-6" strokeWidth={1.8} />
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-charcoal text-[10px] font-bold text-cream">
                  {step.number}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-charcoal">
                {step.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-charcoal/70">
                {step.description}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default HowItWorks;
