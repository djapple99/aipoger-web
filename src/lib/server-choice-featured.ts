import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "listen-bar-data";
const PATH = "choice/featured.json";
const KEY = /^(official|creator):[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isFeaturedChoiceKey(value: unknown): value is string {
  return typeof value === "string" && KEY.test(value);
}

// Only the owner API writes this private storage object. It contains no song data.
export async function readFeaturedChoice(admin: SupabaseClient): Promise<string | null> {
  const { data, error } = await admin.storage.from(BUCKET).download(PATH);
  if (error) {
    if (/not found|not exist|404/i.test(error.message)) return null;
    throw error;
  }
  const value: unknown = data ? JSON.parse(await data.text()) : null;
  const key = value && typeof value === "object" && "key" in value ? value.key : null;
  return isFeaturedChoiceKey(key) ? key : null;
}

export async function writeFeaturedChoice(admin: SupabaseClient, key: string | null) {
  if (key !== null && !isFeaturedChoiceKey(key)) throw new Error("Invalid featured Choice");
  const { error } = await admin.storage.from(BUCKET).upload(PATH, JSON.stringify({ key }), {
    contentType: "application/json", cacheControl: "0", upsert: true,
  });
  if (error) throw error;
}

export async function readPublicFeaturedChoice(admin: SupabaseClient): Promise<string | null> {
  const key = await readFeaturedChoice(admin);
  if (!key) return null;
  const [kind, id] = key.split(":");
  const table = kind === "official" ? "aipoger_choice_collections" : "aipoger_creator_choice_collections";
  const { data, error } = await admin.from(table).select("id").eq("id", id).eq("is_published", true).maybeSingle();
  if (error) throw error;
  return data ? key : null;
}
