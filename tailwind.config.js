/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // <--- ¡ESTA LÍNEA ES VITAL! Si no está, el botón no funcionará
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}