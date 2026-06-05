-- AIPOGER 傷心酒吧 Bar Heartbreak：前台投稿制度
-- 在 Supabase SQL Editor 執行。可重複執行。
--
-- 規則：
-- 1. 傷心酒吧主輪播只收投稿者歌曲；AIPOGER 自己的歌也要透過投稿進場。
-- 2. 原本官方 28 首 soft remove，不佔公播池、不計分；完全無投稿時由前端隱藏店歌備援。
-- 3. 開荒期未滿 88 首時，投稿作品優先進公播池，不開啟 Challenger。
-- 4. 滿 88 首後，投稿作品先進 Challenger；每人同時最多 3 首 Challenger，公播池作品不佔名額。
-- 5. Challenger 在 24H 觀察期內至少 1 顆 heart/thumb/happy/star，才有資格升格公播池。
-- 6. 公播池最多 88 首；Challenger + 公播池最多 100 首共同輪播。
-- 7. 開荒期公播池未滿 88 首時，不做殘酷淘汰。
-- 8. 累積 30 個正向反應的歌曲，取得榮譽榜入選資格。
-- 9. 每 8 小時結算一次；公播池超過 88 首時，最多淘汰 3 首人氣較低的舊歌。
-- 10. 公播池低於或等於 88 首時停止淘汰，不再用 30 天期滿退場。
-- 11. 聽歌不需登入；留言與投票必須登入。每個帳號對每首歌同時只保留 1 個反應，可更換或取消。

alter table public.listen_bar_tracks
  add column if not exists source text not null default 'official',
  add column if not exists is_featured_official boolean not null default true,
  add column if not exists heart_count integer not null default 0,
  add column if not exists thumb_count integer not null default 0,
  add column if not exists happy_count integer not null default 0,
  add column if not exists star_count integer not null default 0,
  add column if not exists positive_reaction_count integer not null default 0,
  add column if not exists review_status text not null default 'approved',
  add column if not exists bar_phase text not null default 'public',
  add column if not exists first_aired_at timestamptz,
  add column if not exists promoted_at timestamptz,
  add column if not exists removed_at timestamptz;

alter table public.listen_bar_tracks
  drop constraint if exists listen_bar_tracks_source_check;

alter table public.listen_bar_tracks
  add constraint listen_bar_tracks_source_check
  check (source in ('official', 'community'));

alter table public.listen_bar_tracks
  drop constraint if exists listen_bar_tracks_review_status_check;

alter table public.listen_bar_tracks
  add constraint listen_bar_tracks_review_status_check
  check (review_status in ('pending', 'approved', 'rejected', 'removed', 'completed'));

alter table public.listen_bar_tracks
  drop constraint if exists listen_bar_tracks_bar_phase_check;

alter table public.listen_bar_tracks
  add constraint listen_bar_tracks_bar_phase_check
  check (bar_phase in ('challenger', 'public'));

update public.listen_bar_tracks
set source = 'official',
    is_featured_official = true,
    review_status = 'removed',
    bar_phase = 'public',
    is_active = false,
    removed_at = coalesce(removed_at, now())
where source is null
   or source = 'official'
   or is_featured_official = true;

create index if not exists listen_bar_tracks_public_rotation_idx
on public.listen_bar_tracks (source, is_active, bar_phase, positive_reaction_count desc, created_at desc);

create index if not exists listen_bar_tracks_challenger_judgment_idx
on public.listen_bar_tracks (source, is_active, bar_phase, created_at, positive_reaction_count desc)
where source = 'community';

create index if not exists listen_bar_tracks_created_by_active_challenger_idx
on public.listen_bar_tracks (created_by, created_at desc)
where source = 'community' and is_active = true and bar_phase = 'challenger';

create or replace function public.listen_bar_tracks_guard_public_submission()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  active_challengers integer := 0;
  active_community_tracks integer := 0;
  is_admin_user boolean := false;
