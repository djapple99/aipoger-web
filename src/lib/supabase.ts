import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export const SUPABASE_AUTH_STORAGE_KEY = "sb-rwueinzgjaaefjvmsyem-auth-token";

if (!supabaseUrl || !supabaseKey) {
  throw new Error("請確認你的 .env.local 是否已經設定好 Supabase 的環境變數！");
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    // OAuth providers return a PKCE code when this browser has a code verifier.
    // The callback page exchanges that code and stores the resulting session.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: "pkce",
    storageKey: SUPABASE_AUTH_STORAGE_KEY,
  },
});

export function createSupabaseImplicitAuthClient() {
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      // Email magic links should remain usable when opened from Gmail or another
      // browser context, so the email-only client requests hash-token links.
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      flowType: "implicit",
      storageKey: SUPABASE_AUTH_STORAGE_KEY,
    },
  });
}
