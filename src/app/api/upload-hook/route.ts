import { NextResponse } from "next/server";
export async function POST() {
  return NextResponse.json({ error: "BATTLE_LINK_REQUIRED", message: "Drop Battle 與 Q Crash 已改為作品連結投稿。", href: "/battle/hook-cut" }, { status: 410 });
}
