import { createClient } from "@supabase/supabase-js";
export function creatorAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Missing server configuration");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export async function creatorAuth(request: Request) {
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer (\S+)$/)?.[1];
  if (!token) return null;
  const admin = creatorAdmin();
  const { data, error } = await admin.auth.getUser(token);
  return error || !data.user || data.user.is_anonymous
    ? null
    : { admin, token, user: data.user };
}
