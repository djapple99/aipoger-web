import React from "react";
import { useCurrentFrame } from "remotion";
import { GlassCard, MusicCard, Pill, SceneShell, CYAN, ORANGE, GOLD, WHITE, MUTED } from "./shared";

export const SceneVote: React.FC = () => {
  const frame = useCurrentFrame();
  const selected = frame > 80;
  return (
    <SceneShell kicker="06 · LISTEN & VOTE" title="先聽、重播、快轉，再送出" subtitle="投票需要登入。選 A 或 B 只是暫存，按下確認後才會正式送出，而且每人只能投一次。">
      <div style={{ display: "flex", alignItems: "stretch", justifyContent: "center", gap: 24, height: 520 }}>
        <MusicCard side="A" title="Midnight Signal" color={CYAN} active={selected} />
        <MusicCard side="B" title="Neon Afterglow" color={ORANGE} active={false} />
        <GlassCard accent={`${GOLD}60`} style={{ width: 355, padding: 24, display: "flex", flexDirection: "column" }}>
          <div style={{ color: GOLD, fontSize: 17, fontWeight: 950, letterSpacing: "0.16em" }}>VOTE DOCK</div>
          <div style={{ marginTop: 20, color: WHITE, fontSize: 26, fontWeight: 950 }}>你比較喜歡哪一首？</div>
          <div style={{ marginTop: 22, display: "flex", gap: 10 }}><Pill active>作品 A</Pill><Pill>作品 B</Pill></div>
          <div style={{ marginTop: 27, padding: 16, borderRadius: 14, background: `${CYAN}10`, border: `1px solid ${CYAN}35`, color: MUTED, fontSize: 17, lineHeight: 1.45, fontWeight: 700 }}>可以繼續重播、快轉、改選。現在只是選擇，還不是投票。</div>
          <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", gap: 6, justifyContent: "center" }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: CYAN }} /><span style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,0.2)" }} /><span style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,0.2)" }} /></div>
            <div style={{ padding: "16px 18px", borderRadius: 14, background: selected ? CYAN : "rgba(255,255,255,0.07)", color: selected ? "#031014" : MUTED, textAlign: "center", fontSize: 20, fontWeight: 950 }}>{selected ? "確定送出：作品 A" : "確定送出"}</div>
            <div style={{ color: "#7d8994", textAlign: "center", fontSize: 15, fontWeight: 700 }}>登入後才能投票 · 每人一次</div>
          </div>
        </GlassCard>
      </div>
    </SceneShell>
  );
};
