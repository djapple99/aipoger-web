"use client";

import Link from "next/link";
import { Check, Copy, Eye, ExternalLink, Pencil, Play, Plus, Save, Search, Trash2, Upload, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AIPOGER_CHOICE_INTRO_MAX_LENGTH, type AipogerChoiceCatalogItem } from "@/lib/aipoger-choice";
import { creatorChoicePublicPath, creatorChoiceWeekStart, type AipogerCreatorChoiceCollection } from "@/lib/creator-choice";
import { AIPOGER_BRAND_LOGO } from "@/lib/brand";
import { rememberAuthNextPath } from "@/lib/auth-urls";
import { supabase } from "@/lib/supabase";
import { musicPlayer } from "@/lib/music-player-store";
import { AipogerChoiceCover } from "@/components/aipoger-choice-cover";
import { useI18n } from "@/lib/i18n";
import { creatorChoiceCopy, creatorChoiceError } from "@/lib/creator-choice-copy";
import { choiceEditorItems, choiceEditorSnapshot, moveChoiceToPosition, toggleChoiceSelection } from "@/lib/creator-choice-editor";
import { ChoiceRequestError, createCreatorChoiceRequestScope, type CreatorChoiceRequestScope } from "@/lib/creator-choice-client";

type ChoicePayload = {
  schemaReady?: boolean;
  catalog?: AipogerChoiceCatalogItem[];
  collections?: AipogerCreatorChoiceCollection[];
  error?: string;
};
type Draft = { weekStart: string; title: string; intro: string };
const emptyDraft = (): Draft => ({ weekStart: creatorChoiceWeekStart(), title: "", intro: "" });
const itemKey = (item: AipogerChoiceCatalogItem) => `${item.sourceKind}:${item.id}`;
const fieldClass = "w-full min-w-0 border border-white/15 bg-black px-3 py-2 text-sm text-white outline-none focus:border-orange-300 disabled:opacity-50";
const buttonClass = "inline-flex min-h-11 items-center justify-center gap-2 border border-white/20 px-3 py-2 text-xs font-bold text-zinc-200 hover:border-orange-300 disabled:cursor-not-allowed disabled:opacity-40";
const iconClass = "inline-flex h-11 w-11 shrink-0 items-center justify-center border border-white/15 text-zinc-200 hover:border-orange-300 disabled:opacity-30";

