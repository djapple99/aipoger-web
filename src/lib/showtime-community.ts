export type ShowtimeContributor = { name: string; count: number };
export type ShowtimeReview = {
  id: string; trackId: string; name: string; body: string; title: string;
  coverUrl: string; isMv: boolean;
};
export type ShowtimeCommunity = {
  reviewers: ShowtimeContributor[]; creators: ShowtimeContributor[]; listeners: ShowtimeContributor[];
  reviews: ShowtimeReview[]; choiceCommentCounts: Record<string, number>; generatedAt: string;
};
