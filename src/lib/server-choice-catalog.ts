import type { SupabaseClient } from "@supabase/supabase-js";
import type { AipogerChoiceCatalogItem } from "@/lib/aipoger-choice";
import { loadCreatorChoicePlaybackCatalog } from "@/lib/server-creator-choice-catalog";

export type AipogerChoiceSelectionCatalog = {
  schemaReady: boolean;
  items: AipogerChoiceCatalogItem[];
};

// Official curators select any public playable song. Creator additions apply
// their own favorite membership check; existing playlist playback never does.
export async function loadChoiceSelectionCatalog(admin: SupabaseClient): Promise<AipogerChoiceSelectionCatalog> {
  const catalog = await loadCreatorChoicePlaybackCatalog(admin);
  return {
    schemaReady: catalog.schemaReady,
    items: catalog.items.map((item) => {
      const source = { ...item, selectable: item.isPublic && Boolean(item.audioUrl) };
      delete source.favoriteAliases;
      return source;
    }),
  };
}
