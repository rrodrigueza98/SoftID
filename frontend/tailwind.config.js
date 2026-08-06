/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#f4f6f6',
          100: '#e4e9e8',
          200: '#c8d2d0',
          300: '#a2b1ae',
          400: '#748a86',
          500: '#57706c',
          600: '#455a57',
          700: '#394947',
          800: '#2c3937',
          900: '#1b2523',
          950: '#0f1615',
        },
        brand: {
          50: '#eefbfa',
          100: '#d4f3f1',
          200: '#ade7e3',
          300: '#78d4cd',
          400: '#43b6ae',
          500: '#279b93',
          600: '#1c7c76',
          700: '#1a6360',
          800: '#194f4d',
          900: '#184240',
          950: '#082524',
        },
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SF Mono', 'Menlo', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
