import React from "react";
import { SceneShell, CYAN, GOLD, MUTED, ORANGE, WHITE } from "./shared";
import { BibleLabel, BiblePanel, RatingBadge } from "./bible-shared";

export const BibleVerify: React.FC = () => (
  <SceneShell kicker="FIELD NOTES · VERSION AWARE" title="成功與失敗，都可以留下來" subtitle="標記可靠度、回報結果，讓資料庫越來越實戰。" accent="cyan">
    <div style={{ display: "flex", gap: 22, height: "100%" }}>
      <BiblePanel style={{ flex: 1 }}>
        <BibleLabel>每筆資料先看可靠度</BibleLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 21 }}>
          <RatingBadge color={CYAN}>官方文件 · Feature</RatingBadge>
          <RatingBadge color={ORANGE}>愛波哥實測 · Field-tested</RatingBadge>
          <RatingBadge color={GOLD}>版本敏感 · Version-sensitive</RatingBadge>
        </div>
      </BiblePanel>
      <BiblePanel accent={ORANGE} style={{ width: 560, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div><BibleLabel color={ORANGE}>共同驗證</BibleLabel><div style={{ marginTop: 17, color: WHITE, fontSize: 28, fontWeight: 950, lineHeight: 1.22 }}>不是把答案說死，<br />而是把條件留下來。</div></div>
        <div style={{ display: "flex", gap: 12 }}><div style={{ flex: 1, padding: "15px 16px", borderRadius: 14, background: "rgba(21,213,238,0.1)", color: CYAN, fontSize: 17, fontWeight: 900 }}>可複製<br /><span style={{ color: MUTED, fontSize: 14 }}>成功條件</span></div><div style={{ flex: 1, padding: "15px 16px", borderRadius: 14, background: "rgba(255,106,33,0.1)", color: ORANGE, fontSize: 17, fontWeight: 900 }}>待驗證<br /><span style={{ color: MUTED, fontSize: 14 }}>社群回報</span></div></div>
      </BiblePanel>
    </div>
  </SceneShell>
);
