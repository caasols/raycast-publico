import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const manifest = () =>
  JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
    commands: Array<{
      name: string;
      title: string;
      keywords?: string[];
      description: string;
    }>;
  };
const searchCommand = () =>
  manifest().commands.find((c) => c.name === "search-news");

describe("the topic command", () => {
  it("keeps the id, so existing hotkeys and aliases survive", () => {
    expect(searchCommand()).toBeDefined();
  });

  it("is titled for what it does, not for full-text search", () => {
    expect(searchCommand()?.title).toBe("Browse Topic");
  });

  it("stays findable by the words people actually type", () => {
    // Renaming away from "Search News" would hide the command from anyone
    // typing the old name. Both words must stay, in both languages.
    const keywords = searchCommand()?.keywords ?? [];
    for (const expected of ["search", "news", "pesquisa", "notícias"]) {
      expect(keywords).toContain(expected);
    }
  });
});

describe("the search fallback", () => {
  const source = () =>
    readFileSync(join(ROOT, "src", "search-news.tsx"), "utf8");

  it("offers Publico's own search when no topic matches", () => {
    expect(source()).toContain("publico.pt/pesquisa?query=");
  });

  it("percent-encodes the query", () => {
    // Real queries contain spaces and accents, such as "guerra na ucrania"
    // and "preco da habitacao". An unencoded URL would break them.
    expect(source()).toMatch(/encodeURIComponent\(\s*searchText/);
  });

  it("does not offer a blank search before anything is typed", () => {
    // The initial prompt has no query yet, so a fallback there would open an
    // empty search page.
    const text = source();
    const initial = text.indexOf('title="Browse Público topics"');
    expect(initial).toBeGreaterThan(-1);
    const block = text.slice(initial, initial + 400);
    expect(block).not.toContain("pesquisa?query=");
  });
});
