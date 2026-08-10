import type { MetadataRoute } from "next";
import { publicSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = publicSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/auth", "/auth/", "/auth/callback", "/admin", "/api", "/settings", "/profile"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
