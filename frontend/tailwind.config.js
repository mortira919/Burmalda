/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Ubuntu', 'system-ui', 'sans-serif'],
        mono: ['Ubuntu Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        primary: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        u: {
          bg:      '#111A14',
          surface: '#182118',
          card:    '#1E2A1E',
          hover:   '#243024',
          border:  '#2D3D2D',
          input:   '#111A14',
          sidebar: '#0A120A',
          green:   '#16A34A',
          purple:  '#77216F',
        },
      },
    },
  },
  plugins: [],
};
