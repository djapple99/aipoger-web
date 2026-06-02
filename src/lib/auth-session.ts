import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export async function getFreshSession(timeoutMs = 2000): Promise<Session | null> {
  const current = await supabase.auth.getSession();
  if (current.data.session?.user) return current.data.session;

  const refreshed = await supabase.auth.refreshSession().catch(() => null);
  if (refreshed?.data.session?.user) return refreshed.data.session;

  return waitForAuthSession(timeoutMs);
}

export function waitForAuthSession(timeoutMs = 2000): Promise<Session | null> {
  return new Promise((resolve) => {
    let done = false;
    let unsubscribe: (() => void) | null = null;
    const finish = (session: Session | null) => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      unsubscribe?.();
      resolve(session?.user ? session : null);
    };

    const timer = window.setTimeout(() => finish(null), timeoutMs);
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) finish(session);
    });
    unsubscribe = () => subscription.unsubscribe();
  });
}
