-- Allow explicit owner/admin hidden actions while keeping retired legacy/global
-- public-pool removal guards in place.

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
    or v_note like 'owner hidden from bar heartbreak console.%'
    or v_note like 'owner bulk hide from bar heartbreak console.%'
    or v_note like 'owner removed from bar heartbreak console.%'
    or v_note like 'owner bulk remove from bar heartbreak console.%'
    or v_note like 'admin hidden from bar heartbreak console.%'
    or v_note like 'admin bulk hide from bar heartbreak console.%'
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

comment on function public.listen_bar_block_legacy_public_capacity_removal() is
'Blocks retired global 88-track and unmarked Bar Heartbreak public-pool removals. Allows explicit creator/owner/admin hidden or removed actions, moderation removals, and 36-song same-genre capacity removals only when the genre is over 36.';
