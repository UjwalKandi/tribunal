import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        tribunal: {
          bg: "#0A0A0B",
          surface: "#121214",
          /** One step above surface — exhibit gutters, selected rows. */
          raised: "#161619",
          /** Brass-tinted surface for anything the court has acted on. */
          inset: "#15140F",
          border: "#232327",
          /** Hairline used inside a pane, quieter than a pane divider. */
          rule: "#1B1B1F",
          text: "#E7E7EA",
          muted: "#8A8A93",
          prosecution: "#C4463A",
          defense: "#3D6FA8",
          authority: "#C9A227",
        },
      },
      fontFamily: {
        // Fallback chains live in the variable definitions (app/globals.css), so these
        // stay single-valued and next/font can override them without touching this file.
        sans: ["var(--font-sans)"],
        serif: ["var(--font-serif)"],
        mono: ["var(--font-mono)"],
      },
      borderRadius: {
        lg: "4px",
        md: "4px",
        sm: "4px",
      },
      keyframes: {
        /** Opacity only — 200-ui.mdc forbids colour change or shake on the timer. */
        "veto-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.42" },
        },
        "registry-flash": {
          "0%": { color: "#E7E7EA", opacity: "0.35" },
          "100%": { color: "#C9A227", opacity: "1" },
        },
        "rule-in": {
          "0%": { transform: "scaleX(0)" },
          "100%": { transform: "scaleX(1)" },
        },
      },
      animation: {
        "veto-pulse": "veto-pulse 1.6s ease-in-out infinite",
        "registry-flash": "registry-flash 900ms ease-out",
        "rule-in": "rule-in 420ms ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
