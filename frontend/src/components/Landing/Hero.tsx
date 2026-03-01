import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronDown, ShieldCheck, Heart, Zap } from 'lucide-react';

export const Hero: React.FC = () => {
  const navigate = useNavigate();

  const handleStartAssessment = () => {
    navigate('/assessment');
  };

  const handleScrollDown = () => {
    window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
  };

  return (
    <section
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 text-center md:px-6"
      aria-labelledby="hero-title"
    >
      {/* Background layers */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1600&auto=format&fit=crop')",
        }}
      />
      <div aria-hidden="true" className="absolute inset-0 bg-charcoal/40" />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-charcoal/70 via-charcoal/30 to-charcoal/55"
      />

      {/* Hero content */}
      <div className="relative z-10 mx-auto w-full max-w-3xl pt-32 md:pt-36 lg:max-w-4xl xl:max-w-5xl">
        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cream/20 bg-cream/10 px-4 py-1.5 backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-calm-sage animate-pulse" />
          <span className="text-xs font-medium tracking-wide text-cream/90">
            Trusted by 10,000+ users across India
          </span>
        </div>

        <h1
          id="hero-title"
          className="font-serif text-4xl font-light leading-[1.15] text-cream sm:text-5xl md:text-6xl lg:text-7xl"
        >
          You&rsquo;re{' '}
          <span className="font-semibold text-gentle-blue">not alone</span>.
          <br />
          <span className="mt-2 inline-block">
            Let&rsquo;s take this{' '}
            <span className="font-semibold text-calm-sage">together</span>.
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-cream/85 sm:text-lg md:max-w-2xl md:text-xl">
          Feeling overwhelmed? Confused? That&rsquo;s okay.
          <br className="hidden sm:block" />
          We&rsquo;ll help you understand what you&rsquo;re going through — in
          just 60 seconds.
        </p>

        {/* CTA */}
        <div className="mt-10 flex flex-col items-center gap-5">
          <button
            onClick={handleStartAssessment}
            className="group inline-flex min-h-[48px] items-center gap-3 rounded-full bg-gradient-calm px-8 py-3.5 text-base font-semibold text-white shadow-soft-lg transition-all duration-300 hover:scale-[1.03] hover:shadow-soft-xl md:px-10 md:py-4 md:text-lg"
            aria-label="Start your 60-second mental health assessment"
          >
            Start Your 60-Second Check
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </button>

          {/* Trust signals */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm font-medium text-cream/80 sm:gap-6">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-calm-sage" />
              Confidential
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Heart className="h-3.5 w-3.5 text-accent-coral" />
              No judgment
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-gentle-blue" />
              Instant guidance
            </span>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <button
        onClick={handleScrollDown}
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 animate-bounce rounded-full p-2 text-cream/60 transition-colors duration-300 hover:text-cream"
        aria-label="Scroll to learn more"
      >
        <ChevronDown className="h-6 w-6" />
      </button>
    </section>
  );
};

export default Hero;
