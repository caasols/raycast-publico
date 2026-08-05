import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CHANGELOG = readFileSync(join(process.cwd(), "CHANGELOG.md"), "utf8");
const HEADINGS = CHANGELOG.split("\n").filter((line) => line.startsWith("## "));

describe("changelog", () => {
  it("has exactly one unreleased placeholder", () => {
    // Raycast substitutes {PR_MERGE_DATE} on merge. Two placeholders would
    // resolve to the same date and read as two releases shipping at once.
    const count = CHANGELOG.split("{PR_MERGE_DATE}").length - 1;
    expect(count).toBe(1);
  });

  it("gives every entry a bracketed title", () => {
    for (const heading of HEADINGS) {
      expect(heading).toMatch(/^## \[[^\]]+\]/);
    }
  });

  it("asserts no release date the repository cannot support", () => {
    // The v1.0.0 release predates this git history, so its date is not
    // recoverable. An invented date is worse than none: 2025-10-16 was the
    // first commit ("Prepare v1.1"), not the v1.0.0 release.
    const dated = HEADINGS.filter((h) => /- \d{4}-\d{2}-\d{2}\s*$/.test(h));
    expect(dated).toEqual([]);
  });

  it("uses no em-dash", () => {
    // Written as an escape, not the literal glyph, so this file does not
    // trip the em-dash detector in copy.test.ts.
    expect(CHANGELOG).not.toContain("\u2014");
  });
});
