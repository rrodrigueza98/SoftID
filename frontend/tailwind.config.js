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
        // Azul estilo Fluent Design / Microsoft 365 (mismo tono que usa
        // Dynamics 365, Teams, etc. -- brand-600 es el "Communication Blue"
        // #0078D4 de Microsoft).
        brand: {
          50: '#eff6fc',
          100: '#deecf9',
          200: '#c7e0f4',
          300: '#71afe5',
          400: '#4a9cdc',
          500: '#2b88d8',
          600: '#0078d4',
          700: '#005a9e',
          800: '#003966',
          900: '#002050',
          950: '#001233',
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
