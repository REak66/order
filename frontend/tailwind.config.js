import flyonui from 'flyonui';
import tailwindcssMotion from 'tailwindcss-motion';
import tailwindcssIntersect from 'tailwindcss-intersect';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/flyonui/dist/js/*.js",
  ],
  theme: {
    extend: {
      transitionDuration: {
        '3000': '3000ms',
      },
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
      },
    },
  },
  plugins: [
    flyonui,
    tailwindcssMotion,
    tailwindcssIntersect,
  ],
}

