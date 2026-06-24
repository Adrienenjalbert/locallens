"use client";

import { useMemo, useState } from "react";
import { Card, CardBody, CardHeader, Input } from "@/components/ui/primitives";
import {
  approxTitlePixels,
  TITLE_PIXEL_LIMIT,
  DESCRIPTION_CHAR_LIMIT,
} from "@/lib/tools/slugify";
import { CopyButton } from "@/components/tools/CopyButton";

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildMarkup(input: {
  title: string;
  description: string;
  url: string;
  image: string;
}): string {
  const t = escapeAttr(input.title);
  const d = escapeAttr(input.description);
  const u = escapeAttr(input.url);
  const img = escapeAttr(input.image);
  const lines = [
    `<title>${t}</title>`,
    `<meta name="description" content="${d}" />`,
    `<link rel="canonical" href="${u}" />`,
    "",
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${t}" />`,
    `<meta property="og:description" content="${d}" />`,
    `<meta property="og:url" content="${u}" />`,
    img ? `<meta property="og:image" content="${img}" />` : null,
    "",
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${t}" />`,
    `<meta name="twitter:description" content="${d}" />`,
    img ? `<meta name="twitter:image" content="${img}" />` : null,
  ].filter((l): l is string => l !== null);
  return lines.join("\n");
}

function prettyHost(url: string): string {
  try {
    const { hostname, pathname } = new URL(url);
    const crumbs = pathname.split("/").filter(Boolean);
    return [hostname, ...crumbs].join(" › ");
  } catch {
    return url || "example.com";
  }
}

/**
 * Interactive island for the meta tag / Open Graph generator. Produces copy-
 * paste-ready markup and a live Google + social preview, with pixel/character
 * length checks. Fully client-side; the answer-first intro + FAQ render around
 * it on the server for crawlability (AEO).
 */
export function MetaPreviewWidget() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [image, setImage] = useState("");

  const titlePixels = useMemo(() => approxTitlePixels(title), [title]);
  const titleOver = titlePixels > TITLE_PIXEL_LIMIT;
  const descOver = description.length > DESCRIPTION_CHAR_LIMIT;

  const markup = useMemo(
    () => buildMarkup({ title, description, url, image }),
    [title, description, url, image],
  );
  const hasContent = Boolean(title || description);

  return (
    <Card>
      <CardHeader>
        <h2 className="font-display text-lg font-semibold text-foreground">
          Generate meta &amp; Open Graph tags
        </h2>
      </CardHeader>
      <CardBody className="space-y-4">
        <div>
          <label
            htmlFor="meta-title"
            className="flex items-center justify-between text-sm font-medium text-foreground"
          >
            <span>Title tag</span>
            <span className={titleOver ? "text-danger" : "text-muted-foreground"}>
              ~{titlePixels}px / {TITLE_PIXEL_LIMIT}px
            </span>
          </label>
          <div className="mt-1.5">
            <Input
              id="meta-title"
              placeholder="Free UTM Builder — Campaign URL Generator"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          {titleOver && (
            <p className="mt-1 text-xs text-danger">
              Title may be truncated in Google. Aim for ~50–60 characters.
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="meta-desc"
            className="flex items-center justify-between text-sm font-medium text-foreground"
          >
            <span>Meta description</span>
            <span className={descOver ? "text-danger" : "text-muted-foreground"}>
              {description.length} / {DESCRIPTION_CHAR_LIMIT}
            </span>
          </label>
          <div className="mt-1.5">
            <textarea
              id="meta-desc"
              rows={3}
              placeholder="Build consistent, trackable UTM campaign URLs in seconds. Free, no signup."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          {descOver && (
            <p className="mt-1 text-xs text-danger">
              Description may be truncated. Aim for ~150–160 characters.
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="meta-url" className="text-sm font-medium text-foreground">
              Page URL
            </label>
            <div className="mt-1.5">
              <Input
                id="meta-url"
                inputMode="url"
                placeholder="https://example.com/tools/utm-builder"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label htmlFor="meta-image" className="text-sm font-medium text-foreground">
              Social image URL (optional)
            </label>
            <div className="mt-1.5">
              <Input
                id="meta-image"
                inputMode="url"
                placeholder="https://example.com/og.png"
                value={image}
                onChange={(e) => setImage(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Live Google result preview */}
        <div>
          <p className="text-sm font-medium text-foreground">Google preview</p>
          <div className="mt-2 rounded-lg border bg-background p-4">
            <p className="truncate text-xs text-muted-foreground">{prettyHost(url)}</p>
            <p className="mt-0.5 truncate text-lg text-[#1a0dab] dark:text-blue-400">
              {title || "Your title tag appears here"}
            </p>
            <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
              {description ||
                "Your meta description appears here. Make it compelling to improve click-through rate."}
            </p>
          </div>
        </div>

        {/* Copy-paste markup */}
        <div aria-live="polite" className="rounded-lg border bg-muted/40 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">
              HTML to paste in &lt;head&gt;
            </p>
            {hasContent && <CopyButton value={markup} label="Copy markup" />}
          </div>
          {hasContent ? (
            <pre className="mt-2 overflow-x-auto rounded-md bg-background p-3 text-xs leading-relaxed text-foreground">
              <code>{markup}</code>
            </pre>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Add a title and description to generate copy-paste-ready meta and Open Graph
              tags.
            </p>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
