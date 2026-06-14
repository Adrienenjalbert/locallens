// Pure builders for the JSON-LD that tool pages emit. They return plain objects;
// the caller stringifies them into a <script type="application/ld+json"> tag.
// Keeping them pure keeps them server-renderable and unit-testable.

export interface FaqItem {
  question: string;
  answer: string;
}

/** A Schema.org FAQPage built from the page's FAQ list (AEO: rich results). */
export interface FaqPageJsonLd {
  "@context": "https://schema.org";
  "@type": "FAQPage";
  mainEntity: Array<{
    "@type": "Question";
    name: string;
    acceptedAnswer: { "@type": "Answer"; text: string };
  }>;
}

export function buildFaqPageJsonLd(items: FaqItem[]): FaqPageJsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export interface PriceRangeInput {
  name: string;
  description: string;
  /** ISO 4217, e.g. "GBP". */
  currency: string;
  lowPrice: number;
  highPrice: number;
  /** ISO date the price estimate is valid through (e.g. "2026-12-31"). */
  priceValidUntil?: string;
}

/**
 * A Schema.org Product carrying an AggregateOffer price range, so the estimator
 * result is eligible for price-range rich results and is machine-extractable.
 */
export interface PriceRangeJsonLd {
  "@context": "https://schema.org";
  "@type": "Product";
  name: string;
  description: string;
  offers: {
    "@type": "AggregateOffer";
    priceCurrency: string;
    lowPrice: number;
    highPrice: number;
    offerCount: number;
    priceValidUntil?: string;
  };
}

export function buildPriceRangeJsonLd(input: PriceRangeInput): PriceRangeJsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: input.currency,
      lowPrice: input.lowPrice,
      highPrice: input.highPrice,
      offerCount: 2,
      ...(input.priceValidUntil
        ? { priceValidUntil: input.priceValidUntil }
        : {}),
    },
  };
}

/** Serialise a JSON-LD object for inline injection, escaping `<` to be safe. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
