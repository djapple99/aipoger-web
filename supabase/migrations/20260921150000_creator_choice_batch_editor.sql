-- Match the existing editor/API 3,000-character introduction limit.
alter table public.aipoger_creator_choice_collections
  drop constraint if exists aipoger_creator_choice_collections_intro_length_check;
alter table public.aipoger_creator_choice_collections
  add constraint aipoger_creator_choice_collections_intro_length_check
  check (intro is null or char_length(intro) <= 3000);

-- One explicit editor save commits metadata, publication and ordered references.
-- Only the authenticated server route may call this after catalog validation.
create or replace function public.save_creator_choice_editor(
  p_user_id uuid, p_collection_id uuid, p_week_start date, p_curator_name text,
  p_title text, p_intro text, p_items jsonb, p_expected jsonb,
  p_is_published boolean default null, p_clear_cover boolean default false
) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_row public.aipoger_creator_choice_collections%rowtype;
  v_id uuid;
  v_current jsonb;
  v_published boolean;
  v_item jsonb;
  v_position integer := 0;
begin
  if p_user_id is null or p_week_start is null or extract(isodow from p_week_start) <> 1
     or p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Invalid Choice editor data' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) > 10 then
    raise exception 'Choice 每期最多 10 首作品。' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_array_elements(p_items) e
    where e->>'sourceKind' is null or e->>'sourceKind' not in ('listen_bar_track','battle_archive')
       or e->>'sourceId' is null)
    or (select count(*) from jsonb_array_elements(p_items)) <>
       (select count(distinct (e->>'sourceKind', (e->>'sourceId')::uuid)) from jsonb_array_elements(p_items) e) then
    raise exception 'Invalid or duplicate Choice items' using errcode = '22023';
  end if;
  if p_collection_id is not null then
    select * into v_row from public.aipoger_creator_choice_collections
      where id = p_collection_id and creator_id = p_user_id for update;
    if not found then raise exception '找不到自己的 Choice。' using errcode = 'P0002'; end if;
    -- Lock item rows as well: a stale editor must never silently replace another save.
    perform 1 from public.aipoger_creator_choice_items where collection_id = p_collection_id for update;
    select jsonb_build_object('weekStart', v_row.week_start::text,
      'title', coalesce(btrim(v_row.title), ''), 'intro', coalesce(btrim(v_row.intro), ''),
      'isPublished', v_row.is_published, 'items', coalesce(jsonb_agg(jsonb_build_object(
        'sourceKind', source_kind, 'sourceId', source_id::text) order by position), '[]'::jsonb))
      into v_current from public.aipoger_creator_choice_items where collection_id = p_collection_id;
    if p_expected is distinct from v_current then
      raise exception '歌單已在其他視窗更新。請重新載入。' using errcode = '40001';
    end if;
    v_id := p_collection_id;
  else
    insert into public.aipoger_creator_choice_collections (creator_id, curator_name, week_start)
      values (p_user_id, p_curator_name, p_week_start) returning id into v_id;
  end if;
  v_published := coalesce(p_is_published, v_row.is_published, false);
  if v_published and jsonb_array_length(p_items) < 5 then
    raise exception '已發布 Choice 至少保留 5 首；請先撤回發布再移除。' using errcode = '22023';
  end if;
  delete from public.aipoger_creator_choice_items i where i.collection_id = v_id
    and not exists (select 1 from jsonb_array_elements(p_items) e
      where e->>'sourceKind' = i.source_kind and (e->>'sourceId')::uuid = i.source_id);
  -- Existing IDs remain stable; temporary positions stay within the 1..99 constraint.
  update public.aipoger_creator_choice_items set position = position + 20 where collection_id = v_id;
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_position := v_position + 1;
    insert into public.aipoger_creator_choice_items (collection_id, source_kind, source_id, position)
      values (v_id, v_item->>'sourceKind', (v_item->>'sourceId')::uuid, v_position)
      on conflict (collection_id, source_kind, source_id) do update set position = excluded.position;
  end loop;
  update public.aipoger_creator_choice_collections set week_start = p_week_start,
    curator_name = p_curator_name, title = p_title, intro = p_intro, is_published = v_published,
    published_at = case when not v_published then null else coalesce(published_at, now()) end,
    cover_path = case when p_clear_cover then null else cover_path end, updated_at = clock_timestamp()
    where id = v_id;
  return v_id;
end;
$$;
revoke all on function public.save_creator_choice_editor(uuid,uuid,date,text,text,text,jsonb,jsonb,boolean,boolean) from public, anon, authenticated;
grant execute on function public.save_creator_choice_editor(uuid,uuid,date,text,text,text,jsonb,jsonb,boolean,boolean) to service_role;
