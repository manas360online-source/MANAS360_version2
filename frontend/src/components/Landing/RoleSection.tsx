import React from 'react';

const roleItems = [
  {
    icon: '🫶',
    title: 'Tell Us How You Feel',
    description:
      'Answer 3 simple questions about what you\'re experiencing. It takes just 60 seconds. No medical jargon.',
  },
  {
    icon: '🧭',
    title: 'Get Clarity',
    description:
      'We\'ll help you understand what you\'re going through. Depression? Anxiety? Something else? We\'ll figure it out together.',
  },
  {
    icon: '🌿',
    title: 'Connect with Help',
    description:
      'We\'ll match you with a therapist who specializes in exactly what you need. Book your first session at ₹500.',
  },
  {
    icon: '⚡',
    title: '60 Second Check',
    description: 'Immediate guidance',
  },
];

export const RoleSection: React.FC = () => {
  return (
    <section className="py-12 md:py-16" aria-labelledby="role-title">
      <h2 id="role-title" className="text-center font-serif text-3xl font-light text-charcoal md:text-5xl">
        Connect with Help
      </h2>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 md:mt-10">
        {roleItems.map((item) => (
          <article
            key={`${item.title}-${item.description}`}
            className="rounded-[30px] border border-white/65 bg-cream/95 p-6 text-center shadow-soft-sm transition duration-300 hover:-translate-y-1"
          >
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-calm-sage/20 bg-white/85 text-xl">
              {item.icon}
            </div>
            <h3 className="text-xl font-semibold text-charcoal">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-charcoal/75">{item.description}</p>
            <a
              href="#"
              className="mt-4 inline-flex min-h-[44px] items-center rounded-full border border-calm-sage/35 px-4 text-sm font-medium text-charcoal transition duration-300 hover:-translate-y-0.5"
              onClick={(event) => event.preventDefault()}
            >
              {item.title}
            </a>
          </article>
        ))}
      </div>
    </section>
  );
};

export default RoleSection;
