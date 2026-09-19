import React from "react";
import { SceneShell, GlassCard, ShareArrow, CYAN, ORANGE, WHITE, MUTED } from "./shared";

export const SceneShare: React.FC = () => (
  <SceneShell kicker="05 · SHARE ONE CARD" title="分享同一張 Q Crash 卡" subtitle="不用複製兩張戰鬥卡。A、B 兩首作品，永遠在同一場比較裡。">
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 32, height: 510 }}>
      <GlassCard accent={`${CYAN}62`} style={{ width: 840, padding: 32 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><span style={{ color: CYAN, fontSize: 18, fontWeight: 950, letterSpacing: "0.18em" }}>Q CRASH · ONE BATTLE</span><span style={{ color: "#9aa7b3", fontSize: 18, fontWeight: 800 }}>剩餘 1 小時 48 分</span></div>
        <div style={{ marginTop: 28, color: WHITE, fontSize: 32, fontWeight: 950 }}>Midnight Signal <span style={{ color: "#72808b", fontSize: 24 }}>VS</span> Neon Afterglow</div>
        <div style={{ marginTop: 17, color: MUTED, fontSize: 21, lineHeight: 1.5, fontWeight: 700 }}>這兩首歌到底哪首比較好聽啊？我有點選不出來！</div>
        <div style={{ marginTop: 25, display: "inline-flex", alignItems: "center", gap: 10, padding: "12px 18px", borderRadius: 999, background: `${ORANGE}18`, border: `1px solid ${ORANGE}70`, color: "#ffd0b6", fontSize: 18, fontWeight: 900 }}>進來聽重點，幫我決定哪首勝出。</div>
      </GlassCard>
      <ShareArrow />
      <div style={{ width: 350, textAlign: "center" }}>
        <div style={{ width: 126, height: 126, margin: "0 auto", borderRadius: 32, border: `1px solid ${CYAN}70`, background: `${CYAN}12`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 50px ${CYAN}20` }}><div style={{ color: CYAN, fontSize: 58 }}>↗</div></div>
        <div style={{ marginTop: 24, color: WHITE, fontSize: 28, fontWeight: 950 }}>丟給朋友</div>
        <div style={{ marginTop: 10, color: MUTED, fontSize: 18, lineHeight: 1.5, fontWeight: 700 }}>收到連結的人直接進同一張卡。</div>
      </div>
    </div>
  </SceneShell>
);
