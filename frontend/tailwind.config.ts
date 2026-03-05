import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        sage: {
          50: '#f0f5ee',
          100: '#E8EFE6',
          200: '#c5d6bf',
          300: '#a2bd99',
          400: '#7fa473',
          500: '#4A6741',
          600: '#3d5636',
          700: '#2D4128',
          800: '#1e2c1b',
          900: '#0f160d',
        },
        clay: {
          50: '#fdf6ef',
          100: '#f7e8d5',
          200: '#E8CDB5',
          300: '#d4a87a',
          400: '#C4956A',
          500: '#B8654A',
          600: '#9a4e38',
          700: '#7c3b2b',
        },
        ink: {
          50: '#f5f5f5',
          100: '#e5e5e5',
          200: '#d4d4d4',
          300: '#a3a3a3',
          400: '#9A9A9A',
          500: '#6B6B6B',
          600: '#525252',
          700: '#3D3D3D',
          800: '#1A1A1A',
        },
        surface: {
          bg: '#FAFAF8',
          card: '#FFFFFF',
          sidebar: '#F5F3F0',
          hover: '#EFEDE9',
        },
        'calm-sage': '#A8B5A0',
        'soft-lavender': '#C4B5D9',
        'warm-terracotta': '#D4A89E',
        'gentle-blue': '#9DADBE',
        'cream': '#F5F3EE',
        'charcoal': '#2C3333',
        'accent-coral': '#E88B7A',

        'wellness-primary': '#A8B5A0',
        'wellness-secondary': '#C4B5D9',
        'wellness-accent': '#E88B7A',
        'wellness-text': '#2C3333',
        'wellness-muted': '#5C6666',
        'wellness-bg': '#F5F3EE',
        'wellness-surface': '#FBFAF7',
      },
      fontFamily: {
        display: ['Outfit', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
        serif: ['Outfit', 'sans-serif'],
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
        fadeIn: 'fadeIn 0.4s ease-out',
        fadeInDown: 'fadeInDown 0.45s ease-out',
        fadeInUp: 'fadeInUp 0.5s ease-out',
        slideIn: 'slideIn 0.35s ease-out',
        scaleIn: 'scaleIn 0.35s ease-out',
      },
      keyframes: {
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
        'soft-xs': '0 2px 8px rgba(44, 51, 51, 0.06)',
        'soft-sm': '0 4px 12px rgba(44, 51, 51, 0.08)',
        'soft-md': '0 8px 20px rgba(44, 51, 51, 0.1)',
        'soft-lg': '0 12px 28px rgba(44, 51, 51, 0.12)',
        'soft-xl': '0 16px 36px rgba(44, 51, 51, 0.14)',
        'soft-2xl': '0 22px 52px rgba(44, 51, 51, 0.16)',
        'soft-inner': 'inset 0 2px 8px rgba(44, 51, 51, 0.06)',
      },
      backgroundImage: {
        'gradient-calm': 'linear-gradient(135deg, #A8B5A0 0%, #9DADBE 100%)',
        'gradient-soft': 'linear-gradient(135deg, #F5F3EE 0%, #EEE8F7 100%)',
        'gradient-coral': 'linear-gradient(135deg, #E88B7A 0%, #D4A89E 100%)',
        'gradient-full': 'linear-gradient(135deg, #F5F3EE 0%, #C4B5D9 50%, #9DADBE 100%)',
        'gradient-peaceful': 'linear-gradient(120deg, #C4B5D9 0%, #9DADBE 100%)',
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
