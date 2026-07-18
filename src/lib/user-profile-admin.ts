import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { isAdminEmail } from "@/lib/admin-emails";

function userIsAdminByEmail(user: User | null | undefined): boolean {
  if (!user) return false;
  if (isAdminEmail(user.email)) return true;
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  return isAdminEmail(typeof meta?.email === "string" ? meta.email : null);
}

/** Read a session with an access token, retrying after Supabase refreshes the user. */
export async function getActiveAuthSession(): Promise<Session | null> {
  const first = await supabase.auth.getSession();
  if (first.data.session?.access_token) return first.data.session;

  const userResult = await supabase.auth.getUser();
  if (!userResult.data.user) return null;

  const refreshed = await supabase.auth.getSession();
  if (refreshed.data.session?.user.id !== userResult.data.user.id) return null;
  return refreshed.data.session;
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
