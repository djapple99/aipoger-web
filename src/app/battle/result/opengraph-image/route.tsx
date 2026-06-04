import { ImageResponse } from "next/og";
import { AIPOGER_BRAND_LOGO } from "@/lib/brand";
import {
  loadBattleResultShareData,
  resultShareDataFromUrl,
} from "@/lib/battle-result-meta";

export const runtime = "edge";

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

function initials(name: string) {
  return name.trim().slice(0, 2).toUpperCase() || "AI";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const data = await loadBattleResultShareData(resultShareDataFromUrl(url.searchParams));
  const logoUrl = imageUrl(AIPOGER_BRAND_LOGO, url.origin);
  const coverUrl = imageUrl(data.coverUrl, url.origin);
  const avatarUrl = imageUrl(data.avatarUrl, url.origin);
  const opponentAvatarUrl = imageUrl(data.opponentAvatarUrl, url.origin);
  const opponentCoverUrl = imageUrl(data.opponentCoverUrl, url.origin);
  const winnerName = fitText(data.winnerName, "AIPOGER Fighter", 26);
  const winnerSong = fitText(data.winnerSong, "AI Drop", 32);
  const opponentName = fitText(data.opponentName, "Drop Rival", 24);
  const opponentSong = fitText(data.opponentSong, "Battle Drop", 26);
  const rank = fitText(data.rank, "Lv.1 訊號啟動者", 24);
  const tool = fitText(data.tool, "AI Music", 18);
  const battleCode = fitText(data.battleCode || data.battleId.slice(0, 8).toUpperCase(), "AIPO-DROP", 14);
  const aiReview = fitText(data.aiReview, "尚無 AI 評價", 32);
  const audienceReview = fitText(data.audienceReview, "尚無觀眾評價", 32);

  const smallSide = ({
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
  }) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: 210,
        height: 82,
        border: `2px solid ${color}88`,
        borderRadius: 24,
        background: `${color}18`,
        padding: "10px 12px",
      }}
    >
      <div
        style={{
          position: "relative",
          display: "flex",
          height: 54,
          width: 54,
          overflow: "hidden",
          border: `3px solid ${color}`,
          borderRadius: 999,
          background: "#000",
          color: "#fff",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          fontWeight: 900,
        }}
      >
        {avatar ? <img src={avatar} alt="" style={{ height: "100%", width: "100%", objectFit: "cover" }} /> : initials(name)}
      </div>
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{ color, fontSize: 15, fontWeight: 900 }}>{label}</div>
        <div style={{ color: "#fff", fontSize: 20, fontWeight: 900, lineHeight: 1.05 }}>{name}</div>
        <div style={{ color: "#bdbdbd", fontSize: 13, fontWeight: 800, lineHeight: 1.2 }}>{song}</div>
      </div>
      <img
        src={cover}
        alt=""
        style={{
          height: 48,
          width: 48,
          borderRadius: 12,
          objectFit: "cover",
          marginLeft: "auto",
        }}
      />
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
          background: "linear-gradient(135deg,#0b0300 0%,#050505 48%,#071b21 100%)",
          color: "#fff",
          fontFamily: "Arial, Helvetica, sans-serif",
          padding: 42,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background:
              "radial-gradient(circle at 28% 28%,rgba(255,106,0,0.42),transparent 31%),radial-gradient(circle at 82% 66%,rgba(42,225,255,0.22),transparent 30%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            opacity: 0.18,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.13) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.13) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div
          style={{
            position: "relative",
            display: "flex",
            height: "100%",
            width: "100%",
            overflow: "hidden",
            border: "2px solid rgba(255,178,83,0.42)",
            borderRadius: 40,
            background: "rgba(0,0,0,0.66)",
            boxShadow: "0 0 80px rgba(255,106,0,0.2)",
            padding: 34,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", width: 530 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <img src={logoUrl} alt="" style={{ height: 70, width: 70, borderRadius: 999, objectFit: "contain", background: "#000" }} />
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ color: "#ffbe74", fontSize: 26, fontWeight: 900, letterSpacing: 4 }}>AIPOGER RESULT CARD</div>
                <div style={{ marginTop: 5, color: "#f8dfba", fontSize: 19, fontWeight: 900 }}>最強抓波 DROP BATTLE</div>
              </div>
            </div>

            <div style={{ marginTop: 34, display: "flex", flexDirection: "column" }}>
              <div style={{ color: "#ffbe74", fontSize: 30, fontWeight: 900 }}>BATTLE WINNER</div>
              <div style={{ marginTop: 4, color: "#fff", fontSize: 68, fontWeight: 900, lineHeight: 0.98 }}>{winnerName}</div>
              <div style={{ marginTop: 13, color: "#f7f1e8", fontSize: 32, fontWeight: 900, lineHeight: 1.08 }}>{winnerSong}</div>
              <div style={{ marginTop: 12, color: "#ffd99c", fontSize: 22, fontWeight: 900 }}>{`${rank} / ${tool}`}</div>
            </div>

            <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  border: "2px solid rgba(255,178,83,0.24)",
                  borderRadius: 18,
                  background: "rgba(255,138,36,0.09)",
                  padding: "10px 16px",
                  color: "#fff",
                  fontSize: 20,
                  fontWeight: 900,
                }}
              >
                {`AI 評價：“${aiReview}”`}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  border: "2px solid rgba(91,232,255,0.24)",
                  borderRadius: 18,
                  background: "rgba(91,232,255,0.08)",
                  padding: "10px 16px",
                  color: "#fff",
                  fontSize: 20,
                  fontWeight: 900,
                }}
              >
                {`觀眾：“${audienceReview}”`}
              </div>
            </div>
          </div>

          <div style={{ position: "relative", display: "flex", flex: 1, alignItems: "center", justifyContent: "center" }}>
            <div
              style={{
                position: "absolute",
                display: "flex",
                height: 420,
                width: 420,
                borderRadius: 999,
                background: "#060606",
                boxShadow: "inset 0 0 0 3px rgba(255,255,255,0.12), inset 0 0 90px rgba(255,255,255,0.08), 0 0 95px rgba(255,106,0,0.33)",
              }}
            />
            <div
              style={{
                position: "absolute",
                display: "flex",
                height: 332,
                width: 332,
                border: "3px solid rgba(255,195,110,0.74)",
                borderRadius: 999,
                overflow: "hidden",
                background: "#000",
              }}
            >
              <img src={coverUrl} alt="" style={{ height: "100%", width: "100%", objectFit: "cover" }} />
            </div>
            <div style={{ position: "absolute", display: "flex", height: 36, width: 36, borderRadius: 999, background: "#000", border: "2px solid rgba(255,255,255,0.48)" }} />
            <div
              style={{
                position: "absolute",
                bottom: 56,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 355,
                border: "2px solid rgba(255,202,109,0.58)",
                borderRadius: 999,
                background: "linear-gradient(180deg,rgba(60,31,4,0.88),rgba(0,0,0,0.84))",
                padding: "14px 20px",
                color: "#ffdb81",
                fontSize: 42,
                fontWeight: 900,
                letterSpacing: 3,
                boxShadow: "0 0 45px rgba(255,128,26,0.36)",
              }}
            >
              WINNER
            </div>
            <div
              style={{
                position: "absolute",
                right: 12,
                top: 18,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                color: "#ffd19a",
                fontSize: 18,
                fontWeight: 900,
              }}
            >
              <img src={avatarUrl} alt="" style={{ height: 96, width: 96, borderRadius: 999, border: "4px solid #ff8a24", objectFit: "cover", background: "#000" }} />
              <div>{battleCode}</div>
            </div>

            <div style={{ position: "absolute", bottom: 2, left: 0, display: "flex", alignItems: "center", gap: 10 }}>
              {smallSide({
                avatar: avatarUrl,
                color: "#ff8a24",
                cover: coverUrl,
                label: "鬥士",
                name: winnerName,
                song: winnerSong,
              })}
              <div style={{ color: "#ff7a18", fontSize: 42, fontWeight: 900 }}>VS</div>
              {smallSide({
                avatar: opponentAvatarUrl,
                color: "#5be8ff",
                cover: opponentCoverUrl,
                label: "挑戰者",
                name: opponentName,
                song: opponentSong,
              })}
            </div>
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
