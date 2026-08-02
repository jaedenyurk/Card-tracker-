import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        base: {
          950: "#0a0e14",
          900: "#0f141d",
          850: "#131a26",
          800: "#171f2e",
          700: "#212b3d",
          600: "#2c3850",
        },
        accent: {
          DEFAULT: "#4f7cff",
          soft: "#7c9bff",
        },
        gain: "#22c55e",
        loss: "#f43f5e",
        muted: "#8a94a6",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        panel: "0 1px 2px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)",
      },
    },
  },
  plugins: [],
};
export default config;
