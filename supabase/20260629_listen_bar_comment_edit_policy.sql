-- AIPOGER Bar Heartbreak: allow listeners to edit their own track comments.
-- Public read remains open; only the signed-in author can update comment body.

alter table public.listen_bar_track_comments
  add column if not exists updated_at timestamptz not null default now();

update public.listen_bar_track_comments
set updated_at = created_at
where updated_at is null;

revoke all on table public.listen_bar_track_comments from anon;
revoke all on table public.listen_bar_track_comments from authenticated;
grant select on table public.listen_bar_track_comments to anon, authenticated;
grant insert on table public.listen_bar_track_comments to authenticated;
grant update (body, updated_at) on table public.listen_bar_track_comments to authenticated;
grant select, insert, update, delete on table public.listen_bar_track_comments to service_role;

drop policy if exists listen_bar_track_comments_update_own on public.listen_bar_track_comments;
create policy listen_bar_track_comments_update_own
on public.listen_bar_track_comments
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

comment on table public.listen_bar_track_comments is
'Persistent per-track comments for AIPOGER Bar Heartbreak. Comment authors can edit their own comment body; inserts can create creator-facing listen_bar_track_comment notifications.';
