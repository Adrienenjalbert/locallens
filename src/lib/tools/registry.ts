// The free-tools directory registry: the single source of truth for every
// self-contained, client-side tool we ship. The /tools hub, the category
// landing pages, the per-tool pages, and the published-pages registry (which
// feeds sitemap.xml) all read from here so they can never drift.
//
// This is also the pSEO backbone: tools are grouped by `category`, and the
// category axis is what generates the vertical landing pages. Adding a tool is a
// single registry entry (+ a widget component wired in `[tool]/page.tsx`).

import type { FaqItem } from "@/lib/tools/jsonld";
import { CONVERSIONS, formatResult, type Conversion } from "@/lib/tools/convert";

/** A tool category — the vertical pSEO axis (one landing page per category). */
export interface ToolCategory {
  slug: string;
  /** Plural display name, e.g. "SEO tools". */
  name: string;
  /** One-line, answer-first description used on the category page + hub. */
  tagline: string;
  /** 40–60 word answer-first intro (AEO extraction surface). */
  intro: string;
}

export const TOOL_CATEGORIES: Record<string, ToolCategory> = {
  converters: {
    slug: "converters",
    name: "Unit converters",
    tagline: "Instant, accurate conversions for weight, length, temperature and more.",
    intro:
      "Free unit converters that run entirely in your browser — kilograms to pounds, centimetres to inches, Celsius to Fahrenheit, miles to kilometres and more. Each converter is instant, accurate to standard factors, and works offline once loaded. No signup, no data sent to a server.",
  },
  calculators: {
    slug: "calculators",
    name: "Everyday calculators",
    tagline: "Free calculators for the numbers you reach for most.",
    intro:
      "Free everyday calculators that run in your browser: percentages, ages, dates, areas and more. Each one answers a single question fast, with no signup and nothing sent to a server. Built to be the quickest way to get a reliable number.",
  },
  finance: {
    slug: "finance",
    name: "Finance tools",
    tagline: "Free tools for VAT, prices, margins and money maths.",
    intro:
      "Free finance tools for UK businesses and households: add or remove VAT, work out discounts and margins, and check the everyday money maths that matters. Instant, private and free — everything runs client-side and nothing is sent to a server.",
  },
  health: {
    slug: "health",
    name: "Health & fitness tools",
    tagline: "Free calculators to plan training and nutrition.",
    intro:
      "Free health and fitness calculators that run in your browser — work out your TDEE and BMR, calorie targets and more using established formulas. For general guidance only, not medical advice. No signup, and nothing you enter leaves the page.",
  },
  text: {
    slug: "text",
    name: "Text tools",
    tagline: "Free tools to count, convert and clean up text.",
    intro:
      "Free text tools that run entirely in your browser: count words and characters, convert case, reverse text and strip line breaks. Fast, private and free — your text is never uploaded. Built for writers, students and anyone working with copy.",
  },
  developer: {
    slug: "developer",
    name: "Developer tools",
    tagline: "Free, fast utilities for everyday development.",
    intro:
      "Free developer utilities that run client-side — generate UUIDs, convert number bases, and handle the small encoding and formatting jobs that interrupt your flow. No signup, no network calls; everything happens in your browser.",
  },
  seo: {
    slug: "seo",
    name: "SEO tools",
    tagline: "Free tools to plan, build and audit pages that rank.",
    intro:
      "Free SEO tools that run entirely in your browser — no signup, no data sent to a server. Build clean URLs, generate meta tags and structured data, and check the on-page basics that decide whether a page can rank and get cited by AI answer engines.",
  },
  marketing: {
    slug: "marketing",
    name: "Marketing tools",
    tagline: "Free tools to launch campaigns and track what works.",
    intro:
      "Free marketing tools for building and tracking campaigns. Generate consistent UTM-tagged links, preview how a page looks when shared, and keep your tracking clean so every click is attributable. Everything runs client-side — your data never leaves the page.",
  },
  "local-business": {
    slug: "local-business",
    name: "Local business tools",
    tagline: "Free tools that help local businesses win more customers.",
    intro:
      "Free tools for local businesses — get more reviews, look credible in search, and turn a local web presence into enquiries. Built for tradespeople, services and small teams who want results without paying for software. Free, no signup.",
  },
} as const;

