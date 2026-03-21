import { fetchLatestHeadlines } from "./api/client";
import { NewsListView } from "./components/NewsListView";

export default function Command() {
  return (
    <NewsListView
      fetchFn={fetchLatestHeadlines}
      searchBarPlaceholder="Search latest headlines..."
      errorToastTitle="Unable to load latest news"
      emptyTitle="No headlines available"
      emptyDescription="Try again later to see the latest updates from Público."
    />
  );
}
