import type { Config } from "tailwindcss";

// Tokens are CSS variables (see src/styles/index.css) so a vertical config can
// re-skin the entire app at runtime by swapping the variable values.
const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--ll-border) / <alpha-value>)",
        input: "hsl(var(--ll-input) / <alpha-value>)",
        ring: "hsl(var(--ll-ring) / <alpha-value>)",
        background: "hsl(var(--ll-background) / <alpha-value>)",
        foreground: "hsl(var(--ll-foreground) / <alpha-value>)",
        primary: {
          DEFAULT: "hsl(var(--ll-primary) / <alpha-value>)",
          foreground: "hsl(var(--ll-primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "hsl(var(--ll-secondary) / <alpha-value>)",
          foreground: "hsl(var(--ll-secondary-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "hsl(var(--ll-accent) / <alpha-value>)",
          foreground: "hsl(var(--ll-accent-foreground) / <alpha-value>)",
        },
        success: "hsl(var(--ll-success) / <alpha-value>)",
        warning: "hsl(var(--ll-warning) / <alpha-value>)",
        danger: "hsl(var(--ll-danger) / <alpha-value>)",
        muted: {
          DEFAULT: "hsl(var(--ll-muted) / <alpha-value>)",
          foreground: "hsl(var(--ll-muted-foreground) / <alpha-value>)",
        },
        card: {
          DEFAULT: "hsl(var(--ll-card) / <alpha-value>)",
          foreground: "hsl(var(--ll-card-foreground) / <alpha-value>)",
        },
      },
      borderRadius: {
        lg: "var(--ll-radius)",
        md: "calc(var(--ll-radius) - 2px)",
        sm: "calc(var(--ll-radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--ll-font-sans)", "system-ui", "sans-serif"],
        display: ["var(--ll-font-display)", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
