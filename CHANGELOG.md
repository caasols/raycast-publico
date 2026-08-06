# Público Changelog

## [Sections and Topic Search] - {PR_MERGE_DATE}

### Added

- **34 section commands.** Go straight to any Público section (`Browse Politics`, `Browse World`, `Browse Economy`, `Browse Sports`, `Browse Culture`, `Browse Science`, and more), generated from a single registry (`src/sections.json`).
- **Endpoint discovery tooling.** `npm run discover` maps Público's open JSON API; `npm run generate:sections` regenerates the section commands.

### Changed

- **Search rebuilt on the JSON API.** Público's `/pesquisa` HTML page is now WAF-blocked, so search was failing. Search now slugifies the query and queries Público's tag feeds (`/api/list/{slug}`), which is fast, reliable, and all-Público. Best for topics, people, places, and teams.
- **Command titles are English and verb-led**, so the list reads as one system: `Browse Politics`, `Browse Latest News`, `Search News`. The Portuguese name is kept as a search keyword, so typing `desporto` still finds Sports.
- Six Público mastheads keep their names: P3, Ípsilon, Fugas, Azul, Ecosfera, and Ímpar.
- `Search News` is now `Browse Topic`, which is what it actually does: it matches Público's own topics rather than searching article text. The command id is unchanged, so existing aliases and hotkeys keep working, and `search` and `pesquisa` are keywords so it stays findable.
- When no topic matches, the command offers to run the same query against Público's full-text search in your browser.
- Copy across the extension now uses one word per concept and a single ellipsis style.

Command ids are unchanged, so existing aliases and hotkeys keep working.

### Fixed

- Video, multimedia and podcast articles showed another article's author, date, keywords and summary. Those URLs end in a timestamp, and the id was being read out of the URL, so it matched the time instead. The id now comes from the article itself.
- Publication times were wrong outside UTC+1, and could show the wrong day. Público sends some timestamps without a timezone offset; those are now read as Lisbon time.
- Article summaries showed raw HTML tags on articles whose summary contains formatting.
- A failed search no longer hides results that are still on screen.

### Removed


- Dropped the `cheerio` HTML-scraping dependency and the dead search code paths.

## [Initial Version]

### Added

- Initial release of the Público extension.
- View the latest headlines from Público directly from your Raycast command bar.
- Access the most popular articles based on engagement.
- Search for any Público news article by keyword.

A fast, distraction-free way to stay informed with Portuguese news, without ever opening your browser.
