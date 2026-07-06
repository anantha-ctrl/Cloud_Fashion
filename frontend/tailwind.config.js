/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: '#c9a96a',
          light: '#e3cfa3',
          dark: '#a3854a',
        },
        ink: {
          DEFAULT: '#0b0b0f',
          soft: '#15151c',
          line: '#23232e',
        },
        // Luxury landing palette (editorial / light theme)
        luxe: {
          bg: '#F8F6F2',      // warm off-white background
          ink: '#111111',     // primary text
          gold: '#D4AF37',    // accent
          bronze: '#8C6A43',  // secondary
          line: '#E7E1D8',    // hairline dividers
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0,0,0,0.18)',
        glow: '0 0 30px rgba(201,169,106,0.25)',
        luxe: '0 24px 60px -20px rgba(17,17,17,0.22)',
        'luxe-sm': '0 12px 30px -12px rgba(17,17,17,0.18)',
      },
      borderRadius: {
        luxe: '24px',
        'luxe-lg': '30px',
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(120deg,#0b0b0f 0%,#1a1320 60%,#2a1f14 100%)',
        'gold-sheen': 'linear-gradient(120deg,#D4AF37 0%,#f0dc9a 45%,#8C6A43 100%)',
      },
      keyframes: {
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        blob: {
          '0%,100%': { transform: 'translate(0,0) scale(1)' },
          '33%': { transform: 'translate(30px,-40px) scale(1.1)' },
          '66%': { transform: 'translate(-20px,20px) scale(0.95)' },
        },
        marquee: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        shimmer: 'shimmer 1.5s infinite',
        blob: 'blob 18s ease-in-out infinite',
        marquee: 'marquee 30s linear infinite',
      },
    },
  },
  plugins: [],
};
