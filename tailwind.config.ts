import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Minimal palette pulled from the Figma: near-white canvas, ink black,
        // and a couple of neutral greys for inactive pills / secondary text.
        canvas: "#f4f4f2",
        ink: "#111111",
        pill: "#c9c9c7",
        pillText: "#6b6b69",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      transitionTimingFunction: {
        "out-strong": "var(--ease-out)",
        "in-out-strong": "var(--ease-in-out)",
        drawer: "var(--ease-drawer)",
      },
      transitionDuration: {
        press: "var(--duration-press)",
        ui: "var(--duration-ui)",
        panel: "var(--duration-panel)",
      },
    },
  },
  plugins: [],
};

export default config;
