import {
  ArrowRight,
  Clock,
  MessageSquare,
  MousePointerClick,
  Send,
  ShieldCheck,
  Star,
  TrendingUp,
} from "lucide-react";
import { ReviewEmailOnboarding } from "@/components/tools/ReviewEmailOnboarding";
import { GoogleFormHelper } from "@/components/tools/GoogleFormHelper";
import { FaqBlock } from "@/components/tools/FaqBlock";
import type { FaqItem } from "@/lib/tools/jsonld";

const FAQS: FaqItem[] = [
  {
    question: "Is this allowed by Google?",
    answer:
      "Yes. Every customer can still post on Google — we never hide or block reviews (that’s called review gating and it breaks Google and FTC rules). Unhappy customers simply see a private feedback form first so you can fix the problem, and that form still offers them the Google link afterwards.",
  },
  {
    question: "Do I need any technical skills?",
    answer:
      "No. Fill in your details, copy the email, and paste it into Gmail, Outlook or your email tool. The form helper walks you through making the private feedback form in Google Forms in about 3 minutes.",
  },
  {
    question: "How does it get me more 5-star reviews?",
    answer:
      "It removes friction. Customers tap a star straight from the email instead of hunting for your Google page, and you send it right after a great job when they’re most likely to say yes. More asks, sent at the right moment, with one tap — that’s what drives review volume and velocity, which lifts your local ranking.",
  },
  {
    question: "Where do the 1–3 star ratings go?",
    answer:
      "To your private feedback form, so you hear about an unhappy customer before they post publicly and can put it right. They can still leave a Google review if they want to — nothing is blocked.",
  },
  {
    question: "Is it really free?",
    answer:
      "Yes — the email builder and the Google Form guide are free to use. Google Forms is also free. You only pay if you later want to automate sending and replies.",
  },
];

const STEPS = [
  {
    icon: MousePointerClick,
    title: "1. Build your email",
    body: "Add your business name, brand colour and your Google review link. Watch it build live, responsive on every device.",
  },
  {
    icon: MessageSquare,
    title: "2. Add a feedback form",
    body: "Use the guided helper to create a private Google Form for unhappy customers — copy-paste content, done in 3 minutes.",
  },
  {
    icon: Send,
    title: "3. Send after each job",
    body: "Paste it into your email tool and send within 24–48h of finishing. One tap and the reviews start rolling in.",
  },
];

const BENEFITS = [
  {
    icon: TrendingUp,
    title: "More 5-star reviews",
    body: "One-tap asking, sent at the perfect moment, turns happy customers into public reviews — the #1 driver of local ranking.",
  },
  {
    icon: ShieldCheck,
    title: "Catch problems privately",
    body: "Less-happy customers reach you first via a private form, so you fix issues instead of finding out from a public 1-star.",
  },
  {
    icon: Clock,
    title: "10 seconds for them, 2 minutes for you",
    body: "No apps, no logins for your customer. Build once, reuse it after every job.",
  },
];

/**
 * Landing page + self-serve tool for the review-request email. A strong hero +
 * how-it-works + benefits explain the product (and render server-side for AEO);
 * the builder and Google-Form helper are interactive client islands. No backend,
 * so it works on the static export and is safe to give away in outreach.
 */
export function ReviewEmailSetupView() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Star className="h-3.5 w-3.5 fill-primary" aria-hidden />
          Free review-request email builder
        </span>
        <h1 className="mx-auto mt-4 max-w-3xl font-display text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
          Get more 5-star Google reviews —{" "}
          <span className="text-primary">in one tap</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Build a beautiful review-request email with a clickable star rating. Happy
          customers go straight to Google; unhappy ones reach you privately first — so you
          grow your rating and catch problems early. No signup, no code.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <a href="#builder">
            <span className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90">
              Build my email
              <ArrowRight className="h-4 w-4" aria-hidden />
            </span>
          </a>
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-success" aria-hidden />
            Google &amp; FTC compliant
          </span>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section className="mt-14" aria-label="How it works">
        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.title} className="rounded-xl border bg-card p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <step.icon className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="mt-3 font-display text-base font-semibold text-foreground">
                {step.title}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── The builder ──────────────────────────────────────────────── */}
      <section id="builder" className="mt-16 scroll-mt-6">
        <div className="mb-5">
          <h2 className="font-display text-2xl font-semibold text-foreground">
            Build your email
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Fill in your details — the preview updates live and is responsive on desktop
            and mobile. Copy or download when you’re happy.
          </p>
        </div>
        <ReviewEmailOnboarding />
      </section>

      {/* ── Google Form helper ───────────────────────────────────────── */}
      <section className="mt-16">
        <GoogleFormHelper />
      </section>

      {/* ── Benefits ─────────────────────────────────────────────────── */}
      <section className="mt-16" aria-label="Why it works">
        <h2 className="text-center font-display text-2xl font-semibold text-foreground">
          Why it works
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {BENEFITS.map((b) => (
            <div key={b.title} className="rounded-xl border bg-card p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <b.icon className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="mt-3 font-display text-base font-semibold text-foreground">
                {b.title}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {b.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <section className="mt-16">
        <FaqBlock items={FAQS} />
      </section>
    </main>
  );
}
