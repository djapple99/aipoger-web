import { supabase } from "@/lib/supabase";
import { ACCOUNT_NOTICES_CHANGED } from "@/lib/account-notifications";

export async function accountNoticeRequest(userId: string, query = "", ids?: string[]) {
  const { data } = await supabase.auth.getSession();
  if (!data.session || data.session.user.id !== userId) throw new Error("AUTH_REQUIRED");
  const response = await fetch(`/api/account-notifications${query}`, {
    method: ids ? "PATCH" : "GET",
    headers: { Authorization: `Bearer ${data.session.access_token}`, ...(ids ? { "Content-Type": "application/json" } : {}) },
    ...(ids ? { body: JSON.stringify({ ids }) } : {}),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("NOTICES_REQUEST_FAILED");
  const payload = await response.json();
  if (ids) window.dispatchEvent(new CustomEvent(ACCOUNT_NOTICES_CHANGED, { detail: { userId } }));
  return payload;
}
