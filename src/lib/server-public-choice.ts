import "server-only";
import { cache } from "react";
import { NextRequest } from "next/server";
import type { AipogerChoiceCollection } from "@/lib/aipoger-choice";
import type { AipogerPublicCreatorChoiceCollection } from "@/lib/creator-choice";
import { publicChoiceResponse } from "@/lib/server-choice-detail";
import { publicOfficialChoicesResponse } from "@/lib/server-choice-current";
import { publicCreatorChoicesResponse } from "@/lib/server-creator-choices";

export type PublicChoiceSeed = {
  official: AipogerChoiceCollection[];
  creators: Omit<AipogerPublicCreatorChoiceCollection, "creatorId">[];
  featuredKey: string | null;
};

async function publishedJson(response: Response) {
  if (!response.ok) throw new Error("Published playlists are temporarily unavailable");
  return response.json();
}
export const readPublicChoices = cache(async (): Promise<PublicChoiceSeed> => {
  const [official, creators] = await Promise.all([
    publicOfficialChoicesResponse().then(publishedJson),
    publicCreatorChoicesResponse().then(publishedJson),
  ]);
  if (official.schemaReady === false || creators.schemaReady === false) throw new Error("Playlist catalog is not ready");
  return { official: official.collections ?? [],
    creators: (creators.collections ?? []).map((collection: AipogerPublicCreatorChoiceCollection) => ({
      id: collection.id, weekStart: collection.weekStart, title: collection.title, intro: collection.intro,
      isPublished: collection.isPublished, curatorName: collection.curatorName, avatarUrl: collection.avatarUrl,
      coverUrl: collection.coverUrl, items: collection.items, publishedAt: collection.publishedAt,
    })),
    featuredKey: official.featuredKey ?? creators.featuredKey ?? null };
});

export const readPublicChoice = cache(async (id: string, kind: "creator" | "official") => {
  const request = new NextRequest(`https://aipoger.com/api/choice/${encodeURIComponent(id)}?kind=${kind}`);
  const response = await publicChoiceResponse(request, { params: Promise.resolve({ id }) });
  if (response.status === 404) return null;
  const payload = await publishedJson(response);
  return payload.collection as AipogerChoiceCollection;
});
