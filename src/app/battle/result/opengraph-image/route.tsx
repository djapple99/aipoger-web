import { ImageResponse } from "next/og";
import { AIPOGER_BRAND_LOGO } from "@/lib/brand";
import {
  loadBattleResultShareData,
  resultShareDataFromUrl,
} from "@/lib/battle-result-meta";

export const runtime = "edge";

const size = {
  width: 1080,
  height: 1920,
};

const skillLabels = ["押韻", "爆點", "旋律", "情緒", "結構"];
const skillValues = [96, 82, 90, 76, 88];

function fitText(value: string, fallback: string, max = 44) {
  const clean = value.trim() || fallback;
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function imageUrl(value: string, origin: string) {
  const clean = value.trim();
  if (/^https:\/\//i.test(clean) || /^data:image\//i.test(clean)) return clean;
  if (clean.startsWith("/")) return new URL(clean, origin).toString();
  return new URL(AIPOGER_BRAND_LOGO, origin).toString();
}

function points(values: number[], radius: number, cx = 250, cy = 250) {
  return values
    .map((value, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI * 2) / values.length;
      const adjustedRadius = radius * (value / 100);
      return `${cx + Math.cos(angle) * adjustedRadius},${cy + Math.sin(angle) * adjustedRadius}`;
    })
    .join(" ");
}

function ringPoints(radius: number, cx = 250, cy = 250) {
  return points([100, 100, 100, 100, 100], radius, cx, cy);
}

function labelPoint(index: number, radius: number, cx = 250, cy = 250) {
  const angle = -Math.PI / 2 + (index * Math.PI * 2) / skillLabels.length;
  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius,
  };
}

function SideCard({
  avatar,
  color,
  cover,
  label,
  name,
  song,
}: {
  avatar: string;
  color: string;
  cover: string;
  label: string;
  name: string;
  song: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        width: 410,
        height: 122,
        border: `2px solid ${color}88`,
        borderRadius: 28,
        background: `${color}18`,
        padding: "14px 16px",
      }}
    >
      <img
        src={avatar}
        alt=""
        style={{
          height: 74,
          width: 74,
          border: `4px solid ${color}`,
          borderRadius: 999,
          objectFit: "cover",
          background: "#000",
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0, width: 190 }}>
        <div style={{ color, fontSize: 22, fontWeight: 900 }}>{label}</div>
        <div style={{ color: "#fff", fontSize: 30, fontWeight: 900, lineHeight: 1.05 }}>{name}</div>
        <div style={{ color: "#c9c9c9", fontSize: 18, fontWeight: 800, lineHeight: 1.2 }}>{song}</div>
      </div>
      <img
        src={cover}
        alt=""
        style={{
          height: 74,
          width: 74,
          borderRadius: 16,
          objectFit: "cover",
          marginLeft: "auto",
        }}
      />
    </div>
  );
}

