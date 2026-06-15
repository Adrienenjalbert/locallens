import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/paths";

// Emitted as a static /robots.txt by the export. Beyond the usual allow-all for
// search crawlers, we *explicitly* name the AI answer-engine crawlers and allow
// them: an explicit allow signals consent and raises crawl priority for the
// engines that honour it. These are the bots that actually drive AI citations
// (per 2026 server-log studies) — note llms.txt is intentionally NOT relied on
// here, as the major providers don't fetch it.
const AI_CRAWLERS = [
  "GPTBot", // OpenAI training
  "OAI-SearchBot", // OpenAI ChatGPT search retrieval
  "ChatGPT-User", // ChatGPT live browsing on a user's behalf
  "PerplexityBot", // Perplexity live RAG (references reviews ~100% of the time)
  "Perplexity-User",
  "ClaudeBot", // Anthropic
  "anthropic-ai",
  "Google-Extended", // Gemini / Vertex AI training opt-in
  "Applebot-Extended", // Apple Intelligence
  "CCBot", // Common Crawl (feeds many models)
  "Bytespider", // ByteDance
  "Meta-ExternalAgent", // Meta AI
];

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Default: everything else may crawl everything except private surfaces.
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/app/", "/admin/", "/claim/", "/r/"],
      },
      // AI answer engines: explicit allow on public content.
      {
        userAgent: AI_CRAWLERS,
        allow: "/",
        disallow: ["/app/", "/admin/", "/claim/", "/r/"],
      },
    ],
    sitemap: siteUrl("/sitemap.xml"),
    host: siteUrl("/"),
  };
}
