"use client";

import { useMemo, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/primitives";

const WORDS_PER_MINUTE = 200;

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/**
 * Word & character counter. Live counts for words, characters (with/without
 * spaces), sentences, paragraphs and reading time. Client-side only; the page's
 * answer-first copy + FAQ render server-side (AEO).
 */
export function WordCounterWidget() {
  const [text, setText] = useState("");

  const stats = useMemo(() => {
    const words = countWords(text);
    const characters = text.length;
    const charactersNoSpaces = text.replace(/\s/g, "").length;
    const sentences = (text.match(/[.!?]+(\s|$)/g) ?? []).length;
    const paragraphs = text.trim() ? text.trim().split(/\n+/).filter(Boolean).length : 0;
    const readingMins = Math.max(words > 0 ? Math.ceil(words / WORDS_PER_MINUTE) : 0, 0);
    return { words, characters, charactersNoSpaces, sentences, paragraphs, readingMins };
  }, [text]);

  return (
    <Card>
      <CardHeader>
        <h2 className="font-display text-lg font-semibold text-foreground">
          Word &amp; character counter
        </h2>
      </CardHeader>
      <CardBody className="space-y-4">
        <label htmlFor="wc-text" className="sr-only">
          Text to count
        </label>
        <textarea
          id="wc-text"
          rows={8}
          placeholder="Paste or type your text here…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        />

        <div aria-live="polite" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Stat label="Words" value={stats.words} emphasis />
          <Stat label="Characters" value={stats.characters} />
          <Stat label="No spaces" value={stats.charactersNoSpaces} />
          <Stat label="Sentences" value={stats.sentences} />
          <Stat label="Paragraphs" value={stats.paragraphs} />
          <Stat label="Reading time" value={`${stats.readingMins} min`} />
        </div>
      </CardBody>
    </Card>
  );
}

function Stat({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: number | string;
  emphasis?: boolean;
}) {
  return (
    <div className="rounded-md border bg-muted/40 p-3 text-center">
      <p
        className={
          emphasis
            ? "font-display text-2xl font-semibold text-primary"
            : "font-display text-xl font-semibold text-foreground"
        }
      >
        {value}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
