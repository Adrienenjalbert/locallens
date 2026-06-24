"use client";

import { useEffect, type ReactNode } from "react";
import type { ThemeTokens } from "@config/types";

const VAR_MAP: Record<keyof ThemeTokens, string> = {
  primary: "--ll-primary",
  secondary: "--ll-secondary",
  accent: "--ll-accent",
  success: "--ll-success",
  warning: "--ll-warning",
  danger: "--ll-danger",
  background: "--ll-background",
  foreground: "--ll-foreground",
  card: "--ll-card",
  cardForeground: "--ll-card-foreground",
  muted: "--ll-muted",
  mutedForeground: "--ll-muted-foreground",
  border: "--ll-border",
  ring: "--ll-ring",
  fontSans: "--ll-font-sans",
  fontDisplay: "--ll-font-display",
  radius: "--ll-radius",
};

/**
 * Applies a vertical's design tokens as CSS variables on :root. Swapping the
 * `tokens` prop re-skins the entire app — this is how one codebase runs any
 * vertical from config alone.
 */
export function ThemeProvider({
  tokens,
  children,
}: {
  tokens: ThemeTokens;
  children: ReactNode;
}) {
  useEffect(() => {
    const root = document.documentElement;
    (Object.keys(VAR_MAP) as (keyof ThemeTokens)[]).forEach((key) => {
      const value = tokens[key];
      const cssVar = VAR_MAP[key];
      // For the brand fonts that next/font self-hosts (layout.tsx), prefer the
      // generated CSS variable so we use the optimised, preloaded font files.
      if (key === "fontSans") {
        const preloaded = value === "Inter" ? "var(--font-inter), " : "";
        root.style.setProperty(cssVar, `${preloaded}"${value}", system-ui, sans-serif`);
      } else if (key === "fontDisplay") {
        const preloaded = value === "Fraunces" ? "var(--font-fraunces), " : "";
        root.style.setProperty(cssVar, `${preloaded}"${value}", Georgia, serif`);
      } else root.style.setProperty(cssVar, value);
    });
  }, [tokens]);

  return <>{children}</>;
}
