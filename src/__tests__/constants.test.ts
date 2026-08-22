import { describe, it, expect } from "vitest";
import {
  MAX_TAGS,
  SUMMARY_PLACEHOLDER,
  UNTITLED_ARTICLE,
  DETAIL_LOAD_DEBOUNCE_MS,
  DEFAULT_MAX_ARTICLES,
} from "../constants";

// The placeholders are user-visible copy rendered by the command components,
// which are outside the unit-test net, so nothing else pins their values:
// mutation testing showed both strings could be emptied without a failure.
// Compare against literals, not the constants themselves.
describe("constants", () => {
  it("keeps the user-visible fallback copy", () => {
    expect(SUMMARY_PLACEHOLDER).toBe("No summary available.");
    expect(UNTITLED_ARTICLE).toBe("Untitled");
  });

  it("keeps the tuning values", () => {
    expect(MAX_TAGS).toBe(6);
    expect(DETAIL_LOAD_DEBOUNCE_MS).toBe(150);
    expect(DEFAULT_MAX_ARTICLES).toBe(10);
  });
});
