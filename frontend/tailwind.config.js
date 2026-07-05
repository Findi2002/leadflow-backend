/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        evergreen: {
          50: '#f3f7f4', 100: '#e3ede5', 200: '#c7dccb',
          500: '#3f7d52', 600: '#2f6240', 700: '#264f34', 900: '#15291c',
        },
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
