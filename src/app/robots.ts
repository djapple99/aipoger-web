import type { MetadataRoute } from "next";
import { publicSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = publicSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/auth", "/auth/", "/auth/callback", "/admin", "/api", "/settings", "/profile", "/battle/setup", "/battle/hook-cut", "/battle/q-crash/new", "/battle/rematch-preview"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
