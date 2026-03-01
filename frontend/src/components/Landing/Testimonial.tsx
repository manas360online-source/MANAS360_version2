import React from 'react';

interface TestimonialProps {
  quote: string;
  author: string;
  location: string;
}

export const Testimonial: React.FC<TestimonialProps> = ({ quote, author, location }) => {
  return (
    <section className="py-12 md:py-16" aria-labelledby="testimonial-quote">
      <div className="mx-auto max-w-4xl rounded-[34px] border border-white/60 bg-white/72 px-6 py-10 text-center shadow-soft-md backdrop-blur-sm md:px-12 md:py-14">
        <div className="mb-3 text-5xl text-calm-sage/40" aria-hidden="true">"</div>
        <p id="testimonial-quote" className="font-serif text-2xl font-light italic leading-relaxed text-charcoal md:text-3xl">
          {quote}
        </p>
        <p className="mt-6 text-base text-charcoal/75">
          — {author}, {location}
        </p>
      </div>
    </section>
  );
};

export default Testimonial;
