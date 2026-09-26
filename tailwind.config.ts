import type { Config } from "tailwindcss";

// "Bold Card-Pack" theme: a near-black base with a gold/foil accent and a
// holographic gradient wash (borrowed from refractor-style trading cards),
// instead of the generic blue SaaS look this app started with.
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        base: {
          950: "#0a0a0d",
          900: "#111116",
          850: "#16161d",
          800: "#1c1c25",
          700: "#28283a",
          600: "#3a3a52",
        },
        accent: {
          DEFAULT: "#f5b942",
          soft: "#ffd579",
        },
        gain: "#34d399",
        loss: "#fb7185",
        muted: "#9a9aa8",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      backgroundImage: {
        // A low-opacity foil wash layered over a card's own bg-color (see
        // KpiCard and other panels) — the "holo" identity of this theme.
        holo: "linear-gradient(135deg, rgba(99,102,241,0.14), rgba(236,72,153,0.10), rgba(245,185,66,0.14))",
        foil: "linear-gradient(135deg, #f5b942, #f97362, #c084fc, #60a5fa)",
      },
      boxShadow: {
        panel: "0 1px 2px rgba(0,0,0,0.5), 0 0 0 1px rgba(245,185,66,0.08)",
      },
    },
  },
  plugins: [],
};
export default config;
