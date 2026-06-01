import { ImageResponse } from "next/og";
import { AIPOGER_BRAND_LOGO } from "@/lib/brand";

export const runtime = "edge";

function read(searchParams: URLSearchParams, key: string, fallback: string) {
  return searchParams.get(key)?.trim() || fallback;
}

function remoteImage(value: string) {
  return /^https:\/\//i.test(value) || /^data:image\//i.test(value) ? value : "";
}

function initials(name: string) {
  return name.trim().slice(0, 2).toUpperCase() || "AI";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const leftName = read(url.searchParams, "l", "AIPOGER");
  const rightName = read(url.searchParams, "r", "DROP RIVAL");
  const leftSong = read(url.searchParams, "ls", "AI Drop");
  const rightSong = read(url.searchParams, "rs", "Battle Drop");
  const genre = read(url.searchParams, "g", "AI Music Drop Battle");
  const battleType = read(url.searchParams, "bt", "90s Drop Battle");
  const leftTool = read(url.searchParams, "ta", read(url.searchParams, "tool", "AI Music"));
  const rightTool = read(url.searchParams, "tb", "AI Music");
  const leftCover = remoteImage(read(url.searchParams, "lc", ""));
  const rightCover = remoteImage(read(url.searchParams, "rc", ""));
  const leftAvatar = remoteImage(read(url.searchParams, "la", ""));
  const rightAvatar = remoteImage(read(url.searchParams, "ra", ""));
  const logoUrl = new URL(AIPOGER_BRAND_LOGO, url.origin).toString();
  const renderSide = ({
    align,
    avatar,
    color,
    cover,
    name,
    side,
    song,
  }: {
    align: "left" | "right";
    avatar: string;
    color: string;
    cover: string;
    name: string;
    side: string;
    song: string;
  }) => (
    <div
      style={{
        position: "relative",
        display: "flex",
        height: 410,
        width: 405,
        overflow: "hidden",
        border: `3px solid ${color}`,
        borderRadius: 34,
        background: "#040404",
        boxShadow: `0 0 54px ${color}50`,
      }}
    >
      {cover ? (
        <img src={cover} alt="" style={{ position: "absolute", inset: 0, height: "100%", width: "100%", objectFit: "cover", opacity: 0.72 }} />
      ) : (
        <img src={logoUrl} alt="" style={{ position: "absolute", inset: "70px 72px", height: 260, width: 260, objectFit: "contain", opacity: 0.55 }} />
      )}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 28%,rgba(0,0,0,0.1),rgba(0,0,0,0.55) 58%,rgba(0,0,0,0.9)),linear-gradient(180deg,transparent,rgba(0,0,0,0.82))",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 22,
          ...(align === "left" ? { left: 22 } : { right: 22 }),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 96,
          width: 96,
          overflow: "hidden",
          border: `5px solid ${color}`,
          borderRadius: 999,
          background: "#000",
          color: "#fff",
          fontSize: 32,
          fontWeight: 900,
        }}
      >
        {avatar ? <img src={avatar} alt="" style={{ height: "100%", width: "100%", objectFit: "cover" }} /> : initials(name)}
      </div>
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: align === "left" ? "flex-start" : "flex-end",
          justifyContent: "flex-end",
          width: "100%",
          padding: "0 28px 32px",
          textAlign: align === "left" ? "left" : "right",
        }}
      >
        <div style={{ color, fontSize: 23, fontWeight: 900, letterSpacing: 5 }}>{side}</div>
        <div style={{ marginTop: 9, color: "#fff", fontSize: 48, fontWeight: 900, lineHeight: 1.02 }}>{name}</div>
        <div style={{ marginTop: 10, color: "#e8e8e8", fontSize: 28, fontWeight: 800, lineHeight: 1.18 }}>{song}</div>
        <div style={{ marginTop: 12, border: `2px solid ${color}90`, borderRadius: 999, padding: "8px 14px", color: "#fff", fontSize: 20, fontWeight: 900 }}>
          {side === "A SIDE" ? leftTool : rightTool}
        </div>
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
          background: "linear-gradient(135deg,#0b0300 0%,#030303 48%,#041822 100%)",
          color: "#fff",
          fontFamily: "Arial, Helvetica, sans-serif",
          padding: 48,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 20% 18%,rgba(255,106,0,0.42),transparent 34%),radial-gradient(circle at 86% 20%,rgba(0,210,255,0.32),transparent 34%)",
          }}
        />
        <div style={{ position: "relative", display: "flex", flexDirection: "column", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <img src={logoUrl} alt="" style={{ height: 72, width: 72, objectFit: "contain" }} />
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ color: "#ffb26f", fontSize: 27, fontWeight: 900, letterSpacing: 7 }}>AIPOGER LIVE BATTLE</div>
                <div style={{ marginTop: 8, color: "#d9d9d9", fontSize: 24, fontWeight: 800 }}>{`${battleType} · ${genre}`}</div>
              </div>
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
          <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "space-between", gap: 28 }}>
            {renderSide({
              align: "left",
              avatar: leftAvatar,
              color: "#ff7a1a",
              cover: leftCover,
              name: leftName,
              side: "A SIDE",
              song: leftSong,
            })}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: 148,
                width: 148,
                border: "3px solid rgba(255,255,255,0.24)",
                borderRadius: 999,
                background: "#000",
                color: "#fff",
                fontSize: 56,
                fontWeight: 900,
                boxShadow: "0 0 62px rgba(255,255,255,0.22)",
              }}
            >
              VS
            </div>
            {renderSide({
              align: "right",
              avatar: rightAvatar,
              color: "#4bdfff",
              cover: rightCover,
              name: rightName,
              side: "B SIDE",
              song: rightSong,
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "center", color: "#f6c49b", fontSize: 30, fontWeight: 900 }}>
            進來聽 Drop，投下你的一票
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
