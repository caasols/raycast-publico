import { List, Icon } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { Article } from "../api/type";
import { ArticleListItem } from "./ArticleListItem";

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

  const articles = data ?? [];
  const errorMessage = error
    ? error instanceof Error
      ? error.message
      : String(error)
    : null;

  if (errorMessage) {
    return (
      <List
        isLoading={isLoading}
        isShowingDetail
        searchBarPlaceholder={searchBarPlaceholder}
      >
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Unable to load Público news"
          description={errorMessage}
        />
      </List>
    );
  }

  if (!isLoading && articles.length === 0) {
    return (
      <List
        isLoading={isLoading}
        isShowingDetail
        searchBarPlaceholder={searchBarPlaceholder}
      >
        <List.EmptyView
          icon={Icon.Document}
          title={emptyTitle}
          description={emptyDescription}
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
      {articles.map((article, index) => (
        <ArticleListItem
          key={`article-${index}`}
          article={article}
          index={index}
          onRefresh={() => {
            void revalidate();
          }}
        />
      ))}
    </List>
  );
}
