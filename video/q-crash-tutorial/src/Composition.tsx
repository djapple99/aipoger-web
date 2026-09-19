import { Audio } from "@remotion/media";
import {
  AbsoluteFill,
  Composition,
  Easing,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { SceneCut } from "./scenes/SceneCut";
import { SceneDeadline } from "./scenes/SceneDeadline";
import { SceneResult } from "./scenes/SceneResult";
import { SceneShare } from "./scenes/SceneShare";
import { SceneTitle } from "./scenes/SceneTitle";
import { SceneUpload } from "./scenes/SceneUpload";
import { SceneVote } from "./scenes/SceneVote";

export const FPS = 30;
export const VIDEO_DURATION_IN_FRAMES = 42 * FPS;

const sceneFrames = {
  title: 0,
  upload: 135,
  cut: 315,
  deadline: 480,
  share: 645,
  vote: 810,
  result: 1050,
} as const;

const SceneBackdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const pulse = interpolate(Math.sin(frame / 32), [-1, 1], [0.18, 0.42]);

  return (
    <AbsoluteFill style={{ background: "#030506", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.55,
          background:
            "radial-gradient(circle at 84% 8%, rgba(22, 184, 218, 0.18), transparent 28%), radial-gradient(circle at 12% 18%, rgba(245, 98, 22, 0.18), transparent 32%), linear-gradient(135deg, #030506 0%, #091114 48%, #030506 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: -160,
          top: -240,
          width: 920,
          height: 920,
          borderRadius: "50%",
          opacity: pulse,
          background:
            "repeating-radial-gradient(circle, transparent 0 46px, rgba(74, 221, 245, 0.22) 48px 50px, transparent 52px 92px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.15,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage: "linear-gradient(to bottom, black, transparent 72%)",
        }}
      />
    </AbsoluteFill>
  );
};

export const MyComposition = () => {
  return (
    <Composition
      id="QCrashTutorial"
      component={QCrashTutorial}
      durationInFrames={VIDEO_DURATION_IN_FRAMES}
      fps={FPS}
      width={1920}
      height={1080}
    />
  );
};

export const QCrashTutorial: React.FC = () => {
  return (
    <AbsoluteFill style={{ color: "#f8fafc", fontFamily: "Arial, PingFang TC, Noto Sans TC, sans-serif" }}>
      <SceneBackdrop />
      <Audio
        src={staticFile("home-bgm.mp3")}
        volume={(currentFrame) => interpolate(currentFrame, [0, 30, VIDEO_DURATION_IN_FRAMES - 45, VIDEO_DURATION_IN_FRAMES], [0, 0.22, 0.22, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) })}
      />

      <AbsoluteFill style={{ padding: "52px 80px 58px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.12)", paddingBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Img src={staticFile("aipoger-logo.png")} style={{ width: 44, height: 44, objectFit: "contain" }} />
            <span style={{ fontSize: 22, fontWeight: 900, letterSpacing: "0.28em" }}>AIPOGER</span>
          </div>
          <div style={{ color: "#65e7fb", fontSize: 16, fontWeight: 800, letterSpacing: "0.22em" }}>HOW TO USE · Q CRASH</div>
        </div>

        <Sequence from={sceneFrames.title} durationInFrames={135} layout="none"><SceneTitle /></Sequence>
        <Sequence from={sceneFrames.upload} durationInFrames={180} layout="none"><SceneUpload /></Sequence>
        <Sequence from={sceneFrames.cut} durationInFrames={165} layout="none"><SceneCut /></Sequence>
        <Sequence from={sceneFrames.deadline} durationInFrames={165} layout="none"><SceneDeadline /></Sequence>
        <Sequence from={sceneFrames.share} durationInFrames={165} layout="none"><SceneShare /></Sequence>
        <Sequence from={sceneFrames.vote} durationInFrames={240} layout="none"><SceneVote /></Sequence>
        <Sequence from={sceneFrames.result} durationInFrames={210} layout="none"><SceneResult /></Sequence>

        <div style={{ position: "absolute", left: 80, right: 80, bottom: 28, display: "flex", justifyContent: "space-between", color: "rgba(226,232,240,0.48)", fontSize: 14, fontWeight: 700, letterSpacing: "0.12em" }}>
          <span>ASYNC 60s DROP BATTLE</span>
          <span>LISTEN · CHOOSE · CRASH</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
