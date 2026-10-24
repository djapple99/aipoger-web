import { LISTEN_BAR_COVER_BUCKET } from "@/lib/listen-bar";

// Only owned, public covers can be fetched by the thumbnail endpoint.
export function isChoiceStorageCover(value: string, supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL) {
  if (!supabaseUrl) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password
      && url.origin === new URL(supabaseUrl).origin
      && url.pathname.startsWith(`/storage/v1/object/public/${LISTEN_BAR_COVER_BUCKET}/`);
  } catch {
    return false;
  }
}
