"use client";
import { useSyncExternalStore } from "react";

export type MusicTrack = { id: string; title: string; artist: string; coverUrl: string; audioUrl: string; heartTrackId?: string; genre?: string; lyrics?: string };
export type MusicSession = { queue: MusicTrack[]; index: number; sourceLabel: string; sourceKey?: string; repeat?: boolean };
export type MusicPlayerState = { session: MusicSession | null; playing: boolean; currentTime: number; duration: number };
export type MusicPlayerHandle = {
  start: (queue: MusicTrack[], index?: number, sourceLabel?: string, options?: { sourceKey?: string; repeat?: boolean }) => Promise<boolean>;
  close: () => void;
  toggle: () => void;
  move: (direction: -1 | 1) => void;
};
const empty: MusicPlayerState = { session: null, playing: false, currentTime: 0, duration: 0 };
let state = empty;
const listeners = new Set<() => void>();
export let musicPlayer: MusicPlayerHandle | null = null;
export function registerMusicPlayer(handle: MusicPlayerHandle | null) { musicPlayer = handle; }
export function publishMusicPlayer(next: MusicPlayerState) { state = next; listeners.forEach(listener => listener()); }
export function getMusicPlayerState() { return state; }
function subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function useMusicPlayer() { return useSyncExternalStore(subscribe, getMusicPlayerState, () => empty); }
