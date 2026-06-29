-- AIPOGER Bar Heartbreak: restore tracks removed during promotion protection.
-- The current 2026-06-29 plan is promotion protection until 2026-07-06 +08:
-- public pool may exceed 88, challengers are public, and system eviction is paused.

update public.listen_bar_tracks
set is_active = true,
    review_status = 'approved',
    hidden_at = null,
    removed_at = null,
    bar_phase = 'public',
    promoted_at = coalesce(promoted_at, created_at, now()),
    moderation_note = 'Restored to match 2026-06-29 Bar Heartbreak promotion protection plan.',
    updated_at = now()
where source = 'community'
  and bar_phase = 'public'
  and hidden_at is null
  and review_status = 'removed'
  and removed_at = timestamptz '2026-06-29 12:01:03.548+00'
  and id in (
    'a8b9b0d9-e5dd-4cec-a6b6-1d42d586700d',
    '006f0bc1-9417-4020-898d-e50c5524fa44',
    '0506bc30-0047-45f6-a7e3-198e19ce7531',
    'a1643e40-01a0-4d80-af1e-cc8d8576dcb2',
    '2089dec5-9319-4c82-80b0-e682120266a1',
    'f470c182-252f-49c0-891d-62fbe5cbaa13',
    'd2cf4502-8a25-400d-a977-c450519c9d98',
    '1e73273c-b368-44d0-8a93-6b1b842529ff'
  );
