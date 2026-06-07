"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { rememberAuthNextPath, safeNextPath } from "@/lib/auth-urls";
import { isDropChallengeAcceptable } from "@/lib/battle-pool-client";
import { supabase } from "@/lib/supabase";

type QueueRow = {
  id: string;
  user_id: string;
  fighter_name: string | null;
  original_file_name: string | null;
  genre: string | null;
  status: string | null;
  match_group_id: string | null;
  expires_at: string | null;
  scheduled_start_at?: string | null;
  cancellation_evaluation_at?: string | null;
};

type AcceptState =
  | { kind: "loading" }
  | { kind: "accepted"; row: QueueRow; watchId: string }
  | { kind: "own-card"; row: QueueRow; watchId: string }
  | { kind: "ended"; title: string; body: string; watchId?: string | null }
  | { kind: "error"; title: string; body: string };

const CLOSED_QUEUE_STATUSES = new Set([
  "expired",
  "cancelled",
  "cancelled_no_challenger",
  "cancelled_founder",
  "completed",
]);

const ACCEPTED_QUEUE_STATUSES = new Set([
  "matched",
  "active",
  "public_voting",
  "ghost_battle",
]);

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function queryLang(value: string | null) {
  return value === "en" ? "en" : "zh";
}

function battleAcceptPath(id: string, lang: string) {
  return `/battle/accept/${encodeURIComponent(id)}?lang=${encodeURIComponent(lang)}`;
}

function uploadDropPath(row: QueueRow, lang: string) {
  const params = new URLSearchParams({
    flow: "upload-first",
    battleMode: "instant",
    instantPairing: "auto",
    challengeEntryId: row.id,
    genre: row.genre?.trim() || "AI Music Drop Battle",
    lang,
  });
  return `/battle/hook-cut?${params.toString()}`;
}

function watchPath(id: string, lang: string) {
  return `/battle/${encodeURIComponent(id)}?lang=${encodeURIComponent(lang)}`;
}

function battlePoolPath(lang: string) {
  return `/battle?lang=${encodeURIComponent(lang)}`;
}

