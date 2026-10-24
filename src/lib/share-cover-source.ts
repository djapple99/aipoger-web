import { publicSiteUrl } from "@/lib/site-url";

export function canRenderShareCover(value: string) {
  try {
    const url = new URL(value, publicSiteUrl());
    if (url.protocol !== "https:" || url.username || url.password) return false;
    if (url.origin === publicSiteUrl()) return /^\/(aipoger-[a-z0-9-]+\.png|images\/)/i.test(url.pathname);
    const storage = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (storage && url.origin === new URL(storage).origin) return /^\/storage\/v1\/object\/public\/(listen-bar-covers|avatars)\//.test(url.pathname);
    return url.hostname === "i.ytimg.com" && /^\/vi\/[\w-]{11}\/(maxresdefault|sddefault|hqdefault)\.jpg$/.test(url.pathname);
  } catch { return false; }
}
