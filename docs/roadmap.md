# Roadmap — Raycast Público Extension

This roadmap tracks the V2 refactor effort. It was produced from a comprehensive codebase audit and captures every improvement planned before the next release.

> **V1 audit score: 6.5/10** — Functional but has significant duplication, no tests, dead code, and fragile patterns.

---

## Phase 1: Eliminate Code Duplication

| Task | Description | Status |
|------|-------------|--------|
| 1.1 | Extract shared `<ArticleListItem>` component from 3 duplicate implementations | Done |
| 1.2 | Extract shared `<NewsListView>` component — popular and latest views become ~14-line wrappers | Done |
| 1.3 | Move duplicated constants (`MAX_TAGS`, `SUMMARY_PLACEHOLDER`, `UNTITLED_ARTICLE`) to `src/constants.ts` | Done |

**Why first**: This is the single biggest quality win. Three files share ~70 lines of identical rendering logic, and two of them are 98% identical overall.

---

## Phase 2: Dead Code & Structural Cleanup

| Task | Description | Status |
|------|-------------|--------|
| 2.1 | Integrate `article-view.tsx` as `Action.Push` "Read Article" in `ArticleListItem` | Done |
| 2.2 | Remove duplicated `TagObject` type — use `Exclude<TagLike, string>` | Done |
| 2.3 | Move `AuthorLike` type to `type.ts`, remove 5 unnecessary `as` casts | Done |

---

## Phase 3: API Client Hardening

| Task | Description | Status |
|------|-------------|--------|
| 3.1 | Create single `fetchArticleList()` helper to replace 3 near-identical fetch functions | Done |
| 3.2 | Add `AbortSignal.timeout(10_000)` to all fetch calls + `AbortSignal.any()` for detail | Done |
| 3.3 | Add `isArticleLike()` runtime validation (checks `titulo` and `url` fields) | Done |
| 3.4 | Add `classifyError()` — distinguishes network, timeout, HTTP, and parse errors | Done |

---

## Phase 4: React & Performance

| Task | Description | Status |
|------|-------------|--------|
| 4.1 | Use `article.id` as React key and List.Item id — removed `index` prop | Done |
| 4.2 | Wrap `ArticleListItem` with `React.memo` | Done |
| 4.3 | Add `useCallback` for `onRefresh` in `NewsListView` and `search-news` | Done |

---

## Phase 5: UX Polish

| Task | Description | Status |
|------|-------------|--------|
| 5.1 | Integrate article reading view via `Action.Push` | Done (Phase 2) |
| 5.2 | Add "Copy Title" action (⌘⇧C) | Done |
| 5.3 | Add retry action to error/empty states, improve error descriptions | Done |
| 5.4 | Add "Max Articles" preference (10/25/50) via `package.json` | Done |

---

## Phase 6: Minor Code Quality Fixes

| Task | Description | Status |
|------|-------------|--------|
| 6.1 | Fix no-op `.replace(",", ",")` in `formatDate.ts` | Done |
| 6.2 | Create `stripHtml()` utility — handles tags + HTML entities (`&amp;`, `&lt;`, etc.) | Done |
| 6.3 | Fix `CHANGELOG.md` uninterpolated `PR_MERGE_DATE` | Done |
| 6.4 | Remove unnecessary `as` type casts in `article.ts` | Done (Phase 2) |

---

## Phase 7: Tests & Lint

| Task | Description | Status |
|------|-------------|--------|
| 7.1 | Set up `vitest` v4.1 as test runner with config | Done |
| 7.2 | 42 unit tests for utility functions (article.test.ts) — `stripHtml`, `getArticleUrl`, `resolvePublishedDate`, `cleanDescription`, `formatAuthors`, `extractTags`, `getTagColor`, `getArticleIcon` | Done |
| 7.3 | 9 unit tests for `extractArticleId` (client.test.ts) — all URL patterns | Done |
| 7.4 | 5 unit tests for `formatDate` (formatDate.test.ts) — valid, invalid, locale | Done |
| 7.5 | Lint compliance verified — ESLint + Prettier pass | Done |
| 7.6 | Added `"test"` and `"test:watch"` scripts to `package.json` | Done |

---

## Phase 8: Panel Config — Set Actions

| Task | Description | Status |
|------|-------------|--------|
| 8.1 | Audit existing `ActionPanel` in `ArticleListItem` and `ArticleView` — ensure consistent action ordering across all views | Planned |
| 8.2 | Add "Summarize" action (⌘⇧S) to `ArticleListItem` — calls Raycast AI (wired in Phase 11, stub for now) | Planned |
| 8.3 | Add "View Summary" action to `ArticleListItem` — visible only when a saved summary exists for the article | Planned |
| 8.4 | Add "Save Summary" action to `ArticleView` — persists the current summary to LocalStorage (wired in Phase 12, stub for now) | Planned |
| 8.5 | Register any new commands or preferences needed in `package.json` (e.g., AI model preference if applicable) | Planned |

