import Link from "next/link";
import { AnswerBlock } from "@/components/directory/AnswerBlock";
import { FaqBlock } from "@/components/tools/FaqBlock";
import { UtmBuilderWidget } from "@/components/tools/UtmBuilderWidget";
import { SlugifyWidget } from "@/components/tools/SlugifyWidget";
import { MetaPreviewWidget } from "@/components/tools/MetaPreviewWidget";
import { ConverterWidget } from "@/components/tools/ConverterWidget";
import { VatCalculatorWidget } from "@/components/tools/VatCalculatorWidget";
import { TdeeCalculatorWidget } from "@/components/tools/TdeeCalculatorWidget";
import { AgeCalculatorWidget } from "@/components/tools/AgeCalculatorWidget";
import { DaysBetweenWidget } from "@/components/tools/DaysBetweenWidget";
import { PercentageCalculatorWidget } from "@/components/tools/PercentageCalculatorWidget";
import { ConcreteCalculatorWidget } from "@/components/tools/ConcreteCalculatorWidget";
import { WordCounterWidget } from "@/components/tools/WordCounterWidget";
import { CaseConverterWidget } from "@/components/tools/CaseConverterWidget";
import { UuidGeneratorWidget } from "@/components/tools/UuidGeneratorWidget";
import {
  buildBreadcrumbJsonLd,
  buildSoftwareApplicationJsonLd,
  jsonLdGraph,
} from "@/lib/tools/jsonld";
import { siteUrl } from "@/lib/paths";
import {
  type ToolDefinition,
  TOOL_CATEGORIES,
  categoryPath,
  toolPath,
} from "@/lib/tools/registry";

/** Map a tool's `kind` to its interactive client widget. */
function ToolWidget({ tool }: { tool: ToolDefinition }) {
  switch (tool.kind) {
    case "utm-builder":
      return <UtmBuilderWidget />;
    case "slugify":
      return <SlugifyWidget />;
    case "meta-preview":
      return <MetaPreviewWidget />;
    case "converter":
      return <ConverterWidget slug={tool.conversionSlug ?? tool.slug} />;
    case "vat-calculator":
      return <VatCalculatorWidget />;
    case "tdee-calculator":
      return <TdeeCalculatorWidget />;
    case "age-calculator":
      return <AgeCalculatorWidget />;
    case "days-between":
      return <DaysBetweenWidget />;
    case "percentage-calculator":
      return <PercentageCalculatorWidget />;
    case "concrete-calculator":
      return <ConcreteCalculatorWidget />;
    case "word-counter":
      return <WordCounterWidget />;
    case "case-converter":
      return <CaseConverterWidget />;
    case "uuid-generator":
      return <UuidGeneratorWidget />;
    default: {
      const _exhaustive: never = tool.kind;
      return _exhaustive;
    }
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Shared shell for every free-tool page: breadcrumb → answer-first hero → the
 * interactive widget → FAQ. Emits the SoftwareApplication + BreadcrumbList
 * JSON-LD (and FaqBlock emits FAQPage) so each page is AI-citation eligible.
 * The hero + FAQ render server-side; only the widget hydrates on the client.
 */
export function ToolPageShell({ tool }: { tool: ToolDefinition }) {
  const category = TOOL_CATEGORIES[tool.category];
  const url = siteUrl(toolPath(tool.slug));

  const breadcrumb = buildBreadcrumbJsonLd([
    { name: "Home", url: siteUrl("/") },
    { name: "Free tools", url: siteUrl("/tools/") },
    { name: category.name, url: siteUrl(categoryPath(category.slug)) },
    { name: tool.name, url },
  ]);

  const software = buildSoftwareApplicationJsonLd({
    url,
    name: tool.name,
    description: tool.description,
    applicationCategory: category.name,
    dateModified: tool.lastModified,
  });

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdGraph([breadcrumb, software]),
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
          <li>
            <Link href={categoryPath(category.slug)} className="hover:text-foreground">
              {category.name}
            </Link>
          </li>
          <li aria-hidden>›</li>
          <li className="text-foreground">{tool.name}</li>
        </ol>
      </nav>

      <AnswerBlock heading={tool.name} answer={tool.answer} />

      <p className="mt-3 text-xs text-muted-foreground">
        Updated {formatDate(tool.lastModified)} · Free · No signup · Runs in your browser
      </p>

      <div className="mt-6">
        <ToolWidget tool={tool} />
      </div>

      <section className="mt-10">
        <FaqBlock items={tool.faq} />
      </section>
    </main>
  );
}
