"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { MUSIC_GENRE_OPTIONS } from "@/lib/music-genres";
import { parseGenreSuggestion } from "@/lib/genre-suggestion";
import { prepareGenreSample } from "@/lib/genre-sample-client";

export const genreSuggestionCopy = {
  zh: { title: "曲風建議", loading: "正在聽取音訊片段，為你尋找適合的類型…", note: "依音訊片段提供參考；是否採用，由你決定。", use: "採用建議", selected: "目前選擇", skip: "自行選擇", skipped: "請從類型選單自行選擇。", empty: "這首歌的曲風較難判斷，請自行選擇適合的類型。", error: "暫時無法提供建議，你可以照常自行選擇類型並投稿。", retry: "重新分析", signIn: "登入後可取得曲風建議。", privacy: "選擇音檔後，會傳送最多 21 秒音訊片段供曲風分析。" },
  en: { title: "Genre suggestions", loading: "Listening to audio excerpts to find a suitable genre…", note: "Suggestions are based on audio excerpts. You choose whether to use them.", use: "Use suggestion", selected: "Selected", skip: "Choose myself", skipped: "Choose your genre from the menu.", empty: "The genre is unclear. Please choose the best fit yourself.", error: "Suggestions are unavailable. You can still choose a genre and submit.", retry: "Try again", signIn: "Sign in for genre suggestions.", privacy: "Selecting audio sends up to 21 seconds of excerpts for genre analysis." },
  ja: { title: "ジャンルの提案", loading: "音声の一部を分析して、合うジャンルを探しています…", note: "音声の一部に基づく参考です。採用するかはあなたが決められます。", use: "提案を採用", selected: "選択中", skip: "自分で選ぶ", skipped: "メニューからジャンルを選んでください。", empty: "ジャンルを判断できませんでした。ご自身でお選びください。", error: "現在提案を取得できません。ジャンルを選んで投稿できます。", retry: "再分析", signIn: "ログインするとジャンルの提案を利用できます。", privacy: "音声を選ぶと、最大21秒の抜粋がジャンル分析のため送信されます。" },
  ko: { title: "장르 추천", loading: "오디오 일부를 분석해 어울리는 장르를 찾고 있어요…", note: "오디오 일부를 바탕으로 한 참고 의견입니다. 채택 여부는 직접 결정하세요.", use: "추천 적용", selected: "선택됨", skip: "직접 선택", skipped: "메뉴에서 장르를 직접 선택하세요.", empty: "장르를 판단하기 어려워요. 알맞은 장르를 직접 선택하세요.", error: "지금은 추천을 제공할 수 없어요. 장르를 직접 선택하고 제출할 수 있어요.", retry: "다시 분석", signIn: "로그인하면 장르 추천을 받을 수 있어요.", privacy: "오디오를 선택하면 장르 분석을 위해 최대 21초의 발췌가 전송됩니다." },
};

export function genreCopy(lang: string) {
  return genreSuggestionCopy[lang as keyof typeof genreSuggestionCopy] ?? genreSuggestionCopy.zh;
}

type State = { file: File | null; userId: string | null; status: "loading" | "ready" | "error"; genres: string[] };

export default function GenreSuggestion({ file, userId, lang, selectedGenre, disabled, onAccept, label }: {
  file: File | null; userId: string | null; lang: string; selectedGenre: string; disabled: boolean;
  onAccept: (genre: string) => void; label: (key: string) => string;
}) {
  const copy = genreCopy(lang);
  const [attempt, setAttempt] = useState(0);
  const [dismissed, setDismissed] = useState<File | null>(null);
  const [state, setState] = useState<State>({ file: null, userId: null, status: "loading", genres: [] });
  useEffect(() => {
    if (!file || !userId || dismissed === file) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55000);
    let active = true;
    setState({ file, userId, status: "loading", genres: [] });
    void (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session || data.session.user.id !== userId) throw new Error("No session");
        const sample = await prepareGenreSample(file, controller.signal);
        const response = await fetch("/api/music-analysis/genre", {
          method: "POST", headers: { "Content-Type": "audio/wav", Authorization: `Bearer ${data.session.access_token}` },
          body: sample, signal: controller.signal,
        });
        if (!response.ok) throw new Error("Unavailable");
        const result = parseGenreSuggestion(await response.json());
        if (!result) throw new Error("Invalid response");
        if (active) setState({ file, userId, status: "ready", genres: result.genres });
      } catch {
        if (active) setState({ file, userId, status: "error", genres: [] });
      } finally {
        clearTimeout(timeout);
      }
    })();
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [file, userId, dismissed, attempt]);

  if (!file) return null;
  const status = state.file === file && state.userId === userId ? state.status : "loading";
  const skipped = dismissed === file;
  return (
    <section aria-label={copy.title} className="rounded-xl border border-orange-300/20 bg-orange-400/5 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold text-orange-200">{copy.title}</h3>
        {!skipped && userId && <button type="button" disabled={disabled} onClick={() => setDismissed(file)} className="min-h-10 rounded-lg px-2 text-xs text-zinc-300 underline underline-offset-4 disabled:opacity-50">{copy.skip}</button>}
      </div>
      <p role="status" aria-live="polite" className="mt-1 text-xs leading-relaxed text-zinc-300">
        {!userId ? copy.signIn : skipped ? copy.skipped : status === "loading" ? copy.loading : status === "error" ? copy.error : state.genres.length ? copy.note : copy.empty}
      </p>
      {userId && !skipped && status === "ready" && <ul className="mt-2 grid gap-2">
        {state.genres.map(genre => <li key={genre} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-black/30 px-3 py-2">
          <span className="min-w-0 text-sm font-bold text-white">{label(MUSIC_GENRE_OPTIONS.find(option => option.value === genre)!.labelKey)}</span>
          <button type="button" disabled={disabled || selectedGenre === genre} onClick={() => onAccept(genre)} className="min-h-10 shrink-0 rounded-lg border border-orange-300/30 px-3 py-2 text-xs font-bold text-orange-200 hover:bg-orange-300/10 focus-visible:outline-2 focus-visible:outline-orange-300 disabled:opacity-50">
            {selectedGenre === genre ? copy.selected : copy.use}
          </button>
        </li>)}
      </ul>}
      {userId && !skipped && status === "error" && <button type="button" disabled={disabled} onClick={() => setAttempt(value => value + 1)} className="mt-2 min-h-10 rounded-lg px-2 text-xs font-bold text-orange-200 underline disabled:opacity-50">{copy.retry}</button>}
    </section>
  );
}