**Why this order**: Actions need to be in place as stubs before the AI and storage phases wire them up. This keeps each phase focused.

---

## Phase 9: Fix Broken Search

| Task | Description | Status |
|------|-------------|--------|
| 9.1 | Investigate publico.pt WAF blocking — open browser DevTools, identify which headers the site requires (likely `User-Agent`, `Accept`, `Referer`) | Planned |
| 9.2 | Add browser-like request headers to `fetchJSON()` in `client.ts` — apply to all API calls, not just search | Planned |
| 9.3 | Test whether the existing search endpoint (`/api/list/search?query=`) still works with proper headers, or if a new endpoint is needed | Planned |
| 9.4 | Add endpoint fallback logic: if primary search returns 403/empty, try alternative endpoint (e.g., `/api/search/`, site-specific Google fallback) | Planned |
| 9.5 | Add a `baseUrl` text preference in `package.json` — defaults to `https://www.publico.pt`, allows overriding for testing or API changes | Planned |
| 9.6 | Replace hardcoded URL strings in `client.ts` with the configurable base URL from preferences | Planned |
| 9.7 | Manual end-to-end verification: run `ray develop`, test search with multiple queries, confirm results render correctly | Planned |

**Blocker note**: This phase requires local manual testing. The publico.pt Cloudflare WAF actively blocks non-browser requests with 403. The fix may be as simple as headers, or may require discovering an entirely new endpoint.

---

## Phase 10: Read the News

**Key constraint**: The API only returns a description/lead and the article URL (or an ID to construct it). It does **not** return the full article body. To read full articles, we must fetch and parse the actual publico.pt article page. Additionally, publico.pt may paywall articles for non-subscribers, meaning full content may simply not be available.

**Strategy**: Break this into small, testable steps. Each step produces a clear pass/fail signal so we can decide early whether this direction is viable before investing more effort.

### Step 1 — Feasibility check (go/no-go gate)

| Task | Description | Status |
|------|-------------|--------|
| 10.1 | Confirm what the API actually returns — log the full response from `fetchArticleDetail()` for 5+ articles and document which fields contain content (`texto`, `body`, `lead`, `descricao`) | Planned |
| 10.2 | Fetch a real article URL (e.g., `https://www.publico.pt/...`) from Raycast with browser-like headers — check if HTML is returned or if it's blocked (403, redirect to login, CAPTCHA) | Planned |
| 10.3 | Compare free vs. premium articles — fetch at least one of each and document what HTML/content is available without authentication | Planned |

**Decision point**: If both the API detail endpoint and direct HTML fetch fail to return usable content, stop here. Document findings and move to Phase 11 using only the description/lead for summarization.

### Step 2 — HTML parsing (only if Step 1 passes)

| Task | Description | Status |
|------|-------------|--------|
| 10.4 | Identify the article body selector in the publico.pt HTML — inspect the DOM structure, find the element(s) containing the article text | Planned |
| 10.5 | Write a `parseArticleHtml(html: string)` utility that extracts the article body as plain text or markdown — keep it minimal, no heavy dependencies | Planned |
| 10.6 | Test the parser against 5+ articles of different types (news, opinion, multimedia) — verify it handles variations in page structure | Planned |

### Step 3 — Integration (only if Step 2 produces usable content)

| Task | Description | Status |
|------|-------------|--------|
| 10.7 | Create `fetchArticleContent(url: string)` in `client.ts` — fetches the article page HTML and runs it through `parseArticleHtml()` | Planned |
| 10.8 | Update `ArticleView` to call `fetchArticleContent()` — show loading state while fetching, render the parsed content as markdown | Planned |
| 10.9 | Handle paywalled articles gracefully — detect truncated or missing body, show a clear message ("This article requires a Público subscription") with "Open in Browser" as the primary action | Planned |
| 10.10 | Handle fetch failures — if the HTML fetch is blocked (403, timeout), fall back to showing the API description/lead with a note that full content is unavailable | Planned |

### Step 4 — Authenticated access (optional, only if Step 1 shows paywall blocking useful content)

| Task | Description | Status |
|------|-------------|--------|
| 10.11 | Investigate publico.pt login flow — inspect the login page/network requests to understand how auth works (session cookie, JWT, OAuth, etc.) | Planned |
| 10.12 | Check if the API has authenticated endpoints — look for `/api/content/` or similar that accept an auth token/cookie and return full article body | Planned |
| 10.13 | Add optional login preferences in `package.json` — email/password or API token fields (marked as `"type": "password"` for secure storage) | Planned |
| 10.14 | Implement auth flow in `client.ts` — login once, store session token, attach to subsequent requests | Planned |
| 10.15 | Test authenticated fetch — verify that a logged-in request returns full article content for premium articles | Planned |

