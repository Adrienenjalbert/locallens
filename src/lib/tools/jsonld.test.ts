import { describe, expect, it } from "vitest";
import {
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildItemListJsonLd,
  buildLocalBusinessJsonLd,
  jsonLdGraph,
  jsonLdScript,
} from "./jsonld";

describe("buildFaqPageJsonLd", () => {
  it("maps items to Question/Answer pairs", () => {
    const ld = buildFaqPageJsonLd([{ question: "Q?", answer: "A." }]);
    expect(ld["@type"]).toBe("FAQPage");
    expect(ld.mainEntity[0]).toMatchObject({
      "@type": "Question",
      name: "Q?",
      acceptedAnswer: { "@type": "Answer", text: "A." },
    });
  });
});

describe("buildLocalBusinessJsonLd", () => {
  it("emits areaServed and aggregateRating when a rating is supplied", () => {
    const ld = buildLocalBusinessJsonLd({
      url: "https://example.com/gardeners/manchester/greenthumb/",
      name: "GreenThumb",
      description: "Top gardener in Manchester.",
      areaServed: "Manchester",
      priceRange: "££",
      rating: { ratingValue: 4.9, reviewCount: 412 },
      dateModified: "2026-06-12",
    });
    expect(ld["@type"]).toBe("LocalBusiness");
    expect(ld.areaServed).toEqual({ "@type": "City", name: "Manchester" });
    expect(ld.aggregateRating).toMatchObject({
      "@type": "AggregateRating",
      ratingValue: 4.9,
      reviewCount: 412,
    });
    expect(ld.dateModified).toBe("2026-06-12");
  });

  it("omits optional fields when absent", () => {
    const ld = buildLocalBusinessJsonLd({
      url: "https://example.com/x/",
      name: "X",
      description: "d",
      areaServed: "Leeds",
    });
    expect(ld.aggregateRating).toBeUndefined();
    expect(ld.priceRange).toBeUndefined();
    expect(ld.dateModified).toBeUndefined();
  });
});

describe("buildBreadcrumbJsonLd", () => {
  it("numbers positions from 1", () => {
    const ld = buildBreadcrumbJsonLd([
      { name: "Home", url: "https://example.com/" },
      { name: "Manchester", url: "https://example.com/gardeners/manchester/" },
    ]);
    expect(ld.itemListElement.map((e) => e.position)).toEqual([1, 2]);
    expect(ld.itemListElement[1]).toMatchObject({
      name: "Manchester",
      item: "https://example.com/gardeners/manchester/",
    });
  });
});

describe("buildItemListJsonLd", () => {
  it("orders descending and counts items", () => {
    const ld = buildItemListJsonLd([
      { name: "A", url: "https://example.com/a/" },
      { name: "B", url: "https://example.com/b/" },
    ]);
    expect(ld.numberOfItems).toBe(2);
    expect(ld.itemListOrder).toBe("https://schema.org/ItemListOrderDescending");
    expect(ld.itemListElement[0]).toMatchObject({ position: 1, name: "A" });
  });
});

describe("serialisation", () => {
  it("escapes < to prevent breaking out of the script tag", () => {
    expect(jsonLdScript({ x: "</script>" })).not.toContain("</script>");
    expect(jsonLdScript({ x: "<" })).toContain("\\u003c");
  });

  it("wraps nodes in a @graph", () => {
    const out = jsonLdGraph([{ "@type": "Thing" }]);
    const parsed = JSON.parse(out);
    expect(parsed["@context"]).toBe("https://schema.org");
    expect(parsed["@graph"]).toHaveLength(1);
  });
});
