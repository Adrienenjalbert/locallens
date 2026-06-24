"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, FileText, ListChecks } from "lucide-react";
import { Button, Card, CardBody } from "@/components/ui/primitives";

// The questions we recommend for the private feedback form (the 1–3★ destination).
// Kept short on purpose — an unhappy customer won't fill in a long form.
const FORM_TITLE = "Tell us how we can do better";
const FORM_DESCRIPTION =
  "Sorry we didn't quite hit the mark. Your feedback goes straight to the owner and helps us put things right.";
const FORM_QUESTIONS = [
  "How would you rate your experience? (1–5)  — short answer",
  "What could we have done better?  — paragraph",
  "Your name  — short answer",
  "Best contact (email or phone) so we can make it right  — short answer",
];
// A closing message shown after submit — keeps the flow compliant by still
// offering the public Google option (no one is ever blocked from Google).
const FORM_CONFIRMATION =
  "Thank you — the owner will be in touch. If you'd still like to leave a public review, you can do that here: [paste your Google review link]";

/**
 * Guides the user to create the matching private feedback form (the destination
 * for 1–3★) in Google Forms, with copy-paste content and step-by-step setup. No
 * API needed — we open a blank Google Form and give them everything to paste.
 */
export function GoogleFormHelper() {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 2000);
    } catch {
      /* clipboard blocked — text is still visible to copy manually */
    }
  };

  const allQuestions = FORM_QUESTIONS.map((q, i) => `${i + 1}. ${q}`).join("\n");

  return (
    <Card>
      <CardBody className="space-y-5">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary">
            <FileText className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Create your private feedback form
            </h2>
            <p className="text-sm text-muted-foreground">
              This is where 1–3★ go first. Takes about 3 minutes — free.
            </p>
          </div>
        </div>

        {/* Step 1 — open a blank form */}
        <Step n={1} title="Open a new Google Form">
          <p className="text-sm text-muted-foreground">
            Click below to create a blank form (you’ll need to be signed into a Google
            account).
          </p>
          <a
            href="https://docs.google.com/forms/create"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex"
          >
            <Button type="button" size="sm">
              <ExternalLink className="h-4 w-4" aria-hidden />
              Create a blank Google Form
            </Button>
          </a>
        </Step>

        {/* Step 2 — paste the title + description */}
        <Step n={2} title="Paste the title & description">
          <CopyRow
            label="Form title"
            value={FORM_TITLE}
            copied={copied === "title"}
            onCopy={() => copy("title", FORM_TITLE)}
          />
          <CopyRow
            label="Description"
            value={FORM_DESCRIPTION}
            copied={copied === "desc"}
            onCopy={() => copy("desc", FORM_DESCRIPTION)}
            multiline
          />
        </Step>

        {/* Step 3 — add the questions */}
        <Step n={3} title="Add these 4 questions">
          <div className="rounded-md border bg-muted/30 p-3">
            <ul className="space-y-1.5 text-sm text-foreground">
              {FORM_QUESTIONS.map((q) => (
                <li key={q} className="flex items-start gap-2">
                  <ListChecks
                    className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                    aria-hidden
                  />
                  <span>{q}</span>
                </li>
              ))}
            </ul>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={() => copy("questions", allQuestions)}
            >
              {copied === "questions" ? (
                <>
                  <Check className="h-4 w-4" aria-hidden /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" aria-hidden /> Copy all questions
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Tip: the email passes the star rating as <code>?rating=N</code>, so you can
            leave question 1 — or pre-fill it later if you want.
          </p>
        </Step>

        {/* Step 4 — confirmation message keeps it compliant */}
        <Step n={4} title="Set the confirmation message (keeps you compliant)">
          <p className="text-sm text-muted-foreground">
            In the form’s <strong>Settings → Presentation → Confirmation message</strong>,
            paste this so unhappy customers can still choose to post publicly — this is
            what keeps the whole flow within Google’s rules:
          </p>
          <CopyRow
            label="Confirmation message"
            value={FORM_CONFIRMATION}
            copied={copied === "confirm"}
            onCopy={() => copy("confirm", FORM_CONFIRMATION)}
            multiline
          />
        </Step>

        {/* Step 5 — get the link */}
        <Step n={5} title="Copy the form’s link → paste it above" last>
          <p className="text-sm text-muted-foreground">
            Hit <strong>Send → link</strong> (the chain icon), tick <em>Shorten URL</em>,
            and copy it. Paste that into the <strong>“Private feedback form link”</strong>{" "}
            field in the builder above and you’re done.
          </p>
        </Step>
      </CardBody>
    </Card>
  );
}

function Step({
  n,
  title,
  children,
  last,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
          {n}
        </span>
        {!last && <span className="mt-1 w-px flex-1 bg-border" aria-hidden />}
      </div>
      <div className="flex-1 space-y-2 pb-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function CopyRow({
  label,
  value,
  copied,
  onCopy,
  multiline,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
  multiline?: boolean;
}) {
  return (
    <div className="mt-2">
      <div className="mb-1 text-xs font-medium text-muted-foreground">{label}</div>
      <div className="flex items-start gap-2">
        <p
          className={cnLocal(
            "flex-1 rounded-md border bg-background px-3 py-2 text-sm text-foreground",
            multiline ? "whitespace-pre-wrap" : "truncate",
          )}
        >
          {value}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={`Copy ${label}`}
          onClick={onCopy}
        >
          {copied ? (
            <Check className="h-4 w-4 text-success" aria-hidden />
          ) : (
            <Copy className="h-4 w-4" aria-hidden />
          )}
        </Button>
      </div>
    </div>
  );
}

// Tiny local class joiner to avoid an extra import in this leaf component.
function cnLocal(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
