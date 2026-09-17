import { createClient } from "@supabase/supabase-js";
import { MonthlyChartError } from "./monthly-charts";

export function monthlyChartAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new MonthlyChartError("Monthly charts are temporarily unavailable.", 503);
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
