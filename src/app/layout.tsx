import type { Metadata } from "next";
import "@/styles/index.css";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { gardeners } from "@config/verticals/gardeners";
import { siteUrl } from "@/lib/paths";

// metadataBase makes relative canonical/OG URLs resolve to absolute ones and is
// what lets robots.ts + sitemap.ts emit absolute URLs under static export.
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl("/")),
  title: {
    default: "LocalLens — find the best local businesses",
    template: "%s | LocalLens",
  },
  description:
    "Real data, ranked honestly, with tools that answer your real question.",
  applicationName: "LocalLens",
  openGraph: {
    type: "website",
    siteName: "LocalLens",
    locale: "en_GB",
    url: siteUrl("/"),
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-GB">
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
