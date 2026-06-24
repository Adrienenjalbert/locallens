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
      ...(input.priceValidUntil ? { priceValidUntil: input.priceValidUntil } : {}),
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

export function buildLocalBusinessJsonLd(input: LocalBusinessInput): LocalBusinessJsonLd {
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

export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]): BreadcrumbListJsonLd {
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

// ---------------------------------------------------------------------------
// Portfolio project schema. A `CreativeWork` carrying the project images, the
// owning business as `creator`, and (where present) the verified post-job
// `Review`. This is the unique, machine-extractable unit each project page adds
// to the graph — the proprietary content that makes the pages non-thin.
// ---------------------------------------------------------------------------

export interface CreativeWorkInput {
  /** Absolute URL of the project page (its @id and url). */
  url: string;
  name: string;
  description: string;
  /** Absolute image URLs shown on the page. */
  images: string[];
  /** The business that did the work. */
  creator: { name: string; url: string };
  /** ISO date the project completed. */
  dateCreated?: string;
  /** Human place the work was done, e.g. "Didsbury". */
  locationCreated?: string;
  /** Tags (service, style, materials) — aids topical relevance. */
  keywords?: string[];
  /** A single verified review attached to this project. */
  review?: { author: string; ratingValue: number; reviewBody: string };
}

export interface CreativeWorkJsonLd {
  "@context": "https://schema.org";
  "@type": "CreativeWork";
  "@id": string;
  url: string;
  name: string;
  description: string;
  image: string[];
  creator: { "@type": "LocalBusiness"; name: string; url: string };
  dateCreated?: string;
  locationCreated?: { "@type": "Place"; name: string };
  keywords?: string;
  review?: {
    "@type": "Review";
    author: { "@type": "Person"; name: string };
    reviewRating: { "@type": "Rating"; ratingValue: number; bestRating: 5 };
    reviewBody: string;
  };
}

export function buildCreativeWorkJsonLd(input: CreativeWorkInput): CreativeWorkJsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    "@id": input.url,
    url: input.url,
    name: input.name,
    description: input.description,
    image: input.images,
    creator: { "@type": "LocalBusiness", name: input.creator.name, url: input.creator.url },
    ...(input.dateCreated ? { dateCreated: input.dateCreated } : {}),
    ...(input.locationCreated
      ? { locationCreated: { "@type": "Place" as const, name: input.locationCreated } }
      : {}),
    ...(input.keywords && input.keywords.length
      ? { keywords: input.keywords.join(", ") }
      : {}),
    ...(input.review
      ? {
          review: {
            "@type": "Review" as const,
            author: { "@type": "Person" as const, name: input.review.author },
            reviewRating: {
              "@type": "Rating" as const,
              ratingValue: input.review.ratingValue,
              bestRating: 5 as const,
            },
            reviewBody: input.review.reviewBody,
          },
        }
      : {}),
  };
}

// ---------------------------------------------------------------------------
// Free-tool directory schema. `SoftwareApplication` is the unit answer engines
// and Google use to describe a web tool/utility; pairing it with a free
// `Offer` (price 0) is what makes "free {tool}" queries eligible to cite us.
// ---------------------------------------------------------------------------

export interface SoftwareApplicationInput {
  /** Absolute URL of the tool page (its @id and url). */
  url: string;
  name: string;
  description: string;
  /** e.g. "SEO tools" / "Marketing tools" — human category label. */
  applicationCategory: string;
  /** ISO date the tool last changed (freshness signal). */
  dateModified?: string;
}

/**
 * A Schema.org SoftwareApplication describing a free, browser-based tool. The
 * zero-price Offer is the signal that lets it surface for "free X" queries.
 */
export interface SoftwareApplicationJsonLd {
  "@context": "https://schema.org";
  "@type": "SoftwareApplication";
  "@id": string;
  url: string;
  name: string;
  description: string;
  applicationCategory: string;
  operatingSystem: "Any";
  offers: { "@type": "Offer"; price: "0"; priceCurrency: "USD" };
  dateModified?: string;
}

export function buildSoftwareApplicationJsonLd(
  input: SoftwareApplicationInput,
): SoftwareApplicationJsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": input.url,
    url: input.url,
    name: input.name,
    description: input.description,
    applicationCategory: input.applicationCategory,
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    ...(input.dateModified ? { dateModified: input.dateModified } : {}),
  };
}

/**
 * A Schema.org CollectionPage with an embedded ItemList — the unit answer
 * engines extract for "free {category} tools" listing queries (the hub +
 * category pages). Mirrors exactly how the list renders to the user.
 */
export interface CollectionPageJsonLd {
  "@context": "https://schema.org";
  "@type": "CollectionPage";
  "@id": string;
  url: string;
  name: string;
  description: string;
  mainEntity: ItemListJsonLd;
}

export function buildCollectionPageJsonLd(input: {
  url: string;
  name: string;
  description: string;
  items: ItemListEntry[];
}): CollectionPageJsonLd {
  const mainEntity = buildItemListJsonLd(input.items);
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": input.url,
    url: input.url,
    name: input.name,
    description: input.description,
    mainEntity,
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
