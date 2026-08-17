-- One-time data repair for Bar Heartbreak tracks incorrectly removed by
-- legacy monthly-survival / 30-day completion logic on 2026-06-22 and 2026-06-23.
--
-- Only restores rows verified as community/public tracks with review_status='completed'.
-- It does not restore manually removed rows.

update public.listen_bar_tracks
set is_active = true,
    review_status = 'approved',
    bar_phase = 'public',
    removed_at = null,
    updated_at = now()
where source = 'community'
  and bar_phase = 'public'
  and review_status = 'completed'
  and id in (
    'a8b9b0d9-e5dd-4cec-a6b6-1d42d586700d',
    '006f0bc1-9417-4020-898d-e50c5524fa44',
    '0506bc30-0047-45f6-a7e3-198e19ce7531',
    'b62138ad-6ddf-43fe-a024-8e57fc0abcbe',
    'dbde4b10-6b0e-4745-9393-0f6f155a0f90',
    '43e4f64d-8be2-4292-961c-c8be80ce7be5',
    'a1643e40-01a0-4d80-af1e-cc8d8576dcb2',
    '2089dec5-9319-4c82-80b0-e682120266a1',
    'f470c182-252f-49c0-891d-62fbe5cbaa13',
    'd2cf4502-8a25-400d-a977-c450519c9d98',
    '65dc3d41-0c3f-4f55-b6b1-f3f6ea7adbf1',
    '463ac097-3845-4469-b6a5-684de8e54488'
  );
