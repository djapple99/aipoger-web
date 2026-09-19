import type { SupabaseClient } from "@supabase/supabase-js";
import {
  Q_CRASH_EDITORIAL_COVER_BUCKET,
  isQCrashEditorialCoverPath,
} from "./q-crash-editorial";

export type QCrashEditorialRow = {
  id: string;
  queue_id: string;
  cover_path: string | null;
  full_song_url: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
};

export function isMissingQCrashEditorialSchema(message: string | null | undefined) {
  return /q_crash_work_editorial|schema cache|does not exist|PGRST204|42P01/i.test(message ?? "");
}

export async function loadQCrashEditorial(
  admin: SupabaseClient,
  queueIds: string[],
) {
  const ids = Array.from(new Set(queueIds.filter(Boolean)));
  if (ids.length === 0) return { schemaReady: true, rows: [] as QCrashEditorialRow[] };

  const { data, error } = await admin
    .from("q_crash_work_editorial")
    .select("id,queue_id,cover_path,full_song_url,created_at,updated_at,updated_by")
    .in("queue_id", ids)
    .returns<QCrashEditorialRow[]>();
  if (error) {
    if (isMissingQCrashEditorialSchema(error.message)) return { schemaReady: false, rows: [] as QCrashEditorialRow[] };
    throw error;
  }
  return { schemaReady: true, rows: data ?? [] };
}

export async function signedQCrashCover(
  admin: SupabaseClient,
  path: string | null | undefined,
  expiresIn = 60 * 60,
) {
  const clean = path?.trim();
  if (!clean) return null;
  if (/^(https?:|data:|blob:|\/)/i.test(clean)) return clean;
  if (!isQCrashEditorialCoverPath(clean)) return null;
  const { data, error } = await admin.storage
    .from(Q_CRASH_EDITORIAL_COVER_BUCKET)
    .createSignedUrl(clean, expiresIn);
  if (error) return null;
  return data?.signedUrl ?? null;
}
