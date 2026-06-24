// Single source of truth for the review-request email HTML. Used both by the
// self-serve onboarding wizard (live preview + copy/download) and as the static
// giveaway asset (tools/outreach/templates/review-request-email.html).
//
// COMPLIANCE (important): every star ultimately lets the customer reach Google.
// We never "gate" reviews (gating violates Google + FTC rules). 4 and 5 stars go
// straight to Google; 1 to 3 stars open a private feedback form FIRST (so the
// owner can fix problems), and that form should still offer the Google link.
//
// CTA: there is ONE primary action in this email, the star rating. We avoid a
// second competing button so the customer is never pushed past the (sentiment-
// aware) star routing into an unconditional Google link.
//
// COPY: all customer-facing copy is overridable from the builder and is written
// without em/en dashes (plain punctuation) so it reads cleanly everywhere and is
// easy to edit by hand after pasting into an email tool.

export interface ReviewEmailConfig {
  businessName: string;
  customerName: string; // "" -> a generic greeting is used
  googleReviewUrl: string;
  feedbackFormUrl: string;
  /** Logo as a hosted URL OR an embedded data: URI (from an upload). "" -> omit. */
  logoUrl: string;
  brandColor: string; // hex, e.g. "#2e7d4f"
  unsubscribeUrl: string;
  // ── Editable copy (all optional in the UI; these are the defaults) ──────────
  headline: string; // {name} is replaced with the customer's first name
  intro: string; // {business} is replaced with the business name
  starPrompt: string; // small line under the stars
  lowRatingNote: string; // the "not a 5-star job" reassurance line
  signoff: string; // bold line after "Thank you,"
}

// Defaults use {name} and {business} tokens so personalisation still works even
// after the user overwrites the copy.
export const DEFAULT_REVIEW_EMAIL_COPY = {
  headline: "How did we do, {name}?",
  intro:
    "Thanks for choosing {business}. Your feedback genuinely helps us, and other locals looking for someone they can trust. Tap a star to let us know how we did.",
  starPrompt: "Tap a star above. It takes about 10 seconds.",
  lowRatingNote:
    "Not a 5-star job? We would still love to hear it. Tap 1 to 3 stars to tell us privately what went wrong, and we will do our best to put it right.",
  signoff: "The {business} team",
} as const;

export const DEFAULT_REVIEW_EMAIL_CONFIG: ReviewEmailConfig = {
  businessName: "Thorburn Landscape",
  customerName: "Sarah",
  googleReviewUrl: "https://g.page/r/EXAMPLE/review",
  feedbackFormUrl: "https://forms.gle/EXAMPLE",
  logoUrl: "",
  brandColor: "#2e7d4f",
  unsubscribeUrl: "https://example.com/unsubscribe",
  ...DEFAULT_REVIEW_EMAIL_COPY,
};

/** Escape user input for safe interpolation into HTML text/attributes. */
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Replace {name} and {business} tokens, then HTML-escape the result. */
function fillTokens(text: string, tokens: { name: string; business: string }): string {
  const replaced = text
    .replace(/\{name\}/g, tokens.name)
    .replace(/\{business\}/g, tokens.business);
  return esc(replaced);
}

/**
 * Append a query param to a URL safely (handles existing query strings). Falls
 * back to naive concatenation if the URL can't be parsed (e.g. a placeholder).
 */
function withRating(url: string, rating: number): string {
  const trimmed = url.trim();
  if (!trimmed) return "#";
  try {
    const u = new URL(trimmed);
    u.searchParams.set("rating", String(rating));
    return u.toString();
  } catch {
    const sep = trimmed.includes("?") ? "&" : "?";
    return `${trimmed}${sep}rating=${rating}`;
  }
}

/**
 * Sanitise a URL for an href/src. Allows http(s) and data: image URIs (so an
 * uploaded logo can be embedded). Anything else becomes "#".
 */
function safeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "#";
  if (/^https?:\/\//i.test(trimmed) || /^data:image\//i.test(trimmed)) {
    return esc(trimmed);
  }
  return "#";
}

/** One clickable star (a plain link, since email clients run no JavaScript). */
function star(href: string, label: string): string {
  return `              <td style="padding:0 4px;">
                <a href="${href}" target="_blank" style="text-decoration:none; font-size:46px; line-height:46px; color:#f5b50a; font-family:Arial, sans-serif;" aria-label="${label}">&#9733;</a>
              </td>`;
}

