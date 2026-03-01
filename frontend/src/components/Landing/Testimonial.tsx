import React, { useCallback, useEffect, useState } from 'react';
import { Quote, ChevronLeft, ChevronRight, Star } from 'lucide-react';

interface TestimonialItem {
  quote: string;
  author: string;
  location: string;
  rating: number;
}

interface TestimonialProps {
  /** kept for backward-compat — if a single quote is passed it is shown first */
  quote?: string;
  author?: string;
  location?: string;
}

const testimonials: TestimonialItem[] = [
  {
    quote:
      'I was so confused about what I was feeling. MANAS360 helped me understand it was anxiety, not weakness. My therapist has been incredible.',
    author: 'Priya',
    location: 'Bangalore',
    rating: 5,
  },
  {
    quote:
      'The 60-second check-in was so simple. Within a week I had my first therapy session — something I had been putting off for years.',
    author: 'Arjun',
    location: 'Mumbai',
    rating: 5,
  },
  {
    quote:
      'As a working mother, I needed flexible sessions. MANAS360 matched me with a therapist who understood my schedule and my struggles.',
    author: 'Meera',
    location: 'Delhi',
    rating: 5,
  },
];

export const Testimonial: React.FC<TestimonialProps> = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const total = testimonials.length;

  const goNext = useCallback(
    () => setActiveIndex((prev) => (prev + 1) % total),
    [total],
  );

  const goPrev = useCallback(
    () => setActiveIndex((prev) => (prev - 1 + total) % total),
    [total],
  );

  // Auto-rotate every 6s
  useEffect(() => {
    const id = setInterval(goNext, 6000);
    return () => clearInterval(id);
  }, [goNext]);

  const current = testimonials[activeIndex];

  return (
    <section className="py-16 md:py-20" aria-labelledby="testimonial-heading">
      <div className="mx-auto max-w-2xl text-center">
        <span className="mb-3 inline-block text-sm font-semibold uppercase tracking-widest text-calm-sage">
          Testimonials
        </span>
        <h2
          id="testimonial-heading"
          className="font-serif text-3xl font-light text-charcoal md:text-4xl lg:text-5xl"
        >
          Real stories, real healing
        </h2>
      </div>

      <div className="relative mx-auto mt-10 max-w-3xl md:mt-12">
        {/* Card */}
        <div className="rounded-2xl border border-calm-sage/10 bg-white/90 px-8 py-10 text-center shadow-soft-sm backdrop-blur-sm md:px-14 md:py-14">
          <Quote
            className="mx-auto mb-4 h-8 w-8 text-calm-sage/30"
            strokeWidth={1.5}
          />

          {/* Stars */}
          <div className="mb-5 flex items-center justify-center gap-1">
            {Array.from({ length: current.rating }).map((_, i) => (
              <Star
                key={i}
                className="h-4 w-4 fill-accent-coral text-accent-coral"
              />
            ))}
          </div>

          <p className="font-serif text-xl font-light italic leading-relaxed text-charcoal md:text-2xl">
            &ldquo;{current.quote}&rdquo;
          </p>

          <p className="mt-6 text-sm font-semibold text-charcoal">
            {current.author}
          </p>
          <p className="text-sm text-charcoal/55">{current.location}</p>
        </div>

        {/* Navigation arrows */}
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={goPrev}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-calm-sage/20 bg-white text-charcoal/60 transition-colors duration-200 hover:bg-cream hover:text-charcoal"
            aria-label="Previous testimonial"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Dots */}
          <div className="flex items-center gap-2">
            {testimonials.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveIndex(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === activeIndex
                    ? 'w-6 bg-calm-sage'
                    : 'w-2 bg-calm-sage/25 hover:bg-calm-sage/40'
                }`}
                aria-label={`Go to testimonial ${i + 1}`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={goNext}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-calm-sage/20 bg-white text-charcoal/60 transition-colors duration-200 hover:bg-cream hover:text-charcoal"
            aria-label="Next testimonial"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default Testimonial;
