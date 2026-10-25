import { supabase } from "@/lib/supabase";
import { ACCOUNT_NOTICES_CHANGED, type AccountNoticeAction } from "@/lib/account-notifications";

async function request(userId: string, query: string, mutation?: { ids?: string[]; action: string; readThrough?: string }) {
  const { data } = await supabase.auth.getSession();
  if (!data.session || data.session.user.id !== userId) throw new Error("AUTH_REQUIRED");
  const response = await fetch(`/api/account-notifications${query}`, {
    method: mutation ? mutation.action === "delete" ? "DELETE" : "PATCH" : "GET",
    headers: { Authorization: `Bearer ${data.session.access_token}`, ...(mutation ? { "Content-Type": "application/json" } : {}) },
    ...(mutation ? { body: JSON.stringify(mutation) } : {}),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("NOTICES_REQUEST_FAILED");
  const payload = await response.json();
  if (mutation) window.dispatchEvent(new CustomEvent(ACCOUNT_NOTICES_CHANGED, { detail: { userId, unreadCount: payload.unreadCount } }));
  return payload;
}

export function accountNoticeRequest(userId: string, query = "", ids?: string[], action: AccountNoticeAction = "read") {
  return request(userId, query, ids ? { ids, action } : undefined);
}

export function readAccountNoticeInbox(userId: string, readThrough: string) {
  return request(userId, "", { action: "read_inbox", readThrough });
}
