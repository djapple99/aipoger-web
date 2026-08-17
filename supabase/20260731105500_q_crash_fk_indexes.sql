-- Cover Q Crash foreign-key lookups used by deletes, invitations, and sealed-vote ownership checks.

create index if not exists battles_q_crash_card_id_idx
on public.battles (q_crash_card_id);

create index if not exists q_crash_cards_invited_user_id_idx
on public.q_crash_cards (invited_user_id);

create index if not exists q_crash_cards_challenger_user_id_idx
on public.q_crash_cards (challenger_user_id);

create index if not exists q_crash_votes_user_id_idx
on public.q_crash_votes (user_id);
