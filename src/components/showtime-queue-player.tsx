"use client";
import { forwardRef, useImperativeHandle } from "react";
import { musicPlayer, type MusicTrack, type MusicPlayerHandle } from "@/lib/music-player-store";
export type ShowtimePlayerTrack = MusicTrack;
export type ShowtimeQueuePlayerHandle = Pick<MusicPlayerHandle, "start" | "close">;
const ShowtimeQueuePlayer = forwardRef<ShowtimeQueuePlayerHandle, { isZh: boolean }>(function ShowtimeQueuePlayer(_props, ref) {
  useImperativeHandle(ref, () => ({
    start: async (...args) => musicPlayer?.start(...args) ?? false,
    close: () => musicPlayer?.close(),
  }), []);
  return null;
});
export default ShowtimeQueuePlayer;
