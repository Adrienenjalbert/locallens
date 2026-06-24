import { describe, it, expect } from "vitest";
import { formatMonthYear, humanize, slugify, titleCaseSlug } from "./format";

describe("humanize", () => {
  it("turns a slug into a single-capitalised label", () => {
    expect(humanize("lawn-care")).toBe("Lawn care");
    expect(humanize("low-maintenance")).toBe("Low maintenance");
  });
});

describe("titleCaseSlug", () => {
  it("capitalises every word", () => {
    expect(titleCaseSlug("greenthumb-gardens")).toBe("Greenthumb Gardens");
  });
});

describe("slugify", () => {
  it("lowercases, strips punctuation/accents and hyphenates", () => {
    expect(slugify("Modern Porcelain Patio in Didsbury!")).toBe(
      "modern-porcelain-patio-in-didsbury",
    );
    expect(slugify("Café & Lawn")).toBe("cafe-and-lawn");
  });
});

describe("formatMonthYear", () => {
  it("formats a valid ISO date", () => {
    expect(formatMonthYear("2026-05-20")).toBe("May 2026");
  });
  it("returns undefined for empty or invalid input", () => {
    expect(formatMonthYear(undefined)).toBeUndefined();
    expect(formatMonthYear("not-a-date")).toBeUndefined();
  });
});
