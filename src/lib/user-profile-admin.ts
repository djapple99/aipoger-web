import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { isAdminEmail } from "@/lib/admin-emails";

function userIsAdminByEmail(user: User | null | undefined): boolean {
  if (!user) return false;
  if (isAdminEmail(user.email)) return true;
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  return isAdminEmail(typeof meta?.email === "string" ? meta.email : null);
}

/** Read the active session without returning a user-only snapshot that cannot authorize API calls. */
export async function getActiveAuthSession(): Promise<Session | null> {
  const first = await supabase.auth.getSession();
  if (first.data.session?.access_token) return first.data.session;

  // In a freshly completed OAuth/OTP callback, Supabase can finish persisting the
  // session just after getSession() resolves. Re-read the user, then read the
  // session once more so callers never proceed with an empty bearer token.
  const userResult = await supabase.auth.getUser();
  if (!userResult.data.user) return null;

  const refreshed = await supabase.auth.getSession();
  if (
    refreshed.data.session?.user.id !== userResult.data.user.id ||
    !refreshed.data.session.access_token
  ) return null;
  return refreshed.data.session;
}

/** Force one refresh when an API rejects a just-read bearer token. */
export async function refreshActiveAuthSession(): Promise<Session | null> {
  const refreshed = await supabase.auth.refreshSession();
  if (refreshed.data.session?.access_token) return refreshed.data.session;
  return getActiveAuthSession();
}

export function isMissingIsAdminColumn(err: unknown): boolean {
  const msg = String((err as { message?: string })?.message ?? err).toLowerCase();
  return (
    msg.includes("is_admin") &&
    (msg.includes("schema cache") || msg.includes("could not find") || msg.includes("column"))
  );
}

/** 是否為管理員 */
export async function loadIsAdmin(userId: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.id === userId) return userIsAdminByEmail(user);

  const {
    data: { session },
  } = await supabase.auth.getSession();
  return userIsAdminByEmail(session?.user);
}
