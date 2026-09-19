import React from "react";
import { SceneShell, CYAN, GOLD, MUTED, ORANGE, WHITE } from "./shared";
import { BibleLabel, BiblePanel, IndexChip, PracticeArrow } from "./bible-shared";

export const BibleClose: React.FC = () => (
  <SceneShell kicker="MAKE · CHECK · PUBLISH" title="先練功，再發表" subtitle="完成作品，再用第二意見找盲點。" accent="orange">
    <div style={{ display: "flex", flexDirection: "column", gap: 20, height: "100%" }}>
      <BiblePanel accent={GOLD} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "25px 30px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}><IndexChip>1 搜尋</IndexChip><PracticeArrow /><IndexChip accent="orange">2 複製</IndexChip><PracticeArrow /><IndexChip accent="gold">3 實測</IndexChip><PracticeArrow /><IndexChip accent="orange">4 發表</IndexChip></div>
      </BiblePanel>
      <div style={{ display: "flex", gap: 22, flex: 1 }}>
        <BiblePanel style={{ flex: 1, display: "flex", alignItems: "center", gap: 22 }}>
          <div style={{ width: 76, height: 76, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: `${CYAN}18`, border: `1px solid ${CYAN}70`, color: CYAN, fontSize: 32 }}>✦</div>
          <div><BibleLabel>AI 音樂練功聖經</BibleLabel><div style={{ marginTop: 12, color: WHITE, fontSize: 27, fontWeight: 950 }}>下一首歌，從這裡開始。</div></div>
        </BiblePanel>
        <BiblePanel accent={ORANGE} style={{ width: 420, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 13 }}>
          <div style={{ padding: "15px 23px", borderRadius: 999, color: "#050607", background: CYAN, fontSize: 20, fontWeight: 950, boxShadow: `0 0 30px ${CYAN}55` }}>進入 AI 音樂練功聖經</div>
          <div style={{ color: MUTED, fontSize: 15, fontWeight: 800 }}>AIPOGER · aipoger.com</div>
        </BiblePanel>
      </div>
    </div>
  </SceneShell>
);
