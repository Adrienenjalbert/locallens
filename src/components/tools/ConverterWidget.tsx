"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRightLeft } from "lucide-react";
import { Card, CardBody, CardHeader, Input, Button } from "@/components/ui/primitives";
import { findConversion, formatResult } from "@/lib/tools/convert";

/**
 * Interactive island for any unit converter. Driven entirely by the conversion
 * `slug` from the registry, so one component powers every converter page. The
 * answer-first intro + FAQ render server-side around it (AEO); the maths runs
 * client-side with no network. A "swap" flips to the reverse converter page.
 */
export function ConverterWidget({ slug }: { slug: string }) {
  const conversion = findConversion(slug);
  const [raw, setRaw] = useState(conversion ? String(conversion.example) : "1");

  const { result, valid } = useMemo(() => {
    if (!conversion) return { result: "", valid: false };
    const n = Number(raw);
    if (raw.trim() === "" || Number.isNaN(n)) return { result: "", valid: false };
    return {
      result: formatResult(conversion.convert(n), conversion.precision),
      valid: true,
    };
  }, [conversion, raw]);

  if (!conversion) return null;

  return (
    <Card>
      <CardHeader>
        <h2 className="font-display text-lg font-semibold text-foreground">
          Convert {conversion.fromUnit.toLowerCase()} to {conversion.toUnit.toLowerCase()}
        </h2>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
          <div>
            <label htmlFor="convert-from" className="text-sm font-medium text-foreground">
              {conversion.fromUnit} ({conversion.fromSymbol})
            </label>
            <div className="mt-1.5">
              <Input
                id="convert-from"
                inputMode="decimal"
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                aria-describedby="convert-result"
              />
            </div>
          </div>

          {conversion.reverseSlug ? (
            <Link
              href={`/tools/${conversion.reverseSlug}/`}
              aria-label={`Swap to ${conversion.toUnit} to ${conversion.fromUnit}`}
              className="mb-1 inline-flex h-10 items-center justify-center rounded-md border px-3 text-muted-foreground transition hover:bg-muted"
            >
              <ArrowRightLeft className="h-4 w-4" aria-hidden />
            </Link>
          ) : (
            <span aria-hidden className="mb-3 text-center text-muted-foreground">
              =
            </span>
          )}

          <div>
            <span className="text-sm font-medium text-foreground">
              {conversion.toUnit} ({conversion.toSymbol})
            </span>
            <div
              id="convert-result"
              aria-live="polite"
              className="mt-1.5 flex h-10 items-center rounded-md border bg-muted/40 px-3 font-display text-lg font-semibold text-foreground"
            >
              {valid ? result : "—"}
            </div>
          </div>
        </div>

        {valid && (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {raw} {conversion.fromSymbol}
            </span>{" "}
            = {result} {conversion.toSymbol}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {[1, 5, 10, 50, 100].map((n) => (
            <Button
              key={n}
              variant="secondary"
              size="sm"
              onClick={() => setRaw(String(n))}
            >
              {n} {conversion.fromSymbol}
            </Button>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
