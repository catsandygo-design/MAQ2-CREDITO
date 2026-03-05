/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cockpit: {
          bg: '#eef3f8',
          panel: '#f8fbff',
          ink: '#10325a',
          accent: '#0f766e',
        },
      },
      boxShadow: {
        panel: '0 10px 24px rgba(15, 23, 42, 0.08)',
      },
    },
  },
  plugins: [],
}
