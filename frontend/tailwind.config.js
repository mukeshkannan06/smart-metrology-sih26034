/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        metrology: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          500: '#0b66c3',
          600: '#0052a3',
          700: '#004182',
          800: '#03376c',
          900: '#082f59',
        },
      },
    },
  },
  plugins: [],
}

