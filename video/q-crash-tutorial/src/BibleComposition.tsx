import { Audio } from "@remotion/media";
import { AbsoluteFill, Composition, Easing, Img, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { BibleClose } from "./scenes/BibleClose";
import { BibleIndex } from "./scenes/BibleIndex";
import { BibleModules } from "./scenes/BibleModules";
import { BibleTaiwanese } from "./scenes/BibleTaiwanese";
import { BibleTitle } from "./scenes/BibleTitle";
import { BibleVerify } from "./scenes/BibleVerify";
import { BibleWorkflow } from "./scenes/BibleWorkflow";
import { FPS } from "./Composition";

const BIBLE_DURATION_IN_FRAMES = 40 * FPS;

const BibleBackdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const pulse = interpolate(Math.sin(frame / 34), [-1, 1], [0.18, 0.42]);

  return (
    <AbsoluteFill style={{ background: "#030506", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, opacity: 0.6, background: "radial-gradient(circle at 84% 8%, rgba(22,184,218,0.2), transparent 28%), radial-gradient(circle at 12% 18%, rgba(245,98,22,0.16), transparent 32%), linear-gradient(135deg, #030506 0%, #091114 48%, #030506 100%)" }} />
      <div style={{ position: "absolute", right: -160, top: -240, width: 920, height: 920, borderRadius: "50%", opacity: pulse, background: "repeating-radial-gradient(circle, transparent 0 46px, rgba(74,221,245,0.22) 48px 50px, transparent 52px 92px)" }} />
      <div style={{ position: "absolute", inset: 0, opacity: 0.14, backgroundImage: "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)", backgroundSize: "72px 72px", maskImage: "linear-gradient(to bottom, black, transparent 72%)" }} />
    </AbsoluteFill>
  );
};

const sceneFrames = {
  title: 0,
  index: 120,
  workflow: 285,
  modules: 465,
  taiwanese: 660,
  verify: 840,
  close: 1005,
} as const;

export const BibleComposition = () => (
  <Composition id="BibleIntro" component={BibleIntro} durationInFrames={BIBLE_DURATION_IN_FRAMES} fps={FPS} width={1920} height={1080} />
);

export const BibleIntro: React.FC = () => (
  <AbsoluteFill style={{ color: "#f8fafc", fontFamily: "Arial, PingFang TC, Noto Sans TC, sans-serif" }}>
    <BibleBackdrop />
    <Audio src={staticFile("home-bgm.mp3")} volume={(currentFrame) => interpolate(currentFrame, [0, 30, BIBLE_DURATION_IN_FRAMES - 45, BIBLE_DURATION_IN_FRAMES], [0, 0.2, 0.2, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) })} />
    <AbsoluteFill style={{ padding: "52px 80px 58px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.12)", paddingBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}><Img src={staticFile("aipoger-logo.png")} style={{ width: 44, height: 44, objectFit: "contain" }} /><span style={{ fontSize: 22, fontWeight: 900, letterSpacing: "0.28em" }}>AIPOGER</span></div>
        <div style={{ color: "#65e7fb", fontSize: 16, fontWeight: 800, letterSpacing: "0.22em" }}>HOW TO USE · AI MUSIC BIBLE</div>
      </div>
      <Sequence from={sceneFrames.title} durationInFrames={120} layout="none"><BibleTitle /></Sequence>
      <Sequence from={sceneFrames.index} durationInFrames={165} layout="none"><BibleIndex /></Sequence>
      <Sequence from={sceneFrames.workflow} durationInFrames={180} layout="none"><BibleWorkflow /></Sequence>
      <Sequence from={sceneFrames.modules} durationInFrames={195} layout="none"><BibleModules /></Sequence>
      <Sequence from={sceneFrames.taiwanese} durationInFrames={180} layout="none"><BibleTaiwanese /></Sequence>
      <Sequence from={sceneFrames.verify} durationInFrames={165} layout="none"><BibleVerify /></Sequence>
      <Sequence from={sceneFrames.close} durationInFrames={195} layout="none"><BibleClose /></Sequence>
      <div style={{ position: "absolute", left: 80, right: 80, bottom: 28, display: "flex", justifyContent: "space-between", color: "rgba(226,232,240,0.48)", fontSize: 14, fontWeight: 700, letterSpacing: "0.12em" }}><span>AI MUSIC PRACTICE BIBLE</span><span>SEARCH · PRACTICE · VERIFY · RELEASE</span></div>
    </AbsoluteFill>
  </AbsoluteFill>
);
