/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          green: "#43A047",
          greenDark: "#2E7D32",
          greenLight: "#E8F5E9",
          charcoal: "#1C1C1E",
          gray: "#F5F5F5",
          border: "#E2E2E4",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
