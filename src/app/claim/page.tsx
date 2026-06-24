"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, MailCheck, ShieldCheck } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Input } from "@/components/ui/primitives";
import { useAuth } from "@/lib/auth/AuthProvider";

function businessName(slug: string | null): string {
  if (!slug) return "your business";
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function ClaimForm() {
  const params = useSearchParams();
  const businessSlug = params.get("business");
  const { signInWithEmail } = useAuth();

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email) return;
    setStatus("sending");
    setError(null);
    const { error: signInError } = await signInWithEmail(email);
    if (signInError) {
      setError(signInError);
      setStatus("error");
      return;
    }
    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <Card>
        <CardHeader className="flex items-center gap-2">
          <MailCheck className="h-5 w-5 text-success" aria-hidden />
          <h2 className="font-display text-lg font-semibold text-foreground">
            Check your email
          </h2>
        </CardHeader>
        <CardBody className="space-y-3">
          <p className="text-sm text-muted-foreground">
            We sent a secure sign-in link to{" "}
            <span className="font-medium text-foreground">{email}</span>. Open it on this
            device to continue claiming{" "}
            <span className="font-medium text-foreground">
              {businessName(businessSlug)}
            </span>
            .
          </p>
          <p className="text-sm text-muted-foreground">
            No password needed — the link signs you in and starts ownership verification.
          </p>
          <Button
            variant="ghost"
            type="button"
            onClick={() => setStatus("idle")}
            className="px-0"
          >
            Use a different email
          </Button>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="font-display text-lg font-semibold text-foreground">
          Claim {businessName(businessSlug)}
        </h2>
      </CardHeader>
      <CardBody>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <label htmlFor="claim-email" className="text-sm font-medium text-foreground">
              Work email
            </label>
            <Input
              id="claim-email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              placeholder="you@yourbusiness.co.uk"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-describedby={error ? "claim-error" : undefined}
              aria-invalid={status === "error"}
            />
          </div>

          {error ? (
            <p id="claim-error" role="alert" className="text-sm text-danger">
              {error}
            </p>
          ) : null}

          <Button type="submit" disabled={status === "sending"} className="w-full">
            {status === "sending" ? "Sending link…" : "Send me a sign-in link"}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}

export default function ClaimPage() {
  return (
    <main className="mx-auto max-w-md space-y-6 px-4 py-10">
      <header className="space-y-2 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
          Free to claim
        </span>
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Claim your listing
        </h1>
        <p className="text-sm text-muted-foreground">
          Take control of your profile, respond to enquiries and see exactly how to climb
          the honest rankings.
        </p>
      </header>

      <Suspense fallback={<ClaimFormFallback />}>
        <ClaimForm />
      </Suspense>

      <section
        aria-labelledby="verify-heading"
        className="rounded-lg border bg-muted/30 p-4"
      >
        <h2 id="verify-heading" className="text-sm font-semibold text-foreground">
          How ownership verification works
        </h2>
        <ol className="mt-2 space-y-2 text-sm text-muted-foreground">
          {[
            "Sign in with your email — we send a one-time secure link, no password.",
            "We confirm you control the business (email domain, phone callback or a code to the listed number).",
            "Once verified, the profile unlocks: edit details, add photos and manage enquiries.",
          ].map((step, i) => (
            <li key={i} className="flex gap-2">
              <CheckCircle2
                className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                aria-hidden
              />
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}

function ClaimFormFallback() {
  return (
    <Card aria-busy="true">
      <CardBody>
        <p className="text-sm text-muted-foreground">Loading claim form…</p>
      </CardBody>
    </Card>
  );
}
