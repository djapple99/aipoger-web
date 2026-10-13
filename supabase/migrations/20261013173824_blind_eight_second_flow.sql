create or replace function public.complete_blind_question(p_user uuid,p_question uuid,p_choice text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare q public.blind_listen_questions%rowtype; balance bigint;
begin
  if p_choice is null or p_choice not in ('A','B','tie') then raise exception 'Invalid choice' using errcode='22023'; end if;
  select * into q from public.blind_listen_questions where id=p_question and user_id=p_user for update;
  if not found then raise exception 'Unavailable question' using errcode='42501'; end if;
  if q.state='voted' then
    select coalesce(sum(delta),0) into balance from public.creator_credit_entries where user_id=p_user;
    return jsonb_build_object('choice',q.choice,'awarded',0,'balance',balance,'replayed',true);
  end if;
  if q.state<>'pending' or q.expires_at<=now() or not public.blind_track_eligible(q.track_a_id,p_user)
    or not public.blind_track_eligible(q.track_b_id,p_user) then raise exception 'Unavailable work' using errcode='42501'; end if;
  -- Eight measured seconds per side; no tolerance below the published minimum.
  if q.heard_a<8 or q.heard_b<8 then raise exception 'Listen to both excerpts first' using errcode='22023'; end if;
  update public.blind_listen_questions set state='voted',choice=p_choice,active_side=null,completed_at=now() where id=q.id;
  insert into public.creator_credit_entries(user_id,delta,reason,source_id) values(p_user,3,'blind_compare',q.id);
  select coalesce(sum(delta),0) into balance from public.creator_credit_entries where user_id=p_user;
  return jsonb_build_object('choice',p_choice,'awarded',3,'balance',balance,'replayed',false);
end;
$$;
revoke all on function public.complete_blind_question(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.complete_blind_question(uuid,uuid,text) to service_role;

-- Consolidate ticket lookup, current eligibility and source into one DB read.
create or replace function public.blind_audio_source(p_question uuid,p_side text)
returns text language sql stable security invoker set search_path='' as $$
  select t.audio_path from public.blind_listen_questions q
    join public.listen_bar_tracks t on t.id=case p_side when 'A' then q.track_a_id when 'B' then q.track_b_id end
    where q.id=p_question and q.state in ('pending','voted') and q.expires_at>now()
      and public.blind_track_eligible(t.id,q.user_id);
$$;
revoke all on function public.blind_audio_source(uuid,text) from public,anon,authenticated;
grant execute on function public.blind_audio_source(uuid,text) to service_role;