function BattleAcceptInner() {
  const router = useRouter();
  const params = useParams<{ id?: string | string[] }>();
  const searchParams = useSearchParams();
  const id = firstParam(params.id);
  const lang = queryLang(searchParams.get("lang"));
  const nextPath = useMemo(() => safeNextPath(battleAcceptPath(id, lang)), [id, lang]);
  const [state, setState] = useState<AcceptState>({ kind: "loading" });
  const handledRef = useRef(false);

  useEffect(() => {
    if (!id || handledRef.current) return;
    handledRef.current = true;

    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id ?? null;
      if (!userId) {
        const returnPath = watchPath(id, lang);
        rememberAuthNextPath(returnPath);
        router.replace(`/auth?next=${encodeURIComponent(returnPath)}`);
        return;
      }

      let { data, error } = await supabase
        .from("battle_queue")
        .select("id,user_id,fighter_name,original_file_name,genre,status,match_group_id,expires_at,scheduled_start_at,cancellation_evaluation_at")
        .eq("id", id)
        .maybeSingle<QueueRow>();

      if (error) {
        const msg = `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`;
        const missingScheduleColumn = /scheduled_start_at|cancellation_evaluation_at|schema cache|column.*does not exist|PGRST204/i.test(msg);
        if (missingScheduleColumn) {
          const legacyRead = await supabase
            .from("battle_queue")
            .select("id,user_id,fighter_name,original_file_name,genre,status,match_group_id,expires_at")
            .eq("id", id)
            .maybeSingle<QueueRow>();
          data = legacyRead.data;
          error = legacyRead.error;
        }
      }

      if (error) {
        console.error("[battle accept] queue read failed", error);
        setState({
          kind: "error",
          title: lang === "zh" ? "接戰入口暫時打不開" : "Accept Link Is Unavailable",
          body: lang === "zh" ? "請回鬥歌場重新選一張戰帖。" : "Return to the Battle Pool and choose another card.",
        });
        return;
      }

      if (!data?.id) {
        setState({
          kind: "ended",
          title: lang === "zh" ? "戰帖不存在或已失效" : "This Card Is Unavailable",
          body: lang === "zh" ? "這張 Drop Battle 戰帖可能已取消、過期或被清理。" : "This Drop Battle card may have been cancelled, expired, or cleaned up.",
        });
        return;
      }

      const watchId = data.match_group_id || data.id;
      if (data.user_id === userId) {
        setState({ kind: "own-card", row: data, watchId });
        return;
      }

      if (data.match_group_id || ACCEPTED_QUEUE_STATUSES.has(data.status ?? "")) {
        setState({ kind: "accepted", row: data, watchId });
        return;
      }

      if (CLOSED_QUEUE_STATUSES.has(data.status ?? "") || !isDropChallengeAcceptable(data)) {
        setState({
          kind: "ended",
          title: lang === "zh" ? "戰帖已結束" : "This Card Has Ended",
          body: lang === "zh" ? "這張 Drop Battle 戰帖已取消、過期或不再開放接戰。" : "This Drop Battle card is cancelled, expired, or no longer open.",
          watchId: data.match_group_id,
        });
        return;
      }

      router.replace(uploadDropPath(data, lang));
    };

    void load();
  }, [id, lang, nextPath, router]);

  const title =
    state.kind === "loading"
      ? lang === "zh"
        ? "確認戰帖狀態中"
        : "Checking Battle Card"
      : state.kind === "accepted"
        ? lang === "zh"
          ? "已經被人挑戰了"
          : "Already Accepted"
        : state.kind === "own-card"
          ? lang === "zh"
            ? "這是你的戰帖"
            : "This Is Your Card"
          : state.title;
  const body =
    state.kind === "loading"
      ? lang === "zh"
        ? "正在確認登入與挑戰池狀態，戰帖可挑戰時會自動帶你去上傳 Drop。"
        : "Checking sign-in and card status. Open cards continue to Drop upload automatically."
      : state.kind === "accepted"
        ? lang === "zh"
          ? "這張戰帖已被其他創作者接走，不能再上傳接戰。你可以直接進戰場觀戰。"
          : "Another creator already answered this card. You can enter the arena to watch."
        : state.kind === "own-card"
          ? lang === "zh"
            ? "不能接受自己的 Drop Battle 戰帖。你可以回到自己的戰場，或回挑戰池。"
            : "You cannot accept your own Drop Battle card. Enter your arena or return to the pool."
          : state.body;
  const watchId =
    state.kind === "accepted" || state.kind === "own-card"
      ? state.watchId
      : state.kind === "ended"
        ? state.watchId
        : null;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050505] px-5 py-24 text-white">
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_20%_18%,rgba(255,106,0,0.24),transparent_34%),radial-gradient(circle_at_82%_24%,rgba(0,203,255,0.15),transparent_30%),linear-gradient(180deg,#050505,#0b0908)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:52px_52px]" />
      <section className="relative z-10 w-full max-w-xl rounded-[2rem] border border-orange-300/28 bg-black/70 p-7 text-center shadow-[0_0_72px_rgba(255,106,0,0.16)]">
        <p className="text-xs font-black uppercase tracking-[0.34em] text-orange-200/80">AIPOGER DROP BATTLE</p>
        <h1 className="mt-4 text-4xl font-black leading-tight text-white md:text-5xl">{title}</h1>
        <p className="mx-auto mt-4 max-w-md text-sm font-bold leading-7 text-zinc-300">{body}</p>
        {state.kind === "loading" ? (
          <div className="mx-auto mt-7 h-2 w-44 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-orange-400" />
          </div>
        ) : (
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            {watchId ? (
              <Link
                href={watchPath(watchId, lang)}
                className="rounded-full bg-orange-500 px-6 py-3 text-sm font-black text-black shadow-[0_0_28px_rgba(255,106,0,0.24)] transition hover:bg-orange-300"
              >
                {lang === "zh" ? "我要觀戰" : "Watch Battle"}
              </Link>
            ) : null}
            <Link
              href={battlePoolPath(lang)}
              className="rounded-full border border-cyan-200/35 bg-cyan-300/10 px-6 py-3 text-sm font-black text-cyan-50 transition hover:border-cyan-100"
            >
              {lang === "zh" ? "回鬥歌場" : "Back to Battle Pool"}
            </Link>
            <Link
              href={`/listen-bar?lang=${encodeURIComponent(lang)}`}
              className="rounded-full border border-white/15 bg-white/[0.05] px-6 py-3 text-sm font-black text-zinc-200 transition hover:border-orange-200/50"
            >
              {lang === "zh" ? "去傷心酒吧" : "Bar Heartbreak"}
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}

export default function BattleAcceptPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-black text-zinc-400">
          載入中…
        </main>
      }
    >
      <BattleAcceptInner />
    </Suspense>
  );
}
