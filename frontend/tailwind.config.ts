import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Clinical Teal Primary
        teal: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        // Emergency Red
        red: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        },
        // Clinical background
        clinical: {
          white: '#ffffff',
          offwhite: '#f8fafc',
          light: '#f1f5f9',
          muted: '#e2e8f0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans Devanagari', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'kiosk-xl': ['2rem', { lineHeight: '2.4rem', fontWeight: '700' }],
        'kiosk-lg': ['1.75rem', { lineHeight: '2.1rem', fontWeight: '600' }],
        'kiosk-md': ['1.375rem', { lineHeight: '1.75rem', fontWeight: '500' }],
        'kiosk-sm': ['1.125rem', { lineHeight: '1.5rem', fontWeight: '500' }],
      },
      minHeight: {
        touch: '56px',
        'touch-lg': '72px',
      },
      animation: {
        'pulse-ring': 'pulse-ring 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite',
        'sound-bar': 'sound-bar 0.8s ease-in-out infinite alternate',
        'fade-in': 'fade-in 0.3s ease-in-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'spin-slow': 'spin 2s linear infinite',
      },
      keyframes: {
        'pulse-ring': {
          '0%': { transform: 'scale(0.8)', opacity: '1' },
          '80%, 100%': { transform: 'scale(2.4)', opacity: '0' },
        },
        'sound-bar': {
          '0%': { height: '4px' },
          '100%': { height: '20px' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
