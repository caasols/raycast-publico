import { describe, it, expect } from "vitest";
import { extractArticleId } from "../api/client";

describe("extractArticleId", () => {
  it("returns null for empty string", () => {
    expect(extractArticleId("")).toBeNull();
  });

  it("returns the string directly if it's a numeric ID", () => {
    expect(extractArticleId("123456")).toBe("123456");
  });

  it("extracts ID from /editorial/ URL", () => {
    expect(
      extractArticleId("https://www.publico.pt/editorial/opinion-piece-789012"),
    ).toBe("789012");
  });

  it("extracts ID from /noticia/ URL", () => {
    expect(
      extractArticleId(
        "https://www.publico.pt/2024/03/15/politica/noticia/some-title-2345678",
      ),
    ).toBe("2345678");
  });

  it("extracts ID from URL ending with number before query params", () => {
    expect(
      extractArticleId("https://www.publico.pt/some/path/9876543?ref=homepage"),
    ).toBe("9876543");
  });

  it("extracts ID from URL ending with number before hash", () => {
    expect(
      extractArticleId("https://www.publico.pt/some/path/9876543#section"),
    ).toBe("9876543");
  });

  it("extracts 6+ digit number after dash as fallback", () => {
    expect(
      extractArticleId("https://www.publico.pt/some-article-title-1234567"),
    ).toBe("1234567");
  });

  it("returns null for URL with no extractable ID", () => {
    expect(extractArticleId("https://www.publico.pt/about")).toBeNull();
  });

  it("extracts ID from /noticia/ URL with query params", () => {
    expect(
      extractArticleId(
        "https://www.publico.pt/noticia/headline-text-5555555?utm_source=test",
      ),
    ).toBe("5555555");
  });
});
