/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        solacePurple: '#6A0DAD',
        solaceBlue: '#0098DB',
        solaceGreen: '#08C68B',
      },
      boxShadow: {
        mesh: '0 10px 40px rgba(106, 13, 173, 0.15)',
      },
    },
  },
  plugins: [],
};