export default function CreatorChoiceWorkbench({ previewScope }: { previewScope?: CreatorChoiceRequestScope }) {
  const { lang } = useI18n();
  const copy = creatorChoiceCopy[lang];
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedId = searchParams.get("collection");
  const [loading, setLoading] = useState(true);
  const [schemaReady, setSchemaReady] = useState(true);
  const [catalog, setCatalog] = useState<AipogerChoiceCatalogItem[]>([]);
  const [collections, setCollections] = useState<AipogerCreatorChoiceCollection[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [selectedItems, setSelectedItems] = useState<AipogerChoiceCatalogItem[]>([]);
  const [pendingItems, setPendingItems] = useState<AipogerChoiceCatalogItem[]>([]);
  const [clearCover, setClearCover] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("");
  const [view, setView] = useState<"favorites" | "selected">("favorites");
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [scope, setScope] = useState<CreatorChoiceRequestScope | null>();
  const scopeRef = useRef<CreatorChoiceRequestScope | null>(null);
  const [retry, setRetry] = useState(0);
  const mutationLock = useRef(false);
  const activeId = useRef<string | null | undefined>(undefined);
  const editorSnapshot = useRef<ReturnType<typeof choiceEditorSnapshot> | null>(null);
  const selected = collections.find((collection) => collection.id === selectedId) ?? null;
  const selectedByKey = new Map(pendingItems.map((item, index) => [itemKey(item), index + 1]));
  const pendingSelection = JSON.stringify(choiceEditorItems(pendingItems)) !== JSON.stringify(choiceEditorItems(selectedItems));
  const dirty = pendingSelection || Boolean(coverFile) || clearCover || draft.weekStart !== (selected?.weekStart ?? creatorChoiceWeekStart())
    || draft.title !== (selected?.title ?? "") || draft.intro !== (selected?.intro ?? "")
    || JSON.stringify(choiceEditorItems(selectedItems)) !== JSON.stringify(choiceEditorItems(selected?.items ?? []));
  const count = selectedItems.length;
  const canPublish = count >= 5 && count <= 10 && selectedItems.every((item) => item.isPublic && item.audioUrl);
  const nextPath = `/profile/choice?lang=${lang}${requestedId ? `&collection=${encodeURIComponent(requestedId)}` : ""}`;
  const signIn = useCallback(() => {
    rememberAuthNextPath(nextPath);
    router.replace(`/auth?lang=${lang}&next=${encodeURIComponent(nextPath)}`);
  }, [lang, nextPath, router]);

  useEffect(() => {
    if (process.env.NODE_ENV === "development" && previewScope) {
      scopeRef.current = previewScope;
      setScope(previewScope);
      return;
    }
    let alive = true;
    let authEventSeen = false;
    let currentUserId: string | null | undefined;
    const updateSession = (id: string | null, token: string | null) => {
      if (!alive) return;
      if (id === currentUserId) {
        if (token) scopeRef.current?.updateAccessToken(token);
        return;
      }
      currentUserId = id;
      scopeRef.current?.controller.abort();
      const next = id && token ? createCreatorChoiceRequestScope(id, token) : null;
      scopeRef.current = next;
      activeId.current = undefined;
      editorSnapshot.current = null;
      mutationLock.current = false;
      setCatalog([]); setCollections([]); setSelectedId(null); setDraft(emptyDraft()); setSelectedItems([]); setPendingItems([]); setClearCover(false);
      setCoverFile(null); setCoverPreview(""); setPreview(false); setQuery(""); setGenre(""); setView("favorites");
      setMessage(""); setError(""); setBusy(false); setLoading(Boolean(next));
      setScope(next);
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      authEventSeen = true;
      updateSession(session?.user.id ?? null, session?.access_token ?? null);
    });
    const timer = setTimeout(() => { if (!authEventSeen) updateSession(null, null); }, 15_000);
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!alive || authEventSeen) return;
      if (error) updateSession(null, null);
      else updateSession(data.session?.user.id ?? null, data.session?.access_token ?? null);
    }).catch(() => { if (!authEventSeen) updateSession(null, null); }).finally(() => clearTimeout(timer));
    return () => { alive = false; clearTimeout(timer); subscription.unsubscribe(); scopeRef.current?.controller.abort(); };
  }, [previewScope]);

  useEffect(() => { if (scope === null) signIn(); }, [scope, signIn]);

  const openCollection = useCallback((collection: AipogerCreatorChoiceCollection | null) => {
    const id = collection?.id ?? null;
    activeId.current = id;
    editorSnapshot.current = collection ? choiceEditorSnapshot(collection) : null;
    setSelectedId(id);
    setDraft(collection ? { weekStart: collection.weekStart, title: collection.title, intro: collection.intro } : emptyDraft());
    setSelectedItems(collection?.items ?? []);
    setPendingItems(collection?.items ?? []);
    setClearCover(false);
    setCoverFile(null);
    setCoverPreview("");
    setPreview(false);
  }, []);

  const loadData = useCallback(async (preferredId?: string | null, resetEditor = false) => {
    if (!scope) return [];
    const payload = await scope.request<ChoicePayload>("/api/creator-choice");
    const nextCollections = payload.collections ?? [];
    setSchemaReady(payload.schemaReady !== false);
    setCatalog(payload.catalog ?? []);
    setCollections(nextCollections);
    const id = preferredId === undefined ? activeId.current : preferredId;
    const next = id ? nextCollections.find((item) => item.id === id) ?? null
      : id === null ? null : nextCollections.find((item) => item.weekStart === creatorChoiceWeekStart()) ?? null;
    if (resetEditor || activeId.current === undefined || activeId.current !== (next?.id ?? null)) openCollection(next);
    return nextCollections;
  }, [openCollection, scope]);

  useEffect(() => {
    if (!scope) return;
    let alive = true;
    void loadData(requestedId || undefined).catch((cause) => {
      if (!alive || scope.controller.signal.aborted) return;
      if (cause instanceof ChoiceRequestError && cause.status === 401) signIn();
      setError(copy.loadFailed);
    }).finally(() => { if (alive && !scope.controller.signal.aborted) setLoading(false); });
    return () => { alive = false; };
  }, [copy.loadFailed, loadData, requestedId, retry, scope, signIn]);

  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const leave = (event: MouseEvent) => {
      const link = (event.target as Element).closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || link.target === "_blank" || (link.pathname === window.location.pathname && link.search === window.location.search)) return;
      if (!window.confirm(copy.discardChanges)) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", leave, true);
    return () => { window.removeEventListener("beforeunload", beforeUnload); document.removeEventListener("click", leave, true); };
  }, [dirty, copy.discardChanges]);

  function chooseCollection(collection: AipogerCreatorChoiceCollection | null) {
    if (dirty && !window.confirm(copy.discardChanges)) return;
    setError(""); setMessage(""); openCollection(collection);
  }

  useEffect(() => () => { if (coverPreview.startsWith("blob:")) URL.revokeObjectURL(coverPreview); }, [coverPreview]);

  const requestAction = useCallback(async (action: string, body: Record<string, unknown>) => {
    if (!scope) throw new Error(copy.login);
    return scope.request<{ collectionId?: string; created?: boolean }>("/api/creator-choice", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...body }),
    });
  }, [copy.login, scope]);

  // One lock spans draft creation, mutation and refresh, including rapid double taps.
  async function runOperation(operation: () => Promise<string | null>, success: string) {
    if (!scope || scope.controller.signal.aborted || mutationLock.current) return;
    mutationLock.current = true;
    setBusy(true); setError(""); setMessage("");
    try {
      const id = await operation();
      scope.controller.signal.throwIfAborted();
      await loadData(id, true);
      setMessage(success);
    } catch (cause) {
      if (scope.controller.signal.aborted) return;
      if (cause instanceof ChoiceRequestError && cause.status === 401) signIn();
      setError(cause instanceof ChoiceRequestError ? creatorChoiceError(cause.message, lang) : copy.failed);
    } finally { if (!scope.controller.signal.aborted) { mutationLock.current = false; setBusy(false); } }
  }

  async function saveCollection(isPublished?: boolean) {
    if (pendingSelection) { setError(copy.confirmFirst); return; }
    await runOperation(async () => {
      const result = await requestAction("save_editor", {
        collectionId: selected?.id ?? null, ...draft, items: choiceEditorItems(selectedItems),
        expected: editorSnapshot.current, clearCover, ...(isPublished === undefined ? {} : { isPublished }),
      });
      if (!result.collectionId) throw new Error(copy.createFailed);
      // Preserve the new ID and refresh the saved baseline if a separate cover upload fails.
      activeId.current = result.collectionId;
      setSelectedId(result.collectionId);
      if (coverFile) {
        const form = new FormData(); form.set("collectionId", result.collectionId); form.set("file", coverFile);
        try { await scope!.request("/api/creator-choice", { method: "POST", body: form }); }
        catch (cause) {
          const saved = (await loadData(result.collectionId)).find(item => item.id === result.collectionId);
          if (saved) editorSnapshot.current = choiceEditorSnapshot(saved);
          throw cause;
        }
      }
      return result.collectionId;
    }, isPublished === undefined ? copy.saved : isPublished ? copy.publishSuccess : copy.withdrawn);
  }

  function toggleChoiceItem(item: AipogerChoiceCatalogItem) {
    setPendingItems(current => toggleChoiceSelection(current, item));
    setMessage("");
  }

  function confirmSelection() {
    setSelectedItems([...pendingItems]); setMessage(copy.selectionConfirmed); setError("");
  }

  function moveItem(index: number, position: number) {
    const next = moveChoiceToPosition(selectedItems, index, position);
    setSelectedItems(next); setPendingItems(next); setMessage("");
  }

  function removeItem(item: AipogerChoiceCatalogItem) {
    const next = selectedItems.filter(value => itemKey(value) !== itemKey(item));
    setSelectedItems(next); setPendingItems(next); setMessage("");
  }

  function play(items: AipogerChoiceCatalogItem[], item?: AipogerChoiceCatalogItem) {
    const queue = items.filter((track): track is AipogerChoiceCatalogItem & { audioUrl: string } => Boolean(track.audioUrl && track.isPublic))
      .map((track) => ({ ...track, id: itemKey(track) }));
    if (!queue.length) return;
    void musicPlayer?.start(queue, item ? Math.max(0, queue.findIndex((track) => track.id === itemKey(item))) : 0, draft.title.trim() || copy.workspace);
  }

  function onCoverChange(file: File | null) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type) || file.size <= 0 || file.size > 10 * 1024 * 1024) {
      setError(copy.coverInvalid); return;
    }
    setClearCover(false); setCoverFile(file); setCoverPreview(URL.createObjectURL(file));
  }

  const sourceItems = view === "selected" ? pendingItems : catalog;
  const genres = useMemo(() => [...new Set([...catalog, ...collections.flatMap((collection) => collection.items)].map((item) => item.genre).filter(Boolean))].sort(), [catalog, collections]);
  const filteredCatalog = sourceItems.filter((item) => (!genre || item.genre === genre)
    && `${item.isPublic ? item.title : copy.unavailable} ${item.artist} ${item.genre}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const currentCover = coverPreview || (!clearCover && selected?.coverUrl) || selected?.avatarUrl || AIPOGER_BRAND_LOGO;

  if (loading || !scope) return <main className="min-h-screen bg-[#050505] px-5 pb-28 pt-24 text-sm text-zinc-400">{copy.loading}</main>;

  return (
    <main className="min-h-screen bg-[#050505] px-4 pb-28 pt-24 text-zinc-100 sm:px-7 sm:pt-8 lg:px-10">
      <div className="mx-auto max-w-[1440px]">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/15 pb-5">
          <h1 className="text-3xl font-black text-white">{copy.workspace}</h1>
          <nav className="flex flex-wrap gap-2"><Link href={`/profile?lang=${lang}`} className={buttonClass}>{copy.myWorks}</Link><Link href={`/rank?lang=${lang}#choice-weekly`} className={buttonClass}>{copy.publicChoice}<ExternalLink size={14} /></Link></nav>
        </header>
        {message ? <p role="status" className="mt-4 text-sm text-emerald-300">{message}</p> : null}
        {error ? <div className="mt-4 flex flex-wrap items-center gap-3"><p role="alert" className="text-sm text-red-300">{error}</p><button type="button" disabled={busy} onClick={() => { if (dirty && !window.confirm(copy.discardChanges)) return; activeId.current = undefined; setError(""); setRetry((value) => value + 1); }} className={buttonClass}>{copy.retry}</button></div> : null}
        {!schemaReady ? <p role="alert" className="mt-5 text-sm text-red-200">{copy.schema}</p> : (
          <>
            <section className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 py-4" aria-label={copy.issue}>
              <select aria-label={copy.chooseIssue} value={selectedId ?? ""} disabled={busy} onChange={(event) => chooseCollection(collections.find((item) => item.id === event.target.value) ?? null)} className={`${fieldClass} sm:max-w-sm`}>
                <option value="">{copy.newIssue}</option>
                {collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.weekStart} · {collection.isPublished ? copy.published : copy.draft} · {collection.title || copy.untitled}</option>)}
              </select>
              <div className="flex items-center gap-3"><span className="text-xs text-zinc-400">{selected?.isPublished ? copy.published : copy.draft} · {count} / 10</span><button type="button" disabled={busy} onClick={() => chooseCollection(null)} className={buttonClass}><Plus size={16} />{copy.newIssue}</button></div>
            </section>

            <div className="grid min-w-0 gap-8 py-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(360px,1fr)]">
              <section className="min-w-0" aria-label={copy.selection}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex border-b border-white/15" role="tablist" aria-label={copy.source}>
                    {([ ["favorites", `${copy.favorites} (${catalog.length})`], ["selected", `${copy.selected} (${pendingItems.length})`] ] as const).map(([value, label]) => <button key={value} role="tab" aria-selected={view === value} type="button" onClick={() => setView(value)} className={`min-h-11 border-b-2 px-3 text-sm font-bold ${view === value ? "border-orange-400 text-orange-200" : "border-transparent text-zinc-400"}`}>{label}</button>)}
                  </div>
                  <a href="#choice-editor" className="text-sm text-orange-200 xl:hidden">{copy.editIssue}</a>
                </div>
                <div className="mt-4 grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(120px,0.7fr)]">
                  <label className="relative min-w-0"><Search aria-hidden="true" size={16} className="absolute left-3 top-3" /><input aria-label={copy.search} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.searchPlaceholder} className={`${fieldClass} pl-9`} /></label>
                  <select aria-label={copy.genre} value={genre} onChange={(event) => setGenre(event.target.value)} className={fieldClass}><option value="">{copy.allGenres}</option>{genres.map((value) => <option key={value} value={value}>{value}</option>)}</select>
                </div>
                <div className="sticky top-20 z-20 mt-4 flex flex-wrap items-center justify-between gap-2 border border-orange-400/30 bg-black/95 p-3">
                  <span className="text-xs text-zinc-300">{copy.selectionHint} · {pendingItems.length} / 10</span>
                  <button type="button" disabled={busy || !pendingSelection} onClick={confirmSelection} className={`${buttonClass} border-orange-400 text-orange-200`}><Check size={16} />{copy.confirmSelection}</button>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6">
                  {filteredCatalog.map((item) => {
                    const added = selectedByKey.has(itemKey(item));
                    const disabled = busy || (!added && (pendingItems.length >= 10 || !item.selectable || !item.audioUrl));
                    return <article key={itemKey(item)} className="min-w-0 overflow-hidden border border-white/10 bg-zinc-950">
                      <div className="relative aspect-square">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.coverUrl} alt="" className="h-full w-full object-cover" />
                        <button type="button" disabled={!item.audioUrl || !item.isPublic} onClick={() => play(sourceItems, item)} aria-label={`${copy.play} ${item.isPublic ? item.title : copy.unavailable}`} title={item.audioUrl ? copy.play : copy.unavailable} className="absolute bottom-1 left-1 flex h-11 w-11 items-center justify-center rounded-full bg-black/85 text-white disabled:opacity-35"><Play size={18} /></button>
                        <label className={`absolute right-1 top-1 flex h-11 w-11 items-center justify-center bg-black/85 ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
                          <input type="checkbox" checked={added} disabled={disabled} onChange={() => toggleChoiceItem(item)} aria-label={`${copy.checkSong}: ${item.isPublic ? item.title : copy.unavailable}`} className="h-5 w-5 accent-orange-400" />
                        </label>
                        {added ? <span className="absolute bottom-2 right-2 bg-orange-400 px-1.5 text-xs font-black text-black">{(selectedByKey.get(itemKey(item)) ?? 1).toString().padStart(2, "0")}</span> : null}
                      </div>
                      <div className="p-2"><h2 className="line-clamp-2 min-h-10 break-words text-xs font-bold leading-5">{item.isPublic ? item.title : copy.unavailable}</h2><p className="truncate text-[11px] text-zinc-400">{item.artist}</p></div>
                    </article>;
                  })}
                </div>
                {!filteredCatalog.length ? <p className="py-10 text-sm text-zinc-400">{query || genre ? copy.emptyFiltered : view === "selected" ? copy.emptySelected : copy.emptyFavorites}</p> : null}
              </section>

              <section id="choice-editor" className="min-w-0 scroll-mt-24 border-t border-white/15 pt-5 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0" aria-label={copy.editor}>
                <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-xl font-black">{copy.editor}</h2><button type="button" onClick={() => setPreview(!preview)} className={buttonClass}>{preview ? <Pencil size={16} /> : <Eye size={16} />}{preview ? copy.edit : copy.preview}</button></div>
                <fieldset disabled={busy} className="min-w-0 space-y-4">
                  {preview ? <div className="flex min-w-0 gap-4"><AipogerChoiceCover src={currentCover} className="h-24 w-24 shrink-0" /><div className="min-w-0"><p className="text-xs text-zinc-400">{draft.weekStart} · {selected?.curatorName || copy.workspace}</p><h3 className="mt-2 break-words text-xl font-black">{draft.title || copy.untitled}</h3><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-300">{draft.intro}</p></div></div> : <>
                    <label className="grid gap-2 text-xs text-zinc-300">{copy.week}<input type="date" value={draft.weekStart} onChange={(event) => setDraft({ ...draft, weekStart: event.target.value })} className={fieldClass} /></label>
                    <label className="grid gap-2 text-xs text-zinc-300">{copy.title}<input value={draft.title} maxLength={120} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className={fieldClass} /></label>
                    <label className="grid gap-2 text-xs text-zinc-300">{copy.intro}<textarea value={draft.intro} rows={4} maxLength={AIPOGER_CHOICE_INTRO_MAX_LENGTH} onChange={(event) => setDraft({ ...draft, intro: event.target.value })} className={`${fieldClass} resize-y leading-6`} /></label>
                    <div className="flex flex-wrap items-center gap-3"><AipogerChoiceCover src={currentCover} alt={copy.coverPreview} className="h-20 w-20 shrink-0" /><label className={`${buttonClass} cursor-pointer`}><Upload size={16} />{copy.cover}<input disabled={busy} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(event) => { onCoverChange(event.target.files?.[0] ?? null); event.target.value = ""; }} /></label>{coverFile || (!clearCover && selected?.coverUrl) ? <button type="button" className={iconClass} aria-label={copy.removeCover} title={copy.removeCover} onClick={() => {
                      if (coverFile) { setCoverFile(null); setCoverPreview(""); return; }
                      setClearCover(true);
                    }}><X size={16} /></button> : null}</div>
                  </>}
                  <div className="flex flex-wrap gap-2"><button type="button" disabled={pendingSelection} onClick={() => void saveCollection()} className={buttonClass}><Save size={16} />{busy ? copy.busy : selected?.isPublished ? copy.saveUpdate : copy.saveDraft}</button><button type="button" disabled={pendingSelection || (!selected?.isPublished && !canPublish)} onClick={() => void saveCollection(!selected?.isPublished)} className={`${buttonClass} border-orange-300 bg-orange-400 text-black`}><Check size={16} />{selected?.isPublished ? copy.withdraw : copy.publish}</button></div>
                </fieldset>
                {dirty ? <p role="status" className="mt-3 text-xs text-orange-200">{pendingSelection ? copy.confirmFirst : copy.unsaved}</p> : null}
                <p className="mt-3 text-xs text-zinc-400">{(count < 5 ? copy.needCount.replace("{count}", String(5 - count)) : count > 10 ? copy.maxCount : copy.readyCount.replace("{count}", String(count)))}</p>
                <div className="mt-6 flex items-center justify-between gap-2"><h3 className="text-sm font-bold">{copy.order}</h3><button type="button" disabled={!selectedItems.some((item) => item.audioUrl)} onClick={() => play(selectedItems)} className={buttonClass}><Play size={14} />{copy.playAll}</button></div>
                <ol className="mt-3 space-y-2">
                  {selectedItems.map((item, index) => <li key={itemKey(item)} className="min-w-0 border-b border-white/10 pb-2">
                    <div className="flex min-w-0 items-center gap-2"><span className="w-5 shrink-0 text-xs text-orange-200">{index + 1}</span><button type="button" disabled={!item.audioUrl} onClick={() => play(selectedItems, item)} className={iconClass} title={copy.play} aria-label={`${copy.play} ${item.isPublic ? item.title : copy.unavailable}`}><Play size={14} /></button><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{item.isPublic ? item.title : copy.unavailable}</span><span className="block truncate text-xs text-zinc-400">{item.artist}</span></span></div>
                    {!preview ? <div className="mt-1 flex items-center justify-end gap-2"><label className="flex items-center gap-2 text-xs text-zinc-400"><span className="whitespace-nowrap">{copy.position}</span><select className={`${fieldClass} !w-16 shrink-0`} disabled={busy || pendingSelection} value={index + 1} onChange={(event) => moveItem(index, Number(event.target.value))} aria-label={`${copy.position}: ${item.isPublic ? item.title : copy.unavailable}`}>{selectedItems.map((_, position) => <option key={position} value={position + 1}>{position + 1}</option>)}</select></label><button type="button" className={iconClass} disabled={busy || pendingSelection} onClick={() => removeItem(item)} title={copy.remove} aria-label={`${copy.remove}: ${item.isPublic ? item.title : copy.unavailable}`}><X size={16} /></button></div> : null}
                  </li>)}
                </ol>
                {selected ? <div className="mt-5 flex flex-wrap gap-2 border-t border-white/10 pt-4">
                  {selected.isPublished ? <><Link href={`${creatorChoicePublicPath(selected.id)}&lang=${lang}`} className={buttonClass}><ExternalLink size={14} />{copy.publicPage}</Link><button type="button" className={iconClass} title={copy.copyLink} aria-label={copy.copyLink} onClick={() => { void navigator.clipboard.writeText(new URL(`${creatorChoicePublicPath(selected.id)}&lang=${lang}`, window.location.origin).toString()).then(() => setMessage(copy.copied)).catch(() => setError(copy.copyFailed)); }}><Copy size={16} /></button></> : null}
                  <button type="button" disabled={busy} className={`${iconClass} ml-auto text-red-300`} title={copy.deleteIssue} aria-label={copy.deleteIssue} onClick={() => {
                    if (!window.confirm(copy.confirmDelete.replace("{title}", selected.title || copy.untitled))) return;
                    void runOperation(async () => { await requestAction("delete_collection", { collectionId: selected.id, confirmed: true }); return null; }, copy.deleted);
                  }}><Trash2 size={16} /></button>
                </div> : null}
              </section>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
