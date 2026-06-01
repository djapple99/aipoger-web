import type { MetadataRoute } from "next";

const configuredSiteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://aipoger.com").replace(/\/$/, "");
const siteUrl = configuredSiteUrl === "https://www.aipoger.com" ? "https://aipoger.com" : configuredSiteUrl;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }> = [
    { path: "/", priority: 1, changeFrequency: "daily" },
    { path: "/listen-bar", priority: 0.9, changeFrequency: "hourly" },
    { path: "/battle", priority: 0.85, changeFrequency: "daily" },
    { path: "/watch", priority: 0.8, changeFrequency: "hourly" },
    { path: "/rank", priority: 0.75, changeFrequency: "daily" },
    { path: "/hook-guide", priority: 0.7, changeFrequency: "weekly" },
    { path: "/ai-music-bible", priority: 0.65, changeFrequency: "weekly" },
    { path: "/about", priority: 0.5, changeFrequency: "monthly" },
    { path: "/partners", priority: 0.4, changeFrequency: "monthly" },
  ];

  return routes.map((route) => ({
    url: `${siteUrl}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
