import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { AnswerBlock } from "@/components/directory/AnswerBlock";
import { ToolCard } from "@/components/tools/ToolCard";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { siteUrl } from "@/lib/paths";
import {
  buildBreadcrumbJsonLd,
  buildCollectionPageJsonLd,
  jsonLdGraph,
} from "@/lib/tools/jsonld";
import {
  activeCategories,
  liveTools,
  toolsByCategory,
  toolPath,
  categoryPath,
} from "@/lib/tools/registry";

const PATH = "/tools/";

export function generateMetadata(): Metadata {
  return buildPageMetadata({
    title: "Free Garden & Everyday Tools — GreenList",
    description:
      "Free, browser-based tools from GreenList: garden cost estimators, concrete and area calculators, plus everyday converters and utilities. For homeowners and garden pros. No signup.",
    path: PATH,
  });
}

export default function ToolsHubPage() {
  const categories = activeCategories();
  const tools = liveTools();
  const url = siteUrl(PATH);

  const collection = buildCollectionPageJsonLd({
    url,
    name: "Free Garden & Everyday Tools",
    description:
      "Free, browser-based tools from GreenList — garden cost estimators, calculators, converters and utilities for homeowners and garden pros. No signup required.",
    items: tools.map((t) => ({ name: t.name, url: siteUrl(toolPath(t.slug)) })),
  });
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: "Home", url: siteUrl("/") },
    { name: "Free tools", url },
  ]);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLdGraph([breadcrumb, collection]),
          }}
        />

        <AnswerBlock
          heading="Free garden & everyday tools"
          answer="A growing toolkit of free, browser-based tools from GreenList — garden cost estimators and project calculators for homeowners, reputation and admin tools for garden pros, plus handy everyday converters and calculators. Every tool runs entirely in your browser: no signup, no account, and nothing you type is ever sent to a server."
        />

        {categories.map((category) => {
          const categoryTools = toolsByCategory(category.slug);
          return (
            <section key={category.slug} className="mt-12">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="font-display text-2xl font-semibold text-foreground">
                    {category.name}
                  </h2>
                  <p className="mt-1 max-w-prose text-sm text-muted-foreground">
                    {category.tagline}
                  </p>
                </div>
                <Link
                  href={categoryPath(category.slug)}
                  className="shrink-0 text-sm font-medium text-primary hover:underline"
                >
                  View all
                </Link>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {categoryTools.map((tool) => (
                  <ToolCard key={tool.slug} tool={tool} />
                ))}
              </div>
            </section>
          );
        })}
      </main>
      <SiteFooter />
    </>
  );
}
