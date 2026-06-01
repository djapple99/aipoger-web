-- AIPOGER 傷心酒吧 Bar Heartbreak：吧台 24H 即時交流 + 單曲永久評論
-- 在 Supabase SQL Editor 執行。可重複執行。
--
-- 兩種留言分工：
-- 1. listen_bar_messages：吧台即時交流，前端只顯示最近 24H。
-- 2. listen_bar_track_comments：綁定單曲的永久評論，會一直給大家看。

create table if not exists public.listen_bar_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  display_name text not null default '訪客',
  body text not null,
  created_at timestamptz not null default now(),
  constraint listen_bar_messages_body_not_blank check (length(trim(body)) > 0),
  constraint listen_bar_messages_body_length check (char_length(body) <= 240)
);

create index if not exists listen_bar_messages_created_at_idx
on public.listen_bar_messages (created_at desc);

alter table public.listen_bar_messages enable row level security;

grant select, insert on table public.listen_bar_messages to anon, authenticated;

drop policy if exists listen_bar_messages_public_read on public.listen_bar_messages;
create policy listen_bar_messages_public_read
on public.listen_bar_messages
for select
to anon, authenticated
using (true);

drop policy if exists listen_bar_messages_insert_public on public.listen_bar_messages;
create policy listen_bar_messages_insert_public
on public.listen_bar_messages
for insert
to anon, authenticated
with check (user_id is null or user_id = auth.uid());

create table if not exists public.listen_bar_track_comments (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.listen_bar_tracks(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  display_name text not null default '吧友',
  body text not null,
  created_at timestamptz not null default now(),
  constraint listen_bar_track_comments_body_not_blank check (length(trim(body)) > 0),
  constraint listen_bar_track_comments_body_length check (char_length(body) <= 280)
);

create index if not exists listen_bar_track_comments_track_created_idx
on public.listen_bar_track_comments (track_id, created_at desc);

alter table public.listen_bar_track_comments enable row level security;

grant select on table public.listen_bar_track_comments to anon, authenticated;
grant insert on table public.listen_bar_track_comments to authenticated;

drop policy if exists listen_bar_track_comments_public_read on public.listen_bar_track_comments;
create policy listen_bar_track_comments_public_read
on public.listen_bar_track_comments
for select
to anon, authenticated
using (true);

drop policy if exists listen_bar_track_comments_insert_public on public.listen_bar_track_comments;
drop policy if exists listen_bar_track_comments_insert_authenticated on public.listen_bar_track_comments;
create policy listen_bar_track_comments_insert_authenticated
on public.listen_bar_track_comments
for insert
to authenticated
with check (user_id = auth.uid());

do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) then
    begin
      alter publication supabase_realtime add table public.listen_bar_messages;
    exception
      when duplicate_object then null;
      when insufficient_privilege then null;
    end;

    begin
      alter publication supabase_realtime add table public.listen_bar_track_comments;
    exception
      when duplicate_object then null;
      when insufficient_privilege then null;
    end;
  end if;
end $$;
