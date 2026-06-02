export type BattleOgData = {
  id: string;
  fighter_a_user_id: string | null;
  fighter_b_user_id: string | null;
  fighter_a_name: string;
  fighter_b_name: string;
  song_a_name: string;
  song_b_name: string;
  genre: string | null;
  song_a_cover: string | null;
  song_b_cover: string | null;
  fighter_a_avatar: string | null;
  fighter_b_avatar: string | null;
  ai_tool_a: string | null;
  ai_tool_b: string | null;
  queue_status?: string | null;
  expires_at?: string | null;
  created_at?: string | null;
};

const BATTLE_OG_SELECT = [
  "id",
  "fighter_a_user_id",
  "fighter_b_user_id",
  "fighter_a_name",
  "fighter_b_name",
  "song_a_name",
  "song_b_name",
  "genre",
  "song_a_cover",
  "song_b_cover",
  "fighter_a_avatar",
  "fighter_b_avatar",
  "ai_tool_a",
  "ai_tool_b",
].join(",");

const BATTLE_OG_BASE_SELECT = [
  "id",
  "fighter_a_user_id",
  "fighter_b_user_id",
  "fighter_a_name",
  "fighter_b_name",
  "song_a_name",
  "song_b_name",
  "genre",
].join(",");

const QUEUE_OG_SELECT = [
  "id",
  "user_id",
  "fighter_name",
  "original_file_name",
  "genre",
  "ai_tool",
  "status",
  "expires_at",
  "created_at",
].join(",");

export function siteOrigin() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.aipoger.com").replace(/\/$/, "");
}

export function fallbackBattleOgData(id: string): BattleOgData {
  return {
    id,
    fighter_a_user_id: null,
    fighter_b_user_id: null,
    fighter_a_name: "AIPOGER",
    fighter_b_name: "DROP RIVAL",
    song_a_name: "AI Drop",
    song_b_name: "Battle Drop",
    genre: "AI Music Drop Battle",
    song_a_cover: null,
    song_b_cover: null,
    fighter_a_avatar: null,
    fighter_b_avatar: null,
    ai_tool_a: null,
    ai_tool_b: null,
  };
}

