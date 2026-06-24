import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { Hero } from "@/components/marketing/Hero";
import { FocusSection } from "@/components/marketing/FocusSection";
import { ToolsShowcase } from "@/components/marketing/ToolsShowcase";
import { VerticalsSection } from "@/components/marketing/VerticalsSection";
import { StatStrip } from "@/components/marketing/StatStrip";
import { WhySection } from "@/components/marketing/WhySection";
import { IntegrationsSection } from "@/components/marketing/IntegrationsSection";
import { SocialProof } from "@/components/marketing/SocialProof";
import { CtaSection } from "@/components/marketing/CtaSection";
import { siteUrl } from "@/lib/paths";
import { jsonLdGraph } from "@/lib/tools/jsonld";

// Organization + WebSite JSON-LD so the brand is machine-extractable in the
// statically-exported HTML for entity recognition (blueprint §5.4). Built inline
// (these shapes are homepage-specific) and merged into one @graph document. No
// fabricated aggregateRating — we only publish signals we can defend.
function homeJsonLd(): string {
  const url = siteUrl("/");
  return jsonLdGraph([
    {
      "@type": "Organization",
      "@id": `${url}#organization`,
      name: "GreenList",
      url,
      description:
        "A trust-led directory of gardeners and landscapers, ranking pros on portfolios, decoded reviews and a legitimacy score, with free tools for homeowners and pros.",
      slogan: "Proof, not promises.",
    },
    {
      "@type": "WebSite",
      "@id": `${url}#website`,
      url,
      name: "GreenList",
      description:
        "Find a trusted local gardener or landscaper — ranked on real proof of work and honest reviews.",
      publisher: { "@id": `${url}#organization` },
    },
  ]);
}

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: homeJsonLd() }}
      />
      <SiteHeader />
      <main>
        <Hero />
        <FocusSection />
        <ToolsShowcase />
        <VerticalsSection />
        <StatStrip />
        <WhySection />
        <IntegrationsSection />
        <SocialProof />
        <CtaSection />
      </main>
      <SiteFooter />
    </>
  );
}
