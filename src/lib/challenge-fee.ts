import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { isAdminEmail } from "@/lib/admin-emails";
import { loadIsAdmin } from "@/lib/user-profile-admin";

function emailsFromUser(user: User | null | undefined): string[] {
  if (!user) return [];
  const out: string[] = [];
  if (user.email) out.push(user.email);
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  if (typeof meta?.email === "string") out.push(meta.email);
  return out;
}

/** 是否免扣 200 APC（管理員信箱或 user_profiles.is_admin） */
export async function shouldSkipChallengeFee(userId: string): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  let user = session?.user ?? null;
  if (!user) {
    const { data } = await supabase.auth.getUser();
    user = data.user ?? null;
  }
  if (emailsFromUser(user).some((e) => isAdminEmail(e))) return true;
  return loadIsAdmin(userId);
}
