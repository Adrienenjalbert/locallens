import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import "@/styles/index.css";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { gardeners } from "@config/verticals/gardeners";
import { siteUrl } from "@/lib/paths";

// Brand type: Inter (body) + Fraunces (display), per the gardeners vertical
// config. next/font self-hosts the files so there's no render-blocking request
// and the static export stays self-contained.
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  display: "swap",
});

// metadataBase makes relative canonical/OG URLs resolve to absolute ones and is
// what lets robots.ts + sitemap.ts emit absolute URLs under static export.
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl("/")),
  title: {
    default: "GreenList — find a gardener or landscaper you can trust",
    template: "%s | GreenList",
  },
  description:
    "GreenList ranks gardeners and landscapers on what matters: reviews decoded into real themes, portfolios that prove the work, and a legitimacy score for every business. Plus free cost and project tools. Find a trusted local pro — or list your business.",
  applicationName: "GreenList",
  openGraph: {
    type: "website",
    siteName: "GreenList",
    locale: "en_GB",
    url: siteUrl("/"),
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${inter.variable} ${fraunces.variable}`}>
      <body>
        {/* ThemeProvider applies the active vertical's design tokens as CSS
            variables at runtime — one codebase re-skins per vertical.
            AuthProvider exposes the magic-link session to the owner workspace. */}
        <ThemeProvider tokens={gardeners.theme}>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
