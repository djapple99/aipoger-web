import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { CYAN, GOLD, ORANGE, SceneShell, Waveform } from "./shared";

export const SceneTitle: React.FC = () => {
  const frame = useCurrentFrame();
  const glow = interpolate(Math.sin(frame / 10), [-1, 1], [0.6, 1]);
  return (
    <SceneShell kicker="01 · START HERE" title="Q CRASH 怎麼玩？" subtitle="兩首 60 秒 Drop，不用等人到齊，在自己的時間決定哪首歌勝出。">
      <div style={{ display: "flex", alignItems: "center", gap: 42, height: 530 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 14, border: `1px solid ${CYAN}88`, background: `${CYAN}12`, borderRadius: 999, padding: "13px 20px", color: CYAN, fontSize: 20, fontWeight: 950, letterSpacing: "0.18em" }}>ASYNC 60s DROP</div>
          <h2 style={{ margin: "26px 0 0", color: "#ffffff", fontSize: 112, lineHeight: 0.92, fontWeight: 950, letterSpacing: "-0.07em", textShadow: `0 0 45px ${CYAN}${Math.round(glow * 80).toString(16).padStart(2, "0")}` }}>Q<br /><span style={{ color: CYAN }}>CRASH</span></h2>
          <p style={{ margin: "30px 0 0", color: GOLD, fontSize: 27, lineHeight: 1.35, fontWeight: 900 }}>聽重點。選一首。讓它出線。</p>
        </div>
        <div style={{ width: 650, padding: 34, border: `1px solid ${ORANGE}55`, borderRadius: 28, background: "rgba(1,5,7,0.72)", boxShadow: `0 0 80px ${ORANGE}14` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#f8fafc", fontSize: 23, fontWeight: 950 }}><span>一張卡</span><span style={{ color: ORANGE, fontSize: 17, letterSpacing: "0.14em" }}>ONE BATTLE</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 22, marginTop: 34 }}>
            <div style={{ flex: 1, height: 150, border: `1px solid ${CYAN}70`, borderRadius: 18, background: `${CYAN}14`, padding: 20 }}><div style={{ color: CYAN, fontSize: 20, fontWeight: 950 }}>作品 A</div><Waveform color={CYAN} bars={18} height={58} seed={2} /></div>
            <div style={{ color: ORANGE, fontSize: 28, fontWeight: 950 }}>VS</div>
            <div style={{ flex: 1, height: 150, border: `1px solid ${ORANGE}70`, borderRadius: 18, background: `${ORANGE}14`, padding: 20 }}><div style={{ color: ORANGE, fontSize: 20, fontWeight: 950 }}>作品 B</div><Waveform color={ORANGE} bars={18} height={58} seed={8} /></div>
          </div>
          <div style={{ marginTop: 28, color: "#b4bdc8", fontSize: 20, fontWeight: 700 }}>分享同一張 Q Crash 卡，請朋友幫你聽。</div>
        </div>
      </div>
    </SceneShell>
  );
};
