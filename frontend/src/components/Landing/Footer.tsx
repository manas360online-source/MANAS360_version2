import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Phone } from 'lucide-react';

export const Footer: React.FC = () => {
  const navigate = useNavigate();
  const crisisNumber = '1800-599-0019';

  const handleStartAssessment = () => {
    navigate('/assessment');
  };

  const footerLinks = {
    Platform: [
      { label: 'How It Works', to: '/#how' },
      { label: 'Find a Therapist', to: '/therapists' },
      { label: 'AI Room', to: '/ai-chat' },
      { label: 'Pricing', to: '/pricing' },
    ],
    Company: [
      { label: 'About Us', to: '/about' },
      { label: 'Careers', to: '/careers' },
      { label: 'Blog', to: '/blog' },
      { label: 'Contact', to: '/contact' },
    ],
    Legal: [
      { label: 'Privacy Policy', to: '/privacy' },
      { label: 'Terms of Service', to: '/terms' },
      { label: 'Refund Policy', to: '/refunds' },
    ],
  };

  return (
    <>
      <footer
        className="border-t border-calm-sage/10 bg-cream px-4 pb-28 pt-16 md:px-6 md:pt-20"
        aria-label="Footer"
      >
        <div className="mx-auto w-full max-w-6xl">
          {/* CTA Banner */}
          <div className="rounded-2xl border border-calm-sage/10 bg-white/90 p-8 text-center shadow-soft-sm md:p-12">
            <h2 className="font-serif text-3xl font-light text-charcoal md:text-4xl">
              Ready to feel{' '}
              <span className="bg-gradient-peaceful bg-clip-text font-semibold text-transparent">
                better
              </span>
              ?
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-charcoal/60">
              Take the first step — it only takes 60 seconds and it&rsquo;s
              completely free.
            </p>
            <div className="mt-6">
              <button
                onClick={handleStartAssessment}
                className="group inline-flex min-h-[44px] items-center gap-2 rounded-full bg-gradient-calm px-8 py-3 text-base font-semibold text-white shadow-soft-md transition-all duration-300 hover:scale-[1.03] hover:shadow-soft-lg"
                aria-label="Take the 60-second mental health assessment"
              >
                Take the 60-Second Check
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
            </div>
          </div>

          {/* Footer links grid */}
          <div className="mt-12 grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-6">
            {/* Brand column */}
            <div className="col-span-2 md:col-span-1">
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-lg font-light text-charcoal"
              >
                <img
                  src="/Untitled.png"
                  alt="MANAS360 logo"
                  className="h-5 w-5 rounded object-cover"
                />
                <span className="font-serif">
                  MANAS<span className="font-semibold">360</span>
                </span>
              </Link>
              <p className="mt-3 text-sm leading-relaxed text-charcoal/55">
                India&rsquo;s compassionate mental health platform — connecting
                you with licensed therapists and AI-powered support.
              </p>
            </div>

            {/* Link columns */}
            {Object.entries(footerLinks).map(([heading, links]) => (
              <div key={heading}>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-charcoal/40">
                  {heading}
                </h3>
                <ul className="space-y-2">
                  {links.map((link) => (
                    <li key={link.to}>
                      <Link
                        to={link.to}
                        className="text-sm text-charcoal/65 transition-colors duration-200 hover:text-charcoal"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-calm-sage/10 pt-6 text-xs text-charcoal/45 md:flex-row">
            <p>&copy; {new Date().getFullYear()} MANAS360. All rights reserved.</p>
            <p>Made with care in India</p>
          </div>
        </div>
      </footer>

      {/* Crisis strip */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-calm-sage/10 bg-cream/95 px-3 py-2 text-center shadow-soft-sm backdrop-blur-md md:py-2.5"
        role="region"
        aria-label="Crisis support information"
        aria-live="polite"
      >
        <div className="mx-auto flex max-w-4xl items-center justify-center gap-2 md:gap-3">
          <Phone className="h-3 w-3 shrink-0 text-accent-coral md:h-3.5 md:w-3.5" />
          <span className="text-[11px] font-medium text-charcoal/70 md:text-sm">
            In crisis? Need immediate help?
          </span>
          <a
            href={`tel:${crisisNumber}`}
            className="inline-flex items-center text-[11px] font-bold text-charcoal underline underline-offset-2 transition-colors duration-200 hover:text-accent-coral md:text-sm"
            aria-label={`Call Tele-MANAS crisis helpline at ${crisisNumber}`}
          >
            Tele-MANAS: {crisisNumber}
          </a>
        </div>
      </div>
    </>
  );
};

export default Footer;
