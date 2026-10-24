import { readPublicSitemap } from "@/lib/server-public-sitemap";
import { sitemapXml } from "@/lib/sitemap-xml";
export const preferredRegion = "hnd1";
export const dynamic = "force-dynamic";
export async function GET() {
  // Own the XML serialization: Next 16's metadata serializer interpolates query
  // ampersands verbatim, which makes playlist and album URLs invalid XML.
  return new Response(sitemapXml(await readPublicSitemap()), { headers: {
    "Content-Type": "application/xml; charset=utf-8",
    "Cache-Control": "public, max-age=0, s-maxage=300",
  } });
}
