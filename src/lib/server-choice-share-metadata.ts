import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { LISTEN_BAR_COVER_BUCKET } from "@/lib/listen-bar";

export type ChoiceShareMetadata = {
  kind: "official" | "creator";
  curatorName: string;
  title: string;
  intro: string;
  imageUrl: string;
};

type CreatorChoiceRow = {
  creator_id: string;
  curator_name: string | null;
  title: string | null;
  intro: string | null;
  cover_path: string | null;
};

type OfficialChoiceRow = {
  created_by: string | null;
  curator_identity: string | null;
  title: string | null;
  intro: string | null;
  cover_path: string | null;
};

type FighterProfileRow = {
  display_name?: string | null;
  avatar_url?: string | null;
};

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase server configuration.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function clean(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function publicCoverUrl(admin: SupabaseClient, path: string | null | undefined) {
  const cleanPath = clean(path);
  if (!cleanPath) return "";
  if (/^https?:/i.test(cleanPath)) return cleanPath;
  return admin.storage.from(LISTEN_BAR_COVER_BUCKET).getPublicUrl(cleanPath).data.publicUrl || "";
}

function isMissingChoiceCover(error: unknown) {
  const text = error && typeof error === "object"
    ? [(error as { message?: string }).message, (error as { details?: string }).details, (error as { code?: string }).code].filter(Boolean).join(" ")
    : String(error ?? "");
  return /cover_path.*does not exist|column.*cover_path/i.test(text);
}

async function loadProfile(admin: SupabaseClient, userId: string | null) {
  if (!userId) return { displayName: "", avatarUrl: "" };
  const fighter = await admin.from("fighter_profiles").select("display_name,avatar_url").eq("id", userId).maybeSingle();
  if (fighter.error) throw fighter.error;
  const fighterProfile = fighter.data as FighterProfileRow | null;
  const fighterDisplayName = clean(fighterProfile?.display_name);
  const fighterAvatarUrl = clean(fighterProfile?.avatar_url);
  if (fighterDisplayName && fighterAvatarUrl) {
    return { displayName: fighterDisplayName, avatarUrl: fighterAvatarUrl };
  }

  const { data: authData } = await admin.auth.admin.getUserById(userId);
  const metadata = authData.user?.user_metadata ?? {};
  return {
    displayName: fighterDisplayName || clean(metadata.display_name) || clean(metadata.name) || clean(metadata.full_name),
    avatarUrl: fighterAvatarUrl || clean(metadata.avatar_url) || clean(metadata.picture),
  };
}

export async function loadChoiceShareMetadata(id: string): Promise<ChoiceShareMetadata | null> {
  if (!isUuid(id)) return null;
  const admin = adminClient();
  let [creatorResult, officialResult] = await Promise.all([
    admin
      .from("aipoger_creator_choice_collections")
      .select("creator_id,curator_name,title,intro,cover_path")
      .eq("id", id)
      .eq("is_published", true)
      .maybeSingle(),
    admin
      .from("aipoger_choice_collections")
      .select("created_by,curator_identity,title,intro,cover_path")
      .eq("id", id)
      .eq("is_published", true)
      .maybeSingle(),
  ]);
  if (creatorResult.error && isMissingChoiceCover(creatorResult.error)) {
    creatorResult = await admin
      .from("aipoger_creator_choice_collections")
      .select("creator_id,curator_name,title,intro")
      .eq("id", id)
      .eq("is_published", true)
      .maybeSingle();
  }
  if (officialResult.error && isMissingChoiceCover(officialResult.error)) {
    officialResult = await admin
      .from("aipoger_choice_collections")
      .select("created_by,curator_identity,title,intro")
      .eq("id", id)
      .eq("is_published", true)
      .maybeSingle();
  }
  if (creatorResult.error) throw creatorResult.error;
  if (officialResult.error) throw officialResult.error;

  if (creatorResult.data) {
    const row = creatorResult.data as CreatorChoiceRow;
    const profile = await loadProfile(admin, row.creator_id);
    return {
      kind: "creator",
      curatorName: clean(row.curator_name) || profile.displayName || "AIPOGER 創作者",
      title: clean(row.title),
      intro: clean(row.intro),
      imageUrl: publicCoverUrl(admin, row.cover_path) || profile.avatarUrl,
    };
  }

  if (officialResult.data) {
    const row = officialResult.data as OfficialChoiceRow;
    const personal = row.curator_identity === "personal";
    const profile = personal ? await loadProfile(admin, row.created_by) : { displayName: "", avatarUrl: "" };
    return {
      kind: "official",
      curatorName: personal ? profile.displayName || "愛波哥" : "AIPOGER",
      title: clean(row.title),
      intro: clean(row.intro),
      imageUrl: publicCoverUrl(admin, row.cover_path) || (personal ? profile.avatarUrl : ""),
    };
  }

  return null;
}
