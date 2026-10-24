"use client";
import { useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { albumCopy } from "@/lib/album-copy";
import { albumPath } from "@/lib/album";
import { creditCopy } from "@/lib/credit-copy";
import { useCreatorUploadQuota } from "@/lib/use-creator-upload-quota";
import { MUSIC_GENRE_OPTIONS } from "@/lib/music-genres";
import { IMAGE_UPLOAD_ACCEPT, isAllowedImageUploadFile, imageContentType } from "@/lib/image-upload-policy";
import type { CreatorWork } from "@/lib/creator-center";
import styles from "./creator-center.module.css";
export default function AlbumBuilder({ userId, name, works, onSubmitted }: { userId: string; name: string; works: CreatorWork[]; onSubmitted: () => void }) {
  const { lang, t } = useI18n(); const c = albumCopy(lang);
  const [title, setTitle] = useState(""); const [description, setDescription] = useState(""); const [genre, setGenre] = useState("");
  const [ids, setIds] = useState<string[]>([]); const [file, setFile] = useState<File | null>(null); const [rights, setRights] = useState(false);
  const [credit, setCredit] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [saved, setSaved] = useState("");
  const requestId = useRef<string | null>(null); const cover = useRef<{ file: File; path: string } | null>(null); const lock = useRef(false);
  const { quota, refresh } = useCreatorUploadQuota(userId);
  const available = works.filter(w => w.workKind !== "album" && w.active && w.status !== "hidden" && (w.audioUrl || w.external));
  const move = (index: number, direction: number) => setIds(list => { const copy = [...list]; const to = index + direction; if (to >= 0 && to < copy.length) [copy[index], copy[to]] = [copy[to], copy[index]]; return copy; });
  const publish = async () => {
    if (lock.current || !rights || ids.length < 2 || !genre || !title.trim()) return;
    lock.current = true; setBusy(true); setError(""); setSaved("");
    try {
      const { data } = await supabase.auth.getSession(); if (data.session?.user.id !== userId) throw new Error("AUTH_REQUIRED");
      requestId.current ??= crypto.randomUUID();
      if (file && cover.current?.file !== file) {
        if (!isAllowedImageUploadFile(file) || file.size > 10 * 1024 * 1024) throw new Error("INVALID_COVER");
        const path = `${userId}/albums/${requestId.current}-${crypto.randomUUID()}.${imageContentType(file).split("/")[1]}`;
        const upload = await supabase.storage.from("listen-bar-covers").upload(path, file, { contentType: imageContentType(file), upsert: false });
        if (upload.error) throw upload.error; cover.current = { file, path };
      }
      const response = await fetch("/api/albums", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` },
        body: JSON.stringify({ requestId: requestId.current, title, artist: name, description, genre, trackIds: ids, coverPath: file ? cover.current?.path : undefined, confirmedRights: rights, confirmedCredit: credit }) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error);
      setSaved(payload.albumId); setTitle(""); setDescription(""); setIds([]); setRights(false); setCredit(false); setFile(null); cover.current = null; requestId.current = null;
      window.dispatchEvent(new CustomEvent("aipoger:credit")); void refresh(); onSubmitted();
    } catch (e) { setError(e instanceof Error && /CREDIT_|CREATOR_WEEKLY_UPLOAD_LIMIT/.test(e.message) ? c.credit : c.error); }
    finally { lock.current = false; setBusy(false); }
  };
  return <div className={styles.linkForm}>
    <p>{c.choose}</p><p>{c.note}</p>
    <p>{quota?.unlimited ? "Owner" : `${Math.min(quota?.used ?? 0, 3)} / 3 · ${creditCopy(lang).allowance}`} · Credit {quota?.balance ?? "—"}</p>
    <fieldset disabled={busy} style={{ border: 0, padding: 0, display: "grid", gap: 16 }}>
      <label>{c.title}<input value={title} maxLength={160} onChange={e => setTitle(e.target.value)} /></label>
      <label>{c.description}<textarea value={description} maxLength={2000} onChange={e => setDescription(e.target.value)} /></label>
      <label>{lang === "zh" ? "曲風" : lang === "ja" ? "ジャンル" : lang === "ko" ? "장르" : "Genre"}<select value={genre} onChange={e => setGenre(e.target.value)}><option value="">—</option>{MUSIC_GENRE_OPTIONS.map(g => <option key={g.value} value={g.value}>{t(g.labelKey)}</option>)}</select></label>
      <label>{c.cover}<small> JPEG / PNG / WebP / GIF · ≤10 MB</small><input type="file" accept={IMAGE_UPLOAD_ACCEPT} onChange={e => { const next = e.target.files?.[0] ?? null; if (next && (!isAllowedImageUploadFile(next) || next.size > 10 * 1024 * 1024)) { setError(`${c.cover}: JPEG / PNG / WebP / GIF · ≤10 MB`); e.target.value = ""; return; } setFile(next); setError(""); }} /></label>
      <ol>{ids.map((id, i) => <li key={id} style={{ marginBottom: 12 }}><span>{works.find(w => w.id === id)?.title}</span><div style={{ display: "flex", gap: 8 }}><button type="button" disabled={i === 0} aria-label={`${c.up} · ${i + 1}`} onClick={() => move(i, -1)}>↑</button><button type="button" disabled={i === ids.length - 1} aria-label={`${c.down} · ${i + 1}`} onClick={() => move(i, 1)}>↓</button><button type="button" onClick={() => setIds(list => list.filter(value => value !== id))}>{c.remove}</button></div></li>)}</ol>
      <div style={{ maxHeight: 260, overflowY: "auto", display: "grid", gap: 8 }}>{available.filter(w => !ids.includes(w.id)).map(w => <button type="button" key={w.id} disabled={ids.length >= 50} onClick={() => setIds(list => [...list, w.id])}>{c.select} · {w.title}</button>)}</div>
      <label><input type="checkbox" checked={rights} onChange={e => setRights(e.target.checked)} /> {c.rights}</label>
      {quota && !quota.unlimited && quota.used >= 3 ? <label><input type="checkbox" checked={credit} onChange={e => setCredit(e.target.checked)} />{creditCopy(lang).consent}</label> : null}
      <button type="button" disabled={!rights || !genre || !title.trim() || ids.length < 2 || Boolean(quota && !quota.unlimited && quota.used >= 3 && !credit)} onClick={() => void publish()}>{busy ? c.loading : c.publish} ({ids.length}/50)</button>
    </fieldset>
    {error ? <p role="alert">{error}</p> : null}{saved ? <p role="status"><a href={albumPath(saved, lang)}>{c.saved} ↗</a></p> : null}
  </div>;
}
