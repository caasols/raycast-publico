import { describe, it, expect, afterEach, vi } from "vitest";
import {
  getArticleId,
  fetchArticleList,
  fetchArticleDetail,
  searchArticlesByTag,
  classifyError,
  fetchSection,
  fetchTopNews,
  fetchLatestHeadlines,
  clampSize,
  slugCandidates,
  MAX_PAGE_SIZE,
} from "../api/client";
import { DEFAULT_MAX_ARTICLES } from "../constants";
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

const ok = (body: unknown) => ({
  ok: true,
  status: 200,
  statusText: "OK",
  json: async () => body,
  text: async () => JSON.stringify(body),
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("classifyError", () => {
  it("explains a timeout in plain language", () => {
    const timeout = Object.assign(new Error("x"), { name: "TimeoutError" });
    expect(classifyError(timeout, "Ctx").message).toContain("took too long");
  });

  it("passes an AbortError through untouched, so callers can ignore it", () => {
    const abort = Object.assign(new Error("x"), { name: "AbortError" });
    expect(classifyError(abort, "Ctx")).toBe(abort);
  });

  it("does not report an ordinary Error as a connectivity problem", () => {
    const plain = new Error("something else");
    expect(classifyError(plain, "Ctx").message).not.toContain("internet");
  });

  it("keeps the original cause instead of discarding it", () => {
    const network = new TypeError("fetch failed");
    const classified = classifyError(network, "Ctx");
    expect(classified.message).toContain("internet");
    expect(classified.cause).toBe(network);
  });
});

describe("fetchArticleList", () => {
  it("reports the HTTP status when the response is not ok", async () => {
    vi.stubGlobal("fetch", async () => ({
      ok: false,
      status: 404,
      statusText: "Not Found",
    }));
    await expect(
      fetchArticleList("https://x/api/list/y", "Ctx"),
    ).rejects.toThrow(/404/);
  });

  it("returns an empty array when the body is not an array", async () => {
    // A WAF or maintenance page can return 200 with an object or HTML.
    vi.stubGlobal("fetch", async () => ok({ message: "nope" }));
    await expect(fetchArticleList("https://x", "Ctx")).resolves.toEqual([]);
  });

  it("drops items that are missing the fields the UI needs", async () => {
    vi.stubGlobal("fetch", async () =>
      ok([{ titulo: "keep", url: "/a" }, { titulo: "drop, no url" }]),
    );
    const articles = await fetchArticleList("https://x", "Ctx");
    expect(articles).toHaveLength(1);
    expect(articles[0].titulo).toBe("keep");
  });
});

describe("fetchArticleDetail", () => {
  it("returns null for an empty body rather than throwing", async () => {
    vi.stubGlobal("fetch", async () => ({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => "",
    }));
    await expect(fetchArticleDetail("123")).resolves.toBeNull();
  });

  it("returns null for truncated JSON rather than throwing", async () => {
    // This is the failure the function exists to survive: Publico has
    // returned oversized and broken payloads before.
    vi.stubGlobal("fetch", async () => ({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => '{"id":1,"titulo":"trunc',
    }));
    await expect(fetchArticleDetail("123")).resolves.toBeNull();
  });
});

describe("searchArticlesByTag", () => {
  it("falls back to the stopword-stripped slug when the first is empty", async () => {
    const requested: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      requested.push(url);
      return ok(
        url.includes("guerra-ucrania") ? [{ titulo: "hit", url: "/a" }] : [],
      );
    });
    const articles = await searchArticlesByTag("guerra na ucrânia");
    expect(requested.some((url) => url.includes("guerra-na-ucrania"))).toBe(
      true,
    );
    expect(requested.some((url) => url.includes("guerra-ucrania"))).toBe(true);
    expect(articles).toHaveLength(1);
  });

  it("returns an empty array when no candidate matches", async () => {
    vi.stubGlobal("fetch", async () => ok([]));
    await expect(searchArticlesByTag("preço da habitação")).resolves.toEqual(
      [],
    );
  });
});

