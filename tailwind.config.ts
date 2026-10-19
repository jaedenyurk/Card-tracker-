import type { Config } from "tailwindcss";

// Every color is a CSS variable (defined as space-separated RGB channels on :root in globals.css) so the whole look can be
// re-themed from one place; `<alpha-value>` keeps Tailwind's opacity modifiers (bg-gold/10) working.
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        page: token("page"),
        card: token("card"),
        inset: token("inset"),
        line: token("line"),
        fg: token("text"),
        muted: token("muted"),
        gold: {
          DEFAULT: token("gold"),
          deep: token("gold-deep"),
          bright: token("gold-bright"),
          text: token("gold-text"),
        },
        ink: {
          DEFAULT: token("ink"),
          2: token("ink-2"),
          on: token("on-ink"),
        },
        ok: { DEFAULT: token("success"), text: token("success-text") },
        bad: { DEFAULT: token("danger"), text: token("danger-text") },
        warn: token("warning"),
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "var(--shadow-card)",
        lift: "var(--shadow-lift)",
        gold: "var(--shadow-gold)",
      },
      backgroundImage: {
        "gold-grad": "var(--gold-gradient)",
      },
    },
  },
  plugins: [],
};
export default config;
