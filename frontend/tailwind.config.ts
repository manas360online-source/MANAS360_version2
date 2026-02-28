import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Refined Therapeutic Color Psychology
        'calm-sage': '#A8B5A0',        // Nature, growth, safety
        'soft-lavender': '#C4B5D9',    // Calm, peace, spirituality
        'warm-terracotta': '#D4A89E',  // Grounding, warmth, comfort
        'gentle-blue': '#9DADBE',      // Trust, stability, peace
        'cream': '#F5F3EE',            // Softness, safety, cleanliness
        'charcoal': '#3D4848',         // Softer charcoal - less harsh
        'accent-coral': '#E8B4A0',     // Softer coral - more peachy
        
        // Soft Primary Colors for Wellness
        'wellness-primary': '#8BA8A8',    // Muted sage-blue (replaces harsh blues)
        'wellness-secondary': '#B8A8C8',  // Soft purple-lavender
        'wellness-accent': '#E8B4A0',     // Warm peach
        'wellness-text': '#3D4848',       // Soft charcoal text
        'wellness-muted': '#6B7B7B',      // Muted text
        'wellness-bg': '#FDFCF8',         // Warm cream background
        'wellness-surface': '#F9F7F4',    // Subtle surface
      },
      fontFamily: {
        serif: ['Crimson Pro', 'serif'],
        sans: ['DM Sans', 'sans-serif'],
      },
      fontSize: {
        // Enhanced line-heights for better readability
        'xs': ['0.75rem', { lineHeight: '1.2rem' }],
        'sm': ['0.875rem', { lineHeight: '1.4rem' }],
        'base': ['1rem', { lineHeight: '1.7rem' }],
        'lg': ['1.125rem', { lineHeight: '1.8rem' }],
        'xl': ['1.25rem', { lineHeight: '1.9rem' }],
        '2xl': ['1.5rem', { lineHeight: '2.1rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.4rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.7rem' }],
        '5xl': ['3rem', { lineHeight: '3.3rem' }],
        '6xl': ['3.75rem', { lineHeight: '4rem' }],
      },
      animation: {
        breathe: 'breathe 6s ease-in-out infinite',
        float: 'float 20s ease-in-out infinite',
        fadeIn: 'fadeIn 1s ease-out',
        fadeInDown: 'fadeInDown 1s ease-out',
        fadeInUp: 'fadeInUp 1s ease-out',
        slideIn: 'slideIn 0.4s ease-out',
        scaleIn: 'scaleIn 0.3s ease-out',
      },
      keyframes: {
        breathe: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.4' },
          '50%': { transform: 'scale(1.03)', opacity: '0.6' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0) translateX(0)' },
          '25%': { transform: 'translateY(-30px) translateX(20px)' },
          '50%': { transform: 'translateY(-60px) translateX(-15px)' },
          '75%': { transform: 'translateY(-30px) translateX(25px)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        fadeInDown: {
          from: { opacity: '0', transform: 'translateY(-20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          from: { opacity: '0', transform: 'translateX(-20px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        md: '8px',
        lg: '16px',
        xl: '24px',
      },
      boxShadow: {
        // Ultra-soft shadows for mental wellness
        'soft-xs': '0 2px 8px rgba(168, 181, 160, 0.08)',
        'soft-sm': '0 4px 12px rgba(168, 181, 160, 0.12)',
        'soft-md': '0 8px 20px rgba(168, 181, 160, 0.15)',
        'soft-lg': '0 12px 28px rgba(168, 181, 160, 0.18)',
        'soft-xl': '0 16px 40px rgba(168, 181, 160, 0.2)',
        'soft-2xl': '0 24px 60px rgba(168, 181, 160, 0.22)',
        'soft-inner': 'inset 0 2px 8px rgba(168, 181, 160, 0.1)',
        'glow-calm': '0 0 20px rgba(168, 181, 160, 0.3)',
        'glow-lavender': '0 0 20px rgba(196, 181, 217, 0.3)',
      },
      backgroundImage: {
        'gradient-calm': 'linear-gradient(135deg, #A8B5A0 0%, #9DADBE 100%)',
        'gradient-soft': 'linear-gradient(135deg, #C4B5D9 0%, #9DADBE 100%)',
        'gradient-warm': 'linear-gradient(135deg, #E8B4A0 0%, #D4A89E 100%)',
        'gradient-full': 'linear-gradient(135deg, #FDFCF8 0%, #F0E8E0 50%, #E8DED5 100%)',
        'gradient-peaceful': 'linear-gradient(120deg, #A8B5A0 0%, #C4B5D9 50%, #9DADBE 100%)',
      },
      spacing: {
        safe: 'max(1rem, env(safe-area-inset-bottom))',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
};

export default config;
