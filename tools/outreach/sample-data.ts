// Sample prospects for --dry-run and key-less runs, so the engine is
// demonstrable without spending a penny. These are illustrative, not real leads.

import type { Prospect } from "./types";

export const SAMPLE_PROSPECTS: Omit<Prospect, "town" | "query">[] = [
  {
    name: "Greenblade Garden Services",
    website: "https://example-greenblade.co.uk",
    phone: "0131 555 0101",
    email: "info@example-greenblade.co.uk",
    address: "12 Mock Street, Sampletown",
    category: "Landscaper",
    rating: 4.8,
    reviewCount: 37,
    placeId: "sample-1",
  },
  {
    name: "Hedgerow & Lawn Co",
    website: "http://example-hedgerow.co.uk", // intentionally http (no HTTPS)
    phone: "0131 555 0102",
    address: "5 Demo Road, Sampletown",
    category: "Gardener",
    rating: 4.5,
    reviewCount: 9,
    placeId: "sample-2",
  },
  {
    name: "Thistle Landscapes",
    website: undefined, // no website at all — strong prospect
    phone: "0131 555 0103",
    category: "Landscaping service",
    rating: 4.9,
    reviewCount: 64,
    placeId: "sample-3",
  },
  {
    name: "Oakleaf Grounds Maintenance",
    website: "https://example-oakleaf.co.uk",
    phone: "0131 555 0104",
    email: "hello@example-oakleaf.co.uk",
    category: "Landscaper",
    rating: 4.2,
    reviewCount: 3,
    placeId: "sample-4",
  },
  {
    name: "City Gardens Ltd",
    website: "https://example-citygardens.co.uk",
    phone: "0131 555 0105",
    category: "Garden designer",
    rating: 4.7,
    reviewCount: 21,
    placeId: "sample-5",
  },
];
