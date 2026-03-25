/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0A1628',
          light: '#0D1F3C'
        },
        'electric-blue': {
          DEFAULT: '#0066FF',
          dark: '#0044CC',
          light: '#3385FF'
        }
      },
      animation: {
        'float-slow': 'float 25s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite'
      }
    }
  },
  plugins: []
};