describe("size parameter", () => {
  function mockFetchOnce(payload: unknown) {
    // The generic types mock.calls as [string, ...], so the assertions
    // below can index calls[0][0] under strict tsc.
    const spy = vi.fn<(url: string, init?: RequestInit) => Promise<unknown>>(
      async () => ({
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => payload,
      }),
    );
    vi.stubGlobal("fetch", spy);
    return spy;
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends size on a section feed", async () => {
    const spy = mockFetchOnce([]);
    await fetchSection("politica", 25);
    expect(spy.mock.calls[0][0]).toContain("size=25");
    expect(spy.mock.calls[0][0]).toContain("/list/politica");
  });

  it("sends size on the popular feed", async () => {
    const spy = mockFetchOnce([]);
    await fetchTopNews(50);
    expect(spy.mock.calls[0][0]).toContain("size=50");
  });

  it("sends size on a topic search", async () => {
    const spy = mockFetchOnce([]);
    await searchArticlesByTag("benfica", 50);
    expect(spy.mock.calls[0][0]).toContain("size=50");
  });

  it("sends NO size on the latest feed, which ignores it", async () => {
    const spy = mockFetchOnce([]);
    await fetchLatestHeadlines();
    expect(spy.mock.calls[0][0]).not.toContain("size=");
  });

  it("omits the parameter entirely when no size is given", async () => {
    const spy = mockFetchOnce([]);
    await fetchSection("politica");
    expect(spy.mock.calls[0][0]).not.toContain("size=");
  });

  it("clamps above the API maximum, which fails downward past 50", async () => {
    const spy = mockFetchOnce([]);
    await fetchSection("politica", 51);
    expect(spy.mock.calls[0][0]).toContain("size=50");
  });

  it("clamps zero and negatives up to 1", () => {
    expect(clampSize(0)).toBe(1);
    expect(clampSize(-5)).toBe(1);
  });

  it("clamps 51 and above down to 50", () => {
    expect(clampSize(51)).toBe(50);
    expect(clampSize(1000)).toBe(50);
    expect(clampSize(MAX_PAGE_SIZE + 1)).toBe(MAX_PAGE_SIZE);
  });

  it("truncates fractional sizes", () => {
    expect(clampSize(25.7)).toBe(25);
  });

  it("falls back to the default when given a non-finite size", () => {
    expect(clampSize(Number.NaN)).toBe(DEFAULT_MAX_ARTICLES);
    expect(clampSize(Number.POSITIVE_INFINITY)).toBe(DEFAULT_MAX_ARTICLES);
  });
});

describe("classifyError", () => {
  it("returns abort errors untouched", () => {
    const abort = Object.assign(new Error("aborted"), { name: "AbortError" });
    expect(classifyError(abort, "Ctx")).toBe(abort);
  });

  it("translates timeouts into a user-facing message", () => {
    const timeout = Object.assign(new Error("t"), { name: "TimeoutError" });
    expect(classifyError(timeout, "Ctx").message).toBe(
      "Ctx: the request took too long. Please try again.",
    );
  });

  it("translates network TypeErrors, keeping the original as cause", () => {
    const network = new TypeError("fetch failed");
    const classified = classifyError(network, "Ctx");
    expect(classified.message).toBe(
      "Ctx: could not connect. Please check your internet connection.",
    );
    expect(classified.cause).toBe(network);
  });

  it("passes other Errors through unchanged", () => {
    const plain = new Error("something else");
    expect(classifyError(plain, "Ctx")).toBe(plain);
  });

  it("wraps non-Error thrown values with the context", () => {
    expect(classifyError("boom", "Ctx").message).toBe("Ctx: boom");
  });
});

describe("request shape", () => {
  function mockFeed(payload: unknown) {
    const spy = vi.fn<(url: string, init?: RequestInit) => Promise<unknown>>(
      async () => ({
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => payload,
      }),
    );
    vi.stubGlobal("fetch", spy);
    return spy;
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("targets the API base with browser-like headers and a timeout", async () => {
    const spy = mockFeed([]);
    await fetchSection("politica");
    const [url, init] = spy.mock.calls[0];
    expect(url).toBe("https://www.publico.pt/api/list/politica");
    const headers = init?.headers as Record<string, string>;
    expect(headers["User-Agent"]).toContain("Mozilla/5.0");
    expect(headers["User-Agent"]).toContain("KHTML, like Gecko");
    expect(headers.Accept).toBe("application/json");
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("uses the ultimas and destaque routes for the fixed feeds", async () => {
    let spy = mockFeed([]);
    await fetchLatestHeadlines();
    expect(spy.mock.calls[0][0]).toBe(
      "https://www.publico.pt/api/list/ultimas",
    );

    spy = mockFeed([]);
    await fetchTopNews();
    expect(spy.mock.calls[0][0]).toBe(
      "https://www.publico.pt/api/list/destaque",
    );
  });

  it("drops feed items that are not article-shaped", async () => {
    mockFeed([
      null,
      42,
      "a string",
      { titulo: 7, url: "/u" },
      { titulo: "only a title" },
      { titulo: "good", url: "/g" },
    ]);
    await expect(fetchSection("politica")).resolves.toEqual([
      { titulo: "good", url: "/g" },
    ]);
  });
});

describe("feed error contexts", () => {
  function mockFailure(status: number, statusText: string) {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status, statusText })),
    );
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("names the feed in each error message", async () => {
    mockFailure(500, "Server Error");
    await expect(fetchLatestHeadlines()).rejects.toThrow(
      "Unable to load latest headlines: HTTP 500 Server Error",
    );
    await expect(fetchTopNews()).rejects.toThrow(
      "Unable to load popular news: HTTP 500 Server Error",
    );
    await expect(searchArticlesByTag("benfica")).rejects.toThrow(
      "Unable to search articles: HTTP 500 Server Error",
    );

    mockFailure(404, "Not Found");
    await expect(fetchSection("desporto")).rejects.toThrow(
      "Unable to load desporto: HTTP 404 Not Found",
    );
  });
});

