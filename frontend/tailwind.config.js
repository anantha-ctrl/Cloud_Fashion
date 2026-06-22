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
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0,0,0,0.18)',
        glow: '0 0 30px rgba(201,169,106,0.25)',
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(120deg,#0b0b0f 0%,#1a1320 60%,#2a1f14 100%)',
      },
      keyframes: {
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        shimmer: 'shimmer 1.5s infinite',
      },
    },
  },
  plugins: [],
};
