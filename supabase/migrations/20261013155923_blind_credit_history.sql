-- Earned Credit is historical: removing the source song/question cannot erase it.
alter table public.creator_credit_entries
  drop constraint if exists creator_credit_entries_source_id_fkey;
