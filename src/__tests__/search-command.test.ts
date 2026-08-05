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
    // Renaming away from "Search" would hide the command from anyone typing
    // it. Nothing else in the suite would catch that.
    const keywords = searchCommand()?.keywords ?? [];
    for (const expected of ["search", "pesquisa"]) {
      expect(keywords).toContain(expected);
    }
  });
});
