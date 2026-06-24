"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader, Button } from "@/components/ui/primitives";
import { CopyButton } from "@/components/tools/CopyButton";
import {
  toUpper,
  toLower,
  toCapitalCase,
  toTitleCase,
  toSentenceCase,
  reverseText,
  removeLineBreaks,
} from "@/lib/tools/text";

const TRANSFORMS: { label: string; fn: (t: string) => string }[] = [
  { label: "UPPERCASE", fn: toUpper },
  { label: "lowercase", fn: toLower },
  { label: "Title Case", fn: toTitleCase },
  { label: "Capital Case", fn: toCapitalCase },
  { label: "Sentence case", fn: toSentenceCase },
  { label: "Reverse", fn: reverseText },
  { label: "Remove line breaks", fn: removeLineBreaks },
];

/**
 * Case converter + text transforms. Applies a transform in place so output can
 * be chained or copied. Client-side only; answer-first + FAQ on the server.
 */
export function CaseConverterWidget() {
  const [text, setText] = useState("");

  return (
    <Card>
      <CardHeader>
        <h2 className="font-display text-lg font-semibold text-foreground">
          Convert text case
        </h2>
      </CardHeader>
      <CardBody className="space-y-4">
        <label htmlFor="case-text" className="sr-only">
          Text to convert
        </label>
        <textarea
          id="case-text"
          rows={6}
          placeholder="Type or paste your text…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        />

        <div className="flex flex-wrap gap-2">
          {TRANSFORMS.map((t) => (
            <Button
              key={t.label}
              variant="secondary"
              size="sm"
              disabled={!text}
              onClick={() => setText(t.fn(text))}
            >
              {t.label}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <CopyButton value={text} label="Copy text" />
          <Button variant="ghost" size="sm" disabled={!text} onClick={() => setText("")}>
            Clear
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
