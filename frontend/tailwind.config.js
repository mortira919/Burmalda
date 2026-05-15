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
          50:  '#f5ffe0',
          100: '#e8ffa8',
          200: '#d4f76e',
          300: '#bce83a',
          400: '#a3d900',
          500: '#8fc900',
          600: '#76B900',
          700: '#5a8c00',
          800: '#3d5f00',
          900: '#213300',
        },
        u: {
          bg:      '#0F0F0F',
          surface: '#1A1A1A',
          card:    '#212121',
          hover:   '#2A2A2A',
          border:  '#333333',
          input:   '#141414',
          sidebar: '#080808',
          nvidia:  '#76B900',
          purple:  '#77216F',
        },
      },
    },
  },
  plugins: [],
};
