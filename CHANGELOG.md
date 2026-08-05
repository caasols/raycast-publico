# Público Changelog

## [Sections and Topic Search] - {PR_MERGE_DATE}

### Added

- **34 section commands.** Browse any Público section directly (Política, Mundo, Economia, Desporto, Cultura, Ciência, and more), generated from a single registry (`src/sections.json`).
- **Endpoint discovery tooling.** `npm run discover` maps Público's open JSON API and writes `docs/endpoints.json`; `npm run generate:sections` regenerates the section commands.

### Changed

- **Search rebuilt on the JSON API.** Público's `/pesquisa` HTML page is now WAF-blocked, so search was failing. Search now slugifies the query and queries Público's tag feeds (`/api/list/{slug}`), which is fast, reliable, and all-Público. Best for topics, people, places, and teams.

### Removed

- Dropped the `cheerio` HTML-scraping dependency and the dead search code paths.

## [Initial Version] - 2025-10-16

### Added

- Initial release of the Público extension.
- View the latest headlines from Público directly from your Raycast command bar.
- Access the most popular articles based on engagement.
- Search for any Público news article by keyword.

A fast, distraction-free way to stay informed with Portuguese news, without ever opening your browser.
