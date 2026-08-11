export const MAX_TAGS = 6;
export const SUMMARY_PLACEHOLDER = "No summary available.";
export const UNTITLED_ARTICLE = "Untitled";
export const DETAIL_LOAD_DEBOUNCE_MS = 150;

/**
 * Fallback article count, used when the stored preference is missing or
 * unparseable. Must stay in step with the `maxArticles` default in
 * package.json; `src/__tests__/preferences.test.ts` asserts they agree.
 */
export const DEFAULT_MAX_ARTICLES = 10;
