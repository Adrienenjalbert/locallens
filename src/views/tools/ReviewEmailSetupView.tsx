import { AnswerBlock } from "@/components/directory/AnswerBlock";
import { ReviewEmailOnboarding } from "@/components/tools/ReviewEmailOnboarding";

/**
 * "Set up your review-request email" — a free, self-serve onboarding tool. The
 * answer-first intro renders server-side (crawlable/AEO); the wizard hydrates as
 * a client island that builds the email live and lets the user copy/download it.
 * No backend needed, so it works on the static export and is safe to give away.
 */
export function ReviewEmailSetupView() {
  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <AnswerBlock
        heading="Set up your review-request email"
        answer="Fill in your details below and we’ll build a ready-to-send email with a clickable 5-star rating. Happy customers (4–5★) go straight to your Google review page; anyone less happy (1–3★) reaches a private form first so you can put it right — no review gating, fully Google- and FTC-compliant. Copy or download it in one click."
      />

      <ReviewEmailOnboarding />

      <section className="rounded-lg border bg-card p-5 text-sm text-muted-foreground">
        <h2 className="font-display text-base font-semibold text-foreground">
          Why it works
        </h2>
        <p className="mt-2 max-w-prose">
          Reviews are the single biggest driver of local-search ranking and
          buyer trust — and the best moment to ask is right after a great job.
          This email turns that moment into a one-tap action for your customer,
          and routes feedback honestly so you collect more public reviews while
          catching any problems privately first.
        </p>
      </section>
    </main>
  );
}
