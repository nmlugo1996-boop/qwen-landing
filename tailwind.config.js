/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}", "./lib/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#ff4d4f"
        },
        accent: "#ff4d4f"
      },
      fontFamily: {
        sans: ["Manrope", "sans-serif"]
      },
      keyframes: {
        fadeSlide: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      },
      animation: {
        fadeSlide: "fadeSlide 0.6s ease forwards"
      },
      boxShadow: {
        card: "0 12px 30px rgba(0,0,0,0.12)",
        glow: "0 0 14px rgba(255, 77, 79, 0.6)"
      }
    }
  },
  plugins: []
};

