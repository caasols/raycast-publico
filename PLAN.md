# Raycast Público Extension — V2 Refactor Plan

## Audit Summary

**Overall Quality: 6.5/10** — Functional but has significant duplication, no tests, dead code, and fragile patterns. The architecture is sound but the implementation needs hardening.

---

## Phase 1: Eliminate Massive Code Duplication (High Priority)

### 1.1 — Extract shared `<ArticleListItem>` component
- `view-popular-news.tsx`, `view-latest-news.tsx`, and `search-news.tsx` all contain **identical** article rendering logic (~70 lines each): title cleaning, author extraction, tag rendering, metadata, action panel.
- **Action**: Create `src/components/ArticleListItem.tsx` — a single reusable component.

### 1.2 — Extract shared `<NewsListView>` component
- `view-popular-news.tsx` and `view-latest-news.tsx` are **98% identical** — the only difference is which fetch function is called and the placeholder text.
- **Action**: Create `src/components/NewsListView.tsx` that accepts `fetchFn`, `searchBarPlaceholder`, `errorTitle`, and `emptyTitle` as props. Both commands become ~10-line wrappers.

### 1.3 — Deduplicate constants
- `MAX_TAGS`, `SUMMARY_PLACEHOLDER`, `UNTITLED_ARTICLE` are copy-pasted across 3 files.
- **Action**: Move to `src/constants.ts`.

---

## Phase 2: Dead Code & Structural Cleanup

### 2.1 — Resolve `article-view.tsx` status
- This file is a fully implemented `<Detail>` view for reading articles, but it's **never imported anywhere**. It was likely intended as a "push to read article" action.
- **Action**: Either integrate it as an action in article list items (push navigation to full article view), or delete it. **Recommendation: integrate it** — it adds real value by letting users read article body content without opening a browser.

### 2.2 — Remove duplicated `TagObject` type
- `src/utils/article.ts:121-128` redefines `TagObject` which is essentially the same as `TagLike` from `src/api/type.ts`.
- **Action**: Reuse `TagLike` from type.ts instead of redefining.

### 2.3 — Clean up `AuthorLike` type
- `AuthorLike` is defined locally in `article.ts:78` but could be part of `type.ts` alongside the `Article` interface.
- **Action**: Move to `type.ts` and export it.

---

## Phase 3: API Client Hardening

### 3.1 — Eliminate repetitive fetch functions
- `fetchLatestHeadlines()`, `fetchTopNews()`, and `searchArticles()` all follow the exact same pattern (fetch → check ok → parse JSON → cast).
- **Action**: Create a single `fetchArticleList(endpoint: string): Promise<Article[]>` helper, then each function becomes a one-liner.

### 3.2 — Add request timeout
- Currently no timeout — requests can hang forever.
- **Action**: Add `AbortSignal.timeout(10_000)` to all fetch calls.

### 3.3 — Add basic response validation
- Currently uses unsafe `as Article[]` casts with zero field checking.
- **Action**: Add lightweight runtime validation (check that response is array, each item has `titulo` and `url`). No need for zod — keep deps minimal.

### 3.4 — Improve error classification
- All errors are treated the same way.
- **Action**: Distinguish network errors vs HTTP errors vs parse errors in the error message shown to users.

---

## Phase 4: React & Performance Improvements

### 4.1 — Use article ID as key instead of array index
- All three list views use `key={`article-${index}`}` — this is a React anti-pattern that causes issues when lists reorder.
- **Action**: Use `article.id` or a hash of `article.url` as the key.

### 4.2 — Memoize ArticleListItem
- Wrap the extracted component with `React.memo` so it doesn't re-render when the article data hasn't changed.

### 4.3 — Add `useCallback` for action handlers
- Inline arrow functions in `onAction` create new references every render.
- **Action**: Wrap `revalidate` call in `useCallback`.

---

## Phase 5: UX Polish

### 5.1 — Integrate article reading view
- Use the currently dead `article-view.tsx` as a push action: "Read Article" that shows full article content in a Raycast Detail view.
- **Action**: Add `Action.Push` to the action panel in `ArticleListItem`.

### 5.2 — Add "Copy Title" action
- Currently only "Open in Browser" and "Copy URL". Adding "Copy Title" is useful.

### 5.3 — Improve empty/error states
- Add actionable suggestions in error messages (e.g., "Check your internet connection").
- Add a "Retry" action to error views.

### 5.4 — Add Raycast preferences
- Add a preference for the number of articles to display.
- Add a preference to choose the date format.

