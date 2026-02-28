import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

/**
 * HeroSection component
 * Main headline and CTA for the landing page
 */
export const HeroSection: React.FC = () => {
  const navigate = useNavigate();
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    setHasAnimated(true);
  }, []);

  const handleStartAssessment = () => {
    // Smooth fade out effect
    document.body.style.transition = 'opacity 0.5s ease';
    document.body.style.opacity = '0';

    setTimeout(() => {
      navigate('/assessment');
      document.body.style.opacity = '1';
    }, 500);
  };

  return (
    <section
      className={`text-center py-20 md:py-32 px-4 relative z-10 ${
        hasAnimated ? 'animate-fade-in-up' : ''
      }`}
    >
      {/* Background hero image (decorative) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-center bg-cover bg-no-repeat"
        style={{
          backgroundImage: "url('/hero.jpg')",
          filter: 'brightness(0.65) saturate(0.95)',
        }}
      />
      {/* Main Headline */}
      <h1 className="font-serif font-light text-4xl md:text-5xl lg:text-6xl text-charcoal leading-tight mb-8 animate-breathe">
        You're{' '}
        <span className="font-semibold text-gradient">not alone</span>.
        <br />
        Let's take this{' '}
        <span className="font-semibold text-gradient">together</span>.
      </h1>

      {/* Subheading */}
      <p className="text-lg md:text-xl text-charcoal opacity-80 max-w-2xl mx-auto mb-12 leading-relaxed">
        Feeling overwhelmed? Confused? That's okay. We'll help you understand
        what you're going through in just 60 seconds.
      </p>

      {/* CTA Buttons */}
      <div className="flex flex-col items-center gap-6 mb-16">
        <button
          onClick={handleStartAssessment}
          className="bg-gradient-calm hover:shadow-soft-xl hover:-translate-y-1 text-white font-sans font-medium text-lg px-12 py-5 rounded-full transition-smooth whitespace-nowrap shadow-soft-lg focus-ring"
          aria-label="Start your 60-second mental health assessment"
        >
          Start Your 60-Second Check
        </button>

        {/* Trust badges */}
        <p className="text-sm text-charcoal opacity-70 space-x-3">
          <span>✓ Completely confidential</span>
          <span className="hidden sm:inline">✓ No judgment</span>
          <span className="hidden md:inline">✓ Immediate guidance</span>
        </p>
      </div>
    </section>
  );
};

export default HeroSection;
