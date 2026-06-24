"use client";

import { useMemo, useState } from "react";
import { Card, CardBody, CardHeader, Input, Button } from "@/components/ui/primitives";
import { buildUtmUrl } from "@/lib/tools/slugify";
import { CopyButton } from "@/components/tools/CopyButton";

// Fixed vocabularies keep campaign reporting clean (lowercase, consistent).
const COMMON_MEDIUMS = ["email", "social", "cpc", "referral", "affiliate", "qr"];

/**
 * Interactive island for the UTM builder. Everything runs client-side; the
 * page's answer-first intro, methodology and FAQ render server-side around it so
 * the static HTML stays crawlable (AEO). No network calls — fully private.
 */
export function UtmBuilderWidget() {
  const [url, setUrl] = useState("");
  const [source, setSource] = useState("");
  const [medium, setMedium] = useState("");
  const [campaign, setCampaign] = useState("");
  const [term, setTerm] = useState("");
  const [content, setContent] = useState("");

  const result = useMemo(
    () => buildUtmUrl({ url, source, medium, campaign, term, content }),
    [url, source, medium, campaign, term, content],
  );

  const ready = Boolean(url && source && medium && campaign);
  const hasResult = ready && result !== url.trim();

  return (
    <Card>
      <CardHeader>
        <h2 className="font-display text-lg font-semibold text-foreground">
          Build your campaign URL
        </h2>
      </CardHeader>
      <CardBody className="space-y-4">
        <Field
          id="utm-url"
          label="Landing page URL"
          required
          hint="The full URL, including https://"
        >
          <Input
            id="utm-url"
            inputMode="url"
            placeholder="https://example.com/landing"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field id="utm-source" label="Campaign source" required hint="e.g. newsletter">
            <Input
              id="utm-source"
              placeholder="newsletter"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            />
          </Field>
          <Field id="utm-medium" label="Campaign medium" required hint="e.g. email">
            <Input
              id="utm-medium"
              list="utm-mediums"
              placeholder="email"
              value={medium}
              onChange={(e) => setMedium(e.target.value)}
            />
            <datalist id="utm-mediums">
              {COMMON_MEDIUMS.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </Field>
          <Field id="utm-campaign" label="Campaign name" required hint="e.g. spring_sale">
            <Input
              id="utm-campaign"
              placeholder="spring_sale"
              value={campaign}
              onChange={(e) => setCampaign(e.target.value)}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="utm-term" label="Term (optional)" hint="Paid keyword">
            <Input
              id="utm-term"
              placeholder="garden+services"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
          </Field>
          <Field id="utm-content" label="Content (optional)" hint="A/B variant">
            <Input
              id="utm-content"
              placeholder="hero_cta"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </Field>
        </div>

        <div aria-live="polite" className="rounded-lg border bg-muted/40 p-4">
          <p className="text-sm font-medium text-foreground">Your tagged URL</p>
          {hasResult ? (
            <>
              <p className="mt-2 break-all rounded-md bg-background p-3 font-mono text-sm text-foreground">
                {result}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <CopyButton value={result} label="Copy URL" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSource("");
                    setMedium("");
                    setCampaign("");
                    setTerm("");
                    setContent("");
                  }}
                >
                  Reset tags
                </Button>
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Fill in the URL, source, medium and campaign to generate a tracked link.
              Values are lowercased automatically.
            </p>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

function Field({
  id,
  label,
  required,
  hint,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </label>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
