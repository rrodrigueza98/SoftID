/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Neutro suave con un leve sesgo azulado (hacia brand), en vez de un
        // gris puro -- asi el fondo se siente elegido, no default.
        ink: {
          50: '#f6f7f8',
          100: '#ecedf0',
          200: '#dde1e5',
          300: '#bfc7cd',
          400: '#98a2aa',
          500: '#76828a',
          600: '#59656d',
          700: '#434e56',
          800: '#2c343a',
          900: '#202a35',
          950: '#161b21',
        },
        // Azul calmado (slate/steel) -- mas apagado que el "Communication
        // Blue" de Fluent que tenia antes, para una estetica menos
        // corporativa y mas tranquila.
        brand: {
          50: '#eef2f6',
          100: '#dde5ec',
          200: '#c1cfdb',
          300: '#9bb0c2',
          400: '#7191a8',
          500: '#5a7c96',
          600: '#4c6b8a',
          700: '#3a5570',
          800: '#2c4256',
          900: '#1f303f',
          950: '#141f29',
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
