import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  Header,
  Hero,
  TrustBar,
  HowItWorks,
  RoleSection,
  Testimonial,
  Footer,
  QuickAccessRail,
} from '../components/Landing';

/**
 * LandingPage Component
 *
 * Production-ready landing page for MANAS360 mental health platform.
 * Features:
 * - Responsive design (mobile-first)
 * - Semantic HTML with ARIA labels
 * - Smooth animations and transitions
 * - Performance optimized (lazy loading, intersection observers)
 * - SEO optimized with meta tags
 * - Accessibility best practices
 * - Crisis support always visible
 *
 * Stack: React + TailwindCSS + React Router
 */
export const LandingPage: React.FC = () => {
  useEffect(() => {
    // Smooth scroll behavior
    document.documentElement.style.scrollBehavior = 'smooth';

    // Scroll position restoration
    const handlePopState = () => {
      window.scrollTo(0, 0);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      document.documentElement.style.scrollBehavior = 'auto';
    };
  }, []);

  return (
    <>
      {/* SEO Meta Tags */}
      <Helmet>
        <title>MANAS360 - You're Not Alone | Mental Health Support</title>
        <meta
          name="description"
          content="Get a 60-second mental health assessment and connect with licensed therapists. Confidential, non-judgmental support for anxiety, depression, and more."
        />
        <meta
          name="keywords"
          content="mental health, therapy, anxiety, depression, counseling, therapist"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content="#A8B5A0" />

        {/* Open Graph */}
        <meta
          property="og:title"
          content="MANAS360 - You're Not Alone | Mental Health Support"
        />
        <meta
          property="og:description"
          content="Get a 60-second mental health assessment and connect with licensed therapists."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://manas360.com" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content="MANAS360 - You're Not Alone | Mental Health Support"
        />
        <meta
          name="twitter:description"
          content="Get a 60-second mental health assessment and connect with licensed therapists."
        />

        {/* Structured Data - Organization */}
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'MANAS360',
            url: 'https://manas360.com',
            logo: 'https://manas360.com/logo.png',
            description:
              'Mental health support platform connecting users with licensed therapists',
            sameAs: [
              'https://www.facebook.com/manas360',
              'https://twitter.com/manas360',
              'https://www.linkedin.com/company/manas360',
            ],
            contactPoint: {
              '@type': 'ContactPoint',
              contactType: 'Crisis Support',
              telephone: '+91-1800-599-0019',
            },
          })}
        </script>

        {/* Structured Data - HealthAndBeautyBusiness */}
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'HealthAndBeautyBusiness',
            name: 'MANAS360',
            description: 'Mental health therapy and counseling platform',
            priceRange: '₹500',
            areaServed: 'IN',
            serviceType: 'Mental Health Therapy',
          })}
        </script>
        {/* Preload hero image for better LCP */}
        <link rel="preload" as="image" href="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1600&auto=format&fit=crop" />
      </Helmet>

      {/* Main Page Structure */}
      <div className="relative min-h-screen overflow-x-hidden bg-[#f5f3ef] text-charcoal">
        <Header />
        <QuickAccessRail />
        <Hero />

        {/* Content sections with visual rhythm */}
        <main>
          {/* Trust bar — tight to hero for continuity */}
          <section className="bg-cream px-4 pt-10 pb-2 sm:px-6 md:px-8 lg:px-12 xl:px-16">
            <div className="mx-auto max-w-6xl">
              <TrustBar />
            </div>
          </section>

          {/* How It Works — white bg for contrast */}
          <section className="bg-white px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16">
            <div className="mx-auto max-w-6xl">
              <HowItWorks />
            </div>
          </section>

          {/* Role Section — subtle cream bg */}
          <section className="bg-cream px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16">
            <div className="mx-auto max-w-6xl">
              <RoleSection />
            </div>
          </section>

          {/* Testimonials — white bg */}
          <section className="bg-white px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16">
            <div className="mx-auto max-w-6xl">
              <Testimonial />
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default LandingPage;
