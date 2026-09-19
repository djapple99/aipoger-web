begin;

alter table public.earworm_track_reactions
  drop constraint if exists earworm_track_reactions_listened;

alter table public.earworm_track_reactions
  add constraint earworm_track_reactions_listened
  check (listened_seconds >= 0);

commit;
