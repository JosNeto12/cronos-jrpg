/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0f1115",
        panel: "#1a1d24",
        accent: "#5eead4",
        danger: "#f87171",
        tension: "#fbbf24",
      },
    },
  },
  plugins: [],
};