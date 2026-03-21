import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { Article } from "../api/type";
import { extractArticleId } from "../api/client";
import {
  cleanDescription,
  extractTags,
  formatAuthors,
  getArticleIcon,
  getArticleUrl,
  getTagColor,
  DEFAULT_METADATA_PLACEHOLDER,
  resolvePublishedDate,
} from "../utils/article";
import { MAX_TAGS, SUMMARY_PLACEHOLDER, UNTITLED_ARTICLE } from "../constants";
import { ArticleView } from "./ArticleView";

interface ArticleListItemProps {
  article: Article;
  index: number;
  enrichedArticle?: Article;
  isLoadingDetail?: boolean;
  onRefresh: () => void;
}

export function ArticleListItem({
  article,
  index,
  enrichedArticle,
  isLoadingDetail,
  onRefresh,
}: ArticleListItemProps) {
  const cleanTitle =
    article.titulo?.replace(/<[^>]*>/g, "") || UNTITLED_ARTICLE;
  const articleUrl = getArticleUrl(article);
  const articleId = extractArticleId(articleUrl);

  const authorText = formatAuthors(enrichedArticle?.autores ?? article.autores);
  const extractedTags = extractTags(
    enrichedArticle?.tags ?? article.tags,
  ).slice(0, MAX_TAGS);

  const summarySource = enrichedArticle?.descricao ?? article.descricao;
  const summary = cleanDescription(summarySource);
  const publishedDate = resolvePublishedDate(enrichedArticle ?? article);

  const icon = getArticleIcon(article);
  const detailMarkdown = `# ${cleanTitle}\n\n---\n\n${summary || SUMMARY_PLACEHOLDER}\n`;

  return (
    <List.Item
      key={`article-${index}`}
      id={`article-${index}`}
      icon={icon}
      title={cleanTitle}
      detail={
        <List.Item.Detail
          isLoading={isLoadingDetail}
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
                      key={`${articleId ?? index}-tag-${tagIndex}`}
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
          <Action.Push
            title="Read Article"
            icon={Icon.Book}
            target={
              <ArticleView articleUrl={articleUrl} articleTitle={cleanTitle} />
            }
          />
          <Action.OpenInBrowser title="Open in Browser" url={articleUrl} />
          <Action.CopyToClipboard
            title="Copy URL"
            content={articleUrl}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action
            title="Refresh"
            icon={Icon.RotateClockwise}
            onAction={onRefresh}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    />
  );
}
