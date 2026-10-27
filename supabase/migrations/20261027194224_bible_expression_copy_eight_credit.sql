-- Authorized 2026-10-28: only new expression/comparison copies change from 5 to 8.
-- Keep every historical debit, income source, receipt and balance unchanged.
alter table public.bible_expression_copy_receipts
 alter column delta set default -8;
alter table public.bible_expression_copy_receipts
 drop constraint if exists bible_expression_copy_receipts_delta_check;
alter table public.bible_expression_copy_receipts
 add constraint bible_expression_copy_receipts_delta_check check(delta in (-5,-8));

-- Replace the signature atomically. Five-argument legacy callers resolve to the
-- default expected price of 5; only retries of their paid receipts can succeed.
drop function if exists public.bible_expression_copy(uuid,uuid,text,text,text);
create or replace function public.bible_expression_copy(p_user uuid,p_receipt uuid,p_key text,p_locale text,p_text text,p_expected_cost integer default 5)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare total bigint; receipt public.bible_expression_copy_receipts%rowtype;
begin
 -- The API verifies getUser and rejects anonymous sessions. Keep auth.users private.
 if p_user is null then
  raise exception 'Sign in first' using errcode='42501';
 end if;
 if p_receipt is null or p_key is null or p_key not in ('expression-sotto-voce','expression-appassionato','expression-marcato','expression-giocoso','expression-furioso','expression-cantabile','expression-dolce','expression-espressivo','expression-leggiero','expression-sostenuto','expression-affettuoso','expression-agitato','expression-con-amore','expression-doloroso','expression-drammatico','expression-feroce','expression-lacrimoso','expression-misterioso','expression-solitario','expression-tranquillo','expression-animato','expression-brioso','expression-celere','expression-con-brio','expression-con-forza','expression-con-fuoco','expression-con-moto','expression-con-spirito','expression-energico','expression-slancio','expression-brillante','expression-bruscamente','expression-buffo','expression-colossale','expression-comodo','expression-con-grazia','expression-festoso','expression-grandioso','expression-grazioso','expression-maestoso','expression-pesante','expression-risoluto','expression-scherzando','expression-semplicemente','expression-sonore','expression-volante','expression-control-a','expression-control-b','expression-control-c')
  or p_locale is null or p_locale not in ('zh','en') or p_text is null or length(p_text) not between 1 and 8000 then
  raise exception 'Invalid copy' using errcode='22023';
 end if;
 -- Same lock as visit, review, Heart, reply and paid submission. No Owner exemption.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user::text,0));
 select * into receipt from public.bible_expression_copy_receipts where user_id=p_user and source_id=p_receipt;
 select coalesce(sum(delta),0) into total from public.creator_credit_history where user_id=p_user;
 if receipt.id is not null then
  if receipt.prompt_key<>p_key or receipt.copy_locale<>p_locale then return jsonb_build_object('error','COPY_CONFLICT'); end if;
  return jsonb_build_object('charged',0,'balance',greatest(total,0),'debt',greatest(-total,0),'text',receipt.copy_text);
 end if;
 -- Existing receipts above keep their original price and can always retry.
 -- Legacy tabs/API calls default to the old displayed price, so never overcharge them.
 if p_expected_cost is distinct from 8 then
  return jsonb_build_object('error','COPY_PRICE_CHANGED','cost',8);
 end if;
 if total<8 then return jsonb_build_object('error','INSUFFICIENT_CREDIT','balance',greatest(total,0),'debt',greatest(-total,0)); end if;
 insert into public.bible_expression_copy_receipts(user_id,source_id,prompt_key,copy_locale,copy_text,delta)
 values(p_user,p_receipt,p_key,p_locale,p_text,-8);
 return jsonb_build_object('charged',8,'balance',total-8,'debt',0,'text',p_text);
end;
$$;
revoke all on function public.bible_expression_copy(uuid,uuid,text,text,text,integer) from public,anon,authenticated;
grant execute on function public.bible_expression_copy(uuid,uuid,text,text,text,integer) to service_role;
