-- Additive per-copy spending, authorized 2026-10-27. No backfill or balance reset.
create table public.bible_expression_copy_receipts (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id),
 source_id uuid not null,
 prompt_key text not null check(prompt_key in ('expression-sotto-voce','expression-appassionato','expression-marcato','expression-giocoso','expression-furioso','expression-cantabile','expression-dolce','expression-espressivo','expression-leggiero','expression-sostenuto','expression-affettuoso','expression-agitato','expression-con-amore','expression-doloroso','expression-drammatico','expression-feroce','expression-lacrimoso','expression-misterioso','expression-solitario','expression-tranquillo','expression-animato','expression-brioso','expression-celere','expression-con-brio','expression-con-forza','expression-con-fuoco','expression-con-moto','expression-con-spirito','expression-energico','expression-slancio','expression-brillante','expression-bruscamente','expression-buffo','expression-colossale','expression-comodo','expression-con-grazia','expression-festoso','expression-grandioso','expression-grazioso','expression-maestoso','expression-pesante','expression-risoluto','expression-scherzando','expression-semplicemente','expression-sonore','expression-volante','expression-control-a','expression-control-b','expression-control-c')),
 copy_locale text not null check(copy_locale in ('zh','en')),
 copy_text text not null check(length(copy_text) between 1 and 8000),
 delta integer not null default -5 check(delta=-5),
 reason text not null default 'bible_prompt_copy' check(reason='bible_prompt_copy'),
 created_at timestamptz not null default clock_timestamp(), unique(user_id,source_id)
);
create index bible_expression_copy_user_idx on public.bible_expression_copy_receipts(user_id,created_at desc);
alter table public.bible_expression_copy_receipts enable row level security;
revoke all on public.bible_expression_copy_receipts from public,anon,authenticated;
grant select,insert on public.bible_expression_copy_receipts to service_role;
create trigger bible_expression_copy_ledger_lock before insert on public.bible_expression_copy_receipts
for each row execute function aipoger_private.credit_ledger_lock();
-- Preserve every existing income/spending source, including creator replies.
do $$
declare existing_view text;
begin
 select pg_catalog.pg_get_viewdef('public.creator_credit_history'::regclass,true) into existing_view;
 execute 'create or replace view public.creator_credit_history with (security_invoker=true) as '
  || pg_catalog.rtrim(existing_view, E';\n ')
  || ' union all select id,user_id,delta,reason,source_id,created_at from public.bible_expression_copy_receipts';
end;
$$;
revoke all on public.creator_credit_history from public,anon,authenticated;
grant select on public.creator_credit_history to service_role;

create or replace function public.bible_expression_copy(p_user uuid,p_receipt uuid,p_key text,p_locale text,p_text text)
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
 if total<5 then return jsonb_build_object('error','INSUFFICIENT_CREDIT','balance',greatest(total,0),'debt',greatest(-total,0)); end if;
 insert into public.bible_expression_copy_receipts(user_id,source_id,prompt_key,copy_locale,copy_text)
 values(p_user,p_receipt,p_key,p_locale,p_text);
 return jsonb_build_object('charged',5,'balance',total-5,'debt',0,'text',p_text);
end;
$$;
revoke all on function public.bible_expression_copy(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.bible_expression_copy(uuid,uuid,text,text,text) to service_role;
