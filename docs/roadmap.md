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
| 8.1 | Configure panel actions in the extension command config | Planned |

---

## Phase 9: Fix Broken Search

| Task | Description | Status |
|------|-------------|--------|
| 9.1 | Add browser-like request headers (`User-Agent`, `Referer`) to API calls | Planned |
| 9.2 | Add endpoint fallback logic for search | Planned |
| 9.3 | Add configurable base URL via Raycast preferences | Planned |
| 9.4 | Local testing required — verify working endpoint via browser DevTools | Planned |

---

## Phase 10: Read the News

| Task | Description | Status |
|------|-------------|--------|
| 10.1 | Verify full article content can be fetched and rendered | Planned |

---

## Phase 11: Summarize Articles

| Task | Description | Status |
|------|-------------|--------|
| 11.1 | Add article summarization functionality | Planned |

---

## Phase 12: Persist Summaries to Memory

| Task | Description | Status |
|------|-------------|--------|
| 12.1 | Save summaries as they are created so they persist across sessions | Planned |

---

## File Change Summary

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
