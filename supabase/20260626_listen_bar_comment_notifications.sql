-- AIPOGER Bar Heartbreak track comments + creator notifications.
--
-- New track comments are persisted in Postgres so creators can receive
-- unread account notifications when listeners comment on their songs.

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

create index if not exists listen_bar_track_comments_user_created_idx
on public.listen_bar_track_comments (user_id, created_at desc);

create index if not exists listen_bar_tracks_creator_idx
on public.listen_bar_tracks (created_by, created_at desc)
where source = 'community';

alter table public.listen_bar_track_comments enable row level security;

grant select on table public.listen_bar_track_comments to anon, authenticated;
grant insert on table public.listen_bar_track_comments to authenticated;
grant select, insert, update, delete on table public.listen_bar_track_comments to service_role;

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
      alter publication supabase_realtime add table public.listen_bar_track_comments;
    exception
      when duplicate_object then null;
      when insufficient_privilege then null;
    end;

    begin
      alter publication supabase_realtime add table public.battle_notifications;
    exception
      when duplicate_object then null;
      when insufficient_privilege then null;
    end;
  end if;
end $$;

comment on table public.listen_bar_track_comments is
'Persistent per-track comments for AIPOGER Bar Heartbreak. Inserts can create creator-facing listen_bar_track_comment notifications.';
