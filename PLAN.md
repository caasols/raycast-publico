# Raycast Público Extension — V2 Refactor Plan

## Audit Summary

**Overall Quality: 6.5/10** — Functional but has significant duplication, no tests, dead code, and fragile patterns. The architecture is sound but the implementation needs hardening.

---

## Phase 1: Fix Broken Search (Critical Bug)

### 1.1 — Investigate & fix the search endpoint
- **Problem**: The `searchArticles()` function calls `GET /api/list/search?query=...` which may have changed or been removed by Público.
- **Action**: Since I can't test the endpoint from this sandbox (network restriction), the fix approach is:
  - Add **endpoint fallback logic** — try `/api/list/search?query=`, and if it returns 404/error, try alternative known patterns: `/api/search?query=`, `/api/list/pesquisa?query=`, `/pesquisa/site?query=`.
  - Add a **configurable base URL** via Raycast preferences so users can override if the API changes again.
  - **You should test locally** after the refactor to confirm which endpoint works. If none of the guesses work, we'll need you to inspect browser DevTools on publico.pt to find the real endpoint.

---

## Phase 2: Eliminate Massive Code Duplication (High Priority)

### 2.1 — Extract shared `<ArticleListItem>` component
- `view-popular-news.tsx`, `view-latest-news.tsx`, and `search-news.tsx` all contain **identical** article rendering logic (~70 lines each): title cleaning, author extraction, tag rendering, metadata, action panel.
- **Action**: Create `src/components/ArticleListItem.tsx` — a single reusable component.

### 2.2 — Extract shared `<NewsListView>` component
- `view-popular-news.tsx` and `view-latest-news.tsx` are **98% identical** — the only difference is which fetch function is called and the placeholder text.
- **Action**: Create `src/components/NewsListView.tsx` that accepts `fetchFn`, `searchBarPlaceholder`, `errorTitle`, and `emptyTitle` as props. Both commands become ~10-line wrappers.

### 2.3 — Deduplicate constants
- `MAX_TAGS`, `SUMMARY_PLACEHOLDER`, `UNTITLED_ARTICLE` are copy-pasted across 3 files.
- **Action**: Move to `src/constants.ts`.

---

## Phase 3: Dead Code & Structural Cleanup

### 3.1 — Resolve `article-view.tsx` status
- This file is a fully implemented `<Detail>` view for reading articles, but it's **never imported anywhere**. It was likely intended as a "push to read article" action.
- **Action**: Either integrate it as an action in article list items (push navigation to full article view), or delete it. **Recommendation: integrate it** — it adds real value by letting users read article body content without opening a browser.

### 3.2 — Remove duplicated `TagObject` type
- `src/utils/article.ts:121-128` redefines `TagObject` which is essentially the same as `TagLike` from `src/api/type.ts`.
- **Action**: Reuse `TagLike` from type.ts instead of redefining.

### 3.3 — Clean up `AuthorLike` type
- `AuthorLike` is defined locally in `article.ts:78` but could be part of `type.ts` alongside the `Article` interface.
- **Action**: Move to `type.ts` and export it.

---

## Phase 4: API Client Hardening

### 4.1 — Eliminate repetitive fetch functions
- `fetchLatestHeadlines()`, `fetchTopNews()`, and `searchArticles()` all follow the exact same pattern (fetch → check ok → parse JSON → cast).
- **Action**: Create a single `fetchArticleList(endpoint: string): Promise<Article[]>` helper, then each function becomes a one-liner.

### 4.2 — Add request timeout
- Currently no timeout — requests can hang forever.
- **Action**: Add `AbortSignal.timeout(10_000)` to all fetch calls.

### 4.3 — Add basic response validation
- Currently uses unsafe `as Article[]` casts with zero field checking.
- **Action**: Add lightweight runtime validation (check that response is array, each item has `titulo` and `url`). No need for zod — keep deps minimal.

### 4.4 — Improve error classification
- All errors are treated the same way.
- **Action**: Distinguish network errors vs HTTP errors vs parse errors in the error message shown to users.

---

## Phase 5: React & Performance Improvements

### 5.1 — Use article ID as key instead of array index
- All three list views use `key={`article-${index}`}` — this is a React anti-pattern that causes issues when lists reorder.
- **Action**: Use `article.id` or a hash of `article.url` as the key.

### 5.2 — Memoize ArticleListItem
- Wrap the extracted component with `React.memo` so it doesn't re-render when the article data hasn't changed.

### 5.3 — Add `useCallback` for action handlers
- Inline arrow functions in `onAction` create new references every render.
- **Action**: Wrap `revalidate` call in `useCallback`.

---

## Phase 6: UX Polish

### 6.1 — Integrate article reading view
- Use the currently dead `article-view.tsx` as a push action: "Read Article" that shows full article content in a Raycast Detail view.
- **Action**: Add `Action.Push` to the action panel in `ArticleListItem`.

### 6.2 — Add "Copy Title" action
- Currently only "Open in Browser" and "Copy URL". Adding "Copy Title" is useful.

### 6.3 — Improve empty/error states
- Add actionable suggestions in error messages (e.g., "Check your internet connection").
- Add a "Retry" action to error views.

### 6.4 — Add Raycast preferences
- Add a preference for the number of articles to display.
- Add a preference to choose the date format.

---

## Phase 7: Minor Code Quality Fixes

### 7.1 — Fix `formatDate` no-op
- `src/utils/formatDate.ts:25`: `.replace(",", ",")` replaces comma with comma — does nothing.

### 7.2 — Fix HTML stripping
- `article.titulo?.replace(/<[^>]*>/g, "")` is incomplete for edge cases (encoded entities like `&lt;`).
- **Action**: Create a `stripHtml()` utility that also handles common HTML entities.

### 7.3 — Fix CHANGELOG.md template
- Contains uninterpolated `PR_MERGE_DATE` variable.

### 7.4 — Unnecessary type casts
- `article.ts:105`: `author as AuthorLike` — unnecessary since the array items already match AuthorLike.
- `article.ts:167`: `tag as TagLike` — same issue.
- `article.ts:177`: `tags as TagLike` — same.
- **Action**: Fix the type definitions so casts aren't needed.

---

## File Change Summary

| Action | File |
|--------|------|
| **Create** | `src/components/ArticleListItem.tsx` |
| **Create** | `src/components/NewsListView.tsx` |
| **Create** | `src/constants.ts` |
| **Heavily modify** | `src/api/client.ts` (deduplicate, add timeout, validation, fallback endpoints) |
| **Simplify** | `src/view-popular-news.tsx` (→ ~10 lines) |
| **Simplify** | `src/view-latest-news.tsx` (→ ~10 lines) |
| **Simplify** | `src/search-news.tsx` (use shared components) |
| **Modify** | `src/utils/article.ts` (remove duplicate types, fix casts) |
| **Modify** | `src/api/type.ts` (add AuthorLike, clean up) |
| **Integrate or delete** | `src/article-view.tsx` |
| **Fix** | `src/utils/formatDate.ts` (no-op replace) |
| **Fix** | `CHANGELOG.md` (template variable) |
| **Modify** | `package.json` (add preferences, keywords) |

---

## Execution Order

1. **Phase 1** — Fix search (critical user-facing bug)
2. **Phase 2** — Deduplicate (biggest code quality win)
3. **Phase 3** — Dead code cleanup
4. **Phase 4** — API hardening
5. **Phase 5** — React performance
6. **Phase 6** — UX polish
7. **Phase 7** — Minor fixes

Phases 2-7 can be done incrementally. Each phase should result in a working, buildable extension.
