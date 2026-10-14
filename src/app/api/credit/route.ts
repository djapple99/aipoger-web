import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { creatorAuth } from "@/lib/server-creator-auth";
import { readCredit } from "@/lib/server-blind-listening";
const headers = { "Cache-Control": "private, no-store" };
export async function GET(request: Request) {
  try {
    const auth = await creatorAuth(request);
    if (!auth) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401, headers });
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { global: { headers: { Authorization: `Bearer ${auth.token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
    const [result, credits] = await Promise.all([db.rpc("listen_bar_my_upload_quota"), readCredit(auth.admin, auth.user.id)]);
    if (result.error) throw result.error;
    return NextResponse.json({ quota: result.data, credits }, { headers });
  } catch { return NextResponse.json({ error: "CREDIT_UNAVAILABLE" }, { status: 503, headers }); }
}
export async function POST(request: Request) {
  try {
    const auth = await creatorAuth(request);
    if (!auth) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401, headers });
    // Amount, identity and Taiwan date are authoritative server/database values.
    const { data, error } = await auth.admin.rpc("creator_credit_visit", { p_user: auth.user.id });
    if (error) throw error;
    return NextResponse.json(data, { headers });
  } catch { return NextResponse.json({ error: "CREDIT_UNAVAILABLE" }, { status: 503, headers }); }
}
