import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export const SUPABASE_AUTH_STORAGE_KEY = "sb-rwueinzgjaaefjvmsyem-auth-token";

if (!supabaseUrl || !supabaseKey) {
  throw new Error("請確認你的 .env.local 是否已經設定好 Supabase 的環境變數！");
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    // Use implicit auth for the public browser client so Email Magic Links still
    // work when users open them from Gmail or another browser context.
    // The callback page is the single place that reads URL tokens and stores the session.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: "implicit",
    storageKey: SUPABASE_AUTH_STORAGE_KEY,
  },
});
