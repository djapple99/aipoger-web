-- AIPOGER 傷心酒吧 Bar Heartbreak：每日反應票制
-- 在 Supabase SQL Editor 執行。可重複執行。
--
-- 規則：
-- 1. 每個登入帳號對每首歌每天保留 1 筆反應，可更換或取消當天反應。
-- 2. 歌曲上的 heart/thumb/happy/star 顯示所有日期累積總數。
-- 3. 「今天是否已投」以台北日期 Asia/Taipei 判斷。

alter table public.listen_bar_track_reactions
  add column if not exists vote_date date;

update public.listen_bar_track_reactions
set vote_date = (timezone('Asia/Taipei', coalesce(updated_at, created_at, now())))::date
where vote_date is null;

alter table public.listen_bar_track_reactions
  alter column vote_date set default (timezone('Asia/Taipei', now()))::date,
  alter column vote_date set not null;

delete from public.listen_bar_track_reactions r
using (
  select ctid
  from (
    select
      ctid,
      row_number() over (
        partition by track_id, user_id, vote_date
        order by updated_at desc, created_at desc
      ) as rn
    from public.listen_bar_track_reactions
  ) ranked
  where ranked.rn > 1
) dupes
where r.ctid = dupes.ctid;

alter table public.listen_bar_track_reactions
  drop constraint if exists listen_bar_track_reactions_pkey;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.listen_bar_track_reactions'::regclass
      and contype = 'p'
  ) then
    alter table public.listen_bar_track_reactions
      add constraint listen_bar_track_reactions_pkey
      primary key (track_id, user_id, vote_date);
  end if;
end $$;

create index if not exists listen_bar_track_reactions_user_date_track_idx
on public.listen_bar_track_reactions (user_id, vote_date, track_id);

create index if not exists listen_bar_track_reactions_track_idx
on public.listen_bar_track_reactions (track_id);

comment on column public.listen_bar_track_reactions.vote_date is
  'Asia/Taipei calendar date for the daily one-reaction-per-account-per-track rule.';

drop policy if exists listen_bar_track_reactions_insert_own on public.listen_bar_track_reactions;
create policy listen_bar_track_reactions_insert_own
on public.listen_bar_track_reactions
for insert
to authenticated
with check (
  auth.uid() = user_id
  and vote_date = (timezone('Asia/Taipei', now()))::date
);

drop policy if exists listen_bar_track_reactions_update_own on public.listen_bar_track_reactions;
create policy listen_bar_track_reactions_update_own
on public.listen_bar_track_reactions
for update
to authenticated
using (
  auth.uid() = user_id
  and vote_date = (timezone('Asia/Taipei', now()))::date
)
with check (
  auth.uid() = user_id
  and vote_date = (timezone('Asia/Taipei', now()))::date
);

drop policy if exists listen_bar_track_reactions_delete_own on public.listen_bar_track_reactions;
create policy listen_bar_track_reactions_delete_own
on public.listen_bar_track_reactions
for delete
to authenticated
using (
  auth.uid() = user_id
  and vote_date = (timezone('Asia/Taipei', now()))::date
);

select public.listen_bar_recount_track_reactions(id)
from public.listen_bar_tracks
where is_active = true;
