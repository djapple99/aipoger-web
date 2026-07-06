-- AIPOGER Bar Heartbreak: retire legacy 88-track rotation paths.
--
-- Current rule:
-- - no global 88-track public pool exists anymore
-- - each fixed genre has its own 36-track public pool
-- - capacity eviction is allowed only inside an overfull genre
-- - creator/admin removals remain allowed when explicitly marked

alter table public.listen_bar_tracks
  add column if not exists moderation_note text;

create or replace function public.process_listen_bar_rotation_limits()
returns table(
  promoted_to_public integer,
  completed_monthly_survival integer,
  removed_from_public integer,
  removed_over_total_limit integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_promoted_count integer := 0;
  v_removed_public_count integer := 0;
  v_now timestamptz := now();
begin
  with promoted as (
    select id
    from public.listen_bar_tracks
    where source = 'community'
      and is_active = true
      and bar_phase = 'challenger'
      and coalesce(review_status, 'approved') not in ('hidden', 'removed', 'completed', 'rejected')
      and hidden_at is null
      and removed_at is null
      and created_at < v_now - interval '24 hours'
    order by created_at asc
  )
  update public.listen_bar_tracks t
  set bar_phase = 'public',
      review_status = 'approved',
      promoted_at = coalesce(t.promoted_at, v_now),
      updated_at = v_now
  from promoted p
  where t.id = p.id;

  get diagnostics v_promoted_count = row_count;

  with visible_public as (
    select
      id,
      coalesce(nullif(trim(genre), ''), 'Original 自我風格') as genre_key,
      coalesce(promoted_at, created_at) as public_started_at,
      coalesce(positive_reaction_count, 0) as positive_reaction_count,
      created_at,
      count(*) over (
        partition by coalesce(nullif(trim(genre), ''), 'Original 自我風格')
      ) as genre_count
    from public.listen_bar_tracks
    where source = 'community'
      and is_active = true
      and bar_phase = 'public'
      and coalesce(review_status, 'approved') not in ('hidden', 'removed', 'completed', 'rejected')
      and hidden_at is null
      and removed_at is null
  ),
  genre_activation as (
    select genre_key, public_started_at as survival_started_at
    from (
      select
        genre_key,
        public_started_at,
        row_number() over (partition by genre_key order by public_started_at asc, created_at asc) as public_rank
      from visible_public
    ) ranked_activation
    where public_rank = 36
  ),
  ranked_public as (
    select
      visible_public.id,
      visible_public.genre_count,
      visible_public.positive_reaction_count,
      visible_public.created_at,
      visible_public.public_started_at,
      genre_activation.survival_started_at,
      row_number() over (
        partition by visible_public.genre_key
        order by visible_public.positive_reaction_count asc, visible_public.created_at asc
      ) as genre_rank
    from visible_public
    join genre_activation on genre_activation.genre_key = visible_public.genre_key
  ),
  public_losers as (
    select id
    from ranked_public
    where genre_count > 36
      and genre_rank <= genre_count - 36
      and not (
        positive_reaction_count >= 30
        or greatest(public_started_at, survival_started_at) <= v_now - interval '7 days'
      )
    order by genre_rank asc
    limit 3
  )
  update public.listen_bar_tracks t
  set is_active = false,
      review_status = 'removed',
      removed_at = v_now,
      moderation_note = '36-song genre public pool capacity rotation eviction.',
      updated_at = v_now
  from public_losers l
  where t.id = l.id;

  get diagnostics v_removed_public_count = row_count;

  return query select
    v_promoted_count,
    0,
    v_removed_public_count,
    0;
end;
$$;

revoke all on function public.process_listen_bar_rotation_limits() from public;
revoke execute on function public.process_listen_bar_rotation_limits() from anon;
revoke execute on function public.process_listen_bar_rotation_limits() from authenticated;
grant execute on function public.process_listen_bar_rotation_limits() to service_role;

comment on function public.process_listen_bar_rotation_limits() is
'AIPOGER Bar Heartbreak current rotation only. Legacy global 88-track rotation is retired; capacity eviction may remove only same-genre overflow above 36.';

create or replace function public.listen_bar_block_legacy_public_capacity_removal()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_genre text;
  v_active_public_in_genre integer := 0;
  v_note text;
  v_manual_removal boolean := false;
  v_capacity_removal boolean := false;
begin
  if old.source is distinct from 'community'
    or old.bar_phase is distinct from 'public'
    or old.is_active is not true
    or old.removed_at is not null
    or coalesce(old.review_status, 'approved') in ('hidden', 'removed', 'completed', 'rejected') then
    return new;
  end if;

  if not (
    new.is_active is false
    or new.removed_at is not null
    or coalesce(new.review_status, 'approved') in ('hidden', 'removed')
  ) then
    return new;
  end if;

  v_note := lower(coalesce(new.moderation_note, ''));
  v_manual_removal :=
    v_note like 'creator removed own bar heartbreak track.%'
    or v_note like 'owner removed from bar heartbreak console.%'
    or v_note like 'owner bulk remove from bar heartbreak console.%'
    or v_note like 'admin removed from bar heartbreak console.%'
    or v_note like 'admin bulk remove from bar heartbreak console.%'
    or v_note like 'moderation:%'
    or v_note like 'content report:%';

  if v_manual_removal then
    return new;
  end if;

  if v_note like '%88-song%'
    or v_note like '%88 首%'
    or v_note like '%88首%'
    or v_note like '%global 88%'
    or v_note like '%legacy 88%'
    or v_note = '' then
    raise exception 'Legacy Bar Heartbreak 88-track or unmarked public-pool removal is blocked. Current rule is 36 tracks per genre only.';
  end if;

  v_capacity_removal := v_note like '%36-song genre public pool capacity rotation eviction%';
  if not v_capacity_removal then
    raise exception 'Unrecognized Bar Heartbreak public-pool removal is blocked. Use an explicit creator/admin/moderation note or the 36-song genre capacity note.';
  end if;

  v_genre := coalesce(nullif(trim(old.genre), ''), 'Original 自我風格');

  select count(*)
  into v_active_public_in_genre
  from public.listen_bar_tracks t
  where t.source = 'community'
    and t.is_active = true
    and t.bar_phase = 'public'
    and coalesce(t.review_status, 'approved') not in ('hidden', 'removed', 'completed', 'rejected')
    and t.hidden_at is null
    and t.removed_at is null
    and coalesce(nullif(trim(t.genre), ''), 'Original 自我風格') = v_genre;

  if v_active_public_in_genre <= 36 then
    raise exception 'Bar Heartbreak capacity removal blocked: genre "%" has % active public tracks, not over 36.', v_genre, v_active_public_in_genre;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_listen_bar_block_legacy_public_capacity_removal on public.listen_bar_tracks;
create trigger trg_listen_bar_block_legacy_public_capacity_removal
before update of is_active, review_status, removed_at, moderation_note on public.listen_bar_tracks
for each row
execute function public.listen_bar_block_legacy_public_capacity_removal();

comment on function public.listen_bar_block_legacy_public_capacity_removal() is
'Blocks retired global 88-track and unmarked Bar Heartbreak public-pool removals. Allows explicit creator/admin/moderation removals and 36-song same-genre capacity removals only when the genre is over 36.';

update public.listen_bar_tracks t
set is_active = true,
    review_status = 'approved',
    removed_at = null,
    hidden_at = null,
    moderation_note = concat_ws(
      ' | ',
      nullif(t.moderation_note, ''),
      'Restored 2026-07-06 after retired legacy/global Bar Heartbreak removal was blocked.'
    ),
    updated_at = now()
where t.source = 'community'
  and t.bar_phase = 'public'
  and t.removed_at in (
    timestamptz '2026-07-05 16:01:07.293+00',
    timestamptz '2026-07-06 00:01:01.791+00'
  )
  and coalesce(t.review_status, 'approved') = 'removed'
  and coalesce(t.moderation_note, '') not in (
    'Creator removed own Bar Heartbreak track.',
    'Owner removed from Bar Heartbreak console.',
    'Owner bulk remove from Bar Heartbreak console.',
    'Admin removed from Bar Heartbreak console.',
    'Admin bulk remove from Bar Heartbreak console.'
  );
