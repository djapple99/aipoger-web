import { ImageResponse } from "next/og";
import { getBattleOgData } from "@/lib/battle-og";

export const runtime = "edge";
export const alt = "AIPOGER Live Drop Battle";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

function remoteImage(value: string | null) {
  const url = value?.trim() ?? "";
  return /^https:\/\//i.test(url) || /^data:/i.test(url) ? url : null;
}

function initials(name: string | null | undefined) {
  return (name ?? "").trim().slice(0, 2).toUpperCase() || "AI";
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const battle = await getBattleOgData(id);
  const leftCover = remoteImage(battle.song_a_cover);
  const rightCover = remoteImage(battle.song_b_cover);
  const leftAvatar = remoteImage(battle.fighter_a_avatar);
  const rightAvatar = remoteImage(battle.fighter_b_avatar);
  const leftName = battle.fighter_a_name || "AIPOGER";
  const rightName = battle.fighter_b_name || "DROP RIVAL";
  const leftSong = battle.song_a_name || "AI Drop";
  const rightSong = battle.song_b_name || "Battle Drop";

  const sideCard = ({
    align,
    avatar,
    cover,
    color,
    name,
    side,
    song,
  }: {
    align: "left" | "right";
    avatar: string | null;
    cover: string | null;
    color: string;
    name: string;
    side: string;
    song: string;
  }) => (
    <div
      style={{
        position: "relative",
        display: "flex",
        height: 430,
        width: 392,
        overflow: "hidden",
        border: `3px solid ${color}`,
        borderRadius: 36,
        background: "#040404",
        boxShadow: `0 0 54px ${color}55`,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: align === "left" ? "linear-gradient(135deg,#311202,#050505)" : "linear-gradient(135deg,#061e32,#050505)",
        }}
      />
      {cover ? (
        <img src={cover} alt="" style={{ position: "absolute", inset: 0, height: "100%", width: "100%", objectFit: "cover", opacity: 0.42 }} />
      ) : null}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 30%,rgba(0,0,0,0.05),rgba(0,0,0,0.72) 62%,rgba(0,0,0,0.94)),linear-gradient(180deg,transparent,rgba(0,0,0,0.78))",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 26,
          ...(align === "left" ? { left: 26 } : { right: 26 }),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 104,
          width: 104,
          overflow: "hidden",
          border: `5px solid ${color}`,
          borderRadius: 999,
          background: "#000",
          color: "#fff",
          fontSize: 34,
          fontWeight: 900,
        }}
      >
        {avatar ? <img src={avatar} alt="" style={{ height: "100%", width: "100%", objectFit: "cover" }} /> : initials(name)}
      </div>
      <div style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "flex-end", width: "100%", padding: "0 30px 34px" }}>
        <div style={{ color, fontSize: 24, fontWeight: 900, letterSpacing: 5 }}>{side}</div>
        <div style={{ marginTop: 10, color: "#fff", fontSize: 48, fontWeight: 900, letterSpacing: 0, lineHeight: 1.02 }}>{name}</div>
        <div style={{ marginTop: 12, color: "#e9e9e9", fontSize: 27, fontWeight: 800, letterSpacing: 0, lineHeight: 1.18 }}>{song}</div>
      </div>
    </div>
  );

  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          display: "flex",
          height: "100%",
          width: "100%",
          overflow: "hidden",
          background: "linear-gradient(135deg,#0b0300 0%,#020305 54%,#051923 100%)",
          color: "#fff",
          fontFamily: "Arial, Helvetica, sans-serif",
          padding: 46,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 18% 18%,rgba(255,106,0,0.38),transparent 32%),radial-gradient(circle at 86% 20%,rgba(0,210,255,0.32),transparent 34%)",
          }}
        />
        <div style={{ position: "relative", display: "flex", flexDirection: "column", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ color: "#ffb26f", fontSize: 28, fontWeight: 900, letterSpacing: 7 }}>AIPOGER LIVE BATTLE</div>
              <div style={{ marginTop: 8, color: "#d9d9d9", fontSize: 24, fontWeight: 800 }}>{battle.genre || "AI Music Drop Battle"}</div>
            </div>
            <div
              style={{
                display: "flex",
                border: "2px solid rgba(255,255,255,0.24)",
                borderRadius: 999,
                padding: "12px 22px",
                color: "#fff",
                fontSize: 24,
                fontWeight: 900,
              }}
            >
              VOTE NOW
            </div>
          </div>
          <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "space-between", marginTop: 30 }}>
            {sideCard({
              align: "left",
              avatar: leftAvatar,
              cover: leftCover,
              color: "#ff7a1a",
              name: leftName,
              side: "A SIDE",
              song: leftSong,
            })}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: 214 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: 140,
                  width: 140,
                  border: "3px solid rgba(255,255,255,0.24)",
                  borderRadius: 999,
                  background: "#000",
                  color: "#fff",
                  fontSize: 52,
                  fontWeight: 900,
                  boxShadow: "0 0 58px rgba(255,255,255,0.22)",
                }}
              >
                VS
              </div>
              <div style={{ marginTop: 24, color: "#f6c49b", fontSize: 24, fontWeight: 900, lineHeight: 1.2, textAlign: "center" }}>
                Listen to the Drop. Pick the winner.
              </div>
            </div>
            {sideCard({
              align: "right",
              avatar: rightAvatar,
              cover: rightCover,
              color: "#4bdfff",
              name: rightName,
              side: "B SIDE",
              song: rightSong,
            })}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
