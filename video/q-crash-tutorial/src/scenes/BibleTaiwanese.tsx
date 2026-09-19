import React from "react";
import { SceneShell, CYAN, GOLD, MUTED, ORANGE, WHITE } from "./shared";
import { BibleLabel, BiblePanel, IndexChip, PracticeArrow, RatingBadge, SearchLine } from "./bible-shared";

export const BibleTaiwanese: React.FC = () => (
  <SceneShell kicker="TAIWANESE LYRIC LAB" title="台語也能練" subtitle="搜尋意思、複製寫法、回報唱得準不準。" accent="orange">
    <div style={{ display: "flex", gap: 18, height: "100%" }}>
      <BiblePanel accent={CYAN} style={{ flex: 1 }}>
        <BibleLabel>輸入你想唱的意思</BibleLabel>
        <div style={{ marginTop: 18 }}><SearchLine value="搜尋：一句台語意思" /></div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 27 }}>
          <IndexChip>中文意思</IndexChip><PracticeArrow /><IndexChip accent="orange">實測寫法</IndexChip>
        </div>
      </BiblePanel>
      <BiblePanel accent={GOLD} style={{ width: 480, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div><BibleLabel color={GOLD}>回報結果</BibleLabel><div style={{ marginTop: 17, color: WHITE, fontSize: 27, fontWeight: 950 }}>這個版本唱得準嗎？</div></div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><RatingBadge color={CYAN}>有效 · 複製寫法</RatingBadge><RatingBadge color={ORANGE}>唱錯 · 留下原因</RatingBadge></div>
        <div style={{ color: MUTED, fontSize: 15, lineHeight: 1.4, fontWeight: 750 }}>不同模型、旋律與聲線，結果都可能不同。</div>
      </BiblePanel>
    </div>
  </SceneShell>
);
