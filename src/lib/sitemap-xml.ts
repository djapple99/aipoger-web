import type { MetadataRoute } from "next";
function xml(value: string) {
  return value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char]!);
}
export function sitemapXml(entries: MetadataRoute.Sitemap) {
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
    + entries.map(entry => '<url><loc>' + xml(entry.url) + '</loc>'
      + (entry.lastModified ? '<lastmod>' + xml(entry.lastModified instanceof Date ? entry.lastModified.toISOString() : entry.lastModified) + '</lastmod>' : '')
      + Object.entries(entry.alternates?.languages ?? {}).map(([lang, href]) => '<xhtml:link rel="alternate" hreflang="' + xml(lang) + '" href="' + xml(String(href)) + '" />').join('')
      + '</url>').join('\n') + '\n</urlset>\n';
}
