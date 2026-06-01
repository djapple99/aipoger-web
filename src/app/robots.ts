import type { MetadataRoute } from "next";

const configuredSiteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://aipoger.com").replace(/\/$/, "");
const siteUrl = configuredSiteUrl === "https://www.aipoger.com" ? "https://aipoger.com" : configuredSiteUrl;

export default function robots(): MetadataRoute.Robots {
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
