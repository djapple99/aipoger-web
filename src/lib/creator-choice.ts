import type { AipogerChoiceCollection } from "@/lib/aipoger-choice";

export type AipogerCreatorChoiceCollection = AipogerChoiceCollection & {
  curatorName: string;
  publishedAt: string | null;
};

export type AipogerPublicCreatorChoiceCollection = AipogerCreatorChoiceCollection & {
  creatorId: string;
  avatarUrl: string;
};

export type CreatorChoiceEligibility = {
  eligible: boolean;
  showtimeWorkCount: number;
};

export function creatorChoicePublicPath(collectionId: string) {
  return `/choice/${encodeURIComponent(collectionId)}?kind=creator`;
}

export function creatorChoiceEligibilityMessage(eligibility: CreatorChoiceEligibility, isZh = true) {
  if (eligibility.eligible) {
    return isZh
      ? "從收藏歌曲建立自己的每週 Choice。"
      : "Create your weekly Choice from saved songs.";
  }
  return isZh
    ? "登入後即可建立自己的 Choice。"
    : "Sign in to publish your own Choice.";
}

export function creatorChoiceWeekStart(value = new Date()) {
  const date = new Date(`${new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(value)}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - (date.getUTCDay() || 7) + 1);
  return date.toISOString().slice(0, 10);
}
