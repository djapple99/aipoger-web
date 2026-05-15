import { supabase } from "@/lib/supabase";
import { isAdminEmail } from "@/lib/admin-emails";
import { loadIsAdmin } from "@/lib/user-profile-admin";

/** 是否免扣 200 APC（管理員信箱或 user_profiles.is_admin） */
export async function shouldSkipChallengeFee(userId: string): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (isAdminEmail(session?.user?.email)) return true;
  return loadIsAdmin(userId);
}
