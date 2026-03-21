import { fetchLatestHeadlines } from "./api/client";
import { NewsListView } from "./components/NewsListView";

export default function Command() {
  return (
    <NewsListView
      fetchFn={fetchLatestHeadlines}
      searchBarPlaceholder="Search latest headlines..."
      errorToastTitle="Unable to load latest news"
      emptyTitle="No headlines right now"
      emptyDescription="Check back soon — the latest stories from Público will appear here."
    />
  );
}
