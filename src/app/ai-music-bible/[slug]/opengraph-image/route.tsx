import { publicBibleArticle } from "@/lib/bible-public-articles";
import { publicLang } from "@/lib/public-seo";
import { bibleShareImage } from "@/lib/bible-share-image";
export const runtime = "nodejs";
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const lang = publicLang(new URL(request.url).searchParams.get("lang"));
  const article = publicBibleArticle(slug, lang);
  if (!article) return new Response(null, { status: 404 });
  return bibleShareImage(article.englishTitle);
}
