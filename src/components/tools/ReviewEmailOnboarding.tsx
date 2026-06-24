"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Copy,
  Download,
  ImagePlus,
  Mail,
  Monitor,
  Pencil,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Star,
  Upload,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, Card, CardBody, Input } from "@/components/ui/primitives";
import {
  buildReviewEmailHtml,
  DEFAULT_REVIEW_EMAIL_COPY,
  DEFAULT_REVIEW_EMAIL_CONFIG,
  type ReviewEmailConfig,
} from "@/lib/tools/review-email-template";

const MAX_LOGO_BYTES = 200 * 1024; // 200KB — keeps the embedded email small enough for inboxes

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
    help: "Google Business Profile, Ask for reviews, copy link. Where 4 and 5 stars go.",
    type: "url",
    required: true,
  },
  {
    key: "feedbackFormUrl",
    label: "Private feedback form link",
    placeholder: "https://forms.gle/XXXX",
    help: "Where 1 to 3 stars go first. Use the form helper below to make one in 3 minutes.",
    type: "url",
    required: true,
  },
  {
    key: "customerName",
    label: "Customer first name",
    placeholder: "Sarah",
    help: "Personalises the greeting. Leave blank for a generic 'How did we do?'.",
    optional: true,
  },
  {
    key: "brandColor",
    label: "Brand colour",
    placeholder: "#2e7d4f",
    help: "Used for the accent bar.",
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

// Editable email copy. {name} and {business} are auto-filled. Plain punctuation,
// no em/en dashes, so it reads cleanly and is easy to hand-edit after pasting.
interface CopyFieldDef {
  key: keyof typeof DEFAULT_REVIEW_EMAIL_COPY;
  label: string;
  help: string;
  multiline?: boolean;
}

const COPY_FIELDS: CopyFieldDef[] = [
  {
    key: "headline",
    label: "Headline",
    help: "Use {name} for the customer's first name.",
  },
  {
    key: "intro",
    label: "Intro paragraph",
    help: "Use {business} for your business name.",
    multiline: true,
  },
  { key: "starPrompt", label: "Line under the stars", help: "A short nudge." },
  {
    key: "lowRatingNote",
    label: "Reassurance line (for 1 to 3 stars)",
    help: "Invites unhappy customers to share privately first.",
    multiline: true,
  },
  { key: "signoff", label: "Sign-off", help: "Use {business} for your business name." },
];

function isLikelyUrl(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  return /^https?:\/\/.+/i.test(v);
}

type PreviewMode = "desktop" | "mobile";

/**
 * Self-serve onboarding for the review-request email. The client fills in their
 * details, sees a RESPONSIVE live preview (desktop/mobile toggle, scaled to fit
 * so nothing clips), tests the conditional star routing interactively, then
 * copies or downloads ready-to-send HTML. Pure client island — no backend, so
 * it works on the static export and is safe to give away.
 */
export function ReviewEmailOnboarding() {
  // Start blank for the details the user must supply; copy starts at the
  // (editable) defaults so the email reads well immediately.
  const [cfg, setCfg] = useState<ReviewEmailConfig>({
    ...DEFAULT_REVIEW_EMAIL_CONFIG,
    customerName: "",
    logoUrl: "",
    googleReviewUrl: "",
    feedbackFormUrl: "",
    unsubscribeUrl: "",
    businessName: "",
  });
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<PreviewMode>("desktop");
  const [demoStars, setDemoStars] = useState<number | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const html = useMemo(() => buildReviewEmailHtml(cfg), [cfg]);

  const set = (key: FieldKey, value: string) => {
    setCfg((prev) => ({ ...prev, [key]: value }));
    setCopied(false);
  };

  const onLogoFile = (file: File | null) => {
    setLogoError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setLogoError("Please choose an image file (PNG, JPG or SVG).");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError("Image is too large. Please use one under 200KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") set("logoUrl", reader.result);
    };
    reader.onerror = () => setLogoError("Could not read that file. Try another.");
    reader.readAsDataURL(file);
  };

  const resetCopy = () => {
    setCfg((prev) => ({ ...prev, ...DEFAULT_REVIEW_EMAIL_COPY }));
    setCopied(false);
  };
  const copyIsDefault = COPY_FIELDS.every(
    (f) => cfg[f.key] === DEFAULT_REVIEW_EMAIL_COPY[f.key],
  );

  const requiredMissing = FIELDS.filter((f) => f.required && !cfg[f.key].trim()).map(
    (f) => f.label,
  );
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
                field.type === "url" && value.trim().length > 0 && !isLikelyUrl(value);
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
                      type={field.type === "color" ? "text" : (field.type ?? "text")}
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

            {/* Logo: upload (embedded) or paste a hosted URL */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                Logo
                <span className="text-xs font-normal text-muted-foreground">
                  optional
                </span>
              </label>
              <div className="mt-1.5 flex items-center gap-3">
                {cfg.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cfg.logoUrl}
                    alt="Logo preview"
                    className="h-12 w-12 shrink-0 rounded-md border bg-background object-contain p-1"
                  />
                ) : (
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-dashed bg-muted/40 text-muted-foreground">
                    <ImagePlus className="h-5 w-5" aria-hidden />
                  </span>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    className="hidden"
                    onChange={(e) => onLogoFile(e.target.files?.[0] ?? null)}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4" aria-hidden /> Upload image
                  </Button>
                  {cfg.logoUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        set("logoUrl", "");
                        setLogoError(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                    >
                      <X className="h-4 w-4" aria-hidden /> Remove
                    </Button>
                  )}
                </div>
              </div>
              <Input
                className="mt-2"
                type="url"
                inputMode="url"
                value={cfg.logoUrl.startsWith("data:") ? "" : cfg.logoUrl}
                placeholder="…or paste a hosted image URL"
                onChange={(e) => set("logoUrl", e.target.value)}
              />
              <p
                className={cn(
                  "mt-1 text-xs",
                  logoError ? "text-warning" : "text-muted-foreground",
                )}
              >
                {logoError ??
                  "Upload embeds the logo in the email (keep it under 200KB), or paste a hosted URL. Leave blank to skip."}
              </p>
            </div>
          </div>

          {/* Interactive routing demo — tap a star to SEE the conditional logic */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-sm font-medium text-foreground">Try the star routing</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Tap a star to see where that customer would be sent.
            </p>
            <div className="mt-2.5 flex gap-1" role="group" aria-label="Demo star rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={`${n} star${n > 1 ? "s" : ""}`}
                  aria-pressed={demoStars !== null && n <= demoStars}
                  onClick={() => setDemoStars(n)}
                  className="transition hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                >
                  <Star
                    className={cn(
                      "h-8 w-8",
                      demoStars !== null && n <= demoStars
                        ? "fill-[#f5b50a] text-[#f5b50a]"
                        : "text-muted-foreground/40",
                    )}
                    aria-hidden
                  />
                </button>
              ))}
            </div>
            {demoStars !== null && (
              <div
                aria-live="polite"
                className={cn(
                  "mt-3 flex items-start gap-2 rounded-md border p-3 text-sm",
                  demoStars >= 4
                    ? "border-success/30 bg-success/10 text-foreground"
                    : "border-warning/30 bg-warning/10 text-foreground",
                )}
              >
                {demoStars >= 4 ? (
                  <>
                    <Star
                      className="mt-0.5 h-4 w-4 shrink-0 fill-success text-success"
                      aria-hidden
                    />
                    <span>
                      <strong>{demoStars}★ goes to your Google review page.</strong> Happy
                      customers post publicly, lifting your rating and rank.
                    </span>
                  </>
                ) : (
                  <>
                    <ShieldCheck
                      className="mt-0.5 h-4 w-4 shrink-0 text-warning"
                      aria-hidden
                    />
                    <span>
                      <strong>{demoStars}★ goes to your private feedback form.</strong>{" "}
                      You hear about it first and can put it right. They can still choose
                      to post on Google afterwards.
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Editable copy — overwrite any of the email wording */}
          <details className="rounded-lg border bg-muted/20 p-4">
            <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
              <Pencil className="h-4 w-4 text-primary" aria-hidden />
              Customise the wording
              <span className="ml-auto text-xs font-normal text-muted-foreground">
                optional
              </span>
            </summary>
            <div className="mt-3 space-y-3">
              <p className="text-xs text-muted-foreground">
                Overwrite any line. Type{" "}
                <code className="rounded bg-muted px-1">{"{name}"}</code> for the
                customer&rsquo;s first name and{" "}
                <code className="rounded bg-muted px-1">{"{business}"}</code> for your
                business name.
              </p>
              {COPY_FIELDS.map((field) => (
                <div key={field.key}>
                  <label
                    htmlFor={`c-${field.key}`}
                    className="text-sm font-medium text-foreground"
                  >
                    {field.label}
                  </label>
                  {field.multiline ? (
                    <textarea
                      id={`c-${field.key}`}
                      rows={3}
                      value={cfg[field.key]}
                      onChange={(e) => set(field.key, e.target.value)}
                      className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  ) : (
                    <Input
                      id={`c-${field.key}`}
                      value={cfg[field.key]}
                      onChange={(e) => set(field.key, e.target.value)}
                    />
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">{field.help}</p>
                </div>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetCopy}
                disabled={copyIsDefault}
              >
                <RotateCcw className="h-4 w-4" aria-hidden /> Reset wording to default
              </Button>
            </div>
          </details>

          {/* Compliance note — the routing is honest by design. */}
          <div className="flex gap-3 rounded-lg border border-dashed bg-muted/30 p-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
            <p className="text-xs leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">Honest by design.</span>{" "}
              Everyone can still post on Google, no review gating, so you stay within
              Google &amp; FTC rules while collecting more 5-star reviews.
            </p>
          </div>
        </CardBody>
      </Card>

      {/* ── Right: responsive live preview + actions ────────────────────── */}
      <div className="space-y-4">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-primary" aria-hidden />
              <span className="text-sm font-medium text-foreground">Live preview</span>
            </div>
            {/* Desktop / Mobile toggle */}
            <div
              className="flex items-center gap-0.5 rounded-md border bg-background p-0.5"
              role="group"
              aria-label="Preview device"
            >
              <ModeButton
                active={mode === "desktop"}
                onClick={() => setMode("desktop")}
                label="Desktop"
              >
                <Monitor className="h-4 w-4" aria-hidden />
              </ModeButton>
              <ModeButton
                active={mode === "mobile"}
                onClick={() => setMode("mobile")}
                label="Mobile"
              >
                <Smartphone className="h-4 w-4" aria-hidden />
              </ModeButton>
            </div>
          </div>
          <div className="bg-[#f4f5f7] p-3">
            <EmailPreview html={html} mode={mode} />
          </div>
        </Card>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" onClick={copy} disabled={!ready} className="flex-1">
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

        <details className="rounded-lg border bg-card p-4 text-sm" open>
          <summary className="cursor-pointer font-medium text-foreground">
            How to send it (and edit it later)
          </summary>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-muted-foreground">
            <li>
              Tweak any wording here first under <strong>Customise the wording</strong>,
              then hit <strong>Copy HTML</strong> (or download the file).
            </li>
            <li>
              In Gmail, click the three dots, choose insert/paste, or in Outlook and most
              email tools paste it into the <strong>HTML</strong> or <strong>code</strong>{" "}
              view. You can also import the downloaded file.
            </li>
            <li>
              Once pasted, you can still edit the text right there in your email tool, the
              wording is plain and easy to change.
            </li>
            <li>Send a test to yourself and tap each star to check the links.</li>
            <li>
              Send within 24 to 48 hours of finishing the job for the best response.
            </li>
          </ol>
          <a
            href="https://support.google.com/business/answer/3474122"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Where to find your Google review link
            <ArrowRight className="h-3 w-3" aria-hidden />
          </a>
        </details>
      </div>
    </div>
  );
}

/**
 * Renders the email HTML in an iframe, scaled to ALWAYS fit the available column
 * width so the email never clips on any screen. We measure the container with a
 * ResizeObserver and compute scale = containerWidth / naturalWidth.
 *  • Desktop = the full 600px email, scaled down to fit (true to what inboxes show).
 *  • Mobile  = a 360px device frame showing the email's responsive behaviour.
 */
function EmailPreview({ html, mode }: { html: string; mode: PreviewMode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setContainerWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // The email's natural render width + a sensible content height per device.
  const naturalWidth = mode === "desktop" ? 600 : 360;
  const naturalHeight = mode === "desktop" ? 720 : 760;
  // Mobile sits inside a 12px device bezel; desktop has a small breathing margin.
  const frame = mode === "mobile" ? 24 : 16;
  const available = Math.max(0, containerWidth - frame);
  // Never upscale past 1 (keeps text crisp); shrink to fit when the column is narrow.
  const scale = containerWidth > 0 ? Math.min(1, available / naturalWidth) : 1;

  return (
    <div ref={containerRef} className="flex justify-center">
      <div
        className={cn(
          "relative origin-top overflow-hidden",
          mode === "mobile"
            ? "rounded-[28px] border-[6px] border-foreground/80 shadow-lg"
            : "rounded-lg",
        )}
        style={{
          width: naturalWidth * scale,
          height: naturalHeight * scale,
        }}
      >
        <iframe
          title={`Email preview (${mode})`}
          srcDoc={html}
          scrolling="no"
          style={{
            width: naturalWidth,
            height: naturalHeight,
            border: "0",
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        />
      </div>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={cn(
        "flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted",
      )}
    >
      {children}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
