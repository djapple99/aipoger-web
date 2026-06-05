-- AIPOGER Bar Heartbreak persistent chat
-- 在 Supabase SQL Editor 執行。可重複執行。
-- 讓 AI 音樂交流區留言刷新後仍保留 8H，並透過 Realtime 同步新留言。

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
  end if;
end $$;
