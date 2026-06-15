"use client";

import { useMemo, useState } from "react";
import {
  Check,
  Copy,
  Download,
  Mail,
  ShieldCheck,
  Star,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, Card, CardBody, Input } from "@/components/ui/primitives";
import {
  buildReviewEmailHtml,
  DEFAULT_REVIEW_EMAIL_CONFIG,
  type ReviewEmailConfig,
} from "@/lib/tools/review-email-template";

type FieldKey = keyof ReviewEmailConfig;

interface FieldDef {
  key: FieldKey;
  label: string;
  placeholder: string;
  help: string;
  type?: "text" | "url" | "color";
  required?: boolean;
  optional?: boolean;
}

const FIELDS: FieldDef[] = [
  {
    key: "businessName",
    label: "Business name",
    placeholder: "Thorburn Landscape",
    help: "Shown in the header and footer.",
    required: true,
  },
  {
    key: "googleReviewUrl",
    label: "Google review link",
    placeholder: "https://g.page/r/XXXX/review",
    help: "Google Business Profile → Ask for reviews → copy link. Where 4–5★ go.",
    type: "url",
    required: true,
  },
  {
    key: "feedbackFormUrl",
    label: "Private feedback form link",
    placeholder: "https://forms.gle/XXXX",
    help: "Where 1–3★ go first. A Google Form or Typeform works (rating is passed automatically).",
    type: "url",
    required: true,
  },
  {
    key: "customerName",
    label: "Customer first name",
    placeholder: "Sarah",
    help: "Personalises the greeting. Leave blank for a generic “How did we do?”.",
    optional: true,
  },
  {
    key: "signoffName",
    label: "Sign-off",
    placeholder: "The Thorburn Landscape team",
    help: "How you’d like to sign the email.",
    optional: true,
  },
  {
    key: "logoUrl",
    label: "Logo image URL",
    placeholder: "https://…/logo.png",
    help: "Optional. A hosted image link. Leave blank to skip the logo.",
    type: "url",
    optional: true,
  },
  {
    key: "brandColor",
    label: "Brand colour",
    placeholder: "#2e7d4f",
    help: "Used for the accent bar and buttons.",
    type: "color",
    optional: true,
  },
  {
    key: "unsubscribeUrl",
    label: "Unsubscribe link",
    placeholder: "https://…/unsubscribe",
    help: "Legally required for marketing email. Your email tool provides one.",
    type: "url",
    required: true,
  },
];

function isLikelyUrl(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  return /^https?:\/\/.+/i.test(v);
}

/**
 * Self-serve onboarding for the review-request email. The client fills in their
 * details, sees a live preview, and copies or downloads ready-to-send HTML.
 * Pure client island — no backend needed, so it works on the static export.
 */
export function ReviewEmailOnboarding() {
  const [cfg, setCfg] = useState<ReviewEmailConfig>({
    ...DEFAULT_REVIEW_EMAIL_CONFIG,
    customerName: "",
    logoUrl: "",
    googleReviewUrl: "",
    feedbackFormUrl: "",
    unsubscribeUrl: "",
    businessName: "",
    signoffName: "",
  });
  const [copied, setCopied] = useState(false);

  const html = useMemo(() => buildReviewEmailHtml(cfg), [cfg]);

  const set = (key: FieldKey, value: string) => {
    setCfg((prev) => ({ ...prev, [key]: value }));
    setCopied(false);
  };

  const requiredMissing = FIELDS.filter(
    (f) => f.required && !cfg[f.key].trim(),
  ).map((f) => f.label);
  const ready = requiredMissing.length === 0;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(html);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* clipboard blocked — the download button still works */
    }
  };

  const download = () => {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const slug =
      (cfg.businessName || "business")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || "business";
    a.href = url;
    a.download = `review-email-${slug}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* ── Left: the form ──────────────────────────────────────────────── */}
      <Card>
        <CardBody className="space-y-5">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Mail className="h-4 w-4" aria-hidden />
            </span>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Your details
            </h2>
          </div>

          <div className="space-y-4">
            {FIELDS.map((field) => {
              const value = cfg[field.key];
              const showUrlWarn =
                field.type === "url" &&
                value.trim().length > 0 &&
                !isLikelyUrl(value);
              return (
                <div key={field.key}>
                  <label
                    htmlFor={`f-${field.key}`}
                    className="flex items-center gap-2 text-sm font-medium text-foreground"
                  >
                    {field.label}
                    {field.optional && (
                      <span className="text-xs font-normal text-muted-foreground">
                        optional
                      </span>
                    )}
                  </label>
                  <div className="mt-1.5 flex items-center gap-2">
                    {field.type === "color" && (
                      <input
                        type="color"
                        aria-label={`${field.label} colour picker`}
                        value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#2e7d4f"}
                        onChange={(e) => set(field.key, e.target.value)}
                        className="h-9 w-10 shrink-0 cursor-pointer rounded-md border bg-background p-1"
                      />
                    )}
                    <Input
                      id={`f-${field.key}`}
                      type={field.type === "color" ? "text" : field.type ?? "text"}
                      inputMode={field.type === "url" ? "url" : undefined}
                      value={value}
                      placeholder={field.placeholder}
                      aria-invalid={showUrlWarn || undefined}
                      onChange={(e) => set(field.key, e.target.value)}
                    />
                  </div>
                  <p
                    className={cn(
                      "mt-1 text-xs",
                      showUrlWarn ? "text-warning" : "text-muted-foreground",
                    )}
                  >
                    {showUrlWarn
                      ? "This should start with http:// or https://"
                      : field.help}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Compliance note — the routing is honest by design. */}
          <div className="flex gap-3 rounded-lg border border-dashed bg-muted/30 p-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
            <p className="text-xs leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">Honest by design.</span>{" "}
              4–5★ go straight to Google; 1–3★ open your private form first so you
              can put things right. Everyone can still post on Google — no review
              gating, so you stay within Google &amp; FTC rules.
            </p>
          </div>
        </CardBody>
      </Card>

      {/* ── Right: live preview + actions ───────────────────────────────── */}
      <div className="space-y-4">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-primary" aria-hidden />
              <span className="text-sm font-medium text-foreground">
                Live preview
              </span>
            </div>
            <span className="text-xs text-muted-foreground">Updates as you type</span>
          </div>
          <div className="bg-[#f4f5f7] p-3">
            <iframe
              title="Email preview"
              srcDoc={html}
              className="h-[640px] w-full rounded-md border bg-white"
            />
          </div>
        </Card>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            onClick={copy}
            disabled={!ready}
            className="flex-1"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" aria-hidden /> Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" aria-hidden /> Copy HTML
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={download}
            disabled={!ready}
            className="flex-1"
          >
            <Download className="h-4 w-4" aria-hidden /> Download .html
          </Button>
        </div>

        {!ready && (
          <p className="text-xs text-muted-foreground">
            Fill in {requiredMissing.join(", ")} to enable copy &amp; download.
          </p>
        )}

        <details className="rounded-lg border bg-card p-4 text-sm">
          <summary className="cursor-pointer font-medium text-foreground">
            How to send it
          </summary>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-muted-foreground">
            <li>Copy the HTML (or download the file).</li>
            <li>
              In Gmail/Outlook/your email tool, paste it into the “HTML” or “code”
              view. In most tools you can also import the downloaded file.
            </li>
            <li>Send a test to yourself and tap each star to check the links.</li>
            <li>Send within 24–48h of finishing the job for the best response.</li>
          </ol>
          <a
            href="https://support.google.com/business/answer/3474122"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Where to find your Google review link
            <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
        </details>
      </div>
    </div>
  );
}
