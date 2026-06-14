import type { Metadata } from "next";
import "@/styles/index.css";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { gardeners } from "@config/verticals/gardeners";

export const metadata: Metadata = {
  title: "LocalLens — find the best local businesses",
  description:
    "Real data, ranked honestly, with tools that answer your real question.",
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
            variables at runtime — one codebase re-skins per vertical. */}
        <ThemeProvider tokens={gardeners.theme}>{children}</ThemeProvider>
      </body>
    </html>
  );
}
