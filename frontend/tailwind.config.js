/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        casino: {
          bg: "#0a0a0f",
          card: "#13131f",
          cardHover: "#1a1a2e",
          accent: "#00ff88",
          accentGlow: "#00ff8855",
          accentDark: "#00cc6a",
          danger: "#ff3366",
          dangerGlow: "#ff336655",
          dangerDark: "#cc1f4d",
          gold: "#ffd700",
          goldGlow: "#ffd70055",
          text: "#e0e0e0",
          muted: "#888888",
          border: "#2a2a3e",
          chartGrid: "#1a1a2e",
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', "monospace"],
        sans: ['"Inter"', "system-ui", "sans-serif"],
      },
      animation: {
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "flash-red": "flashRed 0.5s ease-in-out",
        "slide-in": "slideIn 0.3s ease-out",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 5px #00ff8855" },
          "50%": { boxShadow: "0 0 20px #00ff88aa" },
        },
        flashRed: {
          "0%": { backgroundColor: "transparent" },
          "50%": { backgroundColor: "#ff336622" },
          "100%": { backgroundColor: "transparent" },
        },
        slideIn: {
          "0%": { transform: "translateY(-10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
