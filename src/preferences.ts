import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  maxArticles: string;
}

export function getMaxArticles(): number {
  const { maxArticles } = getPreferenceValues<Preferences>();
  return Number.parseInt(maxArticles, 10) || 25;
}