begin
  select coalesce(p.is_admin, false)
  into is_admin_user
  from public.user_profiles p
  where p.id = auth.uid();

  if new.source = 'community' then
    if auth.uid() is null then
      raise exception '請先登入後再投稿 傷心酒吧 Bar Heartbreak。';
    end if;

    if new.created_by is distinct from auth.uid() then
      raise exception '只能用自己的帳號投稿。';
    end if;

    new.is_featured_official := false;
    new.review_status := coalesce(nullif(new.review_status, ''), 'approved');
    new.sort_order := coalesce(new.sort_order, 1000);

    select count(*)
    into active_community_tracks
    from public.listen_bar_tracks t
    where t.source = 'community'
      and t.is_active = true;

    if active_community_tracks < 88 then
      new.bar_phase := 'public';
      new.promoted_at := coalesce(new.promoted_at, now());
    else
      new.bar_phase := 'challenger';
    end if;

    if not coalesce(is_admin_user, false) then
      select count(*)
      into active_challengers
      from public.listen_bar_tracks t
      where t.created_by = auth.uid()
        and t.source = 'community'
        and t.is_active = true
        and t.bar_phase = 'challenger';

      if new.bar_phase = 'challenger' and active_challengers >= 3 then
        raise exception '你的 Challenger 已達 3 首。要再上傳，請先撤下一首 Challenger，或等歌曲進入公播池後空出位置。';
      end if;
    end if;
  else
    if coalesce(is_admin_user, false) then
      new.is_featured_official := true;
      new.review_status := 'approved';
      new.bar_phase := 'public';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_listen_bar_tracks_public_submission on public.listen_bar_tracks;
create trigger trg_listen_bar_tracks_public_submission
before insert on public.listen_bar_tracks
for each row
execute function public.listen_bar_tracks_guard_public_submission();

