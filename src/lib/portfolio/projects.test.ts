import { describe, it, expect } from "vitest";
import {
  allProjects,
  findProject,
  ideasPath,
  projectPath,
  projectStyles,
  projectsForBusiness,
  projectsForStyle,
  relatedProjects,
} from "./projects";

const WEDGE = {
  vertical: "gardeners",
  location: "manchester",
  business: "greenthumb-gardens",
} as const;

describe("projectsForBusiness", () => {
  it("returns the business's projects newest-first", () => {
    const list = projectsForBusiness(WEDGE.vertical, WEDGE.location, WEDGE.business);
    expect(list.length).toBeGreaterThanOrEqual(3);
    // Sorted by completedAt descending.
    for (let i = 1; i < list.length; i++) {
      expect(list[i - 1].completedAt >= list[i].completedAt).toBe(true);
    }
    expect(list[0].slug).toBe("modern-porcelain-patio-didsbury");
  });

  it("returns nothing for an unknown business", () => {
    expect(projectsForBusiness(WEDGE.vertical, WEDGE.location, "nope")).toEqual([]);
  });
});

describe("findProject", () => {
  it("finds a seeded project", () => {
    const p = findProject(
      WEDGE.vertical,
      WEDGE.location,
      WEDGE.business,
      "full-lawn-renovation-chorlton",
    );
    expect(p?.title).toContain("lawn renovation");
  });

  it("returns undefined for an unknown slug", () => {
    expect(findProject(WEDGE.vertical, WEDGE.location, WEDGE.business, "ghost")).toBeUndefined();
  });
});

describe("projectStyles + projectsForStyle", () => {
  it("lists distinct styles, sorted", () => {
    expect(projectStyles()).toEqual(["cottage", "low-maintenance", "modern"]);
  });

  it("groups projects by style", () => {
    const modern = projectsForStyle("modern");
    expect(modern.every((p) => p.style === "modern")).toBe(true);
    expect(modern.length).toBeGreaterThan(0);
  });
});

describe("relatedProjects (hub-and-spoke linking)", () => {
  it("excludes the project itself and only returns scored matches", () => {
    const patio = findProject(
      WEDGE.vertical,
      WEDGE.location,
      WEDGE.business,
      "modern-porcelain-patio-didsbury",
    )!;
    const related = relatedProjects(patio);
    expect(related.some((p) => p.slug === patio.slug)).toBe(false);
    // The cottage border shares the landscaping service, so it qualifies; the
    // lawn renovation shares neither style nor service, so it is excluded.
    expect(related.map((p) => p.slug)).toContain("cottage-border-planting-sale");
    expect(related.map((p) => p.slug)).not.toContain("full-lawn-renovation-chorlton");
  });

  it("respects the limit", () => {
    const patio = allProjects()[0];
    expect(relatedProjects(patio, 1).length).toBeLessThanOrEqual(1);
  });
});

describe("path helpers", () => {
  it("builds trailing-slash project paths", () => {
    const p = allProjects()[0];
    const path = projectPath(p);
    expect(path.startsWith("/gardeners/manchester/")).toBe(true);
    expect(path.endsWith("/")).toBe(true);
    expect(path).toContain("/work/");
  });

  it("builds ideas paths", () => {
    expect(ideasPath("modern")).toBe("/ideas/modern/");
  });
});