/** Build the full, self-contained HTML email from a config. */
export function buildReviewEmailHtml(cfg: ReviewEmailConfig): string {
  const businessRaw = cfg.businessName.trim() || "our business";
  const nameRaw = cfg.customerName.trim() || "there";
  const tokens = { name: nameRaw, business: businessRaw };

  const business = esc(businessRaw);
  const brand = /^#[0-9a-fA-F]{3,8}$/.test(cfg.brandColor.trim())
    ? cfg.brandColor.trim()
    : "#2e7d4f";
  const google = safeUrl(cfg.googleReviewUrl);
  const unsub = safeUrl(cfg.unsubscribeUrl);

  const headline = fillTokens(cfg.headline || DEFAULT_REVIEW_EMAIL_COPY.headline, tokens);
  const intro = fillTokens(cfg.intro || DEFAULT_REVIEW_EMAIL_COPY.intro, tokens);
  const starPrompt = fillTokens(
    cfg.starPrompt || DEFAULT_REVIEW_EMAIL_COPY.starPrompt,
    tokens,
  );
  const lowRatingNote = fillTokens(
    cfg.lowRatingNote || DEFAULT_REVIEW_EMAIL_COPY.lowRatingNote,
    tokens,
  );
  const signoff = fillTokens(cfg.signoff || DEFAULT_REVIEW_EMAIL_COPY.signoff, tokens);

  const logoBlock = cfg.logoUrl.trim()
    ? `                <img src="${safeUrl(cfg.logoUrl)}" alt="${business}" width="120" style="display:block; border:0; max-width:120px; height:auto; margin:0 auto 12px;" />\n`
    : "";

  const stars = [
    star(withRating(cfg.feedbackFormUrl, 1), "1 star"),
    star(withRating(cfg.feedbackFormUrl, 2), "2 stars"),
    star(withRating(cfg.feedbackFormUrl, 3), "3 stars"),
    star(google, "4 stars"),
    star(google, "5 stars"),
  ].join("\n");

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="color-scheme" content="light dark" />
    <title>How did we do?</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f4f5f7; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%;">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0; mso-hide:all; font-size:1px; line-height:1px; color:#f4f5f7;">
      Got a moment? Tap a star to tell us how we did. It takes 10 seconds.
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f5f7;">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%; max-width:600px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 1px 3px rgba(16,24,40,0.08);">
            <tr>
              <td style="height:6px; background-color:${brand}; line-height:6px; font-size:6px;">&nbsp;</td>
            </tr>
            <tr>
              <td align="center" style="padding:32px 32px 8px 32px;">
${logoBlock}                <div style="font-family:Arial, Helvetica, sans-serif; font-size:14px; font-weight:600; letter-spacing:0.3px; color:#667085; text-transform:uppercase;">
                  ${business}
                </div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:8px 32px 0 32px;">
                <h1 style="margin:0; font-family:Georgia, 'Times New Roman', serif; font-size:28px; line-height:1.25; color:#101828; font-weight:700;">
                  ${headline}
                </h1>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:14px 40px 0 40px;">
                <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:1.6; color:#475467;">
                  ${intro}
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:28px 16px 4px 16px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
${stars}
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:6px 32px 0 32px;">
                <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:13px; color:#98a2b3;">
                  ${starPrompt}
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:18px 40px 0 40px;">
                <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:13px; line-height:1.6; color:#98a2b3;">
                  ${lowRatingNote}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 0 32px;">
                <div style="border-top:1px solid #eaecf0; line-height:1px; font-size:1px;">&nbsp;</div>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 8px 32px;">
                <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:1.6; color:#475467;">
                  Thank you,<br />
                  <strong style="color:#101828;">${signoff}</strong>
                </p>
              </td>
            </tr>
          </table>
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%; max-width:600px;">
            <tr>
              <td align="center" style="padding:20px 24px;">
                <p style="margin:0 0 6px 0; font-family:Arial, Helvetica, sans-serif; font-size:12px; line-height:1.6; color:#98a2b3;">
                  You received this email because you were a customer of ${business}.
                </p>
                <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:12px; line-height:1.6; color:#98a2b3;">
                  <a href="${unsub}" style="color:#98a2b3; text-decoration:underline;">Unsubscribe</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