create table if not exists public.listen_bar_track_reactions (
  track_id uuid not null references public.listen_bar_tracks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null check (reaction in ('heart', 'thumb', 'happy', 'star')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (track_id, user_id)
);

alter table public.listen_bar_track_reactions enable row level security;

grant select on table public.listen_bar_track_reactions to anon, authenticated;
grant insert, update, delete on table public.listen_bar_track_reactions to authenticated;

drop policy if exists listen_bar_track_reactions_public_read on public.listen_bar_track_reactions;
create policy listen_bar_track_reactions_public_read
on public.listen_bar_track_reactions
for select
to anon, authenticated
using (true);

drop policy if exists listen_bar_track_reactions_insert_own on public.listen_bar_track_reactions;
create policy listen_bar_track_reactions_insert_own
on public.listen_bar_track_reactions
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists listen_bar_track_reactions_update_own on public.listen_bar_track_reactions;
create policy listen_bar_track_reactions_update_own
on public.listen_bar_track_reactions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists listen_bar_track_reactions_delete_own on public.listen_bar_track_reactions;
create policy listen_bar_track_reactions_delete_own
on public.listen_bar_track_reactions
for delete
to authenticated
using (auth.uid() = user_id);

create or replace function public.listen_bar_recount_track_reactions(p_track_id uuid)
returns void
language plpgsql
set search_path = public
as $$
begin
  update public.listen_bar_tracks t
  set heart_count = counts.heart_count,
      thumb_count = counts.thumb_count,
      happy_count = counts.happy_count,
      star_count = counts.star_count,
      positive_reaction_count = counts.total_count,
      updated_at = now()
  from (
    select
      count(*) filter (where reaction = 'heart')::integer as heart_count,
      count(*) filter (where reaction = 'thumb')::integer as thumb_count,
      count(*) filter (where reaction = 'happy')::integer as happy_count,
      count(*) filter (where reaction = 'star')::integer as star_count,
      count(*)::integer as total_count
    from public.listen_bar_track_reactions
    where track_id = p_track_id
  ) counts
  where t.id = p_track_id;
end;
$$;

create or replace function public.listen_bar_track_reactions_after_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  perform public.listen_bar_recount_track_reactions(coalesce(new.track_id, old.track_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_listen_bar_track_reactions_after_insert on public.listen_bar_track_reactions;
create trigger trg_listen_bar_track_reactions_after_insert
after insert on public.listen_bar_track_reactions
for each row
execute function public.listen_bar_track_reactions_after_change();

drop trigger if exists trg_listen_bar_track_reactions_after_update on public.listen_bar_track_reactions;
create trigger trg_listen_bar_track_reactions_after_update
after update on public.listen_bar_track_reactions
for each row
execute function public.listen_bar_track_reactions_after_change();

drop trigger if exists trg_listen_bar_track_reactions_after_delete on public.listen_bar_track_reactions;
create trigger trg_listen_bar_track_reactions_after_delete
after delete on public.listen_bar_track_reactions
for each row
execute function public.listen_bar_track_reactions_after_change();

drop policy if exists listen_bar_tracks_creator_insert_community on public.listen_bar_tracks;
create policy listen_bar_tracks_creator_insert_community
on public.listen_bar_tracks
for insert
to authenticated
with check (
  source = 'community'
  and is_featured_official = false
  and created_by = auth.uid()
);

drop policy if exists listen_bar_storage_creator_insert_audio on storage.objects;
create policy listen_bar_storage_creator_insert_audio
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'listen-bar-audio'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists listen_bar_storage_creator_insert_covers on storage.objects;
create policy listen_bar_storage_creator_insert_covers
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'listen-bar-covers'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create or replace function public.process_listen_bar_rotation_limits()
returns table(promoted_to_public integer, completed_monthly_survival integer, removed_from_public integer, removed_over_total_limit integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_promoted_count integer := 0;
  v_completed_count integer := 0;
  v_removed_public_count integer := 0;
  v_removed_over_total_count integer := 0;
  v_public_count integer := 0;
  v_opening_public_seats integer := 0;
  v_promotion_limit integer := 8;
  v_public_overflow integer := 0;
  v_now timestamptz := now();
begin
  select count(*)
  into v_public_count
  from public.listen_bar_tracks
  where source = 'community'
    and is_active = true
    and bar_phase = 'public';

  v_opening_public_seats := greatest(88 - v_public_count, 0);
  v_promotion_limit := case
    when v_opening_public_seats > 0 then v_opening_public_seats
    else 8
  end;

  with promoted as (
    select id
    from public.listen_bar_tracks
    where source = 'community'
      and is_active = true
      and bar_phase = 'challenger'
      and (
        v_opening_public_seats > 0
        or (
          created_at < v_now - interval '24 hours'
          and positive_reaction_count >= 1
        )
      )
    order by positive_reaction_count desc, created_at asc
    limit v_promotion_limit
  )
  update public.listen_bar_tracks t
  set bar_phase = 'public',
      review_status = 'approved',
      promoted_at = v_now,
      updated_at = v_now
  from promoted p
  where t.id = p.id;

  get diagnostics v_promoted_count = row_count;

  select count(*)
  into v_public_count
  from public.listen_bar_tracks
  where source = 'community'
    and is_active = true
    and bar_phase = 'public';

  v_public_overflow := greatest(v_public_count - 88, 0);

  with public_losers as (
    select id
    from public.listen_bar_tracks
    where source = 'community'
      and is_active = true
      and bar_phase = 'public'
    order by positive_reaction_count asc, created_at asc
    limit least(v_public_overflow, 3)
  )
  update public.listen_bar_tracks t
  set is_active = false,
      review_status = 'removed',
      removed_at = v_now,
      updated_at = v_now
  from public_losers l
  where t.id = l.id;

  get diagnostics v_removed_public_count = row_count;

  return query select v_promoted_count, v_completed_count, v_removed_public_count, v_removed_over_total_count;
end;
$$;

revoke all on function public.process_listen_bar_rotation_limits() from public;
grant execute on function public.process_listen_bar_rotation_limits() to authenticated;
