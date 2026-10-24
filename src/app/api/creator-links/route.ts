import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { creatorAuth } from "@/lib/server-creator-auth";
import {
  resolveLinkPreview,
  verifyLinkPreview,
} from "@/lib/server-external-music";
import { isCurrentMusicGenre } from "@/lib/music-genres";
import {
  cleanListenBarDisplayText,
  LISTEN_BAR_SHORT_FIELD_DISPLAY_UNITS,
} from "@/lib/listen-bar-field-limits";
import { readAllHomePages } from "@/lib/home-discovery";
import { parseExternalMusic } from "@/lib/external-music";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const auth = await creatorAuth(request);
    if (!auth)
      return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
    const body = await request.json().catch(() => null);
    if (!body)
      return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
    if (body.action === "preview")
      return NextResponse.json(
        { preview: await resolveLinkPreview(body.url, auth.user.id) },
        { headers: { "Cache-Control": "private, no-store" } },
      );
    if (body.action !== "submit")
      return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
    if (body.workKind !== undefined && body.workKind !== "single" && body.workKind !== "album")
      return NextResponse.json({ error: "INVALID_WORK_KIND" }, { status: 400 });
    if (body.requestId !== undefined && (typeof body.requestId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.requestId))) return NextResponse.json({error:"INVALID_REQUEST"},{status:400});
    const requestId: string = body.requestId ?? randomUUID();
    if (body.requestId) {
      const prior = await auth.admin.from("listen_bar_tracks").select("id").eq("id",requestId).eq("created_by",auth.user.id).maybeSingle();
      if (prior.error) throw prior.error;
      if (prior.data) return NextResponse.json({trackId:prior.data.id,replayed:true},{headers:{"Cache-Control":"private, no-store"}});
    }
    const p = verifyLinkPreview(body.previewToken, auth.user.id);
    if (!p)
      return NextResponse.json({ error: "PREVIEW_EXPIRED" }, { status: 400 });
    if (body.confirmedRights !== true)
      return NextResponse.json(
        { error: "CONFIRM_RIGHTS" },
        { status: 400 },
      );
    if (!isCurrentMusicGenre(body.genre))
      return NextResponse.json({ error: "GENRE_REQUIRED" }, { status: 400 });
    const title =
      typeof body.title === "string" ? body.title.trim().slice(0, 160) : "";
    const artist = cleanListenBarDisplayText(
      body.artist,
      LISTEN_BAR_SHORT_FIELD_DISPLAY_UNITS,
    );
    if (!title || !artist)
      return NextResponse.json(
        { error: "TITLE_ARTIST_REQUIRED" },
        { status: 400 },
      );
    // Existing file submissions can already have an MV link. Reuse that original
    // work rather than publishing the same creator's video under another ID.
    if (p.media.provider === "youtube") {
      const existing = await readAllHomePages<{ youtube_url: string | null }>(
        async (from, to) => {
          const r = await auth.admin
            .from("listen_bar_tracks")
            .select("youtube_url")
            .eq("created_by", auth.user.id)
            .order("id")
            .range(from, to);
          return { data: r.data, error: r.error };
        },
      );
      if (
        existing.some(
          (row) =>
            parseExternalMusic(row.youtube_url)?.mediaId === p.media.mediaId,
        )
      )
        return NextResponse.json(
          { error: "LINK_ALREADY_SUBMITTED" },
          { status: 409 },
        );
    }
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${auth.token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    const result = await db
      .from("listen_bar_tracks")
      .insert({
        id: requestId,
        work_kind: body.workKind ?? "single",
        credit_submission_confirmed: body.confirmedCredit === true,
        title,
        artist,
        ai_tool:
          cleanListenBarDisplayText(
            body.aiTool,
            LISTEN_BAR_SHORT_FIELD_DISPLAY_UNITS,
          ) || "AI Music",
        genre: body.genre,
        description: typeof body.description === "string" ? body.description.trim().slice(0, 2000) || null : null,
        audio_path: null,
        cover_path: p.coverUrl || null,
        external_provider: p.media.provider,
        external_media_id: p.media.mediaId,
        external_url: p.media.url,
        is_music_video:
          body.isMusicVideo === true && p.media.provider === "youtube",
        youtube_url:
          body.isMusicVideo === true && p.media.provider === "youtube"
            ? p.media.url
            : null,
        source: "community",
        bar_phase: "public",
        is_active: true,
        is_featured_official: false,
        review_status: "approved",
        created_by: auth.user.id,
        ai_music_challenge_status: "showcase",
      })
      .select("id")
      .single();
    if (result.error) {
      const retry = await auth.admin.from("listen_bar_tracks").select("id").eq("id",requestId).eq("created_by",auth.user.id).maybeSingle();
      if (retry.data) return NextResponse.json({trackId:retry.data.id,replayed:true},{headers:{"Cache-Control":"private, no-store"}});
      const msg = result.error.message;
      const status =
        result.error.code === "23505"
          ? 409
          : /CREATOR_WEEKLY_UPLOAD_LIMIT|CREDIT_/.test(msg)
            ? 429
            : 500;
      return NextResponse.json(
        {
          error:
            status === 409
              ? "LINK_ALREADY_SUBMITTED"
              : status === 429
                ? /CREATOR_WEEKLY_UPLOAD_LIMIT/.test(msg) ? "UPLOAD_LIMIT" : msg.split(":")[0]
                : msg,
        },
        { status },
      );
    }
    return NextResponse.json(
      { trackId: result.data.id },
      { status: 201, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "LINK_FAILED" },
      { status: 400 },
    );
  }
}
