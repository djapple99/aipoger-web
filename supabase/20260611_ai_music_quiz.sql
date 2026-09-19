-- AIPOGER AI 音樂耳朵測驗：題庫後台 + 測驗音檔 Storage
-- 執行位置：Supabase Dashboard -> SQL Editor
-- 執行後可使用 /admin/quiz 建立二選一與是非題。

create extension if not exists pgcrypto;

alter table public.user_profiles
  add column if not exists is_admin boolean not null default false;

-- 將常用 owner 信箱設為管理員。若尚未用該信箱登入，登入後再重跑本檔即可。
insert into public.user_profiles (id, is_admin)
select u.id, true
from auth.users u
where lower(trim(coalesce(u.email, ''))) in ('djapple99@gmail.com', 'aipoger99@gmail.com')
on conflict (id) do update set is_admin = excluded.is_admin;

create table if not exists public.ai_music_quiz_questions (
  id uuid primary key default gen_random_uuid(),
  sort_order integer not null default 100,
  status text not null default 'draft' check (status in ('draft', 'published')),
  question_type text not null default 'either_or' check (question_type in ('either_or', 'true_false')),
  category text not null default 'listening' check (category in ('prompt', 'listening', 'diagnosis', 'drop_selection', 'copyright')),
  title text not null,
  body text,
  option_a text not null default 'A',
  option_b text not null default 'B',
  correct_answer text not null default 'A' check (correct_answer in ('A', 'B')),
  explanation text,
  learning_point text,
  prompt_fix text,
  copyright_note text,
  audio_a_path text,
  audio_a_source_name text,
  audio_a_duration_seconds numeric(8, 2),
  audio_a_start_seconds numeric(8, 2),
  audio_a_end_seconds numeric(8, 2),
  audio_b_path text,
  audio_b_source_name text,
  audio_b_duration_seconds numeric(8, 2),
  audio_b_start_seconds numeric(8, 2),
  audio_b_end_seconds numeric(8, 2),
  audio_single_path text,
  audio_single_source_name text,
  audio_single_duration_seconds numeric(8, 2),
  audio_single_start_seconds numeric(8, 2),
  audio_single_end_seconds numeric(8, 2),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.ai_music_quiz_questions is 'AIPOGER AI music ear-training quiz question bank.';
comment on column public.ai_music_quiz_questions.question_type is 'either_or = 二選一, true_false = 是非題。';
comment on column public.ai_music_quiz_questions.category is 'prompt, listening, diagnosis, drop_selection, copyright.';
comment on column public.ai_music_quiz_questions.audio_a_path is 'Supabase Storage path in quiz-audio bucket.';
comment on column public.ai_music_quiz_questions.audio_b_path is 'Supabase Storage path in quiz-audio bucket.';
comment on column public.ai_music_quiz_questions.audio_single_path is 'Supabase Storage path in quiz-audio bucket.';

create index if not exists ai_music_quiz_questions_status_order_idx
on public.ai_music_quiz_questions (status, sort_order, created_at desc);

create or replace function public.ai_music_quiz_questions_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_ai_music_quiz_questions_updated_at on public.ai_music_quiz_questions;
create trigger trg_ai_music_quiz_questions_updated_at
before update on public.ai_music_quiz_questions
for each row
execute function public.ai_music_quiz_questions_set_updated_at();

alter table public.ai_music_quiz_questions enable row level security;

grant select on table public.ai_music_quiz_questions to anon;
grant select, insert, update, delete on table public.ai_music_quiz_questions to authenticated;

drop policy if exists ai_music_quiz_public_read_published on public.ai_music_quiz_questions;
create policy ai_music_quiz_public_read_published
on public.ai_music_quiz_questions
for select
to anon, authenticated
using (status = 'published');

drop policy if exists ai_music_quiz_admin_read_all on public.ai_music_quiz_questions;
create policy ai_music_quiz_admin_read_all
on public.ai_music_quiz_questions
for select
to authenticated
using (
  public.is_aipoger_owner(auth.uid())
  or exists (
    select 1
    from public.user_profiles p
    where p.id = auth.uid()
      and coalesce(p.is_admin, false) = true
  )
);

drop policy if exists ai_music_quiz_admin_insert on public.ai_music_quiz_questions;
create policy ai_music_quiz_admin_insert
on public.ai_music_quiz_questions
for insert
to authenticated
with check (
  public.is_aipoger_owner(auth.uid())
  or exists (
    select 1
    from public.user_profiles p
    where p.id = auth.uid()
      and coalesce(p.is_admin, false) = true
  )
);

drop policy if exists ai_music_quiz_admin_update on public.ai_music_quiz_questions;
create policy ai_music_quiz_admin_update
on public.ai_music_quiz_questions
for update
to authenticated
using (
  public.is_aipoger_owner(auth.uid())
  or exists (
    select 1
    from public.user_profiles p
    where p.id = auth.uid()
      and coalesce(p.is_admin, false) = true
  )
)
with check (
  public.is_aipoger_owner(auth.uid())
  or exists (
    select 1
    from public.user_profiles p
    where p.id = auth.uid()
      and coalesce(p.is_admin, false) = true
  )
);

drop policy if exists ai_music_quiz_admin_delete on public.ai_music_quiz_questions;
create policy ai_music_quiz_admin_delete
on public.ai_music_quiz_questions
for delete
to authenticated
using (
  public.is_aipoger_owner(auth.uid())
  or exists (
    select 1
    from public.user_profiles p
    where p.id = auth.uid()
      and coalesce(p.is_admin, false) = true
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'quiz-audio',
  'quiz-audio',
  true,
  52428800,
  array['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/aiff', 'audio/x-aiff', 'audio/mp4', 'audio/aac', 'audio/ogg']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists quiz_audio_storage_public_read on storage.objects;
create policy quiz_audio_storage_public_read
on storage.objects
for select
to public
using (bucket_id = 'quiz-audio');

drop policy if exists quiz_audio_storage_admin_insert on storage.objects;
create policy quiz_audio_storage_admin_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'quiz-audio'
  and (
    public.is_aipoger_owner(auth.uid())
    or exists (
      select 1
      from public.user_profiles p
      where p.id = auth.uid()
        and coalesce(p.is_admin, false) = true
    )
  )
);

drop policy if exists quiz_audio_storage_admin_update on storage.objects;
create policy quiz_audio_storage_admin_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'quiz-audio'
  and (
    public.is_aipoger_owner(auth.uid())
    or exists (
      select 1
      from public.user_profiles p
      where p.id = auth.uid()
        and coalesce(p.is_admin, false) = true
    )
  )
)
with check (
  bucket_id = 'quiz-audio'
  and (
    public.is_aipoger_owner(auth.uid())
    or exists (
      select 1
      from public.user_profiles p
      where p.id = auth.uid()
        and coalesce(p.is_admin, false) = true
    )
  )
);

drop policy if exists quiz_audio_storage_admin_delete on storage.objects;
create policy quiz_audio_storage_admin_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'quiz-audio'
  and (
    public.is_aipoger_owner(auth.uid())
    or exists (
      select 1
      from public.user_profiles p
      where p.id = auth.uid()
        and coalesce(p.is_admin, false) = true
    )
  )
);
