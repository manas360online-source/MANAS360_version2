import React from 'react';

const trustItems = [
  { icon: '🔒', title: '100%', description: 'Confidential' },
  { icon: '🧘', title: 'Licensed', description: 'Therapists' },
  { icon: '💙', title: 'No', description: 'Judgment' },
  { icon: '⚡', title: '60 Second', description: 'Check' },
];

export const TrustBar: React.FC = () => {
  return (
    <section className="py-6 md:py-8" aria-label="Trust indicators">
      <div className="rounded-[30px] border border-white/60 bg-white/70 p-5 shadow-soft-sm backdrop-blur-sm md:p-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
          {trustItems.map((item) => (
            <article
              key={`${item.title}-${item.description}`}
              className="rounded-3xl border border-white/60 bg-cream/75 p-4 text-center shadow-soft-xs"
            >
              <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full border border-calm-sage/20 bg-white/80 text-lg">
                {item.icon}
              </div>
              <h3 className="text-sm font-semibold text-charcoal">{item.title}</h3>
              <p className="text-xs text-charcoal/75">{item.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustBar;
