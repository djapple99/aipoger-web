import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function isRenderWakePage(text: string) {
  return /waiting to respond|service waking up|allocating compute resources|preparing instance/i.test(text);
}

export async function GET() {
  const configuredUrl = process.env.NEXT_PUBLIC_MUSIC_ANALYSIS_URL?.trim();
  if (!configuredUrl) {
    return NextResponse.json({ ready: false, error: "Music analysis URL is not configured" }, { status: 503 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(configuredUrl, {
      cache: "no-store",
      redirect: "follow",
      signal: controller.signal,
    });
    const text = await response.text().catch(() => "");
    const ready = response.ok && !isRenderWakePage(text);
    return NextResponse.json({ ready, status: response.status });
  } catch (error) {
    return NextResponse.json(
      {
        ready: false,
        error: error instanceof Error ? error.message : "Music analysis service is not ready",
      },
      { status: 503 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
