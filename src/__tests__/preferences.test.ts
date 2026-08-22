import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_MAX_ARTICLES } from "../constants";
// vi.mock below is hoisted above this import, so preferences.ts already
// sees the mocked @raycast/api. A dynamic `await import` is not needed
// (and top-level await is rejected by tsconfig's module: "commonjs").
import { getMaxArticles, limitArticles } from "../preferences";

// vi.mock is hoisted above every const in this file, so the factory cannot
// close over an ordinary variable: doing so throws a TDZ error at import
// time. vi.hoisted is the supported way to share a mutable mock with it.
// The other suites here mock @raycast/api with a static object and do not
// hit this.
const { getPreferenceValues } = vi.hoisted(() => ({
  getPreferenceValues: vi.fn(),
}));

vi.mock("@raycast/api", () => ({ getPreferenceValues }));

const ROOT = process.cwd();

describe("maxArticles preference", () => {
  beforeEach(() => {
    getPreferenceValues.mockReset();
  });

  it("reads the stored value", () => {
    getPreferenceValues.mockReturnValue({ maxArticles: "50" });
    expect(getMaxArticles()).toBe(50);
  });

  it("falls back to the shared default when unparseable", () => {
    getPreferenceValues.mockReturnValue({ maxArticles: "not-a-number" });
    expect(getMaxArticles()).toBe(DEFAULT_MAX_ARTICLES);
  });

  it("trims a feed to the preference", () => {
    getPreferenceValues.mockReturnValue({ maxArticles: "10" });
    const articles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      titulo: `t${i}`,
      url: `u${i}`,
    }));
    expect(limitArticles(articles).length).toBe(10);
  });

  it("leaves a feed shorter than the preference alone", () => {
    getPreferenceValues.mockReturnValue({ maxArticles: "50" });
    const articles = Array.from({ length: 3 }, (_, i) => ({
      id: i,
      titulo: `t${i}`,
      url: `u${i}`,
    }));
    expect(limitArticles(articles).length).toBe(3);
  });
});

describe("manifest and code defaults agree", () => {
  // Two hardcoded defaults that disagree would only surface in the edge case
  // nobody exercises, so assert them equal here instead.
  it("package.json default matches DEFAULT_MAX_ARTICLES", () => {
    const pkg = JSON.parse(
      readFileSync(join(ROOT, "package.json"), "utf8"),
    ) as {
      preferences: Array<{
        name: string;
        default?: string;
        data?: Array<{ value: string }>;
      }>;
    };
    const pref = pkg.preferences.find((p) => p.name === "maxArticles");
    expect(pref).toBeDefined();
    expect(Number(pref?.default)).toBe(DEFAULT_MAX_ARTICLES);
  });

  it("the default is one of the offered dropdown values", () => {
    const pkg = JSON.parse(
      readFileSync(join(ROOT, "package.json"), "utf8"),
    ) as {
      preferences: Array<{
        name: string;
        default?: string;
        data?: Array<{ value: string }>;
      }>;
    };
    const pref = pkg.preferences.find((p) => p.name === "maxArticles");
    const values = pref?.data?.map((d) => d.value) ?? [];
    expect(values).toContain(pref?.default);
  });

  it("no offered value exceeds the API maximum", () => {
    const pkg = JSON.parse(
      readFileSync(join(ROOT, "package.json"), "utf8"),
    ) as {
      preferences: Array<{ name: string; data?: Array<{ value: string }> }>;
    };
    const pref = pkg.preferences.find((p) => p.name === "maxArticles");
    for (const option of pref?.data ?? []) {
      expect(Number(option.value)).toBeLessThanOrEqual(50);
    }
  });
});
