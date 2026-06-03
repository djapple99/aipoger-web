import { ImageResponse } from "next/og";
import { getBattleOgData } from "@/lib/battle-og";

export const runtime = "edge";
export const alt = "AIPOGER Drop Battle Card";
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

  const renderSide = ({
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
        display: "flex",
        flexDirection: "column",
        height: 420,
        width: 390,
        border: `3px solid ${color}`,
        borderRadius: 34,
        overflow: "hidden",
        background: "#050505",
        boxShadow: `0 0 48px ${color}55`,
      }}
    >
      <div
        style={{
          position: "relative",
          display: "flex",
          height: 250,
          width: "100%",
          background: align === "left" ? "linear-gradient(135deg,#2a1102,#090909)" : "linear-gradient(135deg,#061c2d,#090909)",
        }}
      >
        {cover ? (
          <img src={cover} alt="" style={{ height: "100%", width: "100%", objectFit: "cover", opacity: 0.78 }} />
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              width: "100%",
              color,
              fontSize: 72,
              fontWeight: 900,
              letterSpacing: 0,
            }}
          >
            {initials(name)}
          </div>
        )}
        <div
          style={{
            position: "absolute",
            top: 20,
            ...(align === "left" ? { left: 20 } : { right: 20 }),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: 92,
            width: 92,
            border: `4px solid ${color}`,
            borderRadius: 999,
            overflow: "hidden",
            background: "#000",
            color: "#fff",
            fontSize: 30,
            fontWeight: 900,
          }}
        >
          {avatar ? <img src={avatar} alt="" style={{ height: "100%", width: "100%", objectFit: "cover" }} /> : initials(name)}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", padding: "26px 28px 30px", background: "#030303" }}>
        <div style={{ color, fontSize: 24, fontWeight: 900, letterSpacing: 4 }}>{side}</div>
        <div style={{ marginTop: 10, color: "#fff", fontSize: 44, fontWeight: 900, letterSpacing: 0, lineHeight: 1.04 }}>{name}</div>
        <div style={{ marginTop: 10, color: "#d8d8d8", fontSize: 26, fontWeight: 800, letterSpacing: 0, lineHeight: 1.18 }}>{song}</div>
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
          background: "linear-gradient(135deg,#090300 0%,#03050b 54%,#061b25 100%)",
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
              "radial-gradient(circle at 20% 20%,rgba(255,120,20,0.34),transparent 30%),radial-gradient(circle at 83% 18%,rgba(0,210,255,0.30),transparent 32%)",
          }}
        />
        <div style={{ position: "relative", display: "flex", flexDirection: "column", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ color: "#ffb26f", fontSize: 26, fontWeight: 900, letterSpacing: 6 }}>AIPOGER BATTLE CARD</div>
              <div style={{ marginTop: 8, color: "#b8b8b8", fontSize: 24, fontWeight: 800 }}>{battle.genre || "AI Music Drop Battle"}</div>
            </div>
            <div
              style={{
                display: "flex",
                border: "2px solid rgba(255,255,255,0.22)",
                borderRadius: 999,
                padding: "12px 22px",
                color: "#fff",
                fontSize: 24,
                fontWeight: 900,
              }}
            >
              90S WAITING ROOM
            </div>
          </div>
          <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "space-between", marginTop: 32 }}>
            {renderSide({
              align: "left",
              avatar: leftAvatar,
              cover: leftCover,
              color: "#ff7a1a",
              name: leftName,
              side: "A SIDE",
              song: leftSong,
            })}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: 210 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: 136,
                  width: 136,
                  border: "3px solid rgba(255,255,255,0.22)",
                  borderRadius: 999,
                  background: "#000",
                  color: "#fff",
                  fontSize: 50,
                  fontWeight: 900,
                  boxShadow: "0 0 54px rgba(255,255,255,0.20)",
                }}
              >
                VS
              </div>
              <div style={{ marginTop: 24, color: "#f4c59c", fontSize: 23, fontWeight: 900, textAlign: "center" }}>
                Hear 5s preview, then vote by instinct.
              </div>
            </div>
            {renderSide({
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
