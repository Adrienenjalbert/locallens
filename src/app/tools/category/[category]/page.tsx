import type { Metadata } from "next";
import Link from "next/link";
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
  findCategory,
  toolsByCategory,
  toolPath,
  categoryPath,
} from "@/lib/tools/registry";

interface RouteParams {
  category: string;
}

// Static export: one landing page per category that has at least one live tool.
export function generateStaticParams(): RouteParams[] {
  return activeCategories().map((c) => ({ category: c.slug }));
}

export function generateMetadata({ params }: { params: RouteParams }): Metadata {
  const category = findCategory(params.category);
  if (!category) return { title: "Tools" };
  return buildPageMetadata({
    title: `Free ${category.name} — No Signup`,
    description: category.intro.slice(0, 155),
    path: categoryPath(category.slug),
  });
}

export default function CategoryPage({ params }: { params: RouteParams }) {
  const category = findCategory(params.category);

  if (!category) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Category not found
        </h1>
        <Link href="/tools" className="mt-4 inline-block text-primary hover:underline">
          Browse all free tools
        </Link>
      </main>
    );
  }

  const tools = toolsByCategory(category.slug);
  const url = siteUrl(categoryPath(category.slug));

  const collection = buildCollectionPageJsonLd({
    url,
    name: `Free ${category.name}`,
    description: category.intro,
    items: tools.map((t) => ({ name: t.name, url: siteUrl(toolPath(t.slug)) })),
  });
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: "Home", url: siteUrl("/") },
    { name: "Free tools", url: siteUrl("/tools/") },
    { name: category.name, url },
  ]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdGraph([breadcrumb, collection]),
        }}
      />

      <nav aria-label="Breadcrumb" className="mb-5 text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/tools" className="hover:text-foreground">
              Free tools
            </Link>
          </li>
          <li aria-hidden>›</li>
          <li className="text-foreground">{category.name}</li>
        </ol>
      </nav>

      <AnswerBlock
        heading={`Free ${category.name.toLowerCase()}`}
        answer={category.intro}
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => (
          <ToolCard key={tool.slug} tool={tool} />
        ))}
      </div>
    </main>
  );
}
