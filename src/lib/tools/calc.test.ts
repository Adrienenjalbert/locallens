import { describe, expect, it } from "vitest";
import {
  addVat,
  removeVat,
  percentOf,
  percentChange,
  applyDiscount,
  calculateAge,
  daysBetween,
  weeksBetween,
  bmr,
  tdee,
  concreteVolumeM3,
} from "@/lib/tools/calc";

describe("VAT (UK 20%)", () => {
  it("adds VAT", () => {
    const r = addVat(100);
    expect(r.vat).toBeCloseTo(20, 6);
    expect(r.gross).toBeCloseTo(120, 6);
  });
  it("removes VAT and round-trips", () => {
    const r = removeVat(120);
    expect(r.net).toBeCloseTo(100, 6);
    expect(r.vat).toBeCloseTo(20, 6);
  });
});

describe("percentages", () => {
  it("X% of Y", () => {
    expect(percentOf(15, 200)).toBe(30);
  });
  it("percent change", () => {
    expect(percentChange(50, 75)).toBeCloseTo(50, 6);
    expect(percentChange(80, 60)).toBeCloseTo(-25, 6);
    expect(percentChange(0, 10)).toBeNaN();
  });
  it("applies a discount", () => {
    expect(applyDiscount(80, 25)).toBe(60);
  });
});

describe("age + dates", () => {
  it("computes calendar age", () => {
    const age = calculateAge(new Date("1990-06-15"), new Date("2026-06-15"));
    expect(age.years).toBe(36);
    expect(age.months).toBe(0);
    expect(age.days).toBe(0);
  });
  it("borrows correctly when the day hasn't arrived", () => {
    const age = calculateAge(new Date("2000-01-20"), new Date("2026-03-10"));
    expect(age.years).toBe(26);
    expect(age.months).toBe(1);
    expect(age.days).toBe(18);
  });
  it("days + weeks between dates", () => {
    expect(daysBetween(new Date("2026-01-01"), new Date("2026-01-15"))).toBe(14);
    expect(weeksBetween(new Date("2026-01-01"), new Date("2026-01-16"))).toEqual({
      weeks: 2,
      days: 1,
    });
  });
});

describe("BMR + TDEE (Mifflin-St Jeor)", () => {
  it("male BMR", () => {
    // 10*80 + 6.25*180 - 5*30 + 5 = 1780
    expect(bmr({ sex: "male", weightKg: 80, heightCm: 180, ageYears: 30 })).toBeCloseTo(
      1780,
      6,
    );
  });
  it("female BMR", () => {
    // 10*65 + 6.25*165 - 5*30 - 161 = 1370.25
    expect(bmr({ sex: "female", weightKg: 65, heightCm: 165, ageYears: 30 })).toBeCloseTo(
      1370.25,
      6,
    );
  });
  it("TDEE applies the activity factor", () => {
    const t = tdee({
      sex: "male",
      weightKg: 80,
      heightCm: 180,
      ageYears: 30,
      activity: "moderate",
    });
    expect(t).toBeCloseTo(1780 * 1.55, 4);
  });
});

describe("concrete", () => {
  it("slab volume in m³", () => {
    expect(concreteVolumeM3(4, 3, 0.1)).toBeCloseTo(1.2, 6);
  });
});
