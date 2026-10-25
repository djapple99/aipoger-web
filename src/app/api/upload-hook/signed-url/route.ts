import { NextResponse } from "next/server";
export async function POST() {
  return NextResponse.json({ error: "BATTLE_LINK_REQUIRED", message: "請使用新版 Drop Battle／Q Crash 入口，以連結或 MP3（最高 320 kbps、30MB）投稿。", href: "/battle/hook-cut" }, { status: 410 });
}