function Radar() {
  const labelPositions = [
    { left: 424, top: 16 },
    { left: 660, top: 190 },
    { left: 570, top: 396 },
    { left: 278, top: 396 },
    { left: 190, top: 190 },
  ];

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: 490,
        width: 940,
        border: "2px solid rgba(255,255,255,0.12)",
        borderRadius: 34,
        background: "rgba(0,0,0,0.54)",
        boxShadow: "inset 0 0 54px rgba(255,255,255,0.04)",
      }}
    >
      {skillLabels.map((label, index) => (
        <div
          key={label}
          style={{
            position: "absolute",
            left: labelPositions[index].left,
            top: labelPositions[index].top,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 92,
            color: "#fff",
            fontSize: 30,
            fontWeight: 900,
            textShadow: "0 3px 10px rgba(0,0,0,0.92)",
          }}
        >
          {label}
        </div>
      ))}
      <svg width="520" height="470" viewBox="0 0 500 500">
        <defs>
          <radialGradient id="radarFill" cx="50%" cy="50%" r="54%">
            <stop offset="0%" stopColor="#ff8a24" stopOpacity="0.72" />
            <stop offset="62%" stopColor="#ff5a16" stopOpacity="0.26" />
            <stop offset="100%" stopColor="#35dcff" stopOpacity="0.14" />
          </radialGradient>
          <linearGradient id="radarLine" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#ffb15c" />
            <stop offset="58%" stopColor="#ff5a16" />
            <stop offset="100%" stopColor="#9df4ff" />
          </linearGradient>
        </defs>
        {[72, 128, 184].map((radius) => (
          <polygon key={radius} points={ringPoints(radius)} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="2" />
        ))}
        {skillLabels.map((_, index) => {
          const end = labelPoint(index, 184);
          return <line key={index} x1="250" y1="250" x2={end.x} y2={end.y} stroke="rgba(255,255,255,0.13)" strokeWidth="2" />;
        })}
        <polygon points={points(skillValues, 184)} fill="url(#radarFill)" stroke="url(#radarLine)" strokeWidth="8" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const data = await loadBattleResultShareData(resultShareDataFromUrl(url.searchParams));
  const logoUrl = imageUrl(AIPOGER_BRAND_LOGO, url.origin);
  const coverUrl = imageUrl(data.coverUrl, url.origin);
  const avatarUrl = imageUrl(data.avatarUrl, url.origin);
  const opponentAvatarUrl = imageUrl(data.opponentAvatarUrl, url.origin);
  const opponentCoverUrl = imageUrl(data.opponentCoverUrl, url.origin);
  const winnerName = fitText(data.winnerName, "AIPOGER Fighter", 20);
  const winnerSong = fitText(data.winnerSong, "AI Drop", 26);
  const opponentName = fitText(data.opponentName, "Drop Rival", 18);
  const opponentSong = fitText(data.opponentSong, "Battle Drop", 20);
  const rank = fitText(data.rank, "Lv.1 訊號啟動者", 20);
  const tool = fitText(data.tool, "AI Music", 14);
  const battleCode = fitText(data.battleCode || data.battleId.slice(0, 8).toUpperCase(), "AIPO-DROP", 14);
  const aiReview = fitText(data.aiReview, "尚無 AI 評價", 28);
  const audienceReview = fitText(data.audienceReview, "尚無觀眾評價", 28);
  const votes = data.votesTotal > 0 ? `${data.votesTotal}票` : "0票";

  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          display: "flex",
          height: "100%",
          width: "100%",
          overflow: "hidden",
          background: "linear-gradient(180deg,#070201 0%,#120704 48%,#030303 100%)",
          color: "#fff",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background:
              "radial-gradient(circle at 45% 16%,rgba(255,106,0,0.38),transparent 30%),radial-gradient(circle at 85% 56%,rgba(42,225,255,0.22),transparent 32%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            opacity: 0.15,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)",
            backgroundSize: "46px 46px",
          }}
        />
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            height: "100%",
            width: "100%",
            padding: "76px 70px 62px",
          }}
        >
          <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", width: "100%" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ color: "#ffe0b4", fontSize: 72, fontWeight: 900, lineHeight: 0.95 }}>最強抓波</div>
              <div style={{ color: "#fff", fontSize: 78, fontWeight: 900, lineHeight: 0.92 }}>DROP BATTLE</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
              <img
                src={logoUrl}
                alt=""
                style={{
                  height: 132,
                  width: 132,
                  border: "2px solid rgba(255,178,83,0.58)",
                  borderRadius: 999,
                  objectFit: "contain",
                  background: "#000",
                }}
              />
              <div style={{ color: "#ffd2a1", fontSize: 25, fontWeight: 900 }}>{`決鬥編號 ${battleCode}`}</div>
            </div>
          </header>

          <section style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", height: 560, marginTop: 20 }}>
            <div
              style={{
                position: "absolute",
                display: "flex",
                height: 560,
                width: 560,
                borderRadius: 999,
                background: "#050505",
                boxShadow: "inset 0 0 0 3px rgba(255,255,255,0.13), inset 0 0 110px rgba(255,255,255,0.08), 0 0 110px rgba(255,106,0,0.28)",
              }}
            />
            <div
              style={{
                position: "absolute",
                display: "flex",
                height: 398,
                width: 398,
                overflow: "hidden",
                border: "6px solid rgba(255,227,184,0.95)",
                borderRadius: 999,
                background: "#000",
              }}
            >
              <img src={coverUrl} alt="" style={{ height: "100%", width: "100%", objectFit: "cover" }} />
            </div>
            <div style={{ position: "absolute", display: "flex", height: 50, width: 50, borderRadius: 999, background: "#000", border: "3px solid rgba(255,255,255,0.5)" }} />
            <div
              style={{
                position: "absolute",
                bottom: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 690,
                height: 106,
                border: "2px solid rgba(255,202,109,0.58)",
                borderRadius: 999,
                background: "linear-gradient(180deg,rgba(60,31,4,0.9),rgba(0,0,0,0.86))",
                color: "#ffdb81",
                fontSize: 62,
                fontWeight: 900,
                letterSpacing: 5,
                boxShadow: "0 0 58px rgba(255,128,26,0.36)",
              }}
            >
              WINNER
            </div>
          </section>

          <section style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: -8 }}>
            <div style={{ color: "#fff", fontSize: 64, fontWeight: 900, lineHeight: 1.02 }}>{winnerName}</div>
            <div style={{ marginTop: 8, height: 2, width: 360, background: "linear-gradient(90deg,transparent,#ffb76b,transparent)" }} />
            <div style={{ marginTop: 10, color: "#fff7ea", fontSize: 39, fontWeight: 900, lineHeight: 1.1 }}>{winnerSong}</div>
            <div style={{ marginTop: 10, color: "#ffd8a5", fontSize: 27, fontWeight: 900 }}>{`${rank} / ${tool}`}</div>
          </section>

          <section
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 20,
              marginTop: 36,
              border: "2px solid rgba(255,255,255,0.1)",
              borderRadius: 34,
              background: "rgba(0,0,0,0.48)",
              padding: 22,
              boxShadow: "inset 0 0 45px rgba(255,255,255,0.035)",
            }}
          >
            <SideCard avatar={avatarUrl} color="#ff8a24" cover={coverUrl} label="鬥士" name={winnerName} song={winnerSong} />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", color: "#ff7a18", fontSize: 58, fontWeight: 900 }}>
              <div>VS</div>
              <div style={{ marginTop: -4, border: "2px solid rgba(250,204,21,0.34)", borderRadius: 999, padding: "4px 14px", color: "#fff0a5", fontSize: 20 }}>{votes}</div>
            </div>
            <SideCard avatar={opponentAvatarUrl} color="#5be8ff" cover={opponentCoverUrl} label="挑戰者" name={opponentName} song={opponentSong} />
          </section>

          <section style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 24 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 20,
                border: "2px solid rgba(255,178,83,0.26)",
                borderRadius: 24,
                background: "rgba(255,138,36,0.1)",
                padding: "18px 26px",
                color: "#fff",
                fontSize: 30,
                fontWeight: 900,
              }}
            >
              <span style={{ color: "#ffd2a1" }}>AI 評價</span>
              <span>{`“${aiReview}”`}</span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 20,
                border: "2px solid rgba(91,232,255,0.28)",
                borderRadius: 24,
                background: "rgba(91,232,255,0.09)",
                padding: "18px 26px",
                color: "#fff",
                fontSize: 30,
                fontWeight: 900,
              }}
            >
              <span style={{ color: "#baf7ff" }}>觀眾</span>
              <span>{`“${audienceReview}”`}</span>
            </div>
          </section>

          <section style={{ display: "flex", justifyContent: "center", marginTop: 24 }}>
            <Radar />
          </section>

          <footer style={{ display: "flex", justifyContent: "space-between", marginTop: "auto", color: "#777", fontSize: 24, fontWeight: 900 }}>
            <span>aipoger.com</span>
            <span>WHERE AI BEATS BATTLE</span>
          </footer>
        </div>
      </div>
    ),
    size,
  );
}
