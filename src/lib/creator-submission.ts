type Result = { data: Record<string, unknown> | null; error: { message?: string; code?: string } | null };
export type CreatorSubmissionDb = { from(table: string): { insert(row: Record<string, unknown>): { select(fields: string): { maybeSingle(): PromiseLike<Result> } }; select(fields: string): { eq(field: string, value: unknown): { eq(field: string, value: unknown): { maybeSingle(): PromiseLike<Result> } } } } };
/** Stable work ID makes an uncertain HTTP retry recover the original commit. */
export async function saveCreatorSubmission(db: CreatorSubmissionDb, payload: Record<string, unknown>) {
  const prior = await db.from("listen_bar_tracks").select("*").eq("id", payload.id).eq("created_by", payload.created_by).maybeSingle();
  if (prior.error) return { ...prior, uncertain: true };
  if (prior.data) return { ...prior, uncertain: false };
  const result = await db.from("listen_bar_tracks").insert(payload).select("*").maybeSingle();
  if (!result.error && result.data) return { ...result, uncertain: false };
  const recovered = await db.from("listen_bar_tracks").select("*").eq("id", payload.id).eq("created_by", payload.created_by).maybeSingle();
  if (recovered.data) return { ...recovered, uncertain: false };
  return { data: null, error: result.error ?? recovered.error ?? { message: "Submission result is unconfirmed" },
    uncertain: Boolean(recovered.error || !result.error?.code) };
}
