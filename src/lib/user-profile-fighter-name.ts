import { supabase } from "@/lib/supabase";
import { readFighterNameFromStorage, writeFighterNameToStorage } from "@/lib/fighter-name-storage";

/** PostgREST schema cache: column not on user_profiles yet */
export function isMissingFighterNameColumn(err: unknown): boolean {
  const msg = String((err as { message?: string })?.message ?? err).toLowerCase();
  return (
    msg.includes("fighter_name") &&
    (msg.includes("schema cache") || msg.includes("could not find") || msg.includes("column"))
  );
}

/** 寫入 DB（若欄位存在）並一律同步 localStorage */
export async function saveFighterNameToProfile(userId: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (trimmed) writeFighterNameToStorage(trimmed);

  const { error } = await supabase
    .from("user_profiles")
    .upsert({ id: userId, fighter_name: trimmed || null }, { onConflict: "id" });

  if (error && isMissingFighterNameColumn(error)) {
    console.warn(
      "[fighter_name] user_profiles.fighter_name missing — run supabase/user_profiles_fighter_name.sql",
      error,
    );
    return;
  }
  if (error) throw error;
}

/** 從 DB 讀取；欄位不存在時改讀 localStorage */
export async function loadFighterNameFromProfile(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("fighter_name")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    if (isMissingFighterNameColumn(error)) {
      return readFighterNameFromStorage();
    }
    console.error("[fighter_name] load", error);
    return readFighterNameFromStorage();
  }

  const fromDb = data?.fighter_name?.trim();
  if (fromDb) {
    writeFighterNameToStorage(fromDb);
    return fromDb;
  }
  return readFighterNameFromStorage();
}