**Note**: This step is exploratory. We don't know yet if publico.pt exposes a usable login API or if auth tokens work with their content endpoints. The goal is to test feasibility, not commit to a full implementation. If it works, it unlocks full content for subscribers; if not, we fall back to the description/lead path.

**Why testable chunks matter**: We don't know yet if publico.pt will serve full article HTML to non-browser clients or without auth. Each step gives us a clear signal before investing in the next. If this direction is a dead end, we still have the API description/lead to work with for summarization in Phase 11.

---

## Phase 11: Summarize Articles

| Task | Description | Status |
|------|-------------|--------|
| 11.1 | Import `AI` from `@raycast/api` and create a `summarizeArticle(article: Article)` utility in `src/utils/summarize.ts` | Planned |
| 11.2 | Design the AI prompt — instruct the model to summarize the article in 2–3 sentences in the article's original language (Portuguese), focusing on key facts | Planned |
| 11.3 | Wire the "Summarize" action (from Phase 8.2) to call `summarizeArticle()` — show a `Toast` with loading/success/error states | Planned |
| 11.4 | Display the summary in a `Detail` view pushed onto the navigation stack, with the original title as heading and summary as body | Planned |
| 11.5 | Handle edge cases: missing article body (prompt user to open in browser first), AI API errors, empty responses | Planned |
| 11.6 | Add the `"type": "no-view"` or appropriate command mode for AI usage — verify Raycast Pro is required and document this in README | Planned |

**Tech notes**: Uses `AI.ask()` from `@raycast/api`. Requires Raycast Pro subscription. The prompt should receive the article title + lead + body (truncated if needed to stay within token limits). Summary language should match the article language (Portuguese).

---

## Phase 12: Persist Summaries to Memory

| Task | Description | Status |
|------|-------------|--------|
| 12.1 | Create `src/utils/storage.ts` — wrapper around `LocalStorage` with typed helpers: `saveSummary(articleId, summary)`, `getSummary(articleId)`, `getAllSummaries()`, `deleteSummary(articleId)` | Planned |
| 12.2 | Define a `StoredSummary` type: `{ articleId: number; title: string; summary: string; createdAt: string; url: string }` | Planned |
| 12.3 | Auto-save after summarization — when `summarizeArticle()` succeeds (Phase 11.3), immediately persist the result via `saveSummary()` | Planned |
| 12.4 | Wire the "View Summary" action (from Phase 8.3) — check `LocalStorage` for existing summary, show it in a `Detail` view if found | Planned |
| 12.5 | Add a visual indicator to `ArticleListItem` — show an accessory icon/tag when a saved summary exists for that article | Planned |
| 12.6 | Add a "Delete Summary" action (⌘⌫) to the summary detail view — removes from LocalStorage and updates the list | Planned |
| 12.7 | Handle storage limits — `LocalStorage` has a 10 MB cap; implement a simple LRU eviction if total size exceeds a threshold (e.g., 8 MB) | Planned |

---

## File Change Summary

### Phases 1–7 (Done)

| Action | File |
|--------|------|
| Create | `src/components/ArticleListItem.tsx` |
| Create | `src/components/NewsListView.tsx` |
| Create | `src/constants.ts` |
| Create | `src/__tests__/article.test.ts` |
| Create | `src/__tests__/client.test.ts` |
| Create | `src/__tests__/formatDate.test.ts` |
| Heavily modify | `src/api/client.ts` |
| Simplify | `src/view-popular-news.tsx` (to ~10 lines) |
| Simplify | `src/view-latest-news.tsx` (to ~10 lines) |
| Simplify | `src/search-news.tsx` |
| Modify | `src/utils/article.ts` |
| Modify | `src/api/type.ts` |
| Integrate or delete | `src/article-view.tsx` |
| Fix | `src/utils/formatDate.ts` |
| Fix | `CHANGELOG.md` |
| Modify | `package.json` |

### Phases 8–12 (Planned)

| Action | File | Phase |
|--------|------|-------|
| Modify | `src/components/ArticleListItem.tsx` — add Summarize, View Summary, Save Summary actions | 8 |
| Modify | `src/components/ArticleView.tsx` — add Save Summary action, improve rendering | 8, 10 |
| Modify | `package.json` — register new preferences (baseUrl, AI-related) | 8, 9 |
| Modify | `src/api/client.ts` — add browser headers, fallback logic, configurable base URL | 9 |
| Modify | `src/preferences.ts` — add `getBaseUrl()` helper | 9 |
| Create | `src/utils/summarize.ts` — Raycast AI summarization wrapper | 11 |
| Create | `src/utils/storage.ts` — LocalStorage helpers for persisted summaries | 12 |
| Create | `src/api/type.ts` — add `StoredSummary` type | 12 |
