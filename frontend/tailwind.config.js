/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      colors: {
        navy: { DEFAULT: '#0B1E3D', mid: '#142850', light: '#1C3461' },
        brand: { DEFAULT: '#1A73E8', hover: '#1557B0' },
      },
    },
  },
  plugins: [],
};
