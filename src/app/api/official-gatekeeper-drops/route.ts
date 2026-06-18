import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { OFFICIAL_GATEKEEPER_DROP_DEFAULTS, normalizeOfficialGatekeeperDrop } from "@/lib/official-gatekeeper-drops";

function adminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error("Missing Supabase server configuration.");
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function isMissingTable(error: { message?: string; details?: string; hint?: string; code?: string } | null) {
  const msg = `${error?.message ?? ""} ${error?.details ?? ""} ${error?.hint ?? ""} ${error?.code ?? ""}`;
  return /official_gatekeeper_drops|relation.*does not exist|schema cache|PGRST204|42P01/i.test(msg);
}

export async function GET() {
  let admin: ReturnType<typeof adminClient>;
  try {
    admin = adminClient();
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Server configuration missing" }, { status: 500 });
  }

  const { data, error } = await admin
    .from("official_gatekeeper_drops")
    .select("*")
    .eq("active", true)
    .not("audio_path", "is", null)
    .order("sort_order", { ascending: true });

  if (error) {
    if (isMissingTable(error)) return NextResponse.json({ drops: [] });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const drops = await Promise.all(
    (data ?? []).map(async (row) => {
      const drop = normalizeOfficialGatekeeperDrop(row as Record<string, unknown>);
      if (drop.audioPath) {
        const { data: signed } = await admin.storage.from("battle-audio").createSignedUrl(drop.audioPath, 60 * 60);
        drop.audioUrl = signed?.signedUrl ?? null;
      }
      return drop;
    }),
  );

  return NextResponse.json({ drops, defaults: OFFICIAL_GATEKEEPER_DROP_DEFAULTS.length });
}
