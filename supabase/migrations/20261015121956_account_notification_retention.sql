-- 2026-10-15: user-approved three-month notifications, with explicit keep.
-- Only notification records expire; original comments, works and credits are untouched.
alter table public.battle_notifications add column if not exists kept_at timestamptz;
alter table public.battle_notifications add column if not exists expires_at timestamptz
  generated always as (((created_at at time zone 'Asia/Taipei') + interval '3 months') at time zone 'Asia/Taipei') stored;
create index if not exists battle_notifications_expiry_idx
  on public.battle_notifications(expires_at) where kept_at is null;
create index if not exists battle_notifications_inbox_idx
  on public.battle_notifications(user_id, created_at desc, id desc);
-- Removing an old battle/queue must not silently erase a recipient's kept notice.
alter table public.battle_notifications drop constraint if exists battle_notifications_battle_id_fkey;
alter table public.battle_notifications add constraint battle_notifications_battle_id_fkey
  foreign key (battle_id) references public.battles(id) on delete set null;
alter table public.battle_notifications drop constraint if exists battle_notifications_queue_id_fkey;
alter table public.battle_notifications add constraint battle_notifications_queue_id_fkey
  foreign key (queue_id) references public.battle_queue(id) on delete set null;
-- Legacy clients may acknowledge read_at, but cannot edit content or dates.
revoke update on public.battle_notifications from anon, authenticated;
grant update (read_at) on public.battle_notifications to authenticated;
drop policy if exists "users can read own battle notifications" on public.battle_notifications;
create policy "users can read own battle notifications" on public.battle_notifications
  for select to authenticated using (auth.uid() = user_id and (kept_at is not null or expires_at > now()));
comment on column public.battle_notifications.kept_at is
  'Recipient explicitly keeps this notice until unkept or deleted; independent of read_at.';
comment on column public.battle_notifications.expires_at is
  'Three calendar months from creation in Asia/Taipei; ignored while kept. Hourly authenticated cleanup deletes expired unkept notices.';
notify pgrst, 'reload schema';
