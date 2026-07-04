import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      // Institutional Brutalism: every corner is square. Overriding the
      // scale (not just avoiding rounded-*) makes it structurally
      // impossible to introduce a soft corner later.
      borderRadius: {
        none: "0px",
        DEFAULT: "0px",
        sm: "0px",
        md: "0px",
        lg: "0px",
        xl: "0px",
        "2xl": "0px",
        "3xl": "0px",
        full: "0px",
      },
      // No soft/blurred drop-shadows. Only hard, zero-blur offset
      // shadows are available in this system.
      boxShadow: {
        none: "none",
        DEFAULT: "none",
        sm: "none",
        md: "none",
        lg: "none",
        xl: "none",
        "2xl": "none",
        inner: "none",
        brutal: "4px 4px 0 0 #000000",
        "brutal-sm": "2px 2px 0 0 #000000",
        "brutal-lg": "8px 8px 0 0 #000000",
        "brutal-white": "4px 4px 0 0 #ffffff",
      },
      letterSpacing: {
        widest: ".2em",
      },
    },
  },
  plugins: [],
};
export default config;
