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
          50:  '#fff1ec',
          100: '#ffe0d0',
          200: '#ffbda0',
          300: '#ff9166',
          400: '#ff6b35',
          500: '#f15820',
          600: '#E95420',
          700: '#c03e10',
          800: '#9a3314',
          900: '#7c2e15',
        },
        u: {
          bg:      '#1C1C1C',
          surface: '#272727',
          card:    '#2E2E2E',
          hover:   '#353535',
          border:  '#3D3D3D',
          input:   '#1A1A1A',
          sidebar: '#0F0F0F',
          orange:  '#E95420',
          purple:  '#77216F',
        },
      },
    },
  },
  plugins: [],
};
