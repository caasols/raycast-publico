# Público Changelog

## [Sections and Topic Search] - {PR_MERGE_DATE}

### Added

- **34 section commands.** Go straight to any Público section (`Browse Politics`, `Browse World`, `Browse Economy`, `Browse Sports`, `Browse Culture`, `Browse Science`, and more), generated from a single registry (`src/sections.json`).
- **Endpoint discovery tooling.** `npm run discover` maps Público's open JSON API; `npm run generate:sections` regenerates the section commands.

### Changed

- **Search rebuilt on the JSON API.** Público's `/pesquisa` HTML page is now WAF-blocked, so search was failing. Search now slugifies the query and queries Público's tag feeds (`/api/list/{slug}`), which is fast, reliable, and all-Público. Best for topics, people, places, and teams.
- **Command titles are English and verb-led**, so the list reads as one system: `Browse Politics`, `Browse Latest News`, `Search News`. The Portuguese name is kept as a search keyword, so typing `desporto` still finds Sports.
- Six Público mastheads keep their names: P3, Ípsilon, Fugas, Azul, Ecosfera, and Ímpar.
- Copy across the extension now uses one word per concept and a single ellipsis style.

Command ids are unchanged, so existing aliases and hotkeys keep working.

### Removed

- Dropped the `cheerio` HTML-scraping dependency and the dead search code paths.

## [Initial Version]

### Added

- Initial release of the Público extension.
- View the latest headlines from Público directly from your Raycast command bar.
- Access the most popular articles based on engagement.
- Search for any Público news article by keyword.

A fast, distraction-free way to stay informed with Portuguese news, without ever opening your browser.
