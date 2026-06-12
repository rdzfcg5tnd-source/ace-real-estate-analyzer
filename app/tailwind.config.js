/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#0a0a0b',
          800: '#111114',
          700: '#17171b',
          600: '#1d1d22',
          500: '#26262d',
        },
        gold: {
          DEFAULT: '#c9a24b',
          light: '#e6cd8a',
          dark: '#9c7a32',
        },
        champagne: '#e8e2d4',
      },
      fontFamily: {
        serif: ['"Noto Serif JP"', 'Georgia', 'serif'],
        sans: ['"Noto Sans JP"', 'system-ui', 'sans-serif'],
        mono: ['"Roboto Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        lux: '0 10px 40px -10px rgba(0,0,0,0.8)',
        glow: '0 0 0 1px rgba(201,162,75,0.25), 0 8px 30px -8px rgba(201,162,75,0.18)',
      },
    },
  },
  plugins: [],
}
