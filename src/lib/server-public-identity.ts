import type { SupabaseClient } from "@supabase/supabase-js";

/** Public identities come from the saved stage profile, never OAuth names or email. */
export async function loadPublicIdentity(admin: SupabaseClient, userId: string, fallback = "AIPOGER 聽眾") {
  const [profile, fighter] = await Promise.all([
    admin.from("user_profiles").select("fighter_name,avatar_url").eq("id", userId).maybeSingle(),
    admin.from("fighter_profiles").select("display_name,avatar_url").eq("id", userId).maybeSingle(),
  ]);
  // A transient lookup failure must not silently publish a different identity.
  if (profile.error || fighter.error) throw new Error("Public identity unavailable");
  const clean = (value: unknown) => typeof value === "string" ? value.trim() : "";
  let name = clean(profile.data?.fighter_name);
  const legacyName = clean(fighter.data?.display_name);
  if (!name && legacyName) {
    // Old signup rows were initialized from OAuth legal names/email. Only retain a
    // legacy alias that differs from those defaults; saving a stage name opts in.
    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (error || !data.user) throw new Error("Public identity unavailable");
    const metadata = data.user.user_metadata ?? {};
    const accountNames = [metadata.full_name, metadata.name, metadata.display_name, data.user.email?.split("@")[0]]
      .map(clean).filter(Boolean);
    if (!accountNames.includes(legacyName)) name = legacyName;
  }
  return {
    displayName: (name || fallback).slice(0, 80),
    avatarUrl: clean(fighter.data?.avatar_url) || clean(profile.data?.avatar_url) || null,
  };
}
