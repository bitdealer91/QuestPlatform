import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        "bg-alt": "var(--bg-alt)",
        card: "var(--card)",
        "card-elev": "var(--card-elev)",
        primary: "var(--primary)",
        accent: "var(--accent)",
        ok: "var(--ok)",
        warn: "var(--warn)",
        danger: "var(--danger)",
        text: "var(--text)",
        muted: "var(--muted)",
        outline: "var(--outline)",
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },
      boxShadow: {
        elevated: "var(--shadow)",
        glow: "0 0 0 1px var(--outline), 0 0 40px rgba(178,108,255,.35)",
      },
      dropShadow: {
        glow: "0 0 24px rgba(69,214,255,.45)",
      },
      transitionTimingFunction: {
        fluent: "cubic-bezier(.2,.8,.2,1)",
      },
      transitionDuration: {
        fast: "180ms",
        normal: "240ms",
        modal: "300ms",
      },
    },
  },
  plugins: [],
};

export default config;
