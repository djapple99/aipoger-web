-- AIPOGER 傷心酒吧 Bar Heartbreak：公測規則
-- 保留門檻：24H 內累積 4 個 emoji。
-- 輪播池：一般創作者作品最多 66 首；官方歌單不計入。
--
comment on table public.listen_bar_tracks is
'AIPOGER Bar Heartbreak rotation. Public beta rule: fill community pool to 66 first; after that, community tracks stay with 4 emoji in 24H; official tracks are exempt.';

create or replace function public.process_listen_bar_rotation_limits()
returns table(deactivated_under_threshold integer, deactivated_over_limit integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_under_count integer := 0;
  v_over_count integer := 0;
  v_active_count integer := 0;
  v_remove_slots integer := 0;
begin
  select count(*)
  into v_active_count
  from public.listen_bar_tracks
  where source = 'community'
    and is_active = true;

  if v_active_count <= 66 then
    return query select 0, 0;
    return;
  end if;

  v_remove_slots := greatest(v_active_count - 66, 0);

  with under_threshold as (
    select id
    from public.listen_bar_tracks
    where source = 'community'
      and is_active = true
      and created_at < now() - interval '24 hours'
      and positive_reaction_count < 4
    order by positive_reaction_count asc, created_at asc
    limit v_remove_slots
  )
  update public.listen_bar_tracks t
  set is_active = false,
      review_status = 'removed',
      updated_at = now()
  from under_threshold u
  where t.id = u.id;

  get diagnostics v_under_count = row_count;

  with ranked as (
    select id,
           row_number() over (order by positive_reaction_count desc, created_at desc) as rn
    from public.listen_bar_tracks
    where source = 'community'
      and is_active = true
  )
  update public.listen_bar_tracks t
  set is_active = false,
      review_status = 'removed',
      updated_at = now()
  from ranked r
  where t.id = r.id
    and r.rn > 66;

  get diagnostics v_over_count = row_count;

  return query select v_under_count, v_over_count;
end;
$$;

revoke all on function public.process_listen_bar_rotation_limits() from public;
grant execute on function public.process_listen_bar_rotation_limits() to authenticated;
