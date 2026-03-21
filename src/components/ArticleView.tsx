import { ActionPanel, Action, Detail } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchArticleDetail, extractArticleId } from "../api/client";
import { formatDate } from "../utils/formatDate";
import { Article } from "../api/type";
import { formatAuthors, stripHtml } from "../utils/article";

interface ArticleViewProps {
  articleUrl: string;
  articleTitle: string;
}

export function ArticleView({ articleUrl, articleTitle }: ArticleViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [article, setArticle] = useState<Article | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchArticleContent() {
      try {
        setIsLoading(true);
        const articleId = extractArticleId(articleUrl);

        if (!articleId) {
          setError(
            "This article can't be loaded right now. Try opening it in your browser.",
          );
          setIsLoading(false);
          return;
        }

        const data = await fetchArticleDetail(articleId);

        if (!data) {
          setError(
            "This article isn't available right now. Try opening it in your browser.",
          );
          setArticle(null);
          return;
        }

        setArticle(data);
      } catch {
        setError(
          `Something went wrong loading this article. Try opening it in your browser.`,
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchArticleContent();
  }, [articleUrl]);

  function generateArticleMarkdown() {
    if (error) {
      return `# Error\n\n${error}`;
    }

    if (!article) {
      return `# ${articleTitle}\n\nLoading article...`;
    }

    const title = article.titulo || articleTitle;
    const lead = article.lead || "";
    const body = article.body ?? "";
    const publishedDate = article.data
      ? formatDate(article.data)
      : "Not available";
    const authors = formatAuthors(article.autores);
    const hasContent = body.trim().length > 0;

    return `# ${title}\n\n*${authors} • ${publishedDate}*\n\n${lead ? `**${lead}**\n\n` : ""}${
      hasContent
        ? stripHtml(body)
        : "The full content of this article is only available on the Público website.\n\nUse **Open in Browser** to read it there."
    }\n`;
  }

  return (
    <Detail
      markdown={generateArticleMarkdown()}
      isLoading={isLoading}
      navigationTitle={articleTitle}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Browser" url={articleUrl} />
          <Action.CopyToClipboard
            title="Copy URL"
            content={articleUrl}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy Title"
            content={articleTitle}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
