import type { VerticalConfig } from "./types";
import { gardeners } from "./verticals/gardeners";

export * from "./types";

export const VERTICALS: Record<string, VerticalConfig> = {
  gardeners,
};

export function getVertical(slug: string): VerticalConfig | undefined {
  return VERTICALS[slug];
}
