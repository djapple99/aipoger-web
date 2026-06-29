-- AIPOGER Listen Bar daily spotlight.
-- Keeps social campaign picks tied to the same listen_bar_tracks row so hearts,
-- comments, and analytics can connect back to Bar Heartbreak without interrupting radio rotation.

create table if not exists public.listen_bar_daily_spotlights (
  id uuid primary key default gen_random_uuid(),
  spotlight_date date not null unique,
  track_id uuid not null references public.listen_bar_tracks(id) on delete cascade,
  title text not null,
  intro text,
  short_caption text,
  status text not null default 'active',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint listen_bar_daily_spotlights_status_check check (status in ('draft', 'active', 'archived'))
);

create index if not exists listen_bar_daily_spotlights_track_idx
on public.listen_bar_daily_spotlights (track_id, spotlight_date desc);

alter table public.listen_bar_daily_spotlights enable row level security;

grant select on table public.listen_bar_daily_spotlights to anon, authenticated;
grant select, insert, update, delete on table public.listen_bar_daily_spotlights to service_role;

drop policy if exists public_read_active_listen_bar_daily_spotlights on public.listen_bar_daily_spotlights;
create policy public_read_active_listen_bar_daily_spotlights
on public.listen_bar_daily_spotlights
for select
to anon, authenticated
using (status = 'active');

drop policy if exists service_manage_listen_bar_daily_spotlights on public.listen_bar_daily_spotlights;
create policy service_manage_listen_bar_daily_spotlights
on public.listen_bar_daily_spotlights
for all
to service_role
using (true)
with check (true);

alter table public.social_posts
drop constraint if exists social_posts_source_type_check;

alter table public.social_posts
add constraint social_posts_source_type_check
check (source_type in ('manual', 'battle_result', 'listen_bar_daily_spotlight'));

create unique index if not exists social_posts_daily_spotlight_unique_idx
on public.social_posts (source_type, source_id)
where source_type = 'listen_bar_daily_spotlight' and source_id is not null;

