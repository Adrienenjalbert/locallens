import type { BusinessCardData } from "@/components/directory/BusinessCard";

// Server-safe directory data (no "use client"): both the client LocationPage and
// the server page.tsx (which builds the ItemList/LocalBusiness JSON-LD) import
// from here, so the machine-readable schema can never drift from the visible
// shortlist. In production this is materialised from golden records.
export const SHORTLIST: BusinessCardData[] = [
  {
    name: "GreenThumb Gardens",
    qualityScore: 91,
    rating: 4.9,
    reviewCount: 412,
    locationName: "Manchester",
    topServices: ["lawn-care", "landscaping", "hedge-trimming"],
    featured: true,
  },
  {
    name: "Urban Roots",
    qualityScore: 84,
    rating: 4.7,
    reviewCount: 188,
    locationName: "Manchester",
    topServices: ["garden-clearance", "lawn-care"],
  },
  {
    name: "Petal & Spade",
    qualityScore: 78,
    rating: 4.8,
    reviewCount: 96,
    locationName: "Manchester",
    topServices: ["landscaping", "tree-surgery"],
  },
];

/** Slugify a business name to its profile path segment (matches generateStaticParams). */
export function businessSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