describe("searchArticlesByTag input guards", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns [] for a blank query without touching the network", async () => {
    const spy = vi.fn();
    vi.stubGlobal("fetch", spy);
    await expect(searchArticlesByTag("   ")).resolves.toEqual([]);
    expect(spy).not.toHaveBeenCalled();
  });

  it("prunes every Portuguese stopword from the fallback candidate", () => {
    // Mirrors PT_STOPWORDS in client.ts; each word must produce the pruned
    // candidate or its stopword status is untested.
    const stopwords = [
      "a",
      "o",
      "as",
      "os",
      "um",
      "uma",
      "de",
      "da",
      "do",
      "das",
      "dos",
      "e",
      "em",
      "na",
      "no",
      "nas",
      "nos",
      "ao",
      "aos",
      "com",
      "para",
      "por",
      "que",
      "se",
      "ou",
    ];
    for (const word of stopwords) {
      expect(slugCandidates(`festa ${word} bonita`)).toContain("festa-bonita");
    }
  });
});

describe("getArticleId defensive input", () => {
  it("returns null for a missing article instead of throwing", () => {
    expect(getArticleId(null as unknown as Article)).toBeNull();
    expect(getArticleId(undefined as unknown as Article)).toBeNull();
  });
});

describe("fetchArticleDetail", () => {
  function mockDetail(body: {
    ok?: boolean;
    status?: number;
    statusText?: string;
    text?: string;
  }) {
    const spy = vi.fn<(url: string, init?: RequestInit) => Promise<unknown>>(
      async () => ({
        ok: body.ok ?? true,
        status: body.status ?? 200,
        statusText: body.statusText ?? "OK",
        text: async () => body.text ?? "",
      }),
    );
    vi.stubGlobal("fetch", spy);
    return spy;
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches the content route and returns the parsed article", async () => {
    const payload = { id: 5, titulo: "T", url: "/u" };
    const spy = mockDetail({ text: JSON.stringify(payload) });
    await expect(fetchArticleDetail("5")).resolves.toEqual(payload);
    expect(spy.mock.calls[0][0]).toBe(
      "https://www.publico.pt/api/content/news/5",
    );
  });

  it("returns null for a payload that is not article-shaped", async () => {
    mockDetail({ text: JSON.stringify({ foo: 1 }) });
    await expect(fetchArticleDetail("5")).resolves.toBeNull();
  });

  it("rejects an empty article id", async () => {
    mockDetail({});
    await expect(fetchArticleDetail("")).rejects.toThrow(
      "Article ID is required",
    );
  });

  it("names the context in HTTP errors", async () => {
    mockDetail({ ok: false, status: 500, statusText: "Oops" });
    await expect(fetchArticleDetail("5")).rejects.toThrow(
      "Unable to load article: HTTP 500 Oops",
    );
  });

  it("treats an empty or whitespace body as null, quietly", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      mockDetail({ text: "" });
      await expect(fetchArticleDetail("5")).resolves.toBeNull();
      mockDetail({ text: "   " });
      await expect(fetchArticleDetail("5")).resolves.toBeNull();
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  it("logs the first 200 characters of an unparseable body", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      mockDetail({ text: "x".repeat(300) });
      await expect(fetchArticleDetail("5")).resolves.toBeNull();
      expect(spy).toHaveBeenCalledWith(
        "JSON parse error, response was:",
        "x".repeat(200),
      );
    } finally {
      spy.mockRestore();
    }
  });

  it("rethrows aborts without wrapping them", async () => {
    const abort = Object.assign(new Error("aborted"), { name: "AbortError" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw abort;
      }),
    );
    await expect(fetchArticleDetail("5")).rejects.toBe(abort);
  });

  it("combines the caller's abort signal with the timeout", async () => {
    const controller = new AbortController();
    controller.abort();
    const spy = mockDetail({
      text: JSON.stringify({ titulo: "T", url: "/u" }),
    });
    await fetchArticleDetail("5", controller.signal);
    const signal = spy.mock.calls[0][1]?.signal;
    expect(signal?.aborted).toBe(true);
  });
});
