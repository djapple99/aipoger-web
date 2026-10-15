-- Run only as an authorized transactional verification. Every change is rolled back.
begin;
set local role service_role;
do $$
declare c public.listen_bar_track_comments%rowtype; o public.listen_bar_track_comments%rowtype;
  member_score numeric; owner_score numeric; owner_id uuid; reward_sum bigint; changed text;
begin
  select * into c from public.listen_bar_track_comments c0 where c0.moderation_status='visible'
    and not public.work_review_owner(c0.user_id) and c0.review_edit_count=0
    and exists(select 1 from public.mv_work_ratings r join public.listen_bar_tracks t on t.id=r.track_id
      where r.comment_id=c0.id and t.is_active and t.review_status='approved' and t.hidden_at is null and t.removed_at is null)
    order by created_at desc limit 1;
  select c0.* into o from public.listen_bar_track_comments c0 join public.mv_work_ratings r on r.comment_id=c0.id
    where c0.moderation_status='visible' and public.work_review_owner(c0.user_id) limit 1;
  if c.id is null or o.id is null then raise exception 'Existing member/owner review not available for rollback verification'; end if;
  owner_id:=o.user_id;
  select score into member_score from public.mv_work_ratings where comment_id=c.id;
  select score into owner_score from public.mv_work_ratings where comment_id=o.id;
  select coalesce(sum(delta),0) into reward_sum from public.creator_credit_history where user_id=c.user_id;
  begin
    perform public.save_work_review(c.track_id,c.user_id,case when member_score<10 then member_score+0.1 else 9.9 end,'','QA',gen_random_uuid(),'mv');
    raise exception 'Score changed';
  exception when insufficient_privilege then if sqlerrm<>'REVIEW_SCORE_LOCKED' then raise; end if; end;
  begin
    perform public.edit_work_review(c.user_id,c.id,c.body,false);
    raise exception 'Member deleted review';
  exception when insufficient_privilege then if sqlerrm<>'REVIEW_OWNER_ONLY' then raise; end if; end;
  changed:='交易內測試音樂旋律與節奏的細節，這段測試內容會完整回滾。'||gen_random_uuid()::text;
  perform public.edit_work_review(c.user_id,c.id,changed,true,null);
  perform public.edit_work_review(c.user_id,c.id,changed,true,null);
  if (select review_edit_count from public.listen_bar_track_comments where id=c.id)<>1 then raise exception 'Retry consumed extra edit'; end if;
  -- A previously short/nonqualifying review may earn its first award through the edit.
  if (select coalesce(sum(delta),0) from public.creator_credit_history where user_id=c.user_id) not in (reward_sum,reward_sum+10) then raise exception 'Invalid edit award'; end if;
  select coalesce(sum(delta),0) into reward_sum from public.creator_credit_history where user_id=c.user_id;
  begin
    perform public.edit_work_review(c.user_id,c.id,changed||'再改一次',true,null);
    raise exception 'Second member edit succeeded';
  exception when insufficient_privilege then if sqlerrm<>'REVIEW_EDIT_LIMIT' then raise; end if; end;
  perform public.edit_work_review(owner_id,o.id,'Owner交易內修改測試第一版',true,8.1);
  perform public.edit_work_review(owner_id,o.id,'Owner交易內修改測試第二版',true,8.2);
  if (select review_edit_count from public.listen_bar_track_comments where id=o.id)<2 then raise exception 'Owner edit limited'; end if;
  perform public.edit_work_review(owner_id,c.id,'',false,null);
  if (select moderation_status from public.listen_bar_track_comments where id=c.id)<>'hidden' then raise exception 'Owner deletion failed'; end if;
  if (select coalesce(sum(delta),0) from public.creator_credit_history where user_id=c.user_id)<>reward_sum then raise exception 'Review reward changed'; end if;
end;
$$;
rollback;
select 'review_finality_transaction_passed_and_rolled_back' as verification;