export type ToolCategorySlug = keyof typeof TOOL_CATEGORIES;

/** The interactive widget a tool page renders (switch key in ToolPageShell). */
export type ToolKind =
  | "utm-builder"
  | "slugify"
  | "meta-preview"
  | "converter"
  | "vat-calculator"
  | "tdee-calculator"
  | "age-calculator"
  | "days-between"
  | "percentage-calculator"
  | "concrete-calculator"
  | "word-counter"
  | "case-converter"
  | "uuid-generator";

export interface ToolDefinition {
  /** URL slug under /tools/<slug>/. Stable; do not rename once published. */
  slug: string;
  /** The interactive widget this page renders (switch key in ToolPageShell). */
  kind: ToolKind;
  /** For `kind: "converter"`, the conversion slug in convert.ts. */
  conversionSlug?: string;
  category: ToolCategorySlug;
  /** Short, human display name, e.g. "UTM campaign URL builder". */
  name: string;
  /** SEO <title>; ~50–60 chars, leads with the primary keyword. */
  title: string;
  /** SEO meta description; ~150 chars, benefit-led, ends with "Free, no signup." */
  description: string;
  /** 40–60 word answer-first paragraph rendered before the widget (AEO). */
  answer: string;
  /** Target query cluster (long-tail, question-shaped) for this tool. */
  keywords: string[];
  /** 5+ Q&A pairs → FAQPage JSON-LD (highest-leverage extraction unit). */
  faq: FaqItem[];
  /** ISO date the tool/page last changed (freshness signal, kept in lock-step
      with sitemap + the visible "Updated {date}"). */
  lastModified: string;
  /** Whether the tool is live (true) or planned/coming-soon (false). Planned
      tools appear on the hub as a roadmap but are NOT indexed or pre-rendered. */
  status: "live" | "planned";
}

const CONVERTER_LAST_MODIFIED = "2026-06-15";

/**
 * Build a registry entry for a converter from its CONVERSIONS definition, so the
 * dozen converter pages stay in lock-step with the engine (one source of truth).
 * Each carries a worked example + a 5-question FAQ generated from the units.
 */
function converterTool(c: Conversion): ToolDefinition {
  const from = c.fromUnit.toLowerCase();
  const to = c.toUnit.toLowerCase();
  const example = formatResult(c.convert(c.example), c.precision);
  const fromName = c.fromUnit.replace(/\s*\(.*\)/, "");
  const toName = c.toUnit.replace(/\s*\(.*\)/, "");

  return {
    slug: c.slug,
    kind: "converter",
    conversionSlug: c.slug,
    category: "converters",
    name: `${fromName} to ${toName} converter`,
    title: `${fromName} to ${toName} Converter — Free & Instant`,
    description: `Convert ${from} to ${to} instantly with this free converter. Accurate, no signup, works in your browser. Includes the ${from} to ${to} formula.`,
    answer: `To convert ${from} to ${to}, enter a value above and the result updates instantly. For reference, ${c.example} ${c.fromSymbol} = ${example} ${c.toSymbol}. This converter uses standard conversion factors and runs entirely in your browser — nothing is sent to a server.`,
    keywords: [
      `${from} to ${to}`,
      `${from} to ${to} converter`,
      `convert ${from} to ${to}`,
      `${c.fromSymbol} to ${c.toSymbol}`,
      `how many ${to} in a ${from.replace(/s$/, "")}`,
    ],
    faq: [
      {
        question: `How do I convert ${from} to ${to}?`,
        answer: `Enter the number of ${from} in the box above and the equivalent in ${to} appears instantly. For example, ${c.example} ${c.fromSymbol} = ${example} ${c.toSymbol}.`,
      },
      {
        question: `What is ${c.example} ${c.fromSymbol} in ${to}?`,
        answer: `${c.example} ${c.fromSymbol} is ${example} ${c.toSymbol}.`,
      },
      {
        question: `Is this ${from} to ${to} converter accurate?`,
        answer: `Yes. It uses the standard internationally-recognised conversion factor, so results match official references to several decimal places.`,
      },
      {
        question: `Can I convert ${to} back to ${from}?`,
        answer: c.reverseSlug
          ? `Yes — use the ${toName} to ${fromName} converter, or tap the swap button on this page.`
          : `Yes — divide instead of multiply, or use the inverse converter.`,
      },
      {
        question: `Does this converter work offline?`,
        answer: `Once the page has loaded it runs entirely in your browser, so conversions keep working without a connection and nothing you type is ever uploaded.`,
      },
    ],
    lastModified: CONVERTER_LAST_MODIFIED,
    status: "live",
  };
}

