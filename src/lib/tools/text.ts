// Pure text transforms for the case-converter tool. No DOM/React; testable.

const SMALL_WORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "but",
  "by",
  "for",
  "if",
  "in",
  "nor",
  "of",
  "on",
  "or",
  "per",
  "the",
  "to",
  "vs",
  "via",
]);

export function toUpper(text: string): string {
  return text.toUpperCase();
}

export function toLower(text: string): string {
  return text.toLowerCase();
}

/** Capitalise the first letter of every word. */
export function toCapitalCase(text: string): string {
  return text.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Title Case with small-word handling (first/last word always capitalised). */
export function toTitleCase(text: string): string {
  const words = text.toLowerCase().split(/(\s+)/);
  const lastIndex = words.length - 1;
  return words
    .map((token, i) => {
      if (/^\s+$/.test(token) || token === "") return token;
      if (i !== 0 && i !== lastIndex && SMALL_WORDS.has(token)) return token;
      return token.charAt(0).toUpperCase() + token.slice(1);
    })
    .join("");
}

/** Sentence case: capitalise the first letter of each sentence. */
export function toSentenceCase(text: string): string {
  return text.toLowerCase().replace(/(^\s*\w|[.!?]\s+\w)/g, (c) => c.toUpperCase());
}

export function reverseText(text: string): string {
  return [...text].reverse().join("");
}

/** Collapse all line breaks (and the surrounding whitespace) into single spaces. */
export function removeLineBreaks(text: string): string {
  return text.replace(/\s*\r?\n\s*/g, " ").trim();
}
