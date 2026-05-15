import { supabase } from "@/lib/supabase";

export function isMissingIsAdminColumn(err: unknown): boolean {
  const msg = String((err as { message?: string })?.message ?? err).toLowerCase();
  return (
    msg.includes("is_admin") &&
    (msg.includes("schema cache") || msg.includes("could not find") || msg.includes("column"))
  );
}

/** 是否為管理員（免 APC 挑戰費）；欄位未 migration 時視為 false */
export async function loadIsAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    if (isMissingIsAdminColumn(error)) return false;
    console.warn("[is_admin] load", error);
    return false;
  }
  return data?.is_admin === true;
}
