"use client";

import { useMemo, useState } from "react";
import { Card, CardBody, CardHeader, Input } from "@/components/ui/primitives";
import { slugify } from "@/lib/tools/slugify";
import { CopyButton } from "@/components/tools/CopyButton";

/**
 * Interactive island for the slug generator. Pure, client-side transform via
 * `slugify()`; the page's answer-first intro + FAQ render server-side. No
 * network — titles never leave the browser.
 */
export function SlugifyWidget() {
  const [title, setTitle] = useState("");
  const [dropStopWords, setDropStopWords] = useState(false);
  const [separator, setSeparator] = useState<"-" | "_">("-");

  const slug = useMemo(
    () => slugify(title, { dropStopWords, separator }),
    [title, dropStopWords, separator],
  );

  return (
    <Card>
      <CardHeader>
        <h2 className="font-display text-lg font-semibold text-foreground">
          Generate a URL slug
        </h2>
      </CardHeader>
      <CardBody className="space-y-4">
        <div>
          <label htmlFor="slug-title" className="text-sm font-medium text-foreground">
            Title or phrase
          </label>
          <div className="mt-1.5">
            <Input
              id="slug-title"
              placeholder="The Best Free UTM Builder for 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={dropStopWords}
              onChange={(e) => setDropStopWords(e.target.checked)}
              className="h-4 w-4 rounded border"
            />
            Drop stop words
          </label>
          <fieldset className="flex items-center gap-2 text-sm text-foreground">
            <legend className="sr-only">Word separator</legend>
            <span className="text-muted-foreground">Separator:</span>
            <SeparatorToggle
              value="-"
              current={separator}
              onSelect={setSeparator}
              label="hyphen ( - )"
            />
            <SeparatorToggle
              value="_"
              current={separator}
              onSelect={setSeparator}
              label="underscore ( _ )"
            />
          </fieldset>
        </div>

        <div aria-live="polite" className="rounded-lg border bg-muted/40 p-4">
          <p className="text-sm font-medium text-foreground">Slug</p>
          {slug ? (
            <>
              <p className="mt-2 break-all rounded-md bg-background p-3 font-mono text-sm text-foreground">
                {slug}
              </p>
              <div className="mt-3">
                <CopyButton value={slug} label="Copy slug" />
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Type a title above to get a clean, lowercase, SEO-friendly slug.
            </p>
          )}
          {separator === "_" && slug && (
            <p className="mt-3 text-xs text-warning">
              Tip: Google reads underscores as word-joiners. Hyphens are the recommended
              separator for SEO.
            </p>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

function SeparatorToggle({
  value,
  current,
  onSelect,
  label,
}: {
  value: "-" | "_";
  current: "-" | "_";
  onSelect: (v: "-" | "_") => void;
  label: string;
}) {
  const selected = value === current;
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(value)}
      className={
        selected
          ? "rounded-md border border-primary bg-primary/10 px-2.5 py-1 font-medium text-foreground"
          : "rounded-md border bg-background px-2.5 py-1 text-muted-foreground hover:bg-muted"
      }
    >
      {label}
    </button>
  );
}
