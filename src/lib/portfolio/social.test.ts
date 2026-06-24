import { describe, it, expect } from "vitest";
import { buildSocialPack, postWithHashtags, type SocialPackInput } from "./social";
import { findProject } from "./projects";

function input(overrides: Partial<SocialPackInput> = {}): SocialPackInput {
  const project = findProject(
    "gardeners",
    "manchester",
    "greenthumb-gardens",
    "modern-porcelain-patio-didsbury",
  )!;
  return {
    project,
    businessName: "GreenThumb Gardens",
    placeName: "Manchester",
    url: "https://example.com/gardeners/manchester/greenthumb-gardens/work/modern-porcelain-patio-didsbury/",
    ...overrides,
  };
}

describe("buildSocialPack", () => {
  it("produces one post per channel, in publish order", () => {
    const pack = buildSocialPack(input());
    expect(pack.map((p) => p.platform)).toEqual([
      "instagram",
      "facebook",
      "google-business",
      "pinterest",
      "x",
      "reel",
    ]);
  });

  it("leads Instagram with the project title and tags it", () => {
    const ig = buildSocialPack(input()).find((p) => p.platform === "instagram")!;
    expect(ig.body).toContain("Modern porcelain patio in Didsbury");
    expect(ig.hashtags.length).toBeGreaterThan(0);
    // Hashtags are clean: single token, lowercase, leading '#'.
    for (const h of ig.hashtags) expect(h).toMatch(/^#[a-z0-9]+$/);
  });

  it("omits hashtags on Google Business Profile (platform convention)", () => {
    const gbp = buildSocialPack(input()).find((p) => p.platform === "google-business")!;
    expect(gbp.hashtags).toEqual([]);
    expect(gbp.body).toContain("Learn more");
  });

  it("includes the link-back on Facebook and X", () => {
    const pack = buildSocialPack(input());
    const url = input().url;
    expect(pack.find((p) => p.platform === "facebook")!.body).toContain(url);
    expect(pack.find((p) => p.platform === "x")!.body).toContain(url);
  });

  it("keeps the X post within 280 characters", () => {
    const x = buildSocialPack(input()).find((p) => p.platform === "x")!;
    expect(x.body.length).toBeLessThanOrEqual(280);
  });
});

describe("postWithHashtags", () => {
  it("appends hashtags when present", () => {
    const ig = buildSocialPack(input()).find((p) => p.platform === "instagram")!;
    const combined = postWithHashtags(ig);
    expect(combined).toContain(ig.body);
    expect(combined).toContain(ig.hashtags[0]);
  });

  it("returns the body unchanged when there are no hashtags", () => {
    const gbp = buildSocialPack(input()).find((p) => p.platform === "google-business")!;
    expect(postWithHashtags(gbp)).toBe(gbp.body);
  });
});
