"use client";

import { useCallback, useState } from "react";
import { Card, CardBody, CardHeader, Button } from "@/components/ui/primitives";
import { CopyButton } from "@/components/tools/CopyButton";

/** Generate a v4 UUID using the platform crypto API (with a safe fallback). */
function uuidV4(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") {
    return c.randomUUID();
  }
  // Fallback: RFC-4122 v4 from getRandomValues.
  const bytes = new Uint8Array(16);
  c.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex
    .slice(6, 8)
    .join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10, 16).join("")}`;
}

/**
 * UUID (v4) generator. Generates one or many UUIDs in the browser using the Web
 * Crypto API — cryptographically random, never sent anywhere. Answer-first +
 * FAQ render on the server (AEO).
 */
export function UuidGeneratorWidget() {
  const [count, setCount] = useState(1);
  const [uuids, setUuids] = useState<string[]>(() => [uuidV4()]);

  const generate = useCallback((n: number) => {
    setUuids(Array.from({ length: n }, () => uuidV4()));
  }, []);

  return (
    <Card>
      <CardHeader>
        <h2 className="font-display text-lg font-semibold text-foreground">
          Generate UUIDs (v4)
        </h2>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="uuid-count" className="text-sm font-medium text-foreground">
              How many?
            </label>
            <select
              id="uuid-count"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="mt-1.5 rounded-md border bg-background px-3 py-2 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              {[1, 5, 10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={() => generate(count)}>Generate</Button>
          <CopyButton value={uuids.join("\n")} label="Copy all" />
        </div>

        <div
          aria-live="polite"
          className="max-h-72 overflow-y-auto rounded-lg border bg-muted/40 p-2"
        >
          <ul className="divide-y divide-border">
            {uuids.map((u, i) => (
              <li
                key={`${u}-${i}`}
                className="px-2 py-1.5 font-mono text-sm text-foreground"
              >
                {u}
              </li>
            ))}
          </ul>
        </div>
      </CardBody>
    </Card>
  );
}
