/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#22223B",
        slate: "#4A4E69",
        mauve: "#9A8C98",
        rose: "#C9ADA7",
        cream: "#F2E9E4",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 10px 30px -12px rgba(34, 34, 59, 0.18)",
        lift: "0 18px 40px -16px rgba(34, 34, 59, 0.28)",
      },
      keyframes: {
        "fade-up": {
          "0%":   { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%":   { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "slide-right": {
          "0%":   { opacity: "0", transform: "translateX(-10px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%":       { opacity: "0.5" },
        },
      },
      animation: {
        "fade-up":    "fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in":    "fade-in 0.4s ease both",
        "scale-in":   "scale-in 0.4s cubic-bezier(0.22, 1, 0.36, 1) both",
        "slide-right": "slide-right 0.4s cubic-bezier(0.22, 1, 0.36, 1) both",
        "pulse-soft": "pulse-soft 1.8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
