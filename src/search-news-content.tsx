import { List, Icon } from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  searchArticlesHtml,
  fetchArticleDetail,
  extractArticleId,
} from "./api/client";
import { Article } from "./api/type";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { getArticleUrl } from "./utils/article";
import { ArticleListItem } from "./components/ArticleListItem";
import { DETAIL_LOAD_DEBOUNCE_MS } from "./constants";
import { getMaxArticles } from "./preferences";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(
    null,
  );
  const [pendingArticle, setPendingArticle] = useState<Article | null>(null);
  const [enrichedArticles, setEnrichedArticles] = useState<
    Record<string, Article>
  >({});
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const maxArticles = getMaxArticles();

  const {
    data: rawArticles = [],
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(
    async (query: string) => {
      if (!query.trim()) {
        return [];
      }
      return await searchArticlesHtml(query);
    },
    [searchText],
    {
      keepPreviousData: true,
      initialData: [],
      onError: (err) => {
        const message = err instanceof Error ? err.message : String(err);
        void showFailureToast({ title: "Unable to search Público", message });
      },
    },
  );

  const articles = rawArticles.slice(0, maxArticles);

  const handleRefresh = useCallback(() => {
    void revalidate();
  }, [revalidate]);

  const articleById = useMemo(() => {
    const map = new Map<string, Article>();
    for (const article of articles) {
      map.set(String(article.id), article);
    }
    return map;
  }, [articles]);

  useEffect(() => {
    if (!pendingArticle) {
      return;
    }

    const articleUrl = getArticleUrl(pendingArticle);
    const articleId = extractArticleId(articleUrl);

    if (!articleId || enrichedArticles[articleId]) {
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    debounceTimerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        setIsLoadingDetails(true);
        setSelectedArticleId(articleId);

        const detail = await fetchArticleDetail(articleId, controller.signal);
        if (!detail) {
          return;
        }

        setEnrichedArticles((prev) => ({
          ...prev,
          [articleId]: detail,
        }));
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        console.error("Error loading article details:", err);
      } finally {
        setIsLoadingDetails(false);
      }
    }, DETAIL_LOAD_DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [pendingArticle, enrichedArticles]);

  const errorMessage = error
    ? error instanceof Error
      ? error.message
      : String(error)
    : null;

  const emptyView = useMemo(() => {
    if (errorMessage) {
      return (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Unable to load results"
          description={errorMessage}
        />
      );
    }

    if (searchText.trim() === "") {
      return (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search Público (Content API)"
          description="Type a keyword to find articles — using /api/content/search endpoint."
        />
      );
    }

    if (!isLoading && articles.length === 0) {
      return (
        <List.EmptyView
          icon={Icon.XmarkCircle}
          title="No articles found"
          description={`No results for "${searchText}". Try a different keyword.`}
        />
      );
    }

    return null;
  }, [articles.length, errorMessage, isLoading, searchText]);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Público news (Content API)..."
      isShowingDetail
      throttle
      onSelectionChange={(id) => {
        if (!id) {
          return;
        }

        const selectedArticle = articleById.get(id);
        if (selectedArticle) {
          setPendingArticle(selectedArticle);
        }
      }}
    >
      {emptyView
        ? emptyView
        : articles.map((article) => {
            const articleUrl = getArticleUrl(article);
            const articleId = extractArticleId(articleUrl);
            const enrichedData = articleId
              ? enrichedArticles[articleId]
              : undefined;
            const isSelected =
              articleId === selectedArticleId && isLoadingDetails;

            return (
              <ArticleListItem
                key={article.id}
                article={article}
                enrichedArticle={enrichedData}
                isLoadingDetail={isSelected}
                onRefresh={handleRefresh}
              />
            );
          })}
    </List>
  );
}
