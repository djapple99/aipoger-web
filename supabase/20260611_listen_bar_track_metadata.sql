-- AIPOGER 傷心酒吧：創作者補資料與一句歌曲介紹
-- 在 Supabase SQL Editor 執行。可重複執行。

alter table public.listen_bar_tracks
  add column if not exists description text;

comment on column public.listen_bar_tracks.description is
  'One-line creator supplied track description shown on Bar Heartbreak now-playing UI.';
