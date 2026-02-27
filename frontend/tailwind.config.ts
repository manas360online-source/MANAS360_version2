import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Therapeutic Color Psychology (Original)
        'calm-sage': '#A8B5A0',        // Nature, growth, safety
        'soft-lavender': '#C4B5D9',    // Calm, peace, spirituality
        'warm-terracotta': '#D4A89E',  // Grounding, warmth, comfort
        'gentle-blue': '#9DADBE',      // Trust, stability, peace
        'cream': '#F5F3EE',            // Softness, safety, cleanliness
        'charcoal': '#2C3333',         // Stability, strength, protection
        'accent-coral': '#E88B7A',     // Hope, gentle energy, warmth
        
        // New Color System (MANAS360)
        'wellness-slate': '#0A3A78',   // Primary blue
        'wellness-text': '#1A1A1A',    // Main text
        'wellness-muted': '#475569',   // Muted text
      },
      fontFamily: {
        serif: ['Crimson Pro', 'serif'],
        sans: ['DM Sans', 'sans-serif'],
      },
      fontSize: {
        // Calming typography scale
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.6rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1.2' }],
      },
      animation: {
        breathe: 'breathe 6s ease-in-out infinite',
        float: 'float 20s ease-in-out infinite',
        fadeIn: 'fadeIn 1s ease-out',
        fadeInDown: 'fadeInDown 1s ease-out',
        fadeInUp: 'fadeInUp 1s ease-out',
      },
      keyframes: {
        breathe: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.3' },
          '50%': { transform: 'scale(1.05)', opacity: '0.5' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0) translateX(0)' },
          '25%': { transform: 'translateY(-50px) translateX(30px)' },
          '50%': { transform: 'translateY(-100px) translateX(-20px)' },
          '75%': { transform: 'translateY(-50px) translateX(40px)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        fadeInDown: {
          from: {
            opacity: '0',
            transform: 'translateY(-30px)',
          },
          to: {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        fadeInUp: {
          from: {
            opacity: '0',
            transform: 'translateY(30px)',
          },
          to: {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
      },
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        md: '10px',
        lg: '20px',
      },
      boxShadow: {
        'soft-lg': '0 10px 40px rgba(168, 181, 160, 0.3)',
        'soft-xl': '0 15px 50px rgba(168, 181, 160, 0.4)',
        'soft-sm': '0 20px 40px rgba(0, 0, 0, 0.1)',
        'soft-top': '0 -5px 20px rgba(0, 0, 0, 0.1)',
      },
      backgroundImage: {
        'gradient-calm': 'linear-gradient(135deg, #A8B5A0 0%, #9DADBE 100%)',
        'gradient-full': 'linear-gradient(135deg, #F5F3EE 0%, #C4B5D9 50%, #9DADBE 100%)',
        'gradient-coral': 'linear-gradient(90deg, #E88B7A, #D4A89E)',
        'gradient-gradient': 'linear-gradient(120deg, #A8B5A0, #9DADBE)',
      },
      spacing: {
        safe: 'max(1rem, env(safe-area-inset-bottom))',
      },
    },
  },
  plugins: [],
};

export default config;
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
};

export default config;
