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
      },
      animation: {
        scroll: "scroll 1.5s ease-in-out infinite",
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
