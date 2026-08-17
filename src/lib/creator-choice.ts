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
      ? `你已有 ${eligibility.showtimeWorkCount} 首 Showtime 認證作品，可以發布自己的 Choice。`
      : `You have ${eligibility.showtimeWorkCount} Showtime-certified work${eligibility.showtimeWorkCount === 1 ? "" : "s"} and can publish your own Choice.`;
  }
  return isZh
    ? "擁有至少一首 Showtime 認證作品後，即可建立自己的 Choice。"
    : "Publish your own Choice after one of your works enters Showtime.";
}