// ---------------------------------------------------------------------------
// The tools. Keep `slug` stable. Bump `lastModified` (and PUBLISHED_PAGES) when
// a tool's behaviour or copy materially changes.
// ---------------------------------------------------------------------------

const STANDALONE_TOOLS: ToolDefinition[] = [
  {
    slug: "utm-builder",
    kind: "utm-builder",
    category: "marketing",
    name: "UTM campaign URL builder",
    title: "Free UTM Builder — Campaign URL Generator",
    description:
      "Build consistent, trackable UTM campaign URLs for Google Analytics in seconds. Live preview, one-click copy, lowercase enforcement. Free, no signup.",
    answer:
      "A UTM builder appends campaign tags (source, medium, campaign) to a URL so analytics can attribute the click. Paste your landing-page URL, fill in the source, medium and campaign name, and copy the tagged link. This tool runs fully in your browser — nothing is sent to a server.",
    keywords: [
      "utm builder",
      "utm campaign url builder",
      "google analytics campaign url builder",
      "utm link generator",
      "how to build a utm url",
    ],
    faq: [
      {
        question: "What is a UTM parameter?",
        answer:
          "A UTM parameter is a tag added to a URL's query string (e.g. utm_source=newsletter) that analytics tools read to attribute a visit to a specific source, medium and campaign.",
      },
      {
        question: "Which UTM parameters are required?",
        answer:
          "utm_source, utm_medium and utm_campaign are the three core parameters. utm_term and utm_content are optional and mainly used for paid search and A/B testing.",
      },
      {
        question: "Should UTM values be lowercase?",
        answer:
          "Yes. UTM values are case-sensitive, so 'Facebook' and 'facebook' are counted as two different sources. This tool lowercases values automatically to keep your reports clean.",
      },
      {
        question: "Is my data sent anywhere?",
        answer:
          "No. The builder runs entirely in your browser. The URL you enter and the tags you add never leave the page.",
      },
      {
        question: "Can I reuse a naming convention?",
        answer:
          "Yes — pick a fixed set of sources and mediums (e.g. email, social, cpc) and stick to them. Consistent, lowercase values are what make campaign reporting reliable.",
      },
    ],
    lastModified: "2026-06-15",
    status: "live",
  },
  {
    slug: "slug-generator",
    kind: "slugify",
    category: "seo",
    name: "SEO-friendly URL slug generator",
    title: "Free Slug Generator — SEO-Friendly URLs",
    description:
      "Turn any title into a clean, lowercase, SEO-friendly URL slug. Strips accents and punctuation, handles stop words. Free, no signup.",
    answer:
      "A URL slug is the human-readable part of a page address (e.g. /free-utm-builder). A good slug is lowercase, hyphen-separated, free of accents and punctuation, and short. Paste a title to get a clean slug instantly — it runs in your browser, with an option to drop common stop words.",
    keywords: [
      "slug generator",
      "url slug generator",
      "seo friendly url generator",
      "slugify online",
      "convert title to url slug",
    ],
    faq: [
      {
        question: "What makes a good URL slug?",
        answer:
          "A good slug is lowercase, uses hyphens (not underscores or spaces), contains your target keyword, drops accents and punctuation, and is as short as it can be while staying readable.",
      },
      {
        question: "Should I remove stop words from slugs?",
        answer:
          "Often, yes. Removing words like 'the', 'a' and 'of' shortens the slug without losing meaning. This tool can drop common English stop words on toggle, but keep them if doing so changes the meaning.",
      },
      {
        question: "Hyphens or underscores in URLs?",
        answer:
          "Use hyphens. Google treats hyphens as word separators but treats underscores as joiners, so 'free-utm-builder' is read as three words while 'free_utm_builder' is read as one.",
      },
      {
        question: "Does the slug generator send my text anywhere?",
        answer:
          "No. All processing happens in your browser. Your titles are never uploaded.",
      },
      {
        question: "How long should a slug be?",
        answer:
          "Aim for three to five meaningful words. Shorter slugs are easier to read, share and remember, and they keep the keyword prominent.",
      },
    ],
    lastModified: "2026-06-15",
    status: "live",
  },
  {
    slug: "meta-tag-generator",
    kind: "meta-preview",
    category: "seo",
    name: "Meta tag & Open Graph generator",
    title: "Free Meta Tag Generator — Title, Description & OG",
    description:
      "Generate SEO meta tags and Open Graph tags with a live Google + social preview and pixel-length checks. Copy-paste ready. Free, no signup.",
    answer:
      "Meta tags tell search engines and social platforms how to title, describe and preview your page. Enter a title, description and URL to get copy-paste-ready <title>, meta description and Open Graph tags, with a live preview of how the result appears in Google and when shared on social.",
    keywords: [
      "meta tag generator",
      "open graph generator",
      "og tag generator",
      "seo meta description generator",
      "google serp preview tool",
    ],
    faq: [
      {
        question: "How long should a title tag be?",
        answer:
          "Aim for roughly 50–60 characters (about 580 pixels). Longer titles get truncated in Google's results. This tool flags when you go over.",
      },
      {
        question: "How long should a meta description be?",
        answer:
          "Around 150–160 characters. It does not directly affect ranking, but a compelling description improves click-through rate from the results page.",
      },
      {
        question: "What are Open Graph tags for?",
        answer:
          "Open Graph (og:) tags control how a page looks when shared on social platforms — the title, description and preview image. Without them, platforms guess, often badly.",
      },
      {
        question: "Do I need both meta and Open Graph tags?",
        answer:
          "Yes. Standard meta tags drive how you appear in search results; Open Graph tags drive how you appear when shared. This tool generates both at once.",
      },
      {
        question: "Is the generated markup sent to a server?",
        answer:
          "No. The preview and the generated tags are produced entirely in your browser.",
      },
    ],
    lastModified: "2026-06-15",
    status: "live",
  },
  // ── Finance ──────────────────────────────────────────────────────────────
  {
    slug: "vat-calculator",
    kind: "vat-calculator",
    category: "finance",
    name: "VAT calculator",
    title: "Free VAT Calculator (UK) — Add or Remove VAT",
    description:
      "Add or remove UK VAT (20%) from any amount instantly. Shows net, VAT and gross. Custom rates supported. Free, no signup.",
    answer:
      "To add VAT, multiply the net amount by 1.20 (for the standard 20% UK rate); to remove VAT, divide the gross amount by 1.20. Enter your figure above and the calculator shows the net, the VAT and the gross at once. It runs in your browser — nothing is sent to a server.",
    keywords: [
      "vat calculator",
      "uk vat calculator",
      "add vat calculator",
      "remove vat calculator",
      "how to work out vat",
    ],
    faq: [
      {
        question: "What is the UK VAT rate?",
        answer:
          "The standard UK VAT rate is 20%. There is a reduced rate of 5% (e.g. domestic energy) and a 0% rate on some goods. This calculator defaults to 20% but lets you set any rate.",
      },
      {
        question: "How do I add VAT to a price?",
        answer:
          "Multiply the net (VAT-exclusive) price by 1.20 for the standard 20% rate. For example, £100 net becomes £120 gross, with £20 of VAT.",
      },
      {
        question: "How do I remove VAT from a price?",
        answer:
          "Divide the gross (VAT-inclusive) price by 1.20 for the standard rate. For example, £120 gross is £100 net, with £20 of VAT — not £24, which is a common mistake.",
      },
      {
        question: "Why isn't removing VAT just taking off 20%?",
        answer:
          "Because the 20% was added to the net amount, not the gross. Taking 20% off the gross over-deducts. You must divide the gross by 1.20 instead.",
      },
      {
        question: "Is my data sent anywhere?",
        answer: "No. The calculation happens entirely in your browser.",
      },
    ],
    lastModified: "2026-06-15",
    status: "live",
  },
  {
    slug: "percentage-calculator",
    kind: "percentage-calculator",
    category: "calculators",
    name: "Percentage calculator",
    title: "Free Percentage Calculator — %, Change & Off",
    description:
      "Work out a percentage of a number, percentage increase or decrease, and percent off a price. Instant and free, no signup.",
    answer:
      "To find X% of a number, multiply the number by X/100. To find a percentage change, divide the difference by the original and multiply by 100. To find a price after a discount, multiply by (1 − percent/100). Pick a mode above and enter two numbers.",
    keywords: [
      "percentage calculator",
      "percent of a number",
      "percentage increase calculator",
      "percentage change calculator",
      "percent off calculator",
    ],
    faq: [
      {
        question: "How do I find a percentage of a number?",
        answer:
          "Multiply the number by the percentage divided by 100. For example, 15% of 200 = 200 × 0.15 = 30.",
      },
      {
        question: "How do I calculate percentage increase?",
        answer:
          "Subtract the old value from the new value, divide by the old value, then multiply by 100. From 50 to 75 is (75−50)/50 × 100 = 50% increase.",
      },
      {
        question: "How do I work out a discount?",
        answer:
          "Multiply the price by (1 − discount/100). A 25% discount on £80 = 80 × 0.75 = £60.",
      },
      {
        question: "What's the difference between percentage points and percent?",
        answer:
          "A move from 10% to 12% is a 2 percentage-point rise but a 20% relative increase. This tool reports the relative percentage change.",
      },
      {
        question: "Is it free?",
        answer: "Yes, completely free and it runs in your browser with no signup.",
      },
    ],
    lastModified: "2026-06-15",
    status: "live",
  },
  // ── Health ───────────────────────────────────────────────────────────────
  {
    slug: "tdee-calculator",
    kind: "tdee-calculator",
    category: "health",
    name: "TDEE calculator",
    title: "Free TDEE Calculator — Daily Calorie Needs",
    description:
      "Calculate your TDEE and BMR using the Mifflin-St Jeor formula, plus calorie targets to lose, maintain or gain weight. Free, no signup.",
    answer:
      "Your TDEE (Total Daily Energy Expenditure) is the calories you burn per day. It's your BMR — calculated here with the Mifflin-St Jeor equation from your sex, age, height and weight — multiplied by an activity factor. Enter your details above for your maintenance calories and cut/bulk targets.",
    keywords: [
      "tdee calculator",
      "daily calorie calculator",
      "maintenance calories calculator",
      "bmr calculator",
      "how many calories do i need",
    ],
    faq: [
      {
        question: "What is TDEE?",
        answer:
          "TDEE is your Total Daily Energy Expenditure — the total calories you burn in a day, including activity. Eating at your TDEE maintains your weight.",
      },
      {
        question: "How is TDEE calculated?",
        answer:
          "This tool calculates your BMR with the Mifflin-St Jeor equation, then multiplies it by an activity factor from 1.2 (sedentary) to 1.9 (very active).",
      },
      {
        question: "How many calories to lose weight?",
        answer:
          "A deficit of about 500 calories below your TDEE per day targets roughly 0.5 kg of fat loss per week. The tool shows this figure automatically.",
      },
      {
        question: "Is the Mifflin-St Jeor equation accurate?",
        answer:
          "It's one of the most accurate predictive equations for resting metabolism, but it's an estimate. Use it as a starting point and adjust based on real-world results.",
      },
      {
        question: "Is this medical advice?",
        answer:
          "No. It's for general guidance only. Consult a qualified professional for personalised dietary or medical advice.",
      },
    ],
    lastModified: "2026-06-15",
    status: "live",
  },
  // ── Everyday calculators ───────────────────────────────────────────────────
  {
    slug: "age-calculator",
    kind: "age-calculator",
    category: "calculators",
    name: "Age calculator",
    title: "Free Age Calculator — How Old Am I?",
    description:
      "Work out your exact age in years, months and days from your date of birth, plus total days lived. Free, instant, no signup.",
    answer:
      "To work out your age, the calculator counts full years from your date of birth to today (or any date you choose), then the remaining months and days. Enter your date of birth above to see your exact age and the total number of days you've been alive.",
    keywords: [
      "age calculator",
      "how old am i",
      "age in years months days",
      "date of birth age calculator",
      "exact age calculator",
    ],
    faq: [
      {
        question: "How is my exact age calculated?",
        answer:
          "It counts the complete years between your birth date and the chosen date, then the leftover months and days, accounting for different month lengths and leap years.",
      },
      {
        question: "Can I calculate my age on a future or past date?",
        answer:
          "Yes. Change the 'age at date' field to any date to see how old you were or will be then.",
      },
      {
        question: "Does it handle leap years?",
        answer:
          "Yes. The day count uses real calendar dates, so 29 February and leap years are handled correctly.",
      },
      {
        question: "How many days have I been alive?",
        answer:
          "The tool shows your total days lived alongside your years/months/days age.",
      },
      {
        question: "Is my date of birth stored?",
        answer: "No. Everything is calculated in your browser and nothing is uploaded.",
      },
    ],
    lastModified: "2026-06-15",
    status: "live",
  },
  {
    slug: "days-between-dates",
    kind: "days-between",
    category: "calculators",
    name: "Days between dates calculator",
    title: "Free Days Between Dates Calculator",
    description:
      "Count the number of days between two dates, plus the result in weeks and days. Free, instant, runs in your browser. No signup.",
    answer:
      "To count the days between two dates, the calculator finds the difference between them and reports the whole number of days, plus the same span expressed in weeks and days. Pick a start and end date above to get the count instantly.",
    keywords: [
      "days between dates",
      "date duration calculator",
      "how many days between two dates",
      "days calculator",
      "weeks between dates",
    ],
    faq: [
      {
        question: "How do I count the days between two dates?",
        answer:
          "Select a start and end date above. The tool subtracts one from the other and shows the whole number of days between them.",
      },
      {
        question: "Does it include both the start and end day?",
        answer:
          "It counts the number of full days from the start date to the end date. To include both endpoints in a count, add one.",
      },
      {
        question: "Can I see the result in weeks?",
        answer: "Yes — it also breaks the total down into weeks and remaining days.",
      },
      {
        question: "Does it work across years and leap years?",
        answer:
          "Yes. It uses real calendar dates, so spans across months, years and leap years are accurate.",
      },
      {
        question: "Is it free?",
        answer: "Yes, free with no signup, and it runs entirely in your browser.",
      },
    ],
    lastModified: "2026-06-15",
    status: "live",
  },
  {
    slug: "concrete-calculator",
    kind: "concrete-calculator",
    category: "calculators",
    name: "Concrete calculator",
    title: "Free Concrete Calculator — Volume & Bags",
    description:
      "Work out how much concrete you need for a slab in cubic metres, plus an estimate of 25 kg pre-mix bags. Free, no signup.",
    answer:
      "To work out concrete for a slab, multiply length × width × depth in metres to get the volume in cubic metres. Enter your slab's dimensions above and the calculator returns the volume and an approximate number of 25 kg pre-mix bags. Add about 10% for spillage.",
    keywords: [
      "concrete calculator",
      "how much concrete do i need",
      "concrete volume calculator",
      "concrete slab calculator",
      "concrete bags calculator",
    ],
    faq: [
      {
        question: "How do I calculate concrete for a slab?",
        answer:
          "Multiply the slab's length, width and depth, all in metres. For example, a 4 m × 3 m slab at 0.1 m deep needs 1.2 m³ of concrete.",
      },
      {
        question: "How many bags of concrete in a cubic metre?",
        answer:
          "Roughly 90–110 standard 25 kg pre-mix bags per cubic metre. For larger volumes, ready-mix delivery is usually cheaper than bags.",
      },
      {
        question: "Should I add extra for waste?",
        answer:
          "Yes. Add about 10% for spillage, an uneven sub-base and over-digging so you don't run short mid-pour.",
      },
      {
        question: "What depth should a slab be?",
        answer:
          "Typical garden/path slabs are 75–100 mm; driveways and bases for heavy loads are often 100–150 mm. Check your project's requirements.",
      },
      {
        question: "Is the bag estimate exact?",
        answer:
          "It's an approximation for standard pre-mixed concrete. Always check the yield printed on the bag you're buying.",
      },
    ],
    lastModified: "2026-06-15",
    status: "live",
  },
  // ── Text ───────────────────────────────────────────────────────────────────
  {
    slug: "word-counter",
    kind: "word-counter",
    category: "text",
    name: "Word & character counter",
    title: "Free Word Counter — Words, Characters & Reading Time",
    description:
      "Count words, characters (with and without spaces), sentences, paragraphs and reading time as you type. Free, private, no signup.",
    answer:
      "Paste or type text above and the counter updates live with the number of words, characters with and without spaces, sentences, paragraphs and an estimated reading time. It runs entirely in your browser, so your text is never uploaded.",
    keywords: [
      "word counter",
      "character counter",
      "count words online",
      "word count tool",
      "letter counter",
    ],
    faq: [
      {
        question: "How does the word counter count words?",
        answer:
          "It splits your text on whitespace and counts the resulting tokens, so it matches how word processors count words.",
      },
      {
        question: "Does it count characters with and without spaces?",
        answer:
          "Yes — it shows both, which is useful for limits that exclude spaces (like some social and SEO fields).",
      },
      {
        question: "How is reading time estimated?",
        answer:
          "It assumes an average reading speed of about 200 words per minute and rounds up to the next minute.",
      },
      {
        question: "Is there a limit on text length?",
        answer: "No practical limit — it handles long documents because it runs locally.",
      },
      {
        question: "Is my text uploaded?",
        answer: "No. Counting happens in your browser; nothing leaves the page.",
      },
    ],
    lastModified: "2026-06-15",
    status: "live",
  },
  {
    slug: "case-converter",
    kind: "case-converter",
    category: "text",
    name: "Case converter",
    title: "Free Case Converter — UPPER, lower, Title Case",
    description:
      "Convert text to UPPERCASE, lowercase, Title Case, Sentence case, reverse it or strip line breaks. Instant, free, no signup.",
    answer:
      "Paste your text above and tap a transform to convert it to UPPERCASE, lowercase, Title Case, Capital Case or Sentence case, to reverse it, or to remove line breaks. Each transform applies in place so you can chain them, then copy the result. Everything runs in your browser.",
    keywords: [
      "case converter",
      "uppercase to lowercase",
      "title case converter",
      "convert text case",
      "sentence case converter",
    ],
    faq: [
      {
        question: "What case options are available?",
        answer:
          "UPPERCASE, lowercase, Title Case, Capital Case, Sentence case, plus reverse text and remove line breaks.",
      },
      {
        question: "What's the difference between Title Case and Capital Case?",
        answer:
          "Capital Case capitalises every word. Title Case follows style rules — it keeps small words like 'of' and 'the' lowercase unless they start or end the title.",
      },
      {
        question: "Can I chain transforms?",
        answer:
          "Yes. Each transform updates the text box in place, so you can apply one after another, then copy the final result.",
      },
      {
        question: "Does it remove line breaks?",
        answer:
          "Yes — the 'remove line breaks' transform collapses newlines into single spaces, handy for pasting multi-line text into one field.",
      },
      {
        question: "Is my text private?",
        answer: "Yes. All transforms run locally in your browser.",
      },
    ],
    lastModified: "2026-06-15",
    status: "live",
  },
  // ── Developer ────────────────────────────────────────────────────────────
  {
    slug: "uuid-generator",
    kind: "uuid-generator",
    category: "developer",
    name: "UUID generator",
    title: "Free UUID Generator (v4) — Bulk & Instant",
    description:
      "Generate random v4 UUIDs in your browser, one or in bulk, using the Web Crypto API. Copy all with one click. Free, no signup.",
    answer:
      "A UUID (v4) is a 128-bit random identifier written as 32 hex digits in five hyphen-separated groups. This generator creates them with the browser's cryptographically-secure Web Crypto API — choose how many you need and copy them all. Nothing is sent to a server.",
    keywords: [
      "uuid generator",
      "guid generator",
      "v4 uuid generator",
      "random uuid",
      "bulk uuid generator",
    ],
    faq: [
      {
        question: "What is a v4 UUID?",
        answer:
          "A version-4 UUID is a 128-bit identifier whose bits are mostly random, making accidental collisions effectively impossible. It's written as 8-4-4-4-12 hex digits.",
      },
      {
        question: "Are these UUIDs cryptographically random?",
        answer:
          "Yes. They're generated with the Web Crypto API (crypto.randomUUID / getRandomValues), which uses a cryptographically-secure random source.",
      },
      {
        question: "Can I generate many at once?",
        answer: "Yes — choose 1 to 100 and copy them all with one click.",
      },
      {
        question: "Is a UUID the same as a GUID?",
        answer:
          "Effectively yes. GUID is Microsoft's name for the same 128-bit identifier standard.",
      },
      {
        question: "Are the UUIDs sent anywhere?",
        answer: "No. They're generated in your browser and never transmitted.",
      },
    ],
    lastModified: "2026-06-15",
    status: "live",
  },
];

