-- An owner-operated Choice can be published as the official AIPOGER identity
-- or the owner's personal curator identity. Creator Choices remain a separate
-- collection type and always use their own profile.

alter table public.aipoger_choice_collections
  add column if not exists curator_identity text not null default 'official';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'aipoger_choice_collections_curator_identity_check'
  ) then
    alter table public.aipoger_choice_collections
      add constraint aipoger_choice_collections_curator_identity_check
      check (curator_identity in ('official', 'personal'));
  end if;
end $$;

comment on column public.aipoger_choice_collections.curator_identity is
  'Presentation identity for owner-operated Choice: official AIPOGER or owner personal curator profile.';
