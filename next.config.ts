// Preserve Next 16.2.12's default HTML-only crawlers when adding LINE. Setting
// htmlLimitedBots replaces the framework defaults rather than extending them.
const defaultHtmlLimitedBots = /[\w-]+-Google|Google-[\w-]+|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight/i;

/** @type {import('next').NextConfig} */
const nextConfig = {
  htmlLimitedBots: new RegExp(`${defaultHtmlLimitedBots.source}|line-poker|\\bLine/`, "i"),
  // Include libvips alongside sharp's native binding in the deployed thumbnail
  // function. Turbopack's external-module trace can otherwise omit the .so file.
  outputFileTracingIncludes: {
    "/choice/*/share-image": [
      "./node_modules/@img/sharp-linux-x64/**/*",
      "./node_modules/@img/sharp-libvips-linux-x64/**/*",
    ],
  },
  // eslint 配置已移除（已移到 .eslintrc.json 管理）
  // 鎖定 Turbopack 專案根目錄（消除多 lockfile 警告）；與 OAuth /auth/callback 無直接關聯
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
