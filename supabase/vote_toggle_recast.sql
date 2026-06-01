-- battle_votes：一人一場一票，比賽結束前可改投。
-- 第一次投票時先鎖定 50 APC；改投不重複扣點；結算時投中者返還本金並獲利，共發 100 APC。
-- 可重複執行；不會清除既有投票。

alter table if exists public.battle_votes
  add column if not exists stake_apc integer not null default 50,
  add column if not exists settled_at timestamptz;

create or replace function public.cast_vote(
  p_battle_id uuid,
  p_voted_for text default null
)
returns public.battle_votes
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_vote public.battle_votes%rowtype;
  battle_row public.battles%rowtype;
  current_balance integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_voted_for not in ('fighter_a', 'fighter_b') then
    raise exception 'Invalid vote target';
  end if;

  select *
  into battle_row
  from public.battles
  where id = p_battle_id;

  if battle_row.id is null then
    raise exception 'Battle not found';
  end if;

  if battle_row.winner is not null or battle_row.status = 'finished' then
    raise exception 'Battle already settled';
  end if;

  if auth.uid() in (battle_row.fighter_a_user_id, battle_row.fighter_b_user_id) then
    raise exception 'Fighters cannot vote in their own Battle';
  end if;

  select *
  into existing_vote
  from public.battle_votes
  where battle_id = p_battle_id
    and user_id = auth.uid()
  for update;

  if existing_vote.id is not null then
    update public.battle_votes
    set voted_for = p_voted_for
    where id = existing_vote.id
    returning * into existing_vote;
    return existing_vote;
  end if;

  select coalesce(apc_balance, 0)
  into current_balance
  from public.user_profiles
  where id = auth.uid()
  for update;

  if current_balance < 50 then
    raise exception 'APC 不足 50，請先去 傷心酒吧 Bar Heartbreak 放歌或每日登入累積點數。';
  end if;

  perform public.award_battle_points(auth.uid(), -50, 'audience_vote_stake', null, p_battle_id, '觀眾投票下注');

  insert into public.battle_votes (battle_id, user_id, voted_for, voter_role, stake_apc)
  values (p_battle_id, auth.uid(), p_voted_for, 'audience', 50)
  returning * into existing_vote;

  return existing_vote;
end;
$$;

revoke all on function public.cast_vote(uuid, text) from public;
grant execute on function public.cast_vote(uuid, text) to authenticated;
