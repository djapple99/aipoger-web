create or replace function public.tick_blind_question(p_user uuid,p_question uuid,p_side text,p_event text,p_position numeric)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare q public.blind_listen_questions%rowtype; elapsed numeric; available numeric:=0; amount numeric:=0;
begin
  if p_side is null or p_event is null or p_side not in ('A','B') or p_event not in ('play','progress','pause','seek')
    or p_position is null or p_position<15 or p_position>45 then
    raise exception 'Invalid listening event' using errcode='22023';
  end if;
  select * into q from public.blind_listen_questions where id=p_question and user_id=p_user for update;
  if not found or q.state<>'pending' or q.expires_at<=now() then raise exception 'Unavailable question' using errcode='42501'; end if;
  if not public.blind_track_eligible(q.track_a_id,p_user) or not public.blind_track_eligible(q.track_b_id,p_user) then
    raise exception 'Unavailable work' using errcode='42501';
  end if;
  -- Seeking never mints listened time. Unlock each side using the same exact
  -- server minimum as voting; an inactive seek must not disturb the other side.
  if p_event='seek' then
    if (case p_side when 'A' then q.heard_a else q.heard_b end)<8 then
      raise exception 'Listen before seeking' using errcode='22023';
    end if;
    if q.active_side=p_side then
      update public.blind_listen_questions set last_position=p_position,last_tick_at=clock_timestamp(),tick_budget=0 where id=q.id;
    end if;
    return jsonb_build_object('heardA',q.heard_a,'heardB',q.heard_b);
  end if;
  if q.active_side=p_side and q.last_tick_at is not null then
    elapsed:=greatest(0,extract(epoch from clock_timestamp()-q.last_tick_at));
    available:=least(6,q.tick_budget+elapsed);
    amount:=least(available,greatest(0,p_position-q.last_position));
    if p_side='A' then q.heard_a:=least(30,q.heard_a+amount); else q.heard_b:=least(30,q.heard_b+amount); end if;
  end if;
  update public.blind_listen_questions set heard_a=q.heard_a,heard_b=q.heard_b,
    active_side=case when p_event='pause' then null else p_side end,
    last_position=p_position,last_tick_at=clock_timestamp(),
    tick_budget=case when p_event='progress' then available-amount else 0 end where id=q.id;
  return jsonb_build_object('heardA',q.heard_a,'heardB',q.heard_b);
end;
$$;
revoke all on function public.tick_blind_question(uuid,uuid,text,text,numeric) from public,anon,authenticated;
grant execute on function public.tick_blind_question(uuid,uuid,text,text,numeric) to service_role;