async function getQueueOgData(supabaseUrl: string, supabaseKey: string, id: string): Promise<BattleOgData | null> {
  try {
    const url = new URL("/rest/v1/battle_queue", supabaseUrl);
    url.searchParams.set("id", `eq.${id}`);
    url.searchParams.set("select", QUEUE_OG_SELECT);
    url.searchParams.set("limit", "1");
    const response = await fetch(url, {
      headers: {
        apikey: supabaseKey,
        authorization: `Bearer ${supabaseKey}`,
      },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const rows = (await response.json()) as Array<{
      id: string;
      user_id: string | null;
      fighter_name: string | null;
      original_file_name: string | null;
      genre: string | null;
      ai_tool: string | null;
      status: string | null;
      expires_at: string | null;
      created_at: string | null;
    }>;
    const queue = rows[0];
    if (!queue?.id) return null;
    const profile = await getProfileMedia(supabaseUrl, supabaseKey, queue.user_id);
    return {
      id: queue.id,
      fighter_a_user_id: queue.user_id,
      fighter_b_user_id: null,
      fighter_a_name: queue.fighter_name || "AIPOGER Fighter",
      fighter_b_name: "等待挑戰者",
      song_a_name: queue.original_file_name || "45s Drop",
      song_b_name: "你的 45s Drop",
      genre: queue.genre || "AI Music Drop Battle",
      song_a_cover: profile.song_cover_url || null,
      song_b_cover: null,
      fighter_a_avatar: profile.avatar_url || null,
      fighter_b_avatar: null,
      ai_tool_a: queue.ai_tool || null,
      ai_tool_b: null,
      queue_status: queue.status || null,
      expires_at: queue.expires_at || null,
      created_at: queue.created_at || null,
    };
  } catch {
    return null;
  }
}

type ProfileMedia = {
  avatar_url?: string | null;
  song_cover_url?: string | null;
};

async function getProfileMedia(supabaseUrl: string, supabaseKey: string, userId: string | null | undefined): Promise<ProfileMedia> {
  const id = userId?.trim();
  if (!id) return {};

  try {
    const fighterUrl = new URL("/rest/v1/fighter_profiles", supabaseUrl);
    fighterUrl.searchParams.set("id", `eq.${id}`);
    fighterUrl.searchParams.set("select", "avatar_url,song_cover_url");
    fighterUrl.searchParams.set("limit", "1");

    const userUrl = new URL("/rest/v1/user_profiles", supabaseUrl);
    userUrl.searchParams.set("id", `eq.${id}`);
    userUrl.searchParams.set("select", "avatar_url");
    userUrl.searchParams.set("limit", "1");

    const headers = {
      apikey: supabaseKey,
      authorization: `Bearer ${supabaseKey}`,
    };
    const [fighterResponse, userResponse] = await Promise.all([
      fetch(fighterUrl, { headers, cache: "no-store" }),
      fetch(userUrl, { headers, cache: "no-store" }),
    ]);

    const fighterRows = fighterResponse.ok ? ((await fighterResponse.json()) as ProfileMedia[]) : [];
    const userRows = userResponse.ok ? ((await userResponse.json()) as ProfileMedia[]) : [];
    const fighter = fighterRows[0] ?? {};
    const user = userRows[0] ?? {};

    return {
      avatar_url: fighter.avatar_url || user.avatar_url || null,
      song_cover_url: fighter.song_cover_url || null,
    };
  } catch {
    return {};
  }
}

export async function getBattleOgData(id: string): Promise<BattleOgData> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey || !id || id.startsWith("mock-")) return fallbackBattleOgData(id);

  try {
    const url = new URL("/rest/v1/battles", supabaseUrl);
    url.searchParams.set("id", `eq.${id}`);
    url.searchParams.set("select", BATTLE_OG_SELECT);
    url.searchParams.set("limit", "1");

    let response = await fetch(url, {
      headers: {
        apikey: supabaseKey,
        authorization: `Bearer ${supabaseKey}`,
      },
      cache: "no-store",
    });
    if (!response.ok) {
      const fallbackUrl = new URL("/rest/v1/battles", supabaseUrl);
      fallbackUrl.searchParams.set("id", `eq.${id}`);
      fallbackUrl.searchParams.set("select", BATTLE_OG_BASE_SELECT);
      fallbackUrl.searchParams.set("limit", "1");
      response = await fetch(fallbackUrl, {
        headers: {
          apikey: supabaseKey,
          authorization: `Bearer ${supabaseKey}`,
        },
        cache: "no-store",
      });
    }
    if (!response.ok) return fallbackBattleOgData(id);

    const rows = (await response.json()) as Partial<BattleOgData>[];
    if (!rows[0]) {
      return (await getQueueOgData(supabaseUrl, supabaseKey, id)) ?? fallbackBattleOgData(id);
    }
    const rawBattle = rows[0];
    const battle: BattleOgData = {
      ...fallbackBattleOgData(id),
      ...rawBattle,
      song_a_cover: rawBattle.song_a_cover ?? null,
      song_b_cover: rawBattle.song_b_cover ?? null,
      fighter_a_avatar: rawBattle.fighter_a_avatar ?? null,
      fighter_b_avatar: rawBattle.fighter_b_avatar ?? null,
      ai_tool_a: rawBattle.ai_tool_a ?? null,
      ai_tool_b: rawBattle.ai_tool_b ?? null,
    };
    const [profileA, profileB] = await Promise.all([
      getProfileMedia(supabaseUrl, supabaseKey, battle.fighter_a_user_id),
      getProfileMedia(supabaseUrl, supabaseKey, battle.fighter_b_user_id),
    ]);

    return {
      ...battle,
      fighter_a_avatar: battle.fighter_a_avatar || profileA.avatar_url || null,
      fighter_b_avatar: battle.fighter_b_avatar || profileB.avatar_url || null,
      song_a_cover: battle.song_a_cover || profileA.song_cover_url || null,
      song_b_cover: battle.song_b_cover || profileB.song_cover_url || null,
    };
  } catch {
    return fallbackBattleOgData(id);
  }
}

export function battleOgTitle(battle: BattleOgData) {
  return `AIPOGER 90S 最強抓波Drop Battle 戰帖｜${battle.fighter_a_name} VS ${battle.fighter_b_name}`;
}

export function battleOgDescription(battle: BattleOgData) {
  return `${battle.fighter_a_name}《${battle.song_a_name}》VS ${battle.fighter_b_name}《${battle.song_b_name}》｜開打前集結，先聽 5 秒 teaser，預測誰的 Drop 最炸。`;
}
