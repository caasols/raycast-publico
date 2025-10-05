import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  searchArticles,
  fetchArticleDetail,
  extractArticleId,
} from "./api/client";
import { Article } from "./api/type";
import { showFailureToast } from "@raycast/utils";
import {
  cleanDescription,
  extractTags,
  formatAuthors,
  getArticleIcon,
  getArticleUrl,
  getTagColor,
  DEFAULT_METADATA_PLACEHOLDER,
  resolvePublishedDate,
} from "./utils/article";

const MAX_TAGS = 6;
const DEBOUNCE_IN_MS = 300;
const SUMMARY_PLACEHOLDER = "No summary available.";
const UNTITLED_ARTICLE = "Untitled";

export default function Command() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [enrichedArticles, setEnrichedArticles] = useState<
    Map<string, Article>
  >(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(
    null,
  );
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setArticles([]);
      setEnrichedArticles(new Map());
      setError(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await searchArticles(query);
      setArticles(data);
      setEnrichedArticles(new Map());
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setArticles([]);
      await showFailureToast("Unable to search Público", message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  async function loadArticleDetails(article: Article) {
    if (!article) {
      return;
    }

    const articleUrl = getArticleUrl(article);
    const articleId = extractArticleId(articleUrl);
    if (!articleId || enrichedArticles.has(articleId)) {
      return;
    }

    try {
      setIsLoadingDetails(true);
      setSelectedArticleId(articleId);

      const detail = await fetchArticleDetail(articleId);
      if (!detail) {
        return;
      }

      setEnrichedArticles((prev) => {
        const updated = new Map(prev);
        updated.set(articleId, detail);
        return updated;
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await showFailureToast("Unable to load article details", message);
    } finally {
      setIsLoadingDetails(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void performSearch(searchText);
    }, DEBOUNCE_IN_MS);

    return () => clearTimeout(timer);
  }, [performSearch, searchText]);

  const emptyView = useMemo(() => {
    if (error) {
      return (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Unable to fetch results"
          description={error}
        />
      );
    }

    if (searchText.trim() === "") {
      return (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search Público News"
          description="Type a keyword to find articles."
        />
      );
    }

    if (!isLoading && articles.length === 0) {
      return (
        <List.EmptyView
          icon={Icon.XmarkCircle}
          title="No articles found"
          description={`No results for '${searchText}'. Try another search.`}
        />
      );
    }

    return null;
  }, [articles.length, error, isLoading, searchText]);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Público news..."
      isShowingDetail
      throttle
      onSelectionChange={(id) => {
        if (!id) {
          return;
        }

        const [, indexAsString] = id.split("-");
        const index = Number.parseInt(indexAsString, 10);
        const selectedArticle = Number.isNaN(index)
          ? undefined
          : articles[index];

        if (selectedArticle) {
          void loadArticleDetails(selectedArticle);
        }
      }}
    >
      {emptyView
        ? emptyView
        : articles.map((article, index) => {
            const cleanTitle =
              article.titulo?.replace(/<[^>]*>/g, "") || UNTITLED_ARTICLE;
            const articleUrl = getArticleUrl(article);
            const articleId = extractArticleId(articleUrl);
            const enrichedData = articleId
              ? enrichedArticles.get(articleId)
              : undefined;

            const authorText = formatAuthors(
              enrichedData?.autores ?? article.autores,
            );
            const extractedTags = extractTags(
              enrichedData?.tags ?? article.tags,
            ).slice(0, MAX_TAGS);

            const summarySource = enrichedData?.descricao ?? article.descricao;
            const summary = cleanDescription(summarySource);
            const publishedDate = resolvePublishedDate(enrichedData ?? article);

            const icon = getArticleIcon(article);
            const detailMarkdown = `# ${cleanTitle}\n\n---\n\n${summary || SUMMARY_PLACEHOLDER}\n`;
            const isSelected =
              articleId === selectedArticleId && isLoadingDetails;

            return (
              <List.Item
                key={`article-${index}`}
                id={`article-${index}`}
                icon={icon}
                title={cleanTitle}
                detail={
                  <List.Item.Detail
                    isLoading={isSelected}
                    markdown={detailMarkdown}
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Label
                          title="Author"
                          text={authorText}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Published"
                          text={publishedDate}
                        />
                        {extractedTags.length > 0 ? (
                          <List.Item.Detail.Metadata.TagList title="Keywords">
                            {extractedTags.map((tag, tagIndex) => (
                              <List.Item.Detail.Metadata.TagList.Item
                                key={`tag-${tagIndex}`}
                                text={tag}
                                color={getTagColor(tagIndex)}
                              />
                            ))}
                          </List.Item.Detail.Metadata.TagList>
                        ) : (
                          <List.Item.Detail.Metadata.Label
                            title="Keywords"
                            text={DEFAULT_METADATA_PLACEHOLDER}
                            icon={Icon.Tag}
                          />
                        )}
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser
                      title="Open in Browser"
                      url={articleUrl}
                    />
                    <Action.CopyToClipboard
                      title="Copy URL"
                      content={articleUrl}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    <Action
                      title="Refresh"
                      icon={Icon.RotateClockwise}
                      onAction={() => {
                        void performSearch(searchText);
                      }}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
    </List>
  );
}
