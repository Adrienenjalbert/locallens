import { describe, expect, it } from "vitest";
import { CONVERSIONS, findConversion, formatResult } from "@/lib/tools/convert";

describe("formatResult", () => {
  it("trims trailing zeros", () => {
    expect(formatResult(2.5, 4)).toBe("2.5");
    expect(formatResult(3, 4)).toBe("3");
    expect(formatResult(1.23456, 2)).toBe("1.23");
  });
  it("handles non-finite input", () => {
    expect(formatResult(NaN)).toBe("");
    expect(formatResult(Infinity)).toBe("");
  });
});

describe("conversions", () => {
  it("kg→lbs uses the standard factor", () => {
    const c = findConversion("kg-to-lbs")!;
    expect(c.convert(1)).toBeCloseTo(2.2046226, 5);
  });

  it("°C→°F is affine (not linear)", () => {
    const c = findConversion("celsius-to-fahrenheit")!;
    expect(c.convert(0)).toBeCloseTo(32, 6);
    expect(c.convert(100)).toBeCloseTo(212, 6);
    expect(c.convert(37)).toBeCloseTo(98.6, 6);
  });

  it("miles→km uses the exact factor", () => {
    expect(findConversion("miles-to-km")!.convert(1)).toBeCloseTo(1.609344, 6);
  });

  it("litres→imperial gallons (UK)", () => {
    // 4.54609 L = 1 imperial gallon
    expect(findConversion("litres-to-gallons")!.convert(4.54609)).toBeCloseTo(1, 5);
  });

  it("every conversion round-trips via invert()", () => {
    for (const c of CONVERSIONS) {
      const v = 42.5;
      expect(c.invert(c.convert(v))).toBeCloseTo(v, 6);
    }
  });

  it("convert matches the reverse page's convert (inverse symmetry)", () => {
    for (const c of CONVERSIONS) {
      if (!c.reverseSlug) continue;
      const reverse = findConversion(c.reverseSlug);
      expect(reverse, `reverse page ${c.reverseSlug} should exist`).toBeDefined();
      // The reverse page's forward conversion equals this page's invert.
      expect(reverse!.convert(123.4)).toBeCloseTo(c.invert(123.4), 6);
    }
  });

  it("slugs are unique", () => {
    const slugs = CONVERSIONS.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
