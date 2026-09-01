import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Q Crash | AIPOGER Full Song Battle",
  description: "Submit a public Suno link or an MP3/WAV full song and invite listeners to choose the winner in their own time.",
};

export default function QCrashNewLayout({ children }: { children: ReactNode }) {
  return children;
}
