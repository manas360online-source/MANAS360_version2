import React from 'react';

const steps = [
  {
    number: 1,
    title: 'Tell Us How You Feel',
    description:
      'Answer 3 simple questions about what you\'re experiencing. It takes just 60 seconds. No medical jargon.',
  },
  {
    number: 2,
    title: 'Get Clarity',
    description:
      'We\'ll help you understand what you\'re going through. Depression? Anxiety? Something else? We\'ll figure it out together.',
  },
  {
    number: 3,
    title: 'Connect with Help',
    description:
      'We\'ll match you with a therapist who specializes in exactly what you need. Book your first session at ₹500.',
  },
];

export const HowItWorks: React.FC = () => {
  return (
    <section className="py-12 md:py-16" aria-labelledby="how-title">
      <h2 id="how-title" className="text-center font-serif text-3xl font-light text-charcoal md:text-5xl">
        Here's What Happens Next
      </h2>

      <div className="mt-8 grid grid-cols-1 gap-6 md:mt-10 md:grid-cols-3">
        {steps.map((step) => (
          <article
            key={step.number}
            className="rounded-[30px] border border-calm-sage/15 bg-cream p-8 shadow-soft-sm transition duration-300 hover:-translate-y-1"
          >
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-calm text-lg font-semibold text-white">
              {step.number}
            </div>
            <h3 className="text-center text-xl font-semibold text-charcoal">{step.title}</h3>
            <p className="mt-3 text-center text-base leading-relaxed text-charcoal/80">{step.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
};

export default HowItWorks;
