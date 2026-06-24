import { describe, expect, it } from "vitest";
import {
  toUpper,
  toLower,
  toTitleCase,
  toCapitalCase,
  toSentenceCase,
  reverseText,
  removeLineBreaks,
} from "@/lib/tools/text";

describe("text transforms", () => {
  it("upper + lower", () => {
    expect(toUpper("hello")).toBe("HELLO");
    expect(toLower("Hello")).toBe("hello");
  });

  it("title case keeps small words lowercase mid-sentence", () => {
    expect(toTitleCase("the lord of the rings")).toBe("The Lord of the Rings");
  });

  it("title case capitalises the first and last word always", () => {
    expect(toTitleCase("a tale of two cities")).toBe("A Tale of Two Cities");
  });

  it("capital case capitalises every word", () => {
    expect(toCapitalCase("the lord of the rings")).toBe("The Lord Of The Rings");
  });

  it("sentence case capitalises after . ! ?", () => {
    expect(toSentenceCase("hello world. how are you? fine!")).toBe(
      "Hello world. How are you? Fine!",
    );
  });

  it("reverse", () => {
    expect(reverseText("abc")).toBe("cba");
  });

  it("remove line breaks collapses newlines to single spaces", () => {
    expect(removeLineBreaks("line one\nline two\n\nline three")).toBe(
      "line one line two line three",
    );
  });
});
