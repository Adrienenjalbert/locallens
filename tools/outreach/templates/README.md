# Free giveaway: Review-request email template

A beautiful, universal, copy-paste **HTML review-request email** with a clickable
5-star rating. Built to be handed out for free in outreach about review
management — it works in any email tool (Gmail, Outlook, Apple Mail, Brevo,
Mailchimp, etc.) because it is pure HTML with inline CSS and **no JavaScript**.

File: [`review-request-email.html`](./review-request-email.html)

---

## What it does

The customer taps a star. The rating routes them — **compliantly**:

| Stars tapped | Goes to | Why |
|---|---|---|
| ⭐⭐⭐⭐ / ⭐⭐⭐⭐⭐ | Your **Google review** link | Happy customer → public review |
| ⭐ / ⭐⭐ / ⭐⭐⭐ | Your **private feedback form** (with `?rating=N`) | You hear the problem first and can fix it |

> **Read this — it protects your client.** Sending *only* 4–5★ to Google while
> hiding 1–3★ from Google entirely is called **review gating**. It violates
> Google's review policies and the FTC, and Google can **remove the business's
> reviews** if detected. This template is the **safe version**: low ratings open
> a private form *first*, but that form should **still offer a Google link at the
> end** so no one is ever blocked from posting publicly. You catch unhappy
> customers early without suppressing honest reviews. Keep it that way when you
> give it out.

Because email clients can't run code, the routing is done with plain links: the
1–3★ stars point at the feedback form, the 4–5★ stars point at Google. Simple,
universal, unbreakable.

---

## How to use it (5 minutes)

1. Open `review-request-email.html` in a text editor.
2. Find-and-replace every placeholder (they all look like `{{LIKE_THIS}}`):

   | Placeholder | What to put | Where to get it |
   |---|---|---|
   | `{{BUSINESS_NAME}}` | The business name | — |
   | `{{CUSTOMER_NAME}}` | First name, or delete the line for a generic send | — |
   | `{{GOOGLE_REVIEW_URL}}` | The "write a review" link | Google Business Profile → **Ask for reviews** → copy link (looks like `https://g.page/r/XXXX/review`) |
   | `{{FEEDBACK_FORM_URL}}` | A private form URL | A Google Form / Typeform / a page on the site. Called as `…?rating=N` so the form can pre-fill the score |
   | `{{LOGO_URL}}` | A hosted logo image URL (or delete the `<img>` line) | — |
   | `{{BRAND_COLOR}}` | A hex colour, e.g. `#2e7d4f` | Brand colour — used for buttons + accent bar |
   | `{{SIGNOFF_NAME}}` | e.g. `The Thorburn Landscape team` | — |
   | `{{UNSUBSCRIBE_URL}}` | Unsubscribe link (**legally required** for marketing email) | Your ESP provides one |

3. Paste the finished HTML into your email tool's "code"/"HTML" mode and send a
   test to yourself. Tap each star to confirm 4–5★ → Google and 1–3★ → your form.

### Subject line ideas (pick one)
- `How did we do, {{CUSTOMER_NAME}}? (10 seconds)`
- `Quick favour — rate your experience with {{BUSINESS_NAME}}`
- `{{CUSTOMER_NAME}}, would you mind leaving a quick review?`

---

## Tips for high response rates

- **Send within 24–48h of finishing the job**, while it's fresh.
- **Personalise the name** — it materially lifts taps.
- **One gentle reminder** after ~3 days if there's no review yet (don't nag).
- **Plain-text fallback:** some recipients see text only — make sure your ESP
  generates a plain-text version with the Google link in it.

---

## Setting up the private feedback form (the 1–3★ destination)

Any form works. The minimum it should capture:
1. What went wrong (free text)
2. Their contact (so the owner can put it right)
3. **A link at the bottom**: *"If you'd still like to leave a public review, you
   can do that here →"* pointing at `{{GOOGLE_REVIEW_URL}}` (this is what keeps
   the whole flow compliant — no one is ever prevented from posting on Google).

A Google Form pre-fills the score automatically because the stars pass
`?rating=N`.

---

*Part of the LocalLens "Reviews on Autopilot" wedge (see
`docs/02-BUSINESS-PLAN-UK-GTM.md`). Honest by design — trust is the product.*
