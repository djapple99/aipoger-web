"use client";

import Link from "next/link";
import Image from "next/image";
import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { HookCropper } from "@/components/hook-cropper";
import { AIPOGER_BRAND_LOGO } from "@/lib/brand";
import { fontGlowSans, fontRighteous } from "@/lib/fonts";
import { supabase } from "@/lib/supabase";
import { loadIsAdmin } from "@/lib/user-profile-admin";

type AdminState = "checking" | "login" | "denied" | "ready";
type QuestionType = "either_or" | "true_false";
type QuestionStatus = "draft" | "published";
type QuestionCategory = "prompt" | "listening" | "diagnosis" | "drop_selection" | "copyright";
type AnswerKey = "A" | "B";
type AudioSlot = "audioA" | "audioB" | "audioSingle";

type QuizQuestionRow = {
  id: string;
  sort_order: number;
  status: QuestionStatus;
  question_type: QuestionType;
  category: QuestionCategory;
  title: string;
  body: string | null;
  option_a: string;
  option_b: string;
  correct_answer: AnswerKey;
  explanation: string | null;
  learning_point: string | null;
  prompt_fix: string | null;
  copyright_note: string | null;
  audio_a_path: string | null;
  audio_a_source_name: string | null;
  audio_a_duration_seconds: number | null;
  audio_a_start_seconds: number | null;
  audio_a_end_seconds: number | null;
  audio_b_path: string | null;
  audio_b_source_name: string | null;
  audio_b_duration_seconds: number | null;
  audio_b_start_seconds: number | null;
  audio_b_end_seconds: number | null;
  audio_single_path: string | null;
  audio_single_source_name: string | null;
  audio_single_duration_seconds: number | null;
  audio_single_start_seconds: number | null;
  audio_single_end_seconds: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type QuestionForm = {
  id: string | null;
  sortOrder: string;
  status: QuestionStatus;
  questionType: QuestionType;
  category: QuestionCategory;
  title: string;
  body: string;
  optionA: string;
  optionB: string;
  correctAnswer: AnswerKey;
  explanation: string;
  learningPoint: string;
  promptFix: string;
  copyrightNote: string;
  audioAPath: string;
  audioASourceName: string;
  audioADuration: string;
  audioAStart: string;
  audioAEnd: string;
  audioBPath: string;
  audioBSourceName: string;
  audioBDuration: string;
  audioBStart: string;
  audioBEnd: string;
  audioSinglePath: string;
  audioSingleSourceName: string;
  audioSingleDuration: string;
  audioSingleStart: string;
  audioSingleEnd: string;
};

const QUIZ_AUDIO_BUCKET = "quiz-audio";
const MAX_QUIZ_CLIP_SECONDS = 30;

const categoryLabel: Record<QuestionCategory, string> = {
  prompt: "Prompt",
  listening: "聽感",
  diagnosis: "掉漆診斷",
  drop_selection: "Drop 片段",
  copyright: "版權風險",
};

const questionTypeLabel: Record<QuestionType, string> = {
  either_or: "二選一",
  true_false: "是非題",
};

function emptyForm(sortOrder = "10"): QuestionForm {
  return {
    id: null,
    sortOrder,
    status: "draft",
    questionType: "either_or",
    category: "listening",
    title: "",
    body: "",
    optionA: "A",
    optionB: "B",
    correctAnswer: "A",
    explanation: "",
    learningPoint: "",
    promptFix: "",
    copyrightNote: "",
    audioAPath: "",
    audioASourceName: "",
    audioADuration: "",
    audioAStart: "",
    audioAEnd: "",
    audioBPath: "",
    audioBSourceName: "",
    audioBDuration: "",
    audioBStart: "",
    audioBEnd: "",
    audioSinglePath: "",
    audioSingleSourceName: "",
    audioSingleDuration: "",
    audioSingleStart: "",
    audioSingleEnd: "",
  };
}

function formFromRow(row: QuizQuestionRow): QuestionForm {
  return {
    id: row.id,
    sortOrder: String(row.sort_order ?? 100),
    status: row.status,
    questionType: row.question_type,
    category: row.category,
    title: row.title ?? "",
    body: row.body ?? "",
    optionA: row.option_a ?? "A",
    optionB: row.option_b ?? "B",
    correctAnswer: row.correct_answer ?? "A",
    explanation: row.explanation ?? "",
    learningPoint: row.learning_point ?? "",
    promptFix: row.prompt_fix ?? "",
    copyrightNote: row.copyright_note ?? "",
    audioAPath: row.audio_a_path ?? "",
    audioASourceName: row.audio_a_source_name ?? "",
    audioADuration: row.audio_a_duration_seconds == null ? "" : String(row.audio_a_duration_seconds),
    audioAStart: row.audio_a_start_seconds == null ? "" : String(row.audio_a_start_seconds),
    audioAEnd: row.audio_a_end_seconds == null ? "" : String(row.audio_a_end_seconds),
    audioBPath: row.audio_b_path ?? "",
    audioBSourceName: row.audio_b_source_name ?? "",
    audioBDuration: row.audio_b_duration_seconds == null ? "" : String(row.audio_b_duration_seconds),
    audioBStart: row.audio_b_start_seconds == null ? "" : String(row.audio_b_start_seconds),
    audioBEnd: row.audio_b_end_seconds == null ? "" : String(row.audio_b_end_seconds),
    audioSinglePath: row.audio_single_path ?? "",
    audioSingleSourceName: row.audio_single_source_name ?? "",
    audioSingleDuration: row.audio_single_duration_seconds == null ? "" : String(row.audio_single_duration_seconds),
    audioSingleStart: row.audio_single_start_seconds == null ? "" : String(row.audio_single_start_seconds),
    audioSingleEnd: row.audio_single_end_seconds == null ? "" : String(row.audio_single_end_seconds),
  };
}

function toNumberOrNull(value: string): number | null {
  if (!value.trim()) return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function payloadFromForm(form: QuestionForm, userId: string | null) {
  return {
    sort_order: Number.parseInt(form.sortOrder, 10) || 100,
    status: form.status,
    question_type: form.questionType,
    category: form.category,
    title: form.title.trim(),
    body: form.body.trim() || null,
    option_a: form.optionA.trim() || (form.questionType === "true_false" ? "是" : "A"),
    option_b: form.optionB.trim() || (form.questionType === "true_false" ? "否" : "B"),
    correct_answer: form.correctAnswer,
    explanation: form.explanation.trim() || null,
    learning_point: form.learningPoint.trim() || null,
    prompt_fix: form.promptFix.trim() || null,
    copyright_note: form.copyrightNote.trim() || null,
    audio_a_path: form.audioAPath.trim() || null,
    audio_a_source_name: form.audioASourceName.trim() || null,
    audio_a_duration_seconds: toNumberOrNull(form.audioADuration),
    audio_a_start_seconds: toNumberOrNull(form.audioAStart),
    audio_a_end_seconds: toNumberOrNull(form.audioAEnd),
    audio_b_path: form.audioBPath.trim() || null,
    audio_b_source_name: form.audioBSourceName.trim() || null,
    audio_b_duration_seconds: toNumberOrNull(form.audioBDuration),
    audio_b_start_seconds: toNumberOrNull(form.audioBStart),
    audio_b_end_seconds: toNumberOrNull(form.audioBEnd),
    audio_single_path: form.audioSinglePath.trim() || null,
    audio_single_source_name: form.audioSingleSourceName.trim() || null,
    audio_single_duration_seconds: toNumberOrNull(form.audioSingleDuration),
    audio_single_start_seconds: toNumberOrNull(form.audioSingleStart),
    audio_single_end_seconds: toNumberOrNull(form.audioSingleEnd),
    created_by: userId,
  };
}

function safeFileName(name: string) {
  const cleaned = name
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return cleaned || `quiz-audio-${Date.now()}.wav`;
}

function publicAudioUrl(path: string) {
  const value = path.trim();
  if (!value) return "";
  if (/^https?:/i.test(value)) return value;
  return supabase.storage.from(QUIZ_AUDIO_BUCKET).getPublicUrl(value).data.publicUrl;
}

function formatSeconds(value: string) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return "-";
  return `${numeric.toFixed(2)}s`;
}

function hasAudio(form: QuestionForm) {
  return Boolean(form.audioAPath || form.audioBPath || form.audioSinglePath);
}

export default function AdminQuizPage() {
  const [adminState, setAdminState] = useState<AdminState>("checking");
  const [userId, setUserId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestionRow[]>([]);
  const [form, setForm] = useState<QuestionForm>(() => emptyForm());
  const [tableReady, setTableReady] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [cropTarget, setCropTarget] = useState<{ slot: AudioSlot; file: File } | null>(null);

  const publishedCount = useMemo(() => questions.filter((question) => question.status === "published").length, [questions]);
  const nextSortOrder = useMemo(() => {
    const highest = questions.reduce((max, question) => Math.max(max, Number(question.sort_order || 0)), 0);
    return String(highest + 10 || 10);
  }, [questions]);

  const loadQuestions = useCallback(async () => {
    setError("");
    const { data, error: queryError } = await supabase
      .from("ai_music_quiz_questions")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (queryError) {
      setQuestions([]);
      setTableReady(false);
      setError("尚未建立 ai_music_quiz_questions。請先在 Supabase SQL Editor 執行 supabase/20260611_ai_music_quiz.sql。");
      return;
    }

    const rows = (data as QuizQuestionRow[] | null) ?? [];
    setTableReady(true);
    setQuestions(rows);
    if (!form.id && rows[0]) setForm(formFromRow(rows[0]));
  }, [form.id]);

  useEffect(() => {
    let mounted = true;
    async function check() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!mounted) return;
      if (!user) {
        setAdminState("login");
        return;
      }
      setUserId(user.id);
      const allowed = await loadIsAdmin(user.id);
      if (!mounted) return;
      setAdminState(allowed ? "ready" : "denied");
      if (allowed) await loadQuestions();
    }
    void check();
    return () => {
      mounted = false;
    };
  }, [loadQuestions]);

  const updateForm = (patch: Partial<QuestionForm>) => {
    setForm((current) => ({ ...current, ...patch }));
  };

  const startNewQuestion = () => {
    setForm(emptyForm(nextSortOrder));
    setMessage("");
    setError("");
  };

  const selectQuestion = (question: QuizQuestionRow) => {
    setForm(formFromRow(question));
    setMessage("");
    setError("");
  };

  const handleQuestionTypeChange = (questionType: QuestionType) => {
    updateForm({
      questionType,
      optionA: questionType === "true_false" ? "是" : form.optionA === "是" ? "A" : form.optionA,
      optionB: questionType === "true_false" ? "否" : form.optionB === "否" ? "B" : form.optionB,
    });
  };

  const saveQuestion = async (event?: FormEvent<HTMLFormElement>, nextStatus?: QuestionStatus) => {
    event?.preventDefault();
    setError("");
    setMessage("");
    if (!userId) {
      setError("請先登入管理員帳號。");
      return;
    }
    if (!form.title.trim()) {
      setError("請先輸入題目標題。");
      return;
    }

    setSaving(true);
    const nextForm = nextStatus ? { ...form, status: nextStatus } : form;
    const payload = payloadFromForm(nextForm, userId);

    try {
      if (form.id) {
        const { error: updateError } = await supabase.from("ai_music_quiz_questions").update(payload).eq("id", form.id);
        if (updateError) throw updateError;
        setMessage(nextForm.status === "published" ? "已儲存並發布。" : "草稿已儲存。");
        setForm(nextForm);
      } else {
        const { data, error: insertError } = await supabase.from("ai_music_quiz_questions").insert(payload).select("*").single();
        if (insertError) throw insertError;
        const row = data as QuizQuestionRow;
        setForm(formFromRow(row));
        setMessage(nextForm.status === "published" ? "已建立並發布。" : "新題目草稿已建立。");
      }
      await loadQuestions();
    } catch (saveError) {
      setError(`儲存失敗：${String((saveError as { message?: string })?.message ?? saveError)}。`);
    } finally {
      setSaving(false);
    }
  };

  const deleteQuestion = async () => {
    if (!form.id) return;
    if (!window.confirm("確定刪除這題？已上傳的音檔會留在 Storage，可之後人工清理。")) return;
    setSaving(true);
    setError("");
    setMessage("");
    const { error: deleteError } = await supabase.from("ai_music_quiz_questions").delete().eq("id", form.id);
    setSaving(false);
    if (deleteError) {
      setError(`刪除失敗：${deleteError.message}`);
      return;
    }
    setMessage("題目已刪除。");
    setForm(emptyForm(nextSortOrder));
    await loadQuestions();
  };

  const handleAudioSelect = (slot: AudioSlot) => (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    setMessage("");
    setError("");
    if (!file) return;
    setCropTarget({ slot, file });
  };

  const applyAudioClip = (slot: AudioSlot, patch: { path: string; sourceName: string; start: number; end: number; duration: number }) => {
    const next = {
      sourceName: patch.sourceName,
      start: patch.start.toFixed(2),
      end: patch.end.toFixed(2),
      duration: patch.duration.toFixed(2),
    };

    if (slot === "audioA") {
      updateForm({
        audioAPath: patch.path,
        audioASourceName: next.sourceName,
        audioAStart: next.start,
        audioAEnd: next.end,
        audioADuration: next.duration,
      });
      return;
    }

    if (slot === "audioB") {
      updateForm({
        audioBPath: patch.path,
        audioBSourceName: next.sourceName,
        audioBStart: next.start,
        audioBEnd: next.end,
        audioBDuration: next.duration,
      });
      return;
    }

    updateForm({
      audioSinglePath: patch.path,
      audioSingleSourceName: next.sourceName,
      audioSingleStart: next.start,
      audioSingleEnd: next.end,
      audioSingleDuration: next.duration,
    });
  };

  const exportJson = async () => {
    const rows = questions.map((question) => ({
      sortOrder: question.sort_order,
      status: question.status,
      questionType: question.question_type,
      category: question.category,
      title: question.title,
      body: question.body,
      optionA: question.option_a,
      optionB: question.option_b,
      correctAnswer: question.correct_answer,
      explanation: question.explanation,
      learningPoint: question.learning_point,
      promptFix: question.prompt_fix,
      copyrightNote: question.copyright_note,
      audioA: question.audio_a_path,
      audioB: question.audio_b_path,
      audioSingle: question.audio_single_path,
    }));
    const text = JSON.stringify(rows, null, 2);
    await navigator.clipboard.writeText(text);
    setMessage("已複製題庫 JSON。之後要接前台或部署，可以直接貼給我。");
  };

  if (cropTarget) {
    return (
      <main className="min-h-screen bg-[#050505] px-4 py-6 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <HookCropper
            file={cropTarget.file}
            maxSeconds={MAX_QUIZ_CLIP_SECONDS}
            eyebrow="AIPOGER QUIZ AUDIO"
            title="測驗音樂片段裁切"
            description="拖曳橘色區塊選取題目要播放的片段，建議 15-30 秒。"
            backLabel="返回題目編輯"
            fullPlayLabel="播放原音檔"
            previewLabel="預聽題目片段"
            confirmLabel="確認片段並上傳"
            onBack={() => setCropTarget(null)}
            onConfirm={async ({ blob, start, end, duration }) => {
              if (!userId) throw new Error("尚未登入。");
              setUploading(true);
              const path = `${userId}/${Date.now()}-${cropTarget.slot}-${safeFileName(cropTarget.file.name).replace(/\.[^.]+$/, "")}.wav`;
              const { error: uploadError } = await supabase.storage.from(QUIZ_AUDIO_BUCKET).upload(path, blob, {
                contentType: "audio/wav",
                upsert: false,
              });
              setUploading(false);
              if (uploadError) throw uploadError;
              applyAudioClip(cropTarget.slot, {
                path,
                sourceName: cropTarget.file.name,
                start,
                end,
                duration,
              });
              setMessage("音樂片段已上傳，記得儲存題目。");
              setCropTarget(null);
            }}
          />
          {uploading && <p className="mt-4 text-sm font-black text-orange-100">上傳片段中...</p>}
        </div>
      </main>
    );
  }

  if (adminState === "checking") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050505] px-6 text-zinc-100">
        <p className="text-sm font-bold text-zinc-400">檢查測驗後台權限...</p>
      </main>
    );
  }

  if (adminState === "login" || adminState === "denied") {
    return (
      <main className="relative min-h-screen overflow-hidden bg-[#050505] px-5 py-8 text-zinc-100">
        <div className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_18%_16%,rgba(255,106,0,0.24),transparent_34%),linear-gradient(180deg,#050505,#090706)]" />
        <section className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl flex-col justify-center">
          <Image src={AIPOGER_BRAND_LOGO} alt="" width={80} height={80} className="mb-8 h-20 w-20 rounded-2xl object-contain" />
          <h1 className="text-4xl font-black text-white">{adminState === "login" ? "請先登入" : "沒有管理權限"}</h1>
          <p className="mt-4 text-base leading-8 text-zinc-400">
            AI 音樂耳朵測驗後台只開放管理員建立題目。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/auth" className="rounded-full bg-orange-500 px-5 py-3 text-sm font-black text-black">
              登入
            </Link>
            <Link href="/" className="rounded-full border border-white/15 px-5 py-3 text-sm font-bold text-zinc-200">
              回首頁
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const audioAUrl = publicAudioUrl(form.audioAPath);
  const audioBUrl = publicAudioUrl(form.audioBPath);
  const audioSingleUrl = publicAudioUrl(form.audioSinglePath);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] px-4 py-5 text-zinc-100 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_18%_10%,rgba(255,106,0,0.22),transparent_32%),radial-gradient(circle_at_88%_20%,rgba(0,202,255,0.13),transparent_28%),linear-gradient(180deg,#050505_0%,#090706_50%,#050505_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.11] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:54px_54px]" />

      <div className="relative z-10 mx-auto flex w-full max-w-[1600px] flex-col gap-5">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <Link href="/" className="rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:border-orange-400/60 hover:text-white">
            回首頁
          </Link>
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-orange-300/70">AIPOGER ADMIN</p>
            <h1 className={`${fontRighteous.className} mt-1 text-3xl tracking-[0.08em] text-white md:text-5xl`}>
              Drop Sense Builder
            </h1>
          </div>
          <nav className="flex flex-wrap items-center justify-end gap-2">
            <Link href="/admin/listen-bar" className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-sm font-bold text-cyan-100">
              酒吧後台
            </Link>
            <Link href="/admin/battles" className="rounded-full border border-orange-300/30 bg-orange-500/10 px-4 py-2 text-sm font-bold text-orange-100">
              Battle 管理
            </Link>
            <button type="button" onClick={() => void exportJson()} className="rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-sm font-black text-zinc-100 transition hover:border-orange-300/55">
              複製 JSON
            </button>
          </nav>
        </header>

        <section className="grid gap-4 lg:grid-cols-[22rem_1fr_24rem]">
          <aside className="rounded-[1.2rem] border border-white/10 bg-black/54 p-4 backdrop-blur">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.26em] text-orange-300/70">QUESTION BANK</p>
                <h2 className="mt-1 text-2xl font-black text-white">題庫</h2>
                <p className="mt-1 text-xs font-bold text-zinc-500">{questions.length} 題 / {publishedCount} 題已發布</p>
              </div>
              <button type="button" onClick={startNewQuestion} className="rounded-full bg-orange-500 px-4 py-2 text-xs font-black text-black transition hover:bg-orange-300">
                新增
              </button>
            </div>

            {!tableReady && (
              <p className="mb-3 rounded-2xl border border-orange-300/30 bg-orange-500/10 px-3 py-3 text-xs font-bold leading-6 text-orange-100">
                尚未建立資料表。先執行 supabase/20260611_ai_music_quiz.sql。
              </p>
            )}

            <div className="grid max-h-[calc(100vh-14rem)] gap-2 overflow-y-auto pr-1">
              {questions.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-8 text-center text-sm leading-7 text-zinc-500">
                  還沒有題目。先建立第一題，之後再排序成 10 題。
                </div>
              ) : (
                questions.map((question) => {
                  const active = question.id === form.id;
                  return (
                    <button
                      key={question.id}
                      type="button"
                      onClick={() => selectQuestion(question)}
                      className={`rounded-2xl border p-3 text-left transition ${
                        active
                          ? "border-orange-300/55 bg-orange-500/13"
                          : "border-white/10 bg-white/[0.035] hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black text-zinc-500">Q{question.sort_order}</span>
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-black ${
                          question.status === "published"
                            ? "border-cyan-200/30 bg-cyan-300/10 text-cyan-100"
                            : "border-zinc-700 bg-zinc-900 text-zinc-500"
                        }`}>
                          {question.status === "published" ? "已發布" : "草稿"}
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm font-black leading-6 text-white">{question.title}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <span className="rounded-full bg-white/[0.06] px-2 py-1 text-[11px] font-bold text-zinc-300">{questionTypeLabel[question.question_type]}</span>
                        <span className="rounded-full bg-white/[0.06] px-2 py-1 text-[11px] font-bold text-zinc-300">{categoryLabel[question.category]}</span>
                        {(question.audio_a_path || question.audio_b_path || question.audio_single_path) && (
                          <span className="rounded-full bg-orange-500/14 px-2 py-1 text-[11px] font-bold text-orange-100">有音檔</span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          <form onSubmit={(event) => void saveQuestion(event)} className="rounded-[1.2rem] border border-orange-400/18 bg-black/60 p-4 shadow-[0_24px_90px_rgba(0,0,0,0.52)] backdrop-blur md:p-5">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-orange-300/70">EDITOR</p>
                <h2 className="mt-1 text-2xl font-black text-white">{form.id ? "編輯題目" : "新增題目"}</h2>
                <p className={`mt-2 text-sm leading-6 text-zinc-500 ${fontGlowSans.className}`} style={fontGlowSans.style}>
                  只支援二選一與是非題，讓前台測驗保持快、清楚、好玩。
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="submit" disabled={saving || !tableReady} className="rounded-full bg-orange-500 px-5 py-2.5 text-xs font-black text-black transition hover:bg-orange-300 disabled:opacity-50">
                  {saving ? "儲存中" : "儲存草稿"}
                </button>
                <button type="button" disabled={saving || !tableReady} onClick={() => void saveQuestion(undefined, form.status === "published" ? "draft" : "published")} className="rounded-full border border-cyan-200/35 bg-cyan-300/10 px-5 py-2.5 text-xs font-black text-cyan-100 transition hover:border-cyan-200 disabled:opacity-50">
                  {form.status === "published" ? "改回草稿" : "發布"}
                </button>
              </div>
            </div>

            {message && <p className="mb-4 rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-3 text-sm font-bold text-cyan-100">{message}</p>}
            {error && <p className="mb-4 rounded-2xl border border-red-300/25 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">{error}</p>}

            <div className="grid gap-4">
              <div className="grid gap-3 md:grid-cols-4">
                <label className="grid gap-2">
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">題號排序</span>
                  <input value={form.sortOrder} onChange={(event) => updateForm({ sortOrder: event.target.value.replace(/[^\d-]/g, "") })} inputMode="numeric" className="h-12 rounded-xl border border-white/12 bg-black/50 px-4 text-sm text-white outline-none transition focus:border-orange-400" />
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">題型</span>
                  <select value={form.questionType} onChange={(event) => handleQuestionTypeChange(event.target.value as QuestionType)} className="h-12 rounded-xl border border-white/12 bg-black/50 px-4 text-sm font-bold text-white outline-none transition focus:border-orange-400">
                    <option value="either_or">二選一</option>
                    <option value="true_false">是非題</option>
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">主題</span>
                  <select value={form.category} onChange={(event) => updateForm({ category: event.target.value as QuestionCategory })} className="h-12 rounded-xl border border-white/12 bg-black/50 px-4 text-sm font-bold text-white outline-none transition focus:border-orange-400">
                    <option value="listening">聽感</option>
                    <option value="prompt">Prompt</option>
                    <option value="diagnosis">掉漆診斷</option>
                    <option value="drop_selection">Drop 片段</option>
                    <option value="copyright">版權風險</option>
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">正解</span>
                  <select value={form.correctAnswer} onChange={(event) => updateForm({ correctAnswer: event.target.value as AnswerKey })} className="h-12 rounded-xl border border-white/12 bg-black/50 px-4 text-sm font-bold text-white outline-none transition focus:border-orange-400">
                    <option value="A">A</option>
                    <option value="B">B</option>
                  </select>
                </label>
              </div>

              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">題目標題</span>
                <input value={form.title} onChange={(event) => updateForm({ title: event.target.value })} placeholder="例如：哪一段比較適合拿去 Drop Battle？" className="h-12 rounded-xl border border-white/12 bg-black/50 px-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-400" />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">題目補充</span>
                <textarea value={form.body} onChange={(event) => updateForm({ body: event.target.value.slice(0, 1600) })} placeholder="可放 prompt、情境、判斷目標。聽感題可以留短一點。" rows={4} className="resize-y rounded-xl border border-white/12 bg-black/50 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-400" />
              </label>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">選項 A</span>
                  <textarea value={form.optionA} onChange={(event) => updateForm({ optionA: event.target.value.slice(0, 1200) })} rows={3} className="resize-y rounded-xl border border-white/12 bg-black/50 px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-orange-400" />
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">選項 B</span>
                  <textarea value={form.optionB} onChange={(event) => updateForm({ optionB: event.target.value.slice(0, 1200) })} rows={3} className="resize-y rounded-xl border border-white/12 bg-black/50 px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-orange-400" />
                </label>
              </div>

              <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-orange-300/70">AUDIO CLIPS</p>
                    <h3 className="mt-1 text-lg font-black text-white">音樂片段</h3>
                  </div>
                  <p className="text-xs font-bold text-zinc-500">建議 15-30 秒</p>
                </div>
                <div className="grid gap-3 xl:grid-cols-3">
                  {([
                    ["audioA", "音檔 A", audioAUrl, form.audioASourceName, form.audioADuration],
                    ["audioB", "音檔 B", audioBUrl, form.audioBSourceName, form.audioBDuration],
                    ["audioSingle", "單一音檔", audioSingleUrl, form.audioSingleSourceName, form.audioSingleDuration],
                  ] as const).map(([slot, label, url, sourceName, duration]) => (
                    <div key={slot} className="rounded-2xl border border-white/10 bg-black/42 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-black text-white">{label}</p>
                        <span className="text-xs font-bold text-zinc-500">{formatSeconds(duration)}</span>
                      </div>
                      <p className="mt-1 min-h-5 truncate text-xs text-zinc-500">{sourceName || "尚未上傳"}</p>
                      {url ? (
                        <audio className="mt-3 w-full accent-orange-500" controls preload="metadata" src={url}>
                          <track kind="captions" />
                        </audio>
                      ) : (
                        <div className="mt-3 flex h-10 items-center rounded-xl border border-white/8 bg-white/[0.025] px-3 text-xs font-bold text-zinc-600">
                          尚無片段
                        </div>
                      )}
                      <label className="mt-3 flex h-10 cursor-pointer items-center justify-center rounded-xl border border-orange-300/30 bg-orange-500/10 text-xs font-black text-orange-100 transition hover:bg-orange-500/16">
                        上傳並裁切
                        <input type="file" accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/aiff,audio/x-aiff,audio/mp4,audio/aac,.mp3,.wav,.aif,.aiff,.m4a,.aac" onChange={handleAudioSelect(slot)} className="hidden" />
                      </label>
                    </div>
                  ))}
                </div>
              </section>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">答案解析</span>
                  <textarea value={form.explanation} onChange={(event) => updateForm({ explanation: event.target.value.slice(0, 2000) })} placeholder="答完後顯示：為什麼 A 或 B 比較對。" rows={5} className="resize-y rounded-xl border border-white/12 bg-black/50 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-400" />
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">學習重點</span>
                  <textarea value={form.learningPoint} onChange={(event) => updateForm({ learningPoint: event.target.value.slice(0, 2000) })} placeholder="這題要訓練什麼耳朵或判斷力。" rows={5} className="resize-y rounded-xl border border-white/12 bg-black/50 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-400" />
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">Prompt 修正建議</span>
                  <textarea value={form.promptFix} onChange={(event) => updateForm({ promptFix: event.target.value.slice(0, 2200) })} placeholder="如果這首掉漆，要怎麼改 prompt。" rows={4} className="resize-y rounded-xl border border-white/12 bg-black/50 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-400" />
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">版權提醒</span>
                  <textarea value={form.copyrightNote} onChange={(event) => updateForm({ copyrightNote: event.target.value.slice(0, 2200) })} placeholder="版權題或商用風險題才需要填。" rows={4} className="resize-y rounded-xl border border-white/12 bg-black/50 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-400" />
                </label>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                <button type="button" onClick={() => void loadQuestions()} className="rounded-full border border-white/12 px-4 py-2 text-xs font-black text-zinc-200 transition hover:border-cyan-200/55">
                  重新整理
                </button>
                <div className="flex flex-wrap gap-2">
                  {form.id && (
                    <button type="button" onClick={() => void deleteQuestion()} disabled={saving} className="rounded-full border border-red-300/30 px-4 py-2 text-xs font-black text-red-100 transition hover:border-red-300 disabled:opacity-50">
                      刪除
                    </button>
                  )}
                  <button type="submit" disabled={saving || !tableReady} className="rounded-full bg-orange-500 px-5 py-2 text-xs font-black text-black transition hover:bg-orange-300 disabled:opacity-50">
                    {saving ? "儲存中" : "儲存題目"}
                  </button>
                </div>
              </div>
            </div>
          </form>

          <aside className="rounded-[1.2rem] border border-cyan-200/14 bg-white/[0.04] p-4 backdrop-blur">
            <div className="mb-4">
              <p className="text-xs uppercase tracking-[0.26em] text-cyan-200/70">LIVE PREVIEW</p>
              <h2 className="mt-1 text-2xl font-black text-white">前台預覽</h2>
            </div>

            <section className="rounded-[1rem] border border-white/10 bg-black/54 p-4">
              <div className="mb-4 flex items-center justify-between gap-2">
                <span className="rounded-full border border-orange-300/30 bg-orange-500/10 px-3 py-1 text-xs font-black text-orange-100">
                  Q{form.sortOrder || "-"} / 10
                </span>
                <span className="rounded-full border border-cyan-200/25 bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-100">
                  {categoryLabel[form.category]}
                </span>
              </div>

              <h3 className="text-2xl font-black leading-tight text-white">{form.title || "題目標題會顯示在這裡"}</h3>
              {form.body && <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-zinc-400">{form.body}</p>}

              <div className="mt-5 grid gap-3">
                {audioSingleUrl && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                    <p className="mb-2 text-xs font-black text-zinc-500">題目音檔</p>
                    <audio className="w-full accent-orange-500" controls preload="metadata" src={audioSingleUrl}>
                      <track kind="captions" />
                    </audio>
                  </div>
                )}

                {(["A", "B"] as const).map((answer) => {
                  const isA = answer === "A";
                  const url = isA ? audioAUrl : audioBUrl;
                  const label = isA ? form.optionA : form.optionB;
                  return (
                    <div key={answer} className="rounded-2xl border border-white/10 bg-black/42 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm font-black text-white">{answer}</p>
                        {form.correctAnswer === answer && <span className="text-xs font-black text-orange-200">正解</span>}
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-300">{label || `${answer} 選項`}</p>
                      {url && (
                        <audio className="mt-3 w-full accent-orange-500" controls preload="metadata" src={url}>
                          <track kind="captions" />
                        </audio>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <button type="button" className="h-11 rounded-xl border border-white/12 bg-white/[0.045] text-sm font-black text-zinc-100">
                  選 A
                </button>
                <button type="button" className="h-11 rounded-xl border border-white/12 bg-white/[0.045] text-sm font-black text-zinc-100">
                  選 B
                </button>
              </div>
            </section>

            <section className="mt-4 rounded-[1rem] border border-white/10 bg-black/36 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-orange-300/70">ANSWER CARD</p>
              <div className="mt-3 grid gap-3 text-sm leading-6 text-zinc-300">
                <p><span className="font-black text-white">解析：</span>{form.explanation || "答題後顯示解析。"}</p>
                <p><span className="font-black text-white">學習：</span>{form.learningPoint || "這題訓練的判斷力。"}</p>
                {form.promptFix && <p><span className="font-black text-white">Prompt：</span>{form.promptFix}</p>}
                {form.copyrightNote && <p><span className="font-black text-white">版權：</span>{form.copyrightNote}</p>}
              </div>
            </section>

            <section className="mt-4 rounded-[1rem] border border-white/10 bg-white/[0.035] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">CHECK</p>
              <ul className="mt-3 grid gap-2 text-sm text-zinc-400">
                <li className={form.title.trim() ? "text-cyan-100" : ""}>題目標題 {form.title.trim() ? "已填" : "未填"}</li>
                <li className={form.explanation.trim() ? "text-cyan-100" : ""}>答案解析 {form.explanation.trim() ? "已填" : "未填"}</li>
                <li className={hasAudio(form) ? "text-cyan-100" : ""}>音樂片段 {hasAudio(form) ? "已上傳" : "可選填"}</li>
                <li className={form.status === "published" ? "text-orange-100" : ""}>狀態：{form.status === "published" ? "已發布" : "草稿"}</li>
              </ul>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}
