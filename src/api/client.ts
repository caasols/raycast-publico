import * as cheerio from "cheerio";
import { Article } from "./type";

const BASE_URL = "https://www.publico.pt/api";
const REQUEST_TIMEOUT_MS = 10_000;

// --- Response validation ---

function isArticleLike(item: unknown): item is Article {
  if (!item || typeof item !== "object") {
    return false;
  }
  const obj = item as Record<string, unknown>;
  return typeof obj.titulo === "string" && typeof obj.url === "string";
}

function validateArticleArray(data: unknown): Article[] {
  if (!Array.isArray(data)) {
    return [];
  }
  return data.filter(isArticleLike);
}

function validateArticle(data: unknown): Article | null {
  return isArticleLike(data) ? data : null;
}

// --- Error classification ---

function classifyError(error: unknown, context: string): Error {
  if (error instanceof Error) {
    if (error.name === "AbortError") {
      return error;
    }
    if (error.name === "TimeoutError") {
      return new Error(
        `${context}: the request took too long. Please try again.`,
      );
    }
    // Network errors (DNS failure, connection refused, etc.)
    if (error instanceof TypeError) {
      return new Error(
        `${context}: could not connect. Please check your internet connection.`,
      );
    }
    return error;
  }
  return new Error(`${context}: ${String(error)}`);
}

// --- Shared fetch helpers ---

async function fetchArticleList(
  url: string,
  context: string,
): Promise<Article[]> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(
        `${context}: HTTP ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    return validateArticleArray(data);
  } catch (error) {
    throw classifyError(error, context);
  }
}

// --- Public API ---

export async function fetchLatestHeadlines(): Promise<Article[]> {
  return fetchArticleList(
    `${BASE_URL}/list/ultimas`,
    "Unable to load latest headlines",
  );
}

export async function fetchTopNews(): Promise<Article[]> {
  return fetchArticleList(
    `${BASE_URL}/list/destaque`,
    "Unable to load popular news",
  );
}

export async function searchArticles(query: string): Promise<Article[]> {
  const encodedQuery = encodeURIComponent(query);
  return fetchArticleList(
    `${BASE_URL}/list/pesquisa?query=${encodedQuery}`,
    "Unable to search articles",
  );
}

export async function searchArticlesContent(
  query: string,
): Promise<Article[]> {
  const encodedQuery = encodeURIComponent(query);
  const context = "Unable to search articles (content)";

  try {
    const response = await fetch(
      `${BASE_URL}/content/search?query=${encodedQuery}`,
      { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) },
    );

    if (!response.ok) {
      throw new Error(
        `${context}: HTTP ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      return [];
    }

    // Map content/search format to our Article type
    return data
      .filter(
        (item: Record<string, unknown>) =>
          typeof item.title === "string" && typeof item.pos === "number",
      )
      .map((item: Record<string, unknown>) => ({
        id: (item.id as number) ?? item.pos,
        titulo: item.title as string,
        url: (item.url as string) ?? "",
        descricao: (item.description as string) ?? "",
        autores: Array.isArray(item.author)
          ? (item.author as Article["autores"])
          : undefined,
        imagem: item.image
          ? { src: item.image as string }
          : undefined,
        secao: (item.site as string) ?? undefined,
      })) as Article[];
  } catch (error) {
    throw classifyError(error, context);
  }
}

// --- HTML-based search (the JSON APIs don't actually filter by query) ---

export async function searchArticlesHtml(
  query: string,
): Promise<Article[]> {
  const context = "Unable to search articles";

  if (!query.trim()) {
    return [];
  }

  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://www.publico.pt/pesquisa?query=${encodedQuery}`;

    const response = await fetch(url, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Accept: "text/html",
      },
    });

    if (!response.ok) {
      throw new Error(
        `${context}: HTTP ${response.status} ${response.statusText}`,
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const articles: Article[] = [];

    $(".headline-list__item").each((index, element) => {
      const $item = $(element);
      const title = $item.find(".headline").first().text().trim();
      const href = $item.find("a").first().attr("href") || "";
      const kicker = $item.find(".kicker").first().text().trim();
      const date = $item.find(".dateline").first().text().trim();
      const lead = $item.find(".lead").first().text().trim();
      const imgSrc = $item.find("img").first().attr("src") || "";
      const authors = $item
        .find(".byline__name")
        .map((_i, el) => $(el).text().trim())
        .get();

      if (!title || !href) {
        return;
      }

      const fullUrl = href.startsWith("http")
        ? href
        : `https://www.publico.pt${href}`;

      articles.push({
        id: index,
        titulo: title,
        url: fullUrl,
        fullUrl,
        descricao: lead || undefined,
        lead: lead || undefined,
        secao: kicker || undefined,
        data: date || undefined,
        imagem: imgSrc ? { src: imgSrc } : undefined,
        autores: authors.length
          ? authors.map((name) => ({ nome: name }))
          : undefined,
      });
    });

    return articles;
  } catch (error) {
    throw classifyError(error, context);
  }
}

// Extract article ID from URL
export function extractArticleId(url: string): string | null {
  try {
    if (!url) {
      return null;
    }

    // Check if it's directly a numeric ID
    if (/^\d+$/.test(url)) {
      return url;
    }

    // Pattern for /editorial/ URLs: extract the number after the last dash
    const patternEditorial = /editorial\/[^-]+-(\d+)(?:\?|$|#)/;
    const matchEditorial = url.match(patternEditorial);
    if (matchEditorial && matchEditorial[1]) {
      return matchEditorial[1];
    }

    // Pattern for /noticia/ URLs: extract the number after the last dash
    const patternNoticia = /noticia\/[^-]+-(\d+)(?:\?|$|#)/;
    const matchNoticia = url.match(patternNoticia);
    if (matchNoticia && matchNoticia[1]) {
      return matchNoticia[1];
    }

    // General pattern: find any number at the end of the URL path (before query params)
    const patternGeneral = /\/([0-9]+)(?:\?|$|#)/;
    const matchGeneral = url.match(patternGeneral);
    if (matchGeneral && matchGeneral[1]) {
      return matchGeneral[1];
    }

    // Last fallback: extract any number with 6+ digits from the URL
    const patternFallback = /-(\d{6,})(?:\?|$|#)/;
    const matchFallback = url.match(patternFallback);
    if (matchFallback && matchFallback[1]) {
      return matchFallback[1];
    }

    return null;
  } catch (error) {
    console.error("Error extracting article ID:", error);
    return null;
  }
}

// Fetch article detail by ID
export async function fetchArticleDetail(
  articleId: string,
  signal?: AbortSignal,
): Promise<Article | null> {
  const context = "Unable to load article";

  try {
    if (!articleId) {
      throw new Error("Article ID is required");
    }

    const url = `${BASE_URL}/content/news/${articleId}`;

    // Combine caller's abort signal with timeout
    const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    const combinedSignal = signal
      ? AbortSignal.any([signal, timeoutSignal])
      : timeoutSignal;

    const response = await fetch(url, { signal: combinedSignal });

    if (!response.ok) {
      throw new Error(
        `${context}: HTTP ${response.status} ${response.statusText}`,
      );
    }

    // Read response as text first to handle incomplete JSON gracefully
    const text = await response.text();

    if (!text || text.trim() === "") {
      return null;
    }

    try {
      const data = JSON.parse(text);
      return validateArticle(data);
    } catch {
      console.error("JSON parse error, response was:", text.substring(0, 200));
      return null;
    }
  } catch (error) {
    // Re-throw abort errors without wrapping — they're intentional
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }
    throw classifyError(error, context);
  }
}
