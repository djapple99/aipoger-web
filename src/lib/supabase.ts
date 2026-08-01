import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("請確認你的 .env.local 是否已經設定好 Supabase 的環境變數！");
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    // OAuth 一律使用 PKCE，callback 頁會明確呼叫 exchangeCodeForSession。
    // 關閉自動 URL 偵測可避免 callback 頁與 SDK 同時交換 code，造成偶發登入失敗。
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: "pkce",
  },
});
