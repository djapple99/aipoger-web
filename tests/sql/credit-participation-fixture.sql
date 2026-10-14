-- Local in-memory PostgreSQL fixture only. Never send this file to production.

create schema auth;
create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,is_anonymous boolean default false);
insert into auth.users values
('00000000-0000-4000-8000-000000000001','qa1@example.invalid',now(),false),
('00000000-0000-4000-8000-000000000002','qa2@example.invalid',now(),false),
('00000000-0000-4000-8000-000000000003','qa3@example.invalid',now(),false),
('00000000-0000-4000-8000-000000000004','djapple99@gmail.com',now(),false);
create table public.creator_credit_entries(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users,delta integer not null constraint creator_credit_entries_delta_check check(delta=3),reason text not null constraint creator_credit_entries_reason_check check(reason='blind_compare'),source_id uuid unique not null,created_at timestamptz default now());
create table public.listen_bar_creator_upload_windows(creator_id uuid primary key references auth.users,started_at timestamptz not null,upload_count smallint check(upload_count between 1 and 3));
create table public.listen_bar_tracks(id uuid primary key default gen_random_uuid(),created_by uuid references auth.users,source text default 'community',is_active boolean default true,is_featured_official boolean default false,review_status text default 'approved',hidden_at timestamptz,removed_at timestamptz,ai_music_showtime_public_removed_at timestamptz);
create table public.listen_bar_track_comments(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users,track_id uuid references public.listen_bar_tracks on delete cascade,body text,moderation_status text default 'visible',moderation_note text,created_at timestamptz default clock_timestamp(),updated_at timestamptz default clock_timestamp());
create table public.mv_work_ratings(user_id uuid references auth.users,track_id uuid references public.listen_bar_tracks on delete cascade,score numeric,comment_id uuid references public.listen_bar_track_comments on delete set null,primary key(track_id,user_id));
create table public.listen_bar_track_reactions(user_id uuid references auth.users,track_id uuid references public.listen_bar_tracks on delete cascade,reaction text,vote_date date default (clock_timestamp() at time zone 'Asia/Taipei')::date,created_at timestamptz default clock_timestamp(),primary key(track_id,user_id,vote_date));
grant usage on schema public,auth to service_role,authenticated;
grant select,insert,update on all tables in schema public to service_role;
-- Historical receipt is deliberately seeded before the release, never rewritten.
insert into public.creator_credit_entries(user_id,delta,reason,source_id) values('00000000-0000-4000-8000-000000000001',3,'blind_compare','00000000-0000-4000-8000-000000000099');

-- Pre-release review and upload window must not become retrospective rewards or resets.
insert into auth.users values('00000000-0000-4000-8000-000000000005','qa5@example.invalid',now(),false);
insert into public.listen_bar_creator_upload_windows values('00000000-0000-4000-8000-000000000005',now()-interval '1 hour',2);
insert into public.listen_bar_tracks(id,created_by) values('00000000-0000-4000-8000-000000000050','00000000-0000-4000-8000-000000000002');
insert into public.listen_bar_track_comments(id,user_id,track_id,body,created_at) values('00000000-0000-4000-8000-000000000051','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000050','副歌旋律很有記憶點鼓組節奏清楚人聲中頻可以再柔和一些',now()-interval '1 day');
insert into public.mv_work_ratings(user_id,track_id,score,comment_id) values('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000050',8.7,'00000000-0000-4000-8000-000000000051');