/** The full tool list: standalone tools + every converter from the engine. */
export const TOOLS: ToolDefinition[] = [
  ...STANDALONE_TOOLS,
  ...CONVERSIONS.map(converterTool),
];

// ---------------------------------------------------------------------------
// Lookups. Centralised so pages don't re-implement filtering/finding.
// ---------------------------------------------------------------------------

export function liveTools(): ToolDefinition[] {
  return TOOLS.filter((t) => t.status === "live");
}

export function findTool(slug: string): ToolDefinition | undefined {
  return TOOLS.find((t) => t.slug === slug);
}

export function toolsByCategory(category: string): ToolDefinition[] {
  return liveTools().filter((t) => t.category === category);
}

export function findCategory(slug: string): ToolCategory | undefined {
  return TOOL_CATEGORIES[slug];
}

/** Categories that currently have at least one live tool (for the hub + sitemap). */
export function activeCategories(): ToolCategory[] {
  return Object.values(TOOL_CATEGORIES).filter((c) => toolsByCategory(c.slug).length > 0);
}

/** Site-relative path (with trailing slash) for a tool page. */
export function toolPath(slug: string): string {
  return `/tools/${slug}/`;
}

/** Site-relative path (with trailing slash) for a category landing page. */
export function categoryPath(slug: string): string {
  return `/tools/category/${slug}/`;
}
