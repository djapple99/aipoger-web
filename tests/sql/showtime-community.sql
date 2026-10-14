-- Transaction-only fixtures. No real user/work/Credit is changed or retained.
begin;
do $$
declare creator uuid:=gen_random_uuid(); reviewer uuid:=gen_random_uuid();
  one uuid:=gen_random_uuid(); two uuid:=gen_random_uuid(); own uuid:=gen_random_uuid();
  hidden uuid:=gen_random_uuid(); pair uuid:=gen_random_uuid(); bad_pair uuid:=gen_random_uuid();
  result jsonb; amount integer;
begin
  insert into auth.users(id) values(creator),(reviewer);
  insert into public.fighter_profiles(id,display_name) values(creator,'QA Showtime creator'),(reviewer,'QA Showtime reviewer')
    on conflict(id) do update set display_name=excluded.display_name;
  perform set_config('request.jwt.claim.sub',creator::text,true);
  insert into public.listen_bar_tracks(id,title,artist,created_by,source,is_active,review_status,audio_path,genre,created_at)
    values(one,'QA one','QA',creator,'community',true,'approved','qa/one.mp3','Original 自我風格',now()),
    (two,'QA two','QA',creator,'community',true,'approved','qa/two.mp3','Original 自我風格',now()),
    (hidden,'QA removed','QA',creator,'community',true,'approved','qa/hidden.mp3','Original 自我風格',now());
  update public.listen_bar_tracks set hidden_at=now() where id=hidden;
  perform set_config('request.jwt.claim.sub',reviewer::text,true);
  insert into public.listen_bar_tracks(id,title,artist,created_by,source,is_active,review_status,audio_path,genre,created_at)
    values(own,'QA own','QA',reviewer,'community',true,'approved','qa/own.mp3','Original 自我風格',now());
  insert into public.listen_bar_track_comments(track_id,user_id,display_name,body,moderation_status,created_at) values
    (one,reviewer,'QA Showtime reviewer',repeat('a',20),'visible',now()),
    (one,reviewer,'QA Showtime reviewer',repeat('b',20),'visible',now()),
    (two,reviewer,'QA Showtime reviewer','too short','visible',now()),
    (two,reviewer,'QA Showtime reviewer',repeat('c',20),'hidden',now()),
    (two,reviewer,'QA Showtime reviewer',repeat('d',20),'visible',now()-interval '31 days'),
    (own,reviewer,'QA Showtime reviewer',repeat('e',20),'visible',now()),
    (hidden,reviewer,'QA Showtime reviewer',repeat('f',20),'visible',now());
  insert into public.blind_listen_questions(id,user_id,track_a_id,track_b_id,state,choice,heard_a,heard_b,completed_at)
    values(pair,reviewer,one,two,'voted','tie',8,8,now()),
    (bad_pair,reviewer,one,own,'voted','A',7.9,8,now());
  insert into public.creator_credit_entries(user_id,delta,reason,source_id)
    values(reviewer,3,'blind_compare',pair),(reviewer,3,'blind_compare',bad_pair);
  result:=public.showtime_community_summary();
  select (p->>'count')::integer into amount from jsonb_array_elements(result->'reviewers') p where p->>'name'='QA Showtime reviewer';
  if amount is distinct from 1 then raise exception 'Duplicate, short, hidden, expired or self reviews incorrectly counted: %',amount; end if;
  select (p->>'count')::integer into amount from jsonb_array_elements(result->'listeners') p where p->>'name'='QA Showtime reviewer';
  if amount is distinct from 1 then raise exception 'Tie or eight-second listening qualification incorrect: %',amount; end if;
  select (p->>'count')::integer into amount from jsonb_array_elements(result->'creators') p where p->>'name'='QA Showtime creator';
  if amount is distinct from 2 then raise exception 'Hidden submission incorrectly counted: %',amount; end if;
  if jsonb_array_length(result->'reviewers')>5 or jsonb_array_length(result->'creators')>5 or jsonb_array_length(result->'listeners')>5 then raise exception 'Top5 limit'; end if;
  if jsonb_array_length(result->'reviews')>2 then raise exception 'Excerpt limit'; end if;
  if exists(select 1 from jsonb_array_elements(result->'reviewers') p where p ? 'user_id' or p ? 'email') then raise exception 'Private identity leaked'; end if;
  if has_function_privilege('anon','public.showtime_community_summary()','execute') or has_function_privilege('authenticated','public.showtime_community_summary()','execute') then raise exception 'Private RPC publicly executable'; end if;
end $$;
select 'Showtime fixtures passed; rollback follows' result;
rollback;
