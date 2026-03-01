import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Users, Briefcase, GraduationCap, ArrowRight } from 'lucide-react';

const roles = [
  {
    icon: Heart,
    title: 'For Individuals',
    description:
      'Get personalized support for anxiety, depression, stress, and more. AI-powered assessment with licensed therapist matching.',
    cta: 'Start Your Check',
    route: '/assessment',
    accent: 'text-accent-coral',
    bg: 'bg-accent-coral/8',
  },
  {
    icon: Users,
    title: 'For Couples & Families',
    description:
      'Strengthen your relationships with guided couples therapy and family counseling sessions — together or individually.',
    cta: 'Explore Plans',
    route: '/couples',
    accent: 'text-soft-lavender',
    bg: 'bg-soft-lavender/8',
  },
  {
    icon: Briefcase,
    title: 'For Organizations',
    description:
      'Employee wellness programs, campus mental health partnerships, and institutional mental health solutions at scale.',
    cta: 'Learn More',
    route: '/corporate',
    accent: 'text-calm-sage',
    bg: 'bg-calm-sage/8',
  },
  {
    icon: GraduationCap,
    title: 'For Therapists',
    description:
      'Join our network of 500+ licensed professionals. Access referral streams, AI-assisted tools, and certification programs.',
    cta: 'Join the Network',
    route: '/join',
    accent: 'text-gentle-blue',
    bg: 'bg-gentle-blue/8',
  },
];

export const RoleSection: React.FC = () => {
  return (
    <section className="py-16 md:py-20" aria-labelledby="role-title">
      <div className="mx-auto max-w-2xl text-center">
        <span className="mb-3 inline-block text-sm font-semibold uppercase tracking-widest text-calm-sage">
          Who It&rsquo;s For
        </span>
        <h2
          id="role-title"
          className="font-serif text-3xl font-light text-charcoal md:text-4xl lg:text-5xl"
        >
          Mental health support for everyone
        </h2>
        <p className="mt-3 text-base text-charcoal/60">
          Whether you&rsquo;re seeking help for yourself, your family, or your
          organization — we have a path for you.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 md:mt-14">
        {roles.map((role) => {
          const Icon = role.icon;
          return (
            <article
              key={role.title}
              className="group flex flex-col rounded-2xl border border-calm-sage/10 bg-white/90 p-6 shadow-soft-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-soft-md"
            >
              <div
                className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${role.bg}`}
              >
                <Icon
                  className={`h-5 w-5 ${role.accent}`}
                  strokeWidth={1.8}
                />
              </div>
              <h3 className="text-base font-semibold text-charcoal">
                {role.title}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-charcoal/65">
                {role.description}
              </p>
              <Link
                to={role.route}
                className={`mt-4 inline-flex items-center gap-1.5 text-sm font-semibold transition-colors duration-200 ${role.accent} group-hover:underline`}
              >
                {role.cta}
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default RoleSection;
