-- AIPOGER Bar Heartbreak: underfilled genres enter public pool immediately.
-- Current rule:
-- - each fixed genre has a 36-track public pool
-- - if a genre has fewer than 36 active public songs, a new community submission enters public immediately
-- - only a full genre sends new submissions into Challenger
-- - Challenger slot limits are calculated per creator + genre

create or replace function public.listen_bar_challenger_slot_limit_for_public_count(p_public_count integer)
returns integer
language sql
immutable
set search_path = public
as $$
  select case
    when greatest(coalesce(p_public_count, 0), 0) >= 6 then 1
    when greatest(coalesce(p_public_count, 0), 0) >= 3 then 2
    else 3
  end;
$$;

create or replace function public.listen_bar_tracks_guard_public_submission()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  active_challengers integer := 0;
  active_public_tracks integer := 0;
  genre_public_tracks integer := 0;
  challenger_slot_limit integer := 3;
  is_admin_user boolean := false;
  v_genre text := nullif(trim(coalesce(new.genre, '')), '');
  v_now timestamptz := now();
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

    if v_genre is null then
      raise exception '請從固定類型選單選擇歌曲類型。';
    end if;

    new.genre := v_genre;
    new.is_featured_official := false;
    new.review_status := coalesce(nullif(new.review_status, ''), 'approved');
    new.sort_order := coalesce(new.sort_order, 1000);

    select count(*)
    into genre_public_tracks
    from public.listen_bar_tracks t
    where t.source = 'community'
      and t.is_active = true
      and t.bar_phase = 'public'
      and coalesce(nullif(trim(t.genre), ''), 'Original 自我風格') = v_genre
      and coalesce(t.review_status, 'approved') not in ('hidden', 'removed', 'completed', 'rejected')
      and t.hidden_at is null
      and t.removed_at is null;

    if genre_public_tracks < 36 then
      new.bar_phase := 'public';
      new.promoted_at := coalesce(new.promoted_at, v_now);
      return new;
    end if;

    new.bar_phase := 'challenger';
    new.promoted_at := null;

    if not coalesce(is_admin_user, false) then
      select count(*)
      into active_challengers
      from public.listen_bar_tracks t
      where t.created_by = auth.uid()
        and t.source = 'community'
        and t.is_active = true
        and t.bar_phase = 'challenger'
        and coalesce(nullif(trim(t.genre), ''), 'Original 自我風格') = v_genre
        and coalesce(t.review_status, 'approved') not in ('hidden', 'removed', 'completed', 'rejected')
        and t.hidden_at is null
        and t.removed_at is null;

      select count(*)
      into active_public_tracks
      from public.listen_bar_tracks t
      where t.created_by = auth.uid()
        and t.source = 'community'
        and t.is_active = true
        and t.bar_phase = 'public'
        and coalesce(nullif(trim(t.genre), ''), 'Original 自我風格') = v_genre
        and coalesce(t.review_status, 'approved') not in ('hidden', 'removed', 'completed', 'rejected')
        and t.hidden_at is null
        and t.removed_at is null;

      challenger_slot_limit := public.listen_bar_challenger_slot_limit_for_public_count(active_public_tracks);

      if active_challengers >= challenger_slot_limit then
        raise exception '你的 % 公播池已有 % 首，現在 Challenger 上限是 % 首。要再上傳，請先撤下一首同類 Challenger，或等同類公播池釋出空間。',
          v_genre,
          active_public_tracks,
          challenger_slot_limit;
      end if;
    end if;
  else
    if coalesce(is_admin_user, false) then
      if v_genre is null then
        raise exception '請從固定類型選單選擇歌曲類型。';
      end if;
      new.genre := v_genre;
      new.is_featured_official := true;
      new.review_status := 'approved';
      new.bar_phase := 'public';
      new.promoted_at := coalesce(new.promoted_at, v_now);
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

with active_challengers as (
  select
    t.id,
    coalesce(nullif(trim(t.genre), ''), 'Original 自我風格') as genre_key,
    row_number() over (
      partition by coalesce(nullif(trim(t.genre), ''), 'Original 自我風格')
      order by t.created_at asc, t.id asc
    ) as challenger_rank
  from public.listen_bar_tracks t
  where t.source = 'community'
    and t.is_active = true
    and t.bar_phase = 'challenger'
    and coalesce(t.review_status, 'approved') not in ('hidden', 'removed', 'completed', 'rejected')
    and t.hidden_at is null
    and t.removed_at is null
),
public_counts as (
  select
    coalesce(nullif(trim(t.genre), ''), 'Original 自我風格') as genre_key,
    count(*)::integer as public_count
  from public.listen_bar_tracks t
  where t.source = 'community'
    and t.is_active = true
    and t.bar_phase = 'public'
    and coalesce(t.review_status, 'approved') not in ('hidden', 'removed', 'completed', 'rejected')
    and t.hidden_at is null
    and t.removed_at is null
  group by 1
),
to_promote as (
  select c.id
  from active_challengers c
  left join public_counts p on p.genre_key = c.genre_key
  where coalesce(p.public_count, 0) + c.challenger_rank <= 36
)
update public.listen_bar_tracks t
set bar_phase = 'public',
    review_status = 'approved',
    promoted_at = coalesce(t.promoted_at, now()),
    updated_at = now(),
    moderation_note = concat_ws(
      E'\n',
      nullif(t.moderation_note, ''),
      'Auto-promoted by 20260702 underfilled genre public entry rule.'
    )
from to_promote p
where t.id = p.id;
