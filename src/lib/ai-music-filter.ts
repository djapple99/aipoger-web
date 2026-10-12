type SearchableMusic = { title: string; creator: string; aiTool: string; genre: string };

const searchText = (value: string) => value.normalize("NFKC").trim().toLocaleLowerCase();

/** Filter the loaded public catalog, preserving its existing order and identity. */
export function filterAiMusicTracks<T extends SearchableMusic>(tracks: T[], query: string, genre: string): T[] {
  const terms = searchText(query).split(/\s+/u).filter(Boolean);
  return tracks.filter(track => (!genre || track.genre === genre) && terms.every(term =>
    searchText(`${track.title} ${track.creator} ${track.aiTool}`).includes(term)));
}
