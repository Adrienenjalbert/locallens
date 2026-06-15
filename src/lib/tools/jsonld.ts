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

// ---------------------------------------------------------------------------
// Local + navigational schema (AEO: required for local AI Overviews to cite us,
// and the units answer engines extract for "best X in Y" / "X vs Y" queries).
// ---------------------------------------------------------------------------

export interface LocalBusinessInput {
  /** Absolute URL of the business profile page (its @id and url). */
  url: string;
  name: string;
  description: string;
  /** Town/city served, e.g. "Manchester". */
  areaServed: string;
  /** Human price band, e.g. "££" or "£30–£55". */
  priceRange?: string;
  rating?: { ratingValue: number; reviewCount: number };
  /** ISO date the underlying record last changed (freshness signal). */
  dateModified?: string;
}

/**
 * A Schema.org LocalBusiness — the schema local AI answer engines require before
 * they'll consider citing a business for a geographic query. Carries the
 * aggregate rating (the dominant local trust signal AI engines cross-reference).
 */
export interface LocalBusinessJsonLd {
  "@context": "https://schema.org";
  "@type": "LocalBusiness";
  "@id": string;
  url: string;
  name: string;
  description: string;
  areaServed: { "@type": "City"; name: string };
  priceRange?: string;
  aggregateRating?: {
    "@type": "AggregateRating";
    ratingValue: number;
    reviewCount: number;
  };
  dateModified?: string;
}

export function buildLocalBusinessJsonLd(
  input: LocalBusinessInput,
): LocalBusinessJsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": input.url,
    url: input.url,
    name: input.name,
    description: input.description,
    areaServed: { "@type": "City", name: input.areaServed },
    ...(input.priceRange ? { priceRange: input.priceRange } : {}),
    ...(input.rating
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: input.rating.ratingValue,
            reviewCount: input.rating.reviewCount,
          },
        }
      : {}),
    ...(input.dateModified ? { dateModified: input.dateModified } : {}),
  };
}

export interface BreadcrumbItem {
  name: string;
  /** Absolute URL of the crumb. */
  url: string;
}

/** A Schema.org BreadcrumbList so engines understand the vertical→location→profile hierarchy. */
export interface BreadcrumbListJsonLd {
  "@context": "https://schema.org";
  "@type": "BreadcrumbList";
  itemListElement: Array<{
    "@type": "ListItem";
    position: number;
    name: string;
    item: string;
  }>;
}

export function buildBreadcrumbJsonLd(
  items: BreadcrumbItem[],
): BreadcrumbListJsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export interface ItemListEntry {
  name: string;
  /** Absolute URL of the listed item (its profile page). */
  url: string;
}

/**
 * A Schema.org ItemList of the ranked shortlist. This is the unit AI Overviews
 * extract for "best {vertical} in {location}" queries — an ordered, named,
 * linkable list mirrors exactly how the answer is rendered to the user.
 */
export interface ItemListJsonLd {
  "@context": "https://schema.org";
  "@type": "ItemList";
  itemListOrder: "https://schema.org/ItemListOrderDescending";
  numberOfItems: number;
  itemListElement: Array<{
    "@type": "ListItem";
    position: number;
    name: string;
    url: string;
  }>;
}

export function buildItemListJsonLd(entries: ItemListEntry[]): ItemListJsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    numberOfItems: entries.length,
    itemListElement: entries.map((entry, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: entry.name,
      url: entry.url,
    })),
  };
}

/** Serialise a JSON-LD object for inline injection, escaping `<` to be safe. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/**
 * Combine multiple JSON-LD objects into one `@graph` document, so a page emits a
 * single <script> tag carrying every entity (breadcrumb + list + businesses).
 */
export function jsonLdGraph(nodes: unknown[]): string {
  return jsonLdScript({ "@context": "https://schema.org", "@graph": nodes });
}
