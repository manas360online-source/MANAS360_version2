import React from 'react';
import { useNavigate } from 'react-router-dom';

export const Footer: React.FC = () => {
  const navigate = useNavigate();
  const crisisNumber = '1800-599-0019';

  const handleStartAssessment = () => {
    document.body.style.transition = 'opacity 0.5s ease';
    document.body.style.opacity = '0';

    setTimeout(() => {
      navigate('/assessment');
      document.body.style.opacity = '1';
    }, 500);
  };

  return (
    <>
      <footer className="border-t border-white/70 bg-cream px-4 pb-24 pt-12 md:px-6 md:pt-14" aria-label="Footer">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
          <div className="rounded-[30px] border border-white/70 bg-white/70 p-8 text-center shadow-soft-sm backdrop-blur-sm">
            <h2 className="font-serif text-3xl font-light text-charcoal md:text-5xl">
              Ready to feel <span className="bg-gradient-peaceful bg-clip-text font-semibold text-transparent">better</span>?
            </h2>
            <div className="mt-6">
              <button
                onClick={handleStartAssessment}
                className="min-h-[44px] w-full max-w-sm rounded-full bg-gradient-calm px-10 py-4 text-lg font-medium text-white shadow-soft-lg transition duration-300 hover:scale-[1.03]"
                aria-label="Take the 60-second mental health assessment"
              >
                Take the 60-Second Check
              </button>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-4 rounded-[30px] border border-white/65 bg-white/65 px-6 py-5 text-sm text-charcoal/80 backdrop-blur-sm md:flex-row">
            <div className="font-serif text-xl font-light text-charcoal">
              MANAS<span className="font-semibold">360</span>
            </div>
            <nav className="flex items-center gap-5" aria-label="Footer links">
              <a href="#" onClick={(event) => event.preventDefault()} className="min-h-[44px] inline-flex items-center">Subscribe</a>
              <a href="#" onClick={(event) => event.preventDefault()} className="min-h-[44px] inline-flex items-center">Create/Login</a>
              <a href="#" onClick={(event) => event.preventDefault()} className="min-h-[44px] inline-flex items-center">No judgment</a>
            </nav>
          </div>
        </div>
      </footer>

      <div
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/60 bg-cream/88 px-3 py-3 text-center text-charcoal shadow-soft-md backdrop-blur-sm"
        role="region"
        aria-label="Crisis support information"
        aria-live="polite"
      >
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-center gap-2 sm:flex-row sm:gap-4">
          <span className="text-sm font-medium md:text-base">🚨 In crisis? Need immediate help?</span>
          <a
            href={`tel:${crisisNumber}`}
            className="inline-flex min-h-[44px] items-center rounded px-2 font-semibold underline"
            aria-label={`Call Tele-MANAS crisis helpline at ${crisisNumber}`}
          >
            Call Tele-MANAS: {crisisNumber}
          </a>
        </div>
      </div>
    </>
  );
};

export default Footer;
