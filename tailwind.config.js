/** @type {import('tailwindcss').Config} */
import animate from "tailwindcss-animate";

const config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      keyframes: {
        scroll: {
          "0%": { transform: "translateY(0)" },
          "100%": { transform: "translateY(100%)" },
        },
        "float-up": {
          "0%": { transform: "translateY(0) translateX(0)", opacity: "0" },
          "10%": { opacity: "1" },
          "90%": { opacity: "0.6" },
          "100%": {
            transform: "translateY(-100vh) translateX(20px)",
            opacity: "0",
          },
        },
        "fall-drift": {
          "0%": {
            transform: "translateY(-20px) translateX(0) rotate(0deg)",
            opacity: "0",
          },
          "10%": { opacity: "1" },
          "90%": { opacity: "0.4" },
          "100%": {
            transform: "translateY(100vh) translateX(40px) rotate(360deg)",
            opacity: "0",
          },
        },
        "float-drift": {
          "0%, 100%": { transform: "translateY(0) translateX(0)" },
          "25%": { transform: "translateY(-15px) translateX(10px)" },
          "50%": { transform: "translateY(-5px) translateX(-8px)" },
          "75%": { transform: "translateY(-20px) translateX(5px)" },
        },
        "scale-bloom": {
          "0%, 100%": { transform: "scale(0.8)", opacity: "0.3" },
          "50%": { transform: "scale(1.2)", opacity: "0.7" },
        },
        shimmer: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.8" },
        },
        "twinkle-random": {
          "0%, 100%": { opacity: "0", transform: "scale(0.5)" },
          "50%": { opacity: "1", transform: "scale(1.2)" },
        },
        "sound-wave": {
          "0%": {
            transform: "translate(-50%, -50%) scale(0.8)",
            opacity: "0.4",
          },
          "100%": {
            transform: "translate(-50%, -50%) scale(1.4)",
            opacity: "0",
          },
        },
        "neon-sweep": {
          "0%": { transform: "translateX(-100%)", opacity: "0" },
          "50%": { opacity: "0.8" },
          "100%": { transform: "translateX(100%)", opacity: "0" },
        },
        "beat-pulse": {
          "0%, 100%": { opacity: "0" },
          "50%": { opacity: "0.04" },
        },
        spotlight: {
          "0%, 100%": {
            opacity: "0.6",
            transform: "translateX(-50%) scaleX(1)",
          },
          "50%": { opacity: "1", transform: "translateX(-50%) scaleX(1.1)" },
        },
      },
      animation: {
        scroll: "scroll 1.5s ease-in-out infinite",
        "float-up": "float-up 8s ease-in-out infinite",
        "fall-drift": "fall-drift 8s linear infinite",
        "float-drift": "float-drift 6s ease-in-out infinite",
        "scale-bloom": "scale-bloom 4s ease-in-out infinite",
        shimmer: "shimmer 4s ease-in-out infinite",
        "twinkle-random": "twinkle-random 2.5s ease-in-out infinite",
        "sound-wave": "sound-wave 2s ease-out infinite",
        "neon-sweep": "neon-sweep 3s ease-in-out infinite",
        "beat-pulse": "beat-pulse 1s ease-in-out infinite",
        spotlight: "spotlight 4s ease-in-out infinite",
      },
      colors: {
        primary: "var(--color-primary)",
        secondary: "var(--color-secondary)",
        background: "var(--color-background)",
        surface: "var(--color-surface)",
        text: "var(--color-text)",
        ev: "var(--color-primary)", // Add alias for legacy class names
      },
      fontFamily: {
        heading: "var(--font-heading)",
        body: "var(--font-body)",
        Tiempos: ["var(--font-heading)", "serif"],
      },
    },
  },
  plugins: [animate],
};

export default config;
