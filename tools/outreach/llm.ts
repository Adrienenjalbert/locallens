// Free-LLM message generator. Order: Groq (free, fast) -> Gemini (free) ->
// deterministic template fallback (no key needed). Called once per prospect on a
// tiny prompt, so free-tier rate limits are plenty.

import type { AuditIssue, Prospect, SenderInfo } from "./types";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GEMINI_URL = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

export interface GenResult {
  message: string;
  source: string;
}

function buildPrompt(
  p: Prospect,
  issues: AuditIssue[],
  sender: SenderInfo,
): string {
  const issueLines = issues
    .map((i, idx) => `${idx + 1}. ${i.label} — ${i.impact}`)
    .join("\n");
  return [
    "You write short, friendly, NON-salesy cold outreach to UK tradespeople (landscapers/gardeners).",
    "Goal: get a reply. Lead with genuine, specific value (the issues found), not a pitch.",
    "",
    `Business name: ${p.name}`,
    `Town: ${p.town}`,
    p.website ? `Website: ${p.website}` : "Website: (they have no website)",
    "",
    "Concrete issues I found on their online presence (use 2-3, in plain English, no jargon):",
    issueLines,
    "",
    `I'm ${sender.name} from ${sender.business}. I help local landscapers get exclusive leads (their own site + Google profile + ads), not shared leads.`,
    `Proof: I do this for a gardener already — ${sender.proofUrl}.`,
    "",
    "Write the message with these rules:",
    "- UK English, warm, max ~110 words.",
    "- Open by referencing THEM specifically (not 'Dear sir').",
    "- Mention 2-3 of the issues as helpful observations, not criticism.",
    "- One soft CTA (e.g. 'want me to send a quick 2-min screen recording of the fixes?').",
    "- No emojis. No subject line. Plain text only. Sign off as " + sender.name + ".",
  ].join("\n");
}

async function tryGroq(prompt: string): Promise<string | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      console.warn(`[llm] Groq ${res.status}; trying fallback.`);
      return null;
    }
    const data = await res.json();
    const text: string | undefined = data?.choices?.[0]?.message?.content;
    return text?.trim() || null;
  } catch (e) {
    console.warn(`[llm] Groq error: ${e instanceof Error ? e.message : e}`);
    return null;
  }
}

async function tryGemini(prompt: string): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  try {
    const res = await fetch(`${GEMINI_URL(model)}?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 300 },
      }),
    });
    if (!res.ok) {
      console.warn(`[llm] Gemini ${res.status}; using template fallback.`);
      return null;
    }
    const data = await res.json();
    const text: string | undefined =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text?.trim() || null;
  } catch (e) {
    console.warn(`[llm] Gemini error: ${e instanceof Error ? e.message : e}`);
    return null;
  }
}

/** Deterministic fallback so the engine ALWAYS produces a usable message. */
function templateMessage(
  p: Prospect,
  issues: AuditIssue[],
  sender: SenderInfo,
): string {
  const bullets = issues
    .slice(0, 3)
    .map((i) => `- ${i.label.toLowerCase()}`)
    .join("\n");
  return [
    `Hi ${p.name} team,`,
    "",
    `I was looking at landscapers around ${p.town} and noticed a few quick things on your online presence that are probably costing you enquiries:`,
    bullets,
    "",
    `I help local landscapers fix exactly this and get their own exclusive leads (your own site + Google profile + ads) instead of shared leads from Checkatrade/Bark. I already do it for a gardener — ${sender.proofUrl}.`,
    "",
    "Want me to send a quick 2-minute screen recording showing the fixes? No obligation.",
    "",
    `Cheers,`,
    sender.name,
    sender.business,
  ].join("\n");
}

export async function generateMessage(
  p: Prospect,
  issues: AuditIssue[],
  sender: SenderInfo,
  noLlm: boolean,
): Promise<GenResult> {
  if (noLlm || issues.length === 0) {
    return { message: templateMessage(p, issues, sender), source: "template" };
  }
  const prompt = buildPrompt(p, issues, sender);

  const groq = await tryGroq(prompt);
  if (groq) return { message: groq, source: "groq" };

  const gemini = await tryGemini(prompt);
  if (gemini) return { message: gemini, source: "gemini" };

  return {
    message: templateMessage(p, issues, sender),
    source: "template-fallback",
  };
}
