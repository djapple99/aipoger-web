-- battles：歌詞（選填）；Supabase SQL Editor 可重複執行
ALTER TABLE public.battles ADD COLUMN IF NOT EXISTS lyrics_a TEXT;
ALTER TABLE public.battles ADD COLUMN IF NOT EXISTS lyrics_b TEXT;
COMMENT ON COLUMN public.battles.lyrics_a IS 'Fighter A lyrics (optional, shown in arena center)';
COMMENT ON COLUMN public.battles.lyrics_b IS 'Fighter B lyrics (optional)';
