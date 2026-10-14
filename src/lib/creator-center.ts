import type { ExternalMusic } from "./external-music";
export type CreatorWork = {
  id: string;
  title: string;
  artist: string;
  aiTool: string;
  genre: string;
  createdAt: string;
  coverUrl: string;
  audioUrl: string;
  external: ExternalMusic | null;
  isMusicVideo: boolean;
  active: boolean;
  status: "public" | "ended" | "hidden";
  supporters: number;
  comments: number;
  lyrics: string;
};
export type CreatorComment = {
  id: string;
  trackId: string;
  title: string;
  name: string;
  text: string;
  createdAt: string;
};
export type CreatorSummary = {
  isOwner: boolean;
  works: CreatorWork[];
  commenters: number;
  commentCount: number;
  comments: CreatorComment[];
  credits: { enabled: boolean; balance: number | null; debt?: number; entries?: { id: string; delta: number; reason: string; created_at: string }[] };
  linkSubmissionReady: boolean;
};