---

## Phase 6: Minor Code Quality Fixes

### 6.1 — Fix `formatDate` no-op
- `src/utils/formatDate.ts:25`: `.replace(",", ",")` replaces comma with comma — does nothing.

### 6.2 — Fix HTML stripping
- `article.titulo?.replace(/<[^>]*>/g, "")` is incomplete for edge cases (encoded entities like `&lt;`).
- **Action**: Create a `stripHtml()` utility that also handles common HTML entities.

### 6.3 — Fix CHANGELOG.md template
- Contains uninterpolated `PR_MERGE_DATE` variable.

### 6.4 — Unnecessary type casts
- `article.ts:105`: `author as AuthorLike` — unnecessary since the array items already match AuthorLike.
- `article.ts:167`: `tag as TagLike` — same issue.
- `article.ts:177`: `tags as TagLike` — same.
- **Action**: Fix the type definitions so casts aren't needed.

---

## Phase 7: Tests

### 7.1 — Set up test infrastructure
- **Problem**: Zero test coverage. No test runner configured.
- **Action**: Add `vitest` (lightweight, fast, TypeScript-native) and configure it in `package.json`.

### 7.2 — Unit tests for utility functions
- These are pure functions with complex logic that should absolutely be tested:
  - `extractArticleId()` — 4 regex patterns with fallbacks, 7+ URL formats to cover
  - `cleanDescription()` — regex-based prefix stripping
  - `formatAuthors()` — handles arrays, single objects, strings, nulls
  - `extractTags()` — handles strings, arrays, objects, edge cases like `"undefined"` and `"[object Object]"`
  - `getArticleUrl()` — URL fixing logic with multiple malformed URL patterns
  - `resolvePublishedDate()` — invalid date detection, fallback logic
  - `normalizeTag()` — object-to-string extraction with multiple field fallbacks
  - `formatDate()` — date parsing and locale formatting
  - `stripHtml()` — (new from Phase 6.2) HTML entity handling

### 7.3 — Unit tests for API client
- Test `ensureArticleArray()` and `ensureArticle()` validation logic (especially after Phase 3.3 hardens them).
- Test error classification logic from Phase 3.4.
- Mock `fetch` to verify timeout, error handling, and abort behavior.

### 7.4 — Ensure lint compliance
- The project uses `ray lint` which runs **ESLint v9** (via `@raycast/eslint-config` flat config) and **Prettier** together.
- **Action**: Run `ray lint` after all refactoring and fix any issues. Ensure new files (components, constants, tests) follow the existing config.
- No new ESLint config changes needed — the Raycast preset handles everything.

### 7.5 — Add test script to package.json
- Add `"test": "vitest run"` and `"test:watch": "vitest"` scripts.

---

## Phase 8: Fix Broken Search (Requires Local Testing)

### 8.1 — Investigate & fix the search endpoint
- **Problem**: The `searchArticles()` function calls `GET /api/list/search?query=...` which may have changed or been removed by Público. Investigation from this sandbox showed all of publico.pt returns 403 (likely WAF/Cloudflare bot blocking), so the endpoint path itself may still be correct.
- **Action**:
  - Add proper request headers (`User-Agent`, `Referer`) to mimic browser requests — this may be all that's needed.
  - Add **endpoint fallback logic** — try `/api/list/search?query=`, and if it returns 404/error, try alternative patterns: `/api/search?query=`, `/api/list/pesquisa?query=`, `/pesquisa/site?query=`.
  - Add a **configurable base URL** via Raycast preferences so users can override if the API changes again.
  - **You must test locally** after the refactor to confirm which endpoint works. If none work, inspect browser DevTools on publico.pt's search page to find the real endpoint.

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
| **Modify** | `package.json` (add preferences, keywords, test scripts) |
| **Create** | `src/__tests__/article.test.ts` |
| **Create** | `src/__tests__/client.test.ts` |
| **Create** | `src/__tests__/formatDate.test.ts` |

---

## Execution Order

1. **Phase 1** — Deduplicate (biggest code quality win)
2. **Phase 2** — Dead code cleanup
3. **Phase 3** — API hardening
4. **Phase 4** — React performance
5. **Phase 5** — UX polish
6. **Phase 6** — Minor fixes
7. **Phase 7** — Tests (validates all the refactored code)
8. **Phase 8** — Fix search (requires your local testing to verify endpoints)

Phases 1-7 can be done incrementally. Each phase should result in a working, buildable extension. Phase 8 is last because it requires local verification that we can't do from this sandbox.
