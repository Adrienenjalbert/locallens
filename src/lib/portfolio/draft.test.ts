import { describe, it, expect } from "vitest";
import {
  draftSummary,
  formToProject,
  parseMaterials,
  projectReadiness,
  type ProjectForm,
} from "./draft";

function form(overrides: Partial<ProjectForm> = {}): ProjectForm {
  return {
    vertical: "gardeners",
    location: "manchester",
    business: "greenthumb-gardens",
    businessName: "GreenThumb Gardens",
    title: "Modern porcelain patio in Didsbury",
    area: "Didsbury",
    service: "landscaping",
    style: "modern",
    materials: ["porcelain", "composite-decking"],
    images: [
      { url: "https://img.example.com/before.jpg", alt: "", before: true },
      { url: "https://img.example.com/after.jpg", alt: "", after: true },
    ],
    ...overrides,
  };
}

describe("parseMaterials", () => {
  it("splits and slugs a free-text list", () => {
    expect(parseMaterials("Porcelain, Composite Decking")).toEqual([
      "porcelain",
      "composite-decking",
    ]);
  });
  it("drops empties", () => {
    expect(parseMaterials(" , ,")).toEqual([]);
  });
});

describe("draftSummary", () => {
  it("never returns a blank field and mentions area/style/service", () => {
    const s = draftSummary(form());
    expect(s.length).toBeGreaterThan(0);
    expect(s).toContain("Didsbury");
    expect(s.toLowerCase()).toContain("modern");
    expect(s.toLowerCase()).toContain("landscaping");
    const words = s.trim().split(/\s+/).length;
    expect(words).toBeGreaterThanOrEqual(30);
    expect(words).toBeLessThanOrEqual(90);
  });
});

describe("projectReadiness", () => {
  it("passes a complete form", () => {
    expect(projectReadiness(form())).toEqual({ ready: true, missing: [] });
  });
  it("flags a missing photo and title", () => {
    const r = projectReadiness(form({ title: "  ", images: [] }));
    expect(r.ready).toBe(false);
    expect(r.missing).toContain("title");
    expect(r.missing).toContain("at least one photo");
  });
});

describe("formToProject", () => {
  it("drafts a summary when none is supplied and derives the slug", () => {
    const p = formToProject(form());
    expect(p.slug).toBe("modern-porcelain-patio-in-didsbury");
    expect(p.summary).toContain("Didsbury");
    expect(p.completedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(p.lastModified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("respects an explicit summary override", () => {
    const p = formToProject(form({ summary: "Custom summary." }));
    expect(p.summary).toBe("Custom summary.");
  });

  it("drops blank images, defaults alt text, and keeps before/after flags", () => {
    const p = formToProject(
      form({
        images: [
          { url: "  ", alt: "" },
          { url: "https://img.example.com/after.jpg", alt: "", after: true },
        ],
      }),
    );
    expect(p.images).toHaveLength(1);
    expect(p.images[0].after).toBe(true);
    expect(p.images[0].alt).toContain("GreenThumb Gardens");
  });
});
