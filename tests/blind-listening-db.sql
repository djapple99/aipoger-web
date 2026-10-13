-- Execute as one transaction; every fixture and test award is rolled back.
begin;
do $$
declare
  listener uuid:=gen_random_uuid(); author uuid:=gen_random_uuid();
  a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); c uuid:=gen_random_uuid();
  q uuid; q2 uuid; r jsonb; total bigint; sample bigint; points numeric;
begin
  insert into auth.users(id,aud,role,email,email_confirmed_at,is_anonymous)
    values(listener,'authenticated','authenticated',listener||'@example.test',now(),false),
          (author,'authenticated','authenticated',author||'@example.test',now(),false);
  perform set_config('request.jwt.claim.sub',author::text,true);
  insert into public.listen_bar_tracks(id,title,artist,genre,duration_seconds,audio_path,source,created_by,is_active,review_status,is_featured_official,created_at)
    values(a,'Blind fixture A','Fixture','Original 自我風格',120,'fixture/a.mp3','community',author,true,'approved',false,now()-interval '1 day'),
          (b,'Blind fixture B','Fixture','Original 自我風格',120,'fixture/b.mp3','community',author,true,'approved',false,now()-interval '1 day'),
          (c,'Blind fixture C','Fixture','Original 自我風格',120,'fixture/c.mp3','community',author,true,'approved',false,now()-interval '1 day');
  perform set_config('request.jwt.claim.sub',listener::text,true);
  if public.blind_track_eligible(a,author) then raise exception 'Author may not self-evaluate'; end if;
  q:=public.issue_blind_question(listener,a,b);
  if q is null then raise exception 'Missing question'; end if;
  if public.issue_blind_question(listener,c,b)<>q then raise exception 'Concurrent starts must resume pending question'; end if;
  begin
    perform public.complete_blind_question(listener,q,'A'); raise exception 'Unheard award accepted';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.complete_blind_question(author,q,'A'); raise exception 'Foreign ownership accepted';
  exception when insufficient_privilege then null;
  end;
  perform public.tick_blind_question(listener,q,'A','play',15);
  r:=public.tick_blind_question(listener,q,'A','progress',45);
  if (r->>'heardA')::numeric>=1 then raise exception 'Fast client reports minted listening time'; end if;
  update public.blind_listen_questions set last_tick_at=clock_timestamp()-interval '2 seconds',last_position=15 where id=q;
  r:=public.tick_blind_question(listener,q,'A','progress',17);
  if (r->>'heardA')::numeric<1.9 or (r->>'heardA')::numeric>2.2 then raise exception 'Elapsed-time cap failed'; end if;
  update public.blind_listen_questions set last_tick_at=clock_timestamp()-interval '2.3 seconds' where id=q;
  perform public.tick_blind_question(listener,q,'A','progress',19);
  update public.blind_listen_questions set last_tick_at=clock_timestamp()-interval '1.7 seconds' where id=q;
  r:=public.tick_blind_question(listener,q,'A','progress',21);
  if (r->>'heardA')::numeric<5.9 then raise exception 'Network jitter incorrectly penalized real listening'; end if;
  update public.blind_listen_questions set heard_a=30,heard_b=30 where id=q;
  r:=public.complete_blind_question(listener,q,'tie');
  if (r->>'awarded')::integer<>3 then raise exception 'Tie must earn3'; end if;
  r:=public.complete_blind_question(listener,q,'B');
  if r->>'choice'<>'tie' or (r->>'awarded')::integer<>0 then raise exception 'Retry must preserve original choice and not repeat award'; end if;
  select sum(delta) into total from public.creator_credit_entries where user_id=listener;
  if total<>3 then raise exception 'Duplicate Credit'; end if;
  if public.issue_blind_question(listener,b,a) is not null then raise exception 'Swapping a completed pair is not new'; end if;
  q2:=public.issue_blind_question(listener,c,b);
  update public.blind_listen_questions set heard_a=30,heard_b=30 where id=q2;
  update public.listen_bar_tracks set hidden_at=now() where id=b;
  begin
    perform public.complete_blind_question(listener,q2,'A'); raise exception 'Hidden work accepted';
  exception when insufficient_privilege then null;
  end;
  update public.listen_bar_tracks set hidden_at=null where id=b;
  update public.blind_listen_questions set expires_at=now()-interval '1 second' where id=q2;
  begin
    perform public.complete_blind_question(listener,q2,'A'); raise exception 'Expired task accepted';
  exception when insufficient_privilege then null;
  end;
  update public.blind_listen_questions set expires_at=now()+interval '1 hour' where id=q2;
  perform public.complete_blind_question(listener,q2,'A');
  select people,preference_points into sample,points from public.blind_popularity_summaries() where track_id=b;
  if sample<>1 or points<>0.25 then raise exception 'Each listener must contribute once per song using their mean preference'; end if;
  perform set_config('request.jwt.claim.sub',author::text,true);
  delete from public.listen_bar_tracks where id=a;
  select sum(delta) into total from public.creator_credit_entries where user_id=listener;
  if total<>6 then raise exception 'Source removal erased earned Credit'; end if;
  if has_function_privilege('anon','public.complete_blind_question(uuid,uuid,text)','execute')
    or has_table_privilege('authenticated','public.creator_credit_entries','insert') then raise exception 'Direct public minting permitted'; end if;
end;
$$;
rollback;
select 'blind database checks passed; fixtures rolled back' result;
