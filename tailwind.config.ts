import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"IBM Plex Mono"', '"SF Mono"', "Courier New", "monospace"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        "bg-base": "#080c14",
        "bg-card": "#0d1220",
        "bg-surface": "#141d2e",
        border: "#1e2d45",
      },
    },
  },
  plugins: [],
};

export default config;
