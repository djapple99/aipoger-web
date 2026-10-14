import { NextResponse } from "next/server";
import { creatorAuth } from "@/lib/server-creator-auth";
import { readAllHomePages } from "@/lib/home-discovery";
import { isAdminEmail } from "@/lib/admin-emails";
import { externalMusicFromRow, parseExternalMusic } from "@/lib/external-music";
import { isInDiscoveryMusicPool, musicPoolSupportCounts } from "@/lib/music-pool";
import { AIPOGER_BRAND_LOGO } from "@/lib/brand";
import { readCredit } from "@/lib/server-blind-listening";
export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const auth = await creatorAuth(request);
    if (!auth)
      return NextResponse.json(
        { error: "AUTH_REQUIRED" },
        { status: 401, headers },
      );
    const { admin, user } = auth;
    type Row = {
      id: string;
      title: string;
      artist: string;
      ai_tool: string;
      genre: string;
      created_at: string;
      created_by: string;
      cover_path: string | null;
      audio_path: string | null;
      external_url: string | null;
      is_music_video: boolean;
      youtube_url: string | null;
      lyrics: string | null;
      is_active: boolean;
      hidden_at: string | null;
      removed_at: string | null;
      review_status: string | null;
      ai_music_showtime_public_removed_at: string | null;
    };
    const tracks = await readAllHomePages<Row>(async (from, to) => {
      const r = await admin
        .from("listen_bar_tracks")
        .select(
          "id,title,artist,ai_tool,genre,created_at,created_by,cover_path,audio_path,external_url,is_music_video,youtube_url,lyrics,is_active,hidden_at,removed_at,review_status,ai_music_showtime_public_removed_at",
        )
        .eq("created_by", user.id)
        .eq("source", "community")
        .order("created_at", { ascending: false })
        .order("id")
        .range(from, to);
      return { data: r.data, error: r.error };
    });
    type Comment = {
      id: string;
      track_id: string;
      user_id: string;
      display_name: string;
      body: string;
      created_at: string;
    };
    const comments: Comment[] = [];
    const hearts: {
      track_id: string;
      user_id: string;
      reaction: string;
      created_at: string;
    }[] = [];
    for (let off = 0; off < tracks.length; off += 100) {
      const ids = tracks.slice(off, off + 100).map((t) => t.id);
      const [c, h] = await Promise.all([
        readAllHomePages<Comment>(async (from, to) => {
          const r = await admin
            .from("listen_bar_track_comments")
            .select("id,track_id,user_id,display_name,body,created_at")
            .in("track_id", ids)
            .eq("moderation_status", "visible")
            .neq("user_id", user.id)
            .order("id")
            .range(from, to);
          return { data: r.data, error: r.error };
        }),
        readAllHomePages<{
          track_id: string;
          user_id: string;
          reaction: string;
          created_at: string;
        }>(async (from, to) => {
          const r = await admin
            .from("listen_bar_track_reactions")
            .select("track_id,user_id,reaction,created_at")
            .in("track_id", ids)
            .eq("reaction", "heart")
            .order("track_id")
            .order("user_id")
            .order("vote_date")
            .range(from, to);
          return { data: r.data, error: r.error };
        }),
      ]);
      comments.push(...c);
      hearts.push(...h);
    }
    const counts = musicPoolSupportCounts(tracks, hearts);
    const commentCounts = new Map<string, number>();
    for (const c of comments)
      commentCounts.set(c.track_id, (commentCounts.get(c.track_id) ?? 0) + 1);
    const url = (bucket: string, p: string | null) =>
      !p
        ? ""
        : /^https:\/\//.test(p)
          ? p
          : admin.storage.from(bucket).getPublicUrl(p).data.publicUrl;
    const works = tracks.map((t) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      aiTool: t.ai_tool || "AI Music",
      genre: t.genre,
      createdAt: t.created_at,
      coverUrl: url("listen-bar-covers", t.cover_path) || AIPOGER_BRAND_LOGO,
      audioUrl: url("listen-bar-audio", t.audio_path),
      external: externalMusicFromRow(t),
      isMusicVideo:
        t.is_music_video ||
        parseExternalMusic(t.youtube_url)?.provider === "youtube",
      active: t.is_active,
      lyrics: t.lyrics ?? "",
      supporters: counts.get(t.id) ?? 0,
      comments: commentCounts.get(t.id) ?? 0,
      status:
        !t.is_active ||
        t.hidden_at ||
        t.removed_at ||
        t.ai_music_showtime_public_removed_at ||
        (t.review_status != null && t.review_status !== "approved")
          ? "hidden"
          : isInDiscoveryMusicPool(t.created_at, t.id)
            ? "public"
            : "ended",
    }));
    return NextResponse.json(
      {
        isOwner: isAdminEmail(user.email),
        works,
        commenters: new Set(comments.map((c) => c.user_id).filter(Boolean))
          .size,
        commentCount: comments.length,
        comments: comments
          .sort(
            (a, b) =>
              b.created_at.localeCompare(a.created_at) ||
              b.id.localeCompare(a.id),
          )
          .map((c) => ({
            id: c.id,
            trackId: c.track_id,
            title: tracks.find((t) => t.id === c.track_id)?.title ?? "",
            name: c.display_name,
            text: c.body,
            createdAt: c.created_at,
          })),
        credits: await readCredit(admin, user.id),
        linkSubmissionReady: true,
      },
      { headers },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "LOAD_FAILED" },
      { status: 500, headers },
    );
  }
}
