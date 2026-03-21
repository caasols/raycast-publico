# Raycast Público — Extension Documentation

## Overview

Raycast Público is a [Raycast](https://www.raycast.com/) extension that lets you browse, search, and read the latest news from [Público](https://www.publico.pt/) directly from your command bar.

The extension is built with React, TypeScript, and the Raycast API. It consumes Público's undocumented JSON API and renders articles in Raycast's native list and detail views.

---

## Commands

The extension provides three commands, each registered in `package.json` under the `commands` array:

| Command | File | Endpoint | Description |
|---------|------|----------|-------------|
| **View Popular News** | `src/view-popular-news.tsx` | `GET /api/list/destaque` | Browse the most popular stories from Público |
| **View Latest News** | `src/view-latest-news.tsx` | `GET /api/list/ultimas` | Browse the latest headlines from Público |
| **Search News** | `src/search-news.tsx` | `GET /api/list/search?query=` | Search for articles on Público |

All three commands render articles in a `<List>` with `isShowingDetail` enabled, showing a preview panel alongside the article list.

---

## Architecture

```
src/
├── api/
│   ├── client.ts          # HTTP client — all API calls to publico.pt
│   └── type.ts            # TypeScript interfaces (Article, TagLike, AuthorLike)
├── components/
│   ├── ArticleListItem.tsx # Memoized list item with actions and detail panel
│   ├── ArticleView.tsx     # Full article reading view (Detail component)
│   └── NewsListView.tsx    # Reusable list wrapper with cached data fetching
├── utils/
│   ├── article.ts         # Article data transformation and formatting
│   └── formatDate.ts      # Date parsing and locale formatting
├── constants.ts           # Shared constants (MAX_TAGS, placeholders, debounce)
├── preferences.ts         # User preferences helper (maxArticles)
├── view-popular-news.tsx  # Command: trending articles
├── view-latest-news.tsx   # Command: latest articles
└── search-news.tsx        # Command: search with detail enrichment
```

### Layer Responsibilities

**API Layer** (`src/api/`)
- `client.ts` handles all HTTP communication with `https://www.publico.pt/api`.
- Exports 5 functions: `fetchTopNews()`, `fetchLatestHeadlines()`, `searchArticles()`, `fetchArticleDetail()`, and `extractArticleId()`.
- Uses native `fetch` — no HTTP library dependencies.
- `type.ts` defines the `Article` interface and `TagLike` union type, reflecting the shape of Público's API responses.

**Utility Layer** (`src/utils/`)
- `article.ts` contains pure functions for transforming raw API data into display-ready values: URL fixing, author name extraction, tag normalization, HTML cleaning, icon resolution, and date fallback logic.
- `formatDate.ts` formats date strings into Portuguese locale (`pt-PT`) using `Intl.DateTimeFormat`.

**Command Layer** (root of `src/`)
- Each command is a React functional component exported as `default`.
- Popular and latest news use `useCachedPromise` from `@raycast/utils` for data fetching with automatic caching.
- Search uses `useCachedPromise` with debounced input, plus a separate `useEffect` pipeline for loading article details on selection.

### Data Flow

```
User action (open command / type search)
  → useCachedPromise triggers fetch function
    → client.ts calls Público API
      → Response parsed as Article[]
        → article.ts transforms data (clean titles, extract tags, format authors)
          → React renders List.Item with Detail panel
            → On selection (search only): debounced fetchArticleDetail() enriches data
```

### Search Command — Detail Enrichment

The search command has a unique pattern not present in the other two commands. When a user selects an article in the list, it:

1. Extracts the article ID from the URL using regex pattern matching (`extractArticleId`)
2. Debounces the request (150ms) to avoid API spam during fast scrolling
3. Cancels any in-flight request via `AbortController` before starting a new one
4. Fetches the full article detail from `/api/content/news/{id}`
5. Merges the enriched data (better description, full author list, complete tags) into the display

This is managed through `useRef` for abort controllers and timers, plus `useState` for an `enrichedArticles` record keyed by article ID.

---

## API

The extension consumes Público's **undocumented** internal JSON API. There is no official documentation, authentication, or rate limits published. The endpoints were discovered through browser DevTools inspection.

### Base URL

```
https://www.publico.pt/api
```

### Endpoints

| Method | Path | Description | Returns |
|--------|------|-------------|---------|
| GET | `/list/ultimas` | Latest headlines | `Article[]` |
| GET | `/list/destaque` | Popular/trending articles | `Article[]` |
| GET | `/list/search?query={q}` | Search articles | `Article[]` |
| GET | `/content/news/{id}` | Full article detail | `Article` |

### Article Schema

The `Article` interface reflects the API response shape:

```typescript
interface Article {
  id: number;
  titulo: string;         // Title (may contain HTML tags)
  url: string;            // Relative or malformed URL
  descricao?: string;     // Summary/lead (may have time prefix)
  lead?: string;          // Article lead paragraph
  body?: string;          // Full article HTML body
  secao?: string;         // Section/category
  time?: string;          // Timestamp (ISO format)
  data?: string;          // Date string (alternative to time)
  imagem?: { src, titulo?, credito? };
  multimediaPrincipal?: string | { src, titulo?, credito?, tipo? };
  autores?: Author[] | Author;  // Single or array
  tags?: TagLike | TagLike[];   // String, object, or array
  fullUrl?: string;             // Pre-resolved absolute URL
}
```

### Known API Quirks

- **Malformed URLs**: The `url` field sometimes contains double-protocol values like `https://www.publico.pthttps//...`. The `getArticleUrl()` function patches these.
- **Inconsistent author format**: Sometimes an array, sometimes a single object. The `formatAuthors()` function handles both.
- **Tags as mixed types**: Tags can be strings, objects with various name fields (`nome`, `name`, `value`, `titulo`, `title`), or arrays thereof.
- **Time prefix in descriptions**: The `descricao` field often starts with relative time like "há 2 horas..." which `cleanDescription()` strips.
- **Invalid dates**: Some articles return `0001-01-01` timestamps, treated as "Not available".
- **Bot blocking**: As of March 2026, publico.pt returns 403 for requests without browser-like headers (likely Cloudflare WAF). This may require adding `User-Agent` and `Referer` headers to fetch calls.

---

## Dependencies

The extension deliberately keeps dependencies minimal:

| Package | Purpose |
|---------|---------|
| `@raycast/api` | Raycast component library (List, Detail, Action, etc.) |
| `@raycast/utils` | `useCachedPromise`, `showFailureToast` |

**Dev dependencies**: ESLint (v9), Prettier, TypeScript, `@raycast/eslint-config`.

No external HTTP client, date library, validation library, or markdown processor. All transformations are done with native APIs and hand-written utilities.

---

## Design Decisions

### Why no shared component (V1)?

V1 prioritized shipping speed. The three commands were built independently, each as self-contained files. This led to duplication but kept each command easy to reason about in isolation. The V2 refactor addresses this with shared `ArticleListItem` and `NewsListView` components.

### Why no zod/validation library?

The API is undocumented and the response shape is known only through observation. Adding a strict schema validator would add a dependency and could cause false failures if Público changes their response shape slightly (e.g., adding a new field). The V2 plan opts for lightweight hand-written validation — checking that responses are arrays and that required fields (`titulo`, `url`) exist — rather than a full schema.

### Why `useCachedPromise` over SWR/React Query?

`useCachedPromise` is provided by `@raycast/utils` and is the idiomatic way to fetch data in Raycast extensions. It provides caching, revalidation, error handling, and loading states out of the box, without adding any extra dependencies.

### Why debounced detail loading in search?

The search list shows many articles at once. When users scroll through the list, each selection triggers a detail fetch. Without debouncing, rapid scrolling would fire dozens of concurrent API requests. The 150ms debounce plus `AbortController` cancellation ensures only the currently-selected article's detail is fetched.

### Why native `fetch` over axios/got?

Raycast extensions run in a Node.js-like environment with native `fetch` support. Adding an HTTP library would increase bundle size for no benefit. The V2 refactor adds timeout via `AbortSignal.timeout()` and better error handling, which are the only features native `fetch` lacks compared to libraries.

### Why was `article-view.tsx` unused in V1?

V1 included a standalone article reading view using Raycast's `<Detail>` component, but it was never wired into the navigation. The V2 refactor integrated it as `ArticleView` in `src/components/`, accessible via `Action.Push` from any article list item. Users can now read article content directly in Raycast before deciding whether to open the browser.

### Why vitest over Jest for V2?

Vitest is TypeScript-native, faster, and requires less configuration than Jest. It uses the same assertion API (`expect`, `describe`, `it`) so there's no learning curve. For a small extension with pure utility functions to test, vitest is the pragmatic choice.

### Why search fix is last in the roadmap?

The search endpoint investigation revealed that publico.pt blocks all non-browser requests with a 403 (likely Cloudflare WAF). This means:
1. We can't verify any endpoint changes from automated environments.
2. The fix may be as simple as adding browser headers, or may require discovering a new endpoint entirely.
3. It requires the maintainer to test locally with browser DevTools.

Placing it last ensures all other improvements ship regardless of how the search investigation goes.

---

## Related Documents

- [Roadmap](./roadmap.md) — V2 refactor plan with task tracking
- [CHANGELOG](../CHANGELOG.md) — Release history
- [README](../README.md) — User-facing documentation
