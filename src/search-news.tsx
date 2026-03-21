import { List, Icon } from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  searchArticles,
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

  // Track the current abort controller to cancel in-flight requests
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Main search with automatic debouncing and caching
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
      return await searchArticles(query);
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

  // Build a lookup from article ID to article for onSelectionChange
  const articleById = useMemo(() => {
    const map = new Map<string, Article>();
    for (const article of articles) {
      map.set(String(article.id), article);
    }
    return map;
  }, [articles]);

  // Debounce article detail loading to reduce API calls when scrolling quickly
  useEffect(() => {
    if (!pendingArticle) {
      return;
    }

    const articleUrl = getArticleUrl(pendingArticle);
    const articleId = extractArticleId(articleUrl);

    // Skip if already loaded
    if (!articleId || enrichedArticles[articleId]) {
      return;
    }

    // Clear any existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Cancel any previous in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Set new debounce timer
    debounceTimerRef.current = setTimeout(async () => {
      // Create new abort controller for this request
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
        // Ignore abort errors - they're intentional when user switches articles
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }

        // Log error but don't show toast - some articles may not have details
        console.error("Error loading article details:", err);
      } finally {
        setIsLoadingDetails(false);
      }
    }, DETAIL_LOAD_DEBOUNCE_MS);

    // Cleanup timer on unmount or when pendingArticle changes
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
          title="Unable to fetch results"
          description={errorMessage}
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
  }, [articles.length, errorMessage, isLoading, searchText]);

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
