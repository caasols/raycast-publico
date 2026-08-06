import { describe, it, expect } from "vitest";
import { getArticleId } from "../api/client";
import { Article } from "../api/type";

const article = (over: Partial<Article> = {}): Article =>
  ({ id: 98097, titulo: "t", url: "/u", ...over }) as Article;

describe("getArticleId", () => {
  it("uses the id the API already provides", () => {
    expect(getArticleId(article({ id: 98097 }))).toBe("98097");
  });

  it("does not read the id out of the URL", () => {
    // Video URLs end in -YYYYMMDD-HHMMSS. The previous implementation parsed
    // the URL and returned the time component, 155509, which is itself a
    // valid article id (a 2002 article), so the detail pane silently showed
    // another article's author, date and summary.
    const video = article({
      id: 98097,
      url: "https://www.publico.pt/2026/08/04/video/mamdani-nao-20260804-155509",
    });
    expect(getArticleId(video)).toBe("98097");
    expect(getArticleId(video)).not.toBe("155509");
  });

  it("handles ids shorter than six digits", () => {
    // These matched no URL pattern before, so the item was never enriched.
    expect(getArticleId(article({ id: 906 }))).toBe("906");
  });

  it("returns null when the API gives no id", () => {
    expect(getArticleId({ titulo: "t", url: "/u" } as Article)).toBeNull();
    expect(getArticleId(article({ id: 0 }))).toBeNull();
  });
});
