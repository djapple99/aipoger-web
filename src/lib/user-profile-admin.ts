import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { isAdminEmail } from "@/lib/admin-emails";

function userIsAdminByEmail(user: User | null | undefined): boolean {
  if (!user) return false;
  if (isAdminEmail(user.email)) return true;
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  return isAdminEmail(typeof meta?.email === "string" ? meta.email : null);
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
  void userId;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return userIsAdminByEmail(session?.user);
}
