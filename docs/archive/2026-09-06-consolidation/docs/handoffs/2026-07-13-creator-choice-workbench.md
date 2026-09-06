# 2026-07-13 Creator Choice Workbench

## Delivered Rule

- A creator with at least one persisted Showtime-certified community work may publish personal Choice collections.
- Eligibility comes from the creator's own Showtime recognition, not from ownership of every selected track.
- A personal Choice may select any currently public Showtime work, including another creator's work.
- Creator Choice is separate from the owner-operated weekly `AIPOGER Choice` at `#choice-weekly`; it does not create social drafts or publish externally.
- A published collection has its own `/choice/{id}` share page and must keep 5-10 currently public Showtime items.

## Creator Showtime Links

- Creators can set an HTTPS external URL plus a short public-purpose label on their own Showtime work, such as YouTube, MV, or an external support/tip page.
- Editing either value returns the link to the existing pending review state. AIPOGER is only a redirect surface and never processes payments, amounts, wallets, or checkout.

## Implementation Map

- Creator management API: `src/app/api/creator-choice/route.ts`
- Public creator Choice read API: `src/app/api/creator-choice/[id]/route.ts`
- Creator workbench: `src/app/profile/choice/page.tsx`
- Public share page: `src/app/choice/[id]/page.tsx`
- Additive database migration: `supabase/migrations/20260713090833_creator_choice_collections.sql`

## Verification Required

1. Apply the additive migration before using the new workbench in production.
2. Test a non-eligible account receives no creator Choice management access.
3. Test an eligible creator can add another creator's public Showtime work, cannot add a non-public work, and cannot change another curator's collection.
4. Confirm a published collection is available at `/choice/{id}`, while a draft or withdrawn collection returns no public data.
5. Confirm a changed external URL or purpose label is pending and cannot be displayed publicly until approved.
