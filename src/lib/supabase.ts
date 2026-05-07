import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("請確認你的 .env.local 是否已經設定好 Supabase 的環境變數！");
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    // 明確指定，避免不同環境/版本預設差異導致 callback 沒解析 session
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});