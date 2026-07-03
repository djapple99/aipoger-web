import { NextRequest, NextResponse } from "next/server";
import { MUSIC_GENRE_OPTIONS } from "@/lib/music-genres";

function genreValueFromSlug(slug: string) {
  const clean = slug.trim().toLowerCase();
  if (!clean || clean === "all" || clean === "public") return "all";
  const index = Number(clean);
  if (Number.isInteger(index) && index >= 1 && index <= MUSIC_GENRE_OPTIONS.length) {
    return MUSIC_GENRE_OPTIONS[index - 1]?.value ?? "all";
  }
  return "all";
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ genre: string }> },
) {
  const { genre } = await context.params;
  const lang = request.nextUrl.searchParams.get("lang") ?? "zh";
  const target = new URL("/listen-bar", request.url);
  target.searchParams.set("lang", /^[a-z]{2}$/i.test(lang) ? lang : "zh");
  target.searchParams.set("genre", genreValueFromSlug(genre));
  return NextResponse.redirect(target, 307);
}
