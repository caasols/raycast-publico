import { fetchTopNews } from "./api/client";
import { NewsListView } from "./components/NewsListView";

export default function Command() {
  return (
    <NewsListView
      fetchFn={fetchTopNews}
      searchBarPlaceholder="Search trending headlines..."
      errorToastTitle="Unable to load top news"
      emptyTitle="No trending articles"
      emptyDescription="Check back soon for the most popular stories from Público."
    />
  );
}
