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
  return `/choice/${encodeURIComponent(collectionId)}`;
}

export function creatorChoiceEligibilityMessage(eligibility: CreatorChoiceEligibility, isZh = true) {
  if (eligibility.eligible) {
    return isZh
      ? `登入後即可建立自己的 Choice；目前有 ${eligibility.showtimeWorkCount} 首 Showtime 認證作品。`
      : `Any signed-in creator can publish a Choice; you currently have ${eligibility.showtimeWorkCount} Showtime-certified work${eligibility.showtimeWorkCount === 1 ? "" : "s"}.`;
  }
  return isZh
    ? "登入後即可建立自己的 Choice，不需要先有 Showtime 認證作品。"
    : "Sign in to publish your own Choice; a Showtime work is not required.";
}
