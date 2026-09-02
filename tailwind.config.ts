import type { Config } from "tailwindcss";

function withOpacity(varName: string) {
  return ({ opacityValue }: { opacityValue?: string }) => {
    if (opacityValue !== undefined) {
      return `rgb(var(${varName}) / ${opacityValue})`;
    }
    return `rgb(var(${varName}))`;
  };
}

const themeColors: any = {
  ink: withOpacity("--color-ink"),
  inkline: withOpacity("--color-inkline"),
  paper: withOpacity("--color-paper"),
  amber: withOpacity("--color-amber"),
  amberdim: withOpacity("--color-amberdim"),
  signal: withOpacity("--color-signal"),
  rust: withOpacity("--color-rust"),
  slate: withOpacity("--color-slate"),
};

const config: Config = {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: themeColors,
      fontFamily: {
        display: ["var(--font-mono)", "monospace"],
        body: ["var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      letterSpacing: {
        widest2: "0.28em",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};
export default config;
