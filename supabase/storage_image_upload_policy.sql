-- AIPOGER image upload policy refresh.
-- Safe to re-run in Supabase SQL Editor.
--
-- Product rule:
-- Adult non-explicit swimwear, stage looks, and tasteful sexy fashion are allowed.
-- Explicit nudity, sex acts, porn/adult redirects, sexualized minors, violence,
-- scams, personal data exposure, impersonation, and infringing content remain banned.

update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
where id in ('avatars', 'listen-bar-covers');
