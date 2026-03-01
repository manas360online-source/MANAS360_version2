import React from 'react';
import { useNavigate } from 'react-router-dom';

export const Hero: React.FC = () => {
  const navigate = useNavigate();

  const handleStartAssessment = () => {
    document.body.style.transition = 'opacity 0.5s ease';
    document.body.style.opacity = '0';

    setTimeout(() => {
      navigate('/assessment');
      document.body.style.opacity = '1';
    }, 500);
  };

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 text-center md:px-6" aria-labelledby="hero-title">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1000&auto=format&fit=crop')" }}
      />
      <div aria-hidden="true" className="absolute inset-0 bg-charcoal/36" />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-charcoal/60 via-charcoal/35 to-charcoal/48" />

      <div className="relative z-10 mx-auto w-full max-w-3xl pt-44 md:pt-48">
        <h1 id="hero-title" className="font-serif text-4xl font-light leading-tight text-cream [text-shadow:0_2px_8px_rgba(0,0,0,0.3)] md:text-6xl">
          You're <span className="font-semibold text-gentle-blue">not alone</span>.
          <br />
          Let's take this <span className="font-semibold text-calm-sage">together</span>.
        </h1>

        <p className="mx-auto mt-6 max-w-2xl px-4 py-2 text-lg leading-relaxed text-cream/95 md:text-xl md:px-5">
          Feeling overwhelmed? Confused? That's okay. We'll help you understand
          what you're going through in just 60 seconds.
        </p>

        <div className="mt-9 flex flex-col items-center gap-4">
          <button
            onClick={handleStartAssessment}
            className="min-h-[44px] w-full max-w-sm rounded-full bg-gradient-calm px-10 py-5 text-lg font-medium text-white shadow-soft-lg transition duration-300 hover:scale-[1.03]"
            aria-label="Start your 60-second mental health assessment"
          >
            Start Your 60-Second Check
          </button>

          <p className="flex flex-col items-center gap-1 px-4 py-2 text-sm font-medium text-cream/95 sm:flex-row sm:gap-3">
            <span>✓ Completely confidential</span>
            <span>✓ No judgment</span>
            <span>✓ Immediate guidance</span>
          </p>
        </div>
      </div>
    </section>
  );
};

export default Hero;
