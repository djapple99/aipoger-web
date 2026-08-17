import React from "react";
import { SceneShell, GlassCard, Pill, CYAN, GOLD, ORANGE, WHITE } from "./shared";

export const SceneDeadline: React.FC = () => (
  <SceneShell kicker="04 · SET THE CLOCK" title="選一個投票截止時間" subtitle="作品 B 鎖定後，投票立即開放；截止時間設定後不能再修改。">
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 72, height: 510 }}>
      <GlassCard accent={`${CYAN}62`} style={{ width: 900, padding: 40 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div style={{ color: WHITE, fontSize: 28, fontWeight: 950 }}>投票時間</div><div style={{ color: CYAN, fontSize: 18, fontWeight: 950, letterSpacing: "0.16em" }}>VOTING WINDOW</div></div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 18, marginTop: 36 }}>
          <Pill>30 分鐘</Pill><Pill active>2 小時 · 預設</Pill><Pill>6 小時</Pill><Pill>24 小時</Pill>
        </div>
        <div style={{ marginTop: 42, padding: 22, borderRadius: 16, border: `1px solid ${GOLD}44`, background: `${GOLD}0d`, color: GOLD, fontSize: 21, lineHeight: 1.45, fontWeight: 800 }}>時間到，系統才會公開勝出作品與五角評分分布。</div>
      </GlassCard>
      <div style={{ width: 300 }}>
        <div style={{ color: ORANGE, fontSize: 17, fontWeight: 950, letterSpacing: "0.18em" }}>NO RUSH</div>
        <div style={{ marginTop: 15, color: WHITE, fontSize: 32, lineHeight: 1.2, fontWeight: 950 }}>不用約同一個時間。<br /><span style={{ color: CYAN }}>各自來聽就好。</span></div>
      </div>
    </div>
  </SceneShell>
);