with spotlight as (
  insert into public.listen_bar_daily_spotlights (
    spotlight_date,
    track_id,
    title,
    intro,
    short_caption,
    status,
    updated_at
  )
  values (
    date '2026-06-30',
    'bf7e7d32-01c1-4ec8-837c-3cb4cefcdca2',
    '每日推薦歌｜橘貓。女巫。月',
    '今晚推薦 Tank Lu《橘貓。女巫。月》：動感電音裡帶一點奇幻感，像夜裡有貓走過合成器。',
    '今天的傷心酒吧推薦：Tank Lu《橘貓。女巫。月》。進來聽完整版，喜歡就按愛心，這顆心會直接算進歌曲成績。',
    'active',
    now()
  )
  on conflict (spotlight_date) do update
  set
    track_id = excluded.track_id,
    title = excluded.title,
    intro = excluded.intro,
    short_caption = excluded.short_caption,
    status = excluded.status,
    updated_at = now()
  returning *
),
existing_post as (
  select id
  from public.social_posts
  where source_type = 'listen_bar_daily_spotlight'
    and source_id = (select id::text from spotlight)
  limit 1
),
inserted_post as (
  insert into public.social_posts (
    source_type,
    source_id,
    language,
    title,
    body,
    cta,
    link_url,
    status,
    updated_at
  )
  select
    'listen_bar_daily_spotlight',
    spotlight.id::text,
    'zh',
    '每日推薦歌｜Tank Lu《橘貓。女巫。月》',
    spotlight.intro,
    spotlight.short_caption,
    'https://aipoger.com/listen-bar?spotlight=2026-06-30&lang=zh',
    'needs_review',
    now()
  from spotlight
  where not exists (select 1 from existing_post)
  returning id
),
target_post as (
  select id from inserted_post
  union all
  select id from existing_post
),
draft_targets(platform, publish_mode, title, content_text, target_url, manual_publish_url, background_audio_url, background_audio_label, notes) as (
  values
    (
      'discord',
      'api',
      '每日推薦歌｜Tank Lu《橘貓。女巫。月》',
      'AIPOGER 每日推薦歌

Tank Lu《橘貓。女巫。月》
類型：動感電音
工具：Suno

今晚推薦 Tank Lu《橘貓。女巫。月》：動感電音裡帶一點奇幻感，像夜裡有貓走過合成器。

進來聽完整歌曲，喜歡就按愛心，這顆心會直接算進傷心酒吧成績。

https://aipoger.com/listen-bar?spotlight=2026-06-30&lang=zh',
      'https://aipoger.com/listen-bar?spotlight=2026-06-30&lang=zh',
      null,
      'https://rwueinzgjaaefjvmsyem.supabase.co/storage/v1/object/public/listen-bar-audio/64667ac8-9c43-45e0-8ebb-83cd16ba94d6/community/1781699273655-331d8449-c4f3-4035-86fe-8c340d87cb94-l.n.c-.mp3',
      '橘貓。女巫。月',
      '每日推薦歌可直發 Discord；連結會帶聽眾直接進 Spotlight，不打斷一般輪播。'
    ),
    (
      'x',
      'api',
      '每日推薦歌｜Tank Lu《橘貓。女巫。月》',
      '今天的 AIPOGER 每日推薦歌：Tank Lu《橘貓。女巫。月》

動感電音 / Suno

進來聽完整歌曲，喜歡就按愛心，這顆心會直接算進傷心酒吧成績。

https://aipoger.com/listen-bar?spotlight=2026-06-30&lang=zh',
      'https://aipoger.com/listen-bar?spotlight=2026-06-30&lang=zh',
      null,
      'https://rwueinzgjaaefjvmsyem.supabase.co/storage/v1/object/public/listen-bar-audio/64667ac8-9c43-45e0-8ebb-83cd16ba94d6/community/1781699273655-331d8449-c4f3-4035-86fe-8c340d87cb94-l.n.c-.mp3',
      '橘貓。女巫。月',
      'X 第一版發文字與 Spotlight 連結；音檔保留作素材提示。'
    ),
    (
      'instagram',
      'draft_only',
      '每日推薦歌｜Tank Lu《橘貓。女巫。月》',
      '今天的傷心酒吧推薦：Tank Lu《橘貓。女巫。月》。進來聽完整版，喜歡就按愛心，這顆心會直接算進歌曲成績。

#AIPOGER #愛播歌 #AIMusic #SunoAI #DropBattle #每日推薦歌 #傷心酒吧',
      'https://aipoger.com/listen-bar?spotlight=2026-06-30&lang=zh',
      null,
      'https://rwueinzgjaaefjvmsyem.supabase.co/storage/v1/object/public/listen-bar-audio/64667ac8-9c43-45e0-8ebb-83cd16ba94d6/community/1781699273655-331d8449-c4f3-4035-86fe-8c340d87cb94-l.n.c-.mp3',
      '橘貓。女巫。月',
      'IG Reels/圖文草稿；發布時使用推薦歌曲片段當背景配樂。'
    ),
    (
      'tiktok',
      'draft_only',
      '每日推薦歌｜Tank Lu《橘貓。女巫。月》',
      'Shorts 腳本：
1. 開場：今天推薦 Tank Lu《橘貓。女巫。月》。
2. 中段：截取最有記憶點的一段，畫面放歌曲名、創作者、類型 動感電音。
3. 結尾 CTA：進 AIPOGER 傷心酒吧聽完整版，喜歡就按愛心。

Caption:
今天的傷心酒吧推薦：Tank Lu《橘貓。女巫。月》。進來聽完整版，喜歡就按愛心，這顆心會直接算進歌曲成績。
#AIPOGER #愛播歌 #AIMusic #SunoAI #DropBattle #每日推薦歌 #傷心酒吧',
      'https://aipoger.com/listen-bar?spotlight=2026-06-30&lang=zh',
      null,
      'https://rwueinzgjaaefjvmsyem.supabase.co/storage/v1/object/public/listen-bar-audio/64667ac8-9c43-45e0-8ebb-83cd16ba94d6/community/1781699273655-331d8449-c4f3-4035-86fe-8c340d87cb94-l.n.c-.mp3',
      '橘貓。女巫。月',
      'TikTok 先產 Shorts 腳本與 caption；發布時使用推薦歌曲片段。'
    ),
    (
      'youtube',
      'draft_only',
      '每日推薦歌｜Tank Lu《橘貓。女巫。月》',
      'Shorts 標題：今天推薦 Tank Lu《橘貓。女巫。月》

Description:
今天的傷心酒吧推薦：Tank Lu《橘貓。女巫。月》。進來聽完整版，喜歡就按愛心，這顆心會直接算進歌曲成績。

聽完整版：https://aipoger.com/listen-bar?spotlight=2026-06-30&lang=zh
#AIPOGER #愛播歌 #AIMusic #SunoAI #DropBattle #每日推薦歌 #傷心酒吧',
      'https://aipoger.com/listen-bar?spotlight=2026-06-30&lang=zh',
      null,
      'https://rwueinzgjaaefjvmsyem.supabase.co/storage/v1/object/public/listen-bar-audio/64667ac8-9c43-45e0-8ebb-83cd16ba94d6/community/1781699273655-331d8449-c4f3-4035-86fe-8c340d87cb94-l.n.c-.mp3',
      '橘貓。女巫。月',
      'YouTube Shorts 標題與 description；發布時使用推薦歌曲片段。'
    ),
    (
      'facebook_group',
      'manual',
      '每日推薦歌｜Tank Lu《橘貓。女巫。月》',
      'AIPOGER 每日推薦歌

Tank Lu《橘貓。女巫。月》
類型：動感電音
工具：Suno

今晚推薦 Tank Lu《橘貓。女巫。月》：動感電音裡帶一點奇幻感，像夜裡有貓走過合成器。

進來聽完整歌曲，喜歡就按愛心，這顆心會直接算進傷心酒吧成績。

#AIPOGER #愛播歌 #AIMusic #SunoAI #DropBattle #每日推薦歌 #傷心酒吧

https://aipoger.com/listen-bar?spotlight=2026-06-30&lang=zh',
      'https://aipoger.com/listen-bar?spotlight=2026-06-30&lang=zh',
      'https://www.facebook.com/groups/aipoger',
      'https://rwueinzgjaaefjvmsyem.supabase.co/storage/v1/object/public/listen-bar-audio/64667ac8-9c43-45e0-8ebb-83cd16ba94d6/community/1781699273655-331d8449-c4f3-4035-86fe-8c340d87cb94-l.n.c-.mp3',
      '橘貓。女巫。月',
      'Facebook 社團採半自動：複製文案、使用推薦歌曲素材、手動貼到社團。'
    )
)
insert into public.social_post_targets (
  post_id,
  platform,
  publish_mode,
  status,
  title,
  content_text,
  target_url,
  manual_publish_url,
  background_audio_url,
  background_audio_label,
  notes,
  updated_at
)
select
  target_post.id,
  draft_targets.platform,
  draft_targets.publish_mode,
  'needs_review',
  draft_targets.title,
  draft_targets.content_text,
  draft_targets.target_url,
  draft_targets.manual_publish_url,
  draft_targets.background_audio_url,
  draft_targets.background_audio_label,
  draft_targets.notes,
  now()
from target_post
cross join draft_targets
on conflict (post_id, platform) do update
set
  publish_mode = excluded.publish_mode,
  status = excluded.status,
  title = excluded.title,
  content_text = excluded.content_text,
  target_url = excluded.target_url,
  manual_publish_url = excluded.manual_publish_url,
  background_audio_url = excluded.background_audio_url,
  background_audio_label = excluded.background_audio_label,
  notes = excluded.notes,
  updated_at = now();
