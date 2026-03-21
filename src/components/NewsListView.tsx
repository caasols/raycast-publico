import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { useCallback } from "react";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { Article } from "../api/type";
import { ArticleListItem } from "./ArticleListItem";
import { getMaxArticles } from "../preferences";

interface NewsListViewProps {
  fetchFn: () => Promise<Article[]>;
  searchBarPlaceholder: string;
  errorToastTitle: string;
  emptyTitle: string;
  emptyDescription: string;
}

export function NewsListView({
  fetchFn,
  searchBarPlaceholder,
  errorToastTitle,
  emptyTitle,
  emptyDescription,
}: NewsListViewProps) {
  const { data, isLoading, error, revalidate } = useCachedPromise(fetchFn, [], {
    keepPreviousData: true,
    onError: (err) => {
      const message = err instanceof Error ? err.message : String(err);
      void showFailureToast({ title: errorToastTitle, message });
    },
  });

  const handleRefresh = useCallback(() => {
    void revalidate();
  }, [revalidate]);

  const maxArticles = getMaxArticles();
  const articles = (data ?? []).slice(0, maxArticles);
  const errorMessage = error
    ? error instanceof Error
      ? error.message
      : String(error)
    : null;

  if (errorMessage) {
    return (
      <List
        isLoading={isLoading}
        isShowingDetail={false}
        searchBarPlaceholder={searchBarPlaceholder}
      >
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Unable to load Público news"
          description={`${errorMessage}\n\nPress ⌘R to retry.`}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.RotateClockwise}
                onAction={handleRefresh}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (!isLoading && articles.length === 0) {
    return (
      <List
        isLoading={isLoading}
        isShowingDetail={false}
        searchBarPlaceholder={searchBarPlaceholder}
      >
        <List.EmptyView
          icon={Icon.Document}
          title={emptyTitle}
          description={emptyDescription}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.RotateClockwise}
                onAction={handleRefresh}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder={searchBarPlaceholder}
    >
      {articles.map((article) => (
        <ArticleListItem
          key={article.id}
          article={article}
          onRefresh={handleRefresh}
        />
      ))}
    </List>
  );
}
