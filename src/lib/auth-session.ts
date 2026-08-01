import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

let freshSessionPromise: Promise<Session | null> | null = null;

export async function getFreshSession(timeoutMs = 6000): Promise<Session | null> {
  if (!freshSessionPromise) {
    freshSessionPromise = resolveFreshSession(timeoutMs).finally(() => {
      freshSessionPromise = null;
    });
  }

  return freshSessionPromise;
}

async function resolveFreshSession(timeoutMs: number): Promise<Session | null> {
  const current = await getUsableSession();
  if (current) return current;

  return waitForAuthSession(timeoutMs);
}

async function getUsableSession(): Promise<Session | null> {
  const current = await supabase.auth.getSession().catch(() => null);
  if (current?.data.session?.user) {
    const { data, error } = await supabase.auth.getUser().catch(() => ({ data: { user: null }, error: null }));
    if (data.user) return current.data.session;

    const refreshed = await supabase.auth.refreshSession().catch(() => null);
    if (refreshed?.data.session?.user) {
      const verified = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
      if (verified.data.user) return refreshed.data.session;
    }

    if (error && isProbablyUsableSession(current.data.session)) return current.data.session;
    if (isProbablyUsableSession(current.data.session)) return current.data.session;
  }

  return null;
}

export function waitForAuthSession(timeoutMs = 6000): Promise<Session | null> {
  if (typeof window === "undefined") return Promise.resolve(null);

  return new Promise((resolve) => {
    let done = false;
    let polling = false;
    let unsubscribe: (() => void) | null = null;
    const finish = (session: Session | null) => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      window.clearInterval(pollTimer);
      unsubscribe?.();
      resolve(session?.user ? session : null);
    };
    const pollSession = async () => {
      if (done || polling) return;
      polling = true;
      try {
        const session = await getUsableSession();
        if (session?.user) finish(session);
      } finally {
        polling = false;
      }
    };

    const timer = window.setTimeout(() => finish(null), timeoutMs);
    const pollTimer = window.setInterval(() => {
      void pollSession();
    }, 350);
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) finish(session);
    });
    unsubscribe = () => subscription.unsubscribe();
    void pollSession();
  });
}

function isProbablyUsableSession(session: Session): boolean {
  if (!session.user || !session.access_token) return false;
  if (!session.expires_at) return true;
  return session.expires_at * 1000 > Date.now() + 30_000;
}
