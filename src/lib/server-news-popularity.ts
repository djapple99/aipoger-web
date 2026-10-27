import "server-only";
import { unstable_cache } from "next/cache";
import { publishedMusicNews, type MusicNews } from "@/lib/music-news";
import { mvReviewAdmin } from "@/lib/server-mv-reviews";

export type NewsPopularity = { slugs: string[]; status: "ranked" | "empty" | "unavailable" };

/** Read counts only: no member identities, comment bodies or engagement writes. */
export async function readNewsPopularity(articles: readonly MusicNews[], admin = mvReviewAdmin()): Promise<NewsPopularity> {
  const rows = await Promise.all(articles.map(async article => {
    const [likes, comments] = await Promise.all([
      admin.from("music_news_likes").select("*", { count: "exact", head: true }).eq("article_slug", article.slug).abortSignal(AbortSignal.timeout(4000)),
      admin.from("music_news_comments").select("*", { count: "exact", head: true }).eq("article_slug", article.slug).eq("moderation_status", "visible").abortSignal(AbortSignal.timeout(4000)),
    ]);
    if (likes.error || comments.error || likes.count === null || comments.count === null) throw new Error("News popularity unavailable");
    return { article, score: likes.count + comments.count };
  }));
  rows.sort((a, b) => b.score - a.score || b.article.publishedOn.localeCompare(a.article.publishedOn) || a.article.slug.localeCompare(b.article.slug));
  return { slugs: rows.slice(0, 4).map(row => row.article.slug), status: rows.some(row => row.score > 0) ? "ranked" : "empty" };
}

const cachedPopularity = unstable_cache(async () => readNewsPopularity(publishedMusicNews()), ["news-popularity-v1"], { revalidate: 60 });

export async function newsPopularity(): Promise<NewsPopularity> {
  try { return await cachedPopularity(); }
  catch {
    return { slugs: publishedMusicNews().slice(0, 4).map(article => article.slug), status: "unavailable" };
  }
}
