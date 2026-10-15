"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, ChevronDown, ArrowUpRight, Check } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { creatorText } from "@/lib/creator-center-copy";
import { accountNotificationHref, type AccountNotification } from "@/lib/account-notifications";
import { accountNoticeRequest } from "@/lib/account-notifications-client";
import { useAccountNotices } from "@/lib/use-account-notices";
import styles from "./account-notifications.module.css";

export default function AccountNotifications({ userId }: { userId: string }) {
  const { lang } = useI18n();
  const tx = (zh: string, en: string, ja: string, ko: string) => creatorText(lang, zh, en, ja, ko);
  const count = useAccountNotices(userId, "inbox");
  const [open, setOpen] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [rows, setRows] = useState<AccountNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const [readError, setReadError] = useState(false);
  const section = useRef<HTMLElement>(null);
  const pending = useRef(new Set<string>());
  const revision = useRef(0);
  const live = useRef(true);

  useEffect(() => {
    const requestRevision = revision;
    live.current = true;
    const openInbox = () => {
      setOpen(true);
      section.current?.scrollIntoView({ block: "start" });
    };
    const reveal = () => { if (window.location.hash === "#notifications" || new URLSearchParams(window.location.search).get("tab") === "notifications") openInbox(); };
    reveal();
    window.addEventListener("hashchange", reveal);
    window.addEventListener("aipoger:open-notifications", openInbox);
    return () => {
      live.current = false; requestRevision.current++;
      window.removeEventListener("hashchange", reveal);
      window.removeEventListener("aipoger:open-notifications", openInbox);
    };
  }, []);

  const load = useCallback(async (cursor?: AccountNotification) => {
    const request = ++revision.current;
    setLoading(true); setError("");
    const params = new URLSearchParams({ unread: unreadOnly ? "1" : "0" });
    if (cursor) { params.set("before", cursor.created_at); params.set("beforeId", cursor.id); }
    try {
      const result = await accountNoticeRequest(userId, `?${params}`);
      if (!live.current || request !== revision.current) return;
      setRows(previous => cursor ? [...previous, ...result.notices.filter((row: AccountNotification) => !previous.some(p => p.id === row.id))] : result.notices);
      setHasMore(result.hasMore);
    } catch {
      if (live.current && request === revision.current) setError("LOAD_FAILED");
    } finally {
      if (live.current && request === revision.current) setLoading(false);
    }
  }, [userId, unreadOnly]);
  useEffect(() => { if (open) void load(); }, [open, load]);

  const markRead = useCallback(async (ids: string[]) => {
    const fresh = ids.filter(id => !pending.current.has(id));
    if (!fresh.length) return;
    fresh.forEach(id => pending.current.add(id));
    try {
      const result = await accountNoticeRequest(userId, "", fresh);
      if (!live.current) return;
      // A successful repeat acknowledgement also confirms the row is already read.
      setRows(previous => previous.map(row => fresh.includes(row.id) ? { ...row, read_at: row.read_at || result.readAt } : row));
      setReadError(false);
    } catch {
      if (live.current) setReadError(true);
    } finally { fresh.forEach(id => pending.current.delete(id)); }
  }, [userId]);

  useEffect(() => {
    if (!open || readError || typeof IntersectionObserver === "undefined") return;
    const visible = new Set<string>();
    const timers = new Map<string, ReturnType<typeof setTimeout>>();
    const schedule = (id: string) => {
      if (document.visibilityState !== "visible" || timers.has(id)) return;
      timers.set(id, setTimeout(() => {
        timers.delete(id);
        if (visible.has(id) && document.visibilityState === "visible") void markRead([id]);
      }, 800));
    };
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const id = (entry.target as HTMLElement).dataset.noticeId!;
        if (entry.isIntersecting) { visible.add(id); schedule(id); }
        else { visible.delete(id); clearTimeout(timers.get(id)); timers.delete(id); }
      }
    }, { threshold: 0.75 });
    section.current?.querySelectorAll<HTMLElement>("[data-notice-id]").forEach(node => observer.observe(node));
    const visibility = () => {
      timers.forEach(clearTimeout); timers.clear();
      if (document.visibilityState === "visible") visible.forEach(schedule);
    };
    document.addEventListener("visibilitychange", visibility);
    return () => { observer.disconnect(); timers.forEach(clearTimeout); document.removeEventListener("visibilitychange", visibility); };
  }, [open, rows, readError, markRead]);

  return <section id="notifications" ref={section} className={styles.section} aria-label={tx("互動通知", "Notifications", "通知", "알림")}>
    <button className={styles.heading} aria-expanded={open} aria-controls="notification-list" onClick={() => setOpen(value => !value)}>
      <Bell size={21} /><strong>{tx("互動通知", "Notifications", "通知", "알림")}</strong>
      <span className={count ? styles.unreadCount : styles.quiet}>{count ? `${count} ${tx("則未讀", "unread", "件の未読", "개 읽지 않음")}` : tx("沒有未讀消息", "All caught up", "未読はありません", "모두 읽었습니다")}</span>
      <ChevronDown size={18} className={open ? styles.up : styles.chevron} />
    </button>
    {open ? <div id="notification-list" className={styles.content}>
      <div className={styles.toolbar}>
        <div className={styles.filters} aria-label={tx("通知篩選", "Filter notifications", "通知フィルター", "알림 필터")}>
          <button aria-pressed={!unreadOnly} onClick={() => setUnreadOnly(false)}>{tx("全部消息", "All", "すべて", "전체")}</button>
          <button aria-pressed={unreadOnly} onClick={() => setUnreadOnly(true)}>{tx("未讀", "Unread", "未読", "읽지 않음")}</button>
        </div>
        <span>{tx("看過即已讀，消息會保留。", "Seen messages are marked read and kept here.", "表示した通知は既読になり、履歴に残ります。", "확인한 알림은 읽음 처리되고 보관됩니다.")}</span>
      </div>
      {error ? <p role="alert">{tx("通知讀取失敗。", "Could not load notifications.", "通知を読み込めません。", "알림을 불러오지 못했습니다.")} <button onClick={() => void load()}>{tx("重試", "Retry", "再試行", "다시 시도")}</button></p> : null}
      {readError ? <p role="alert">{tx("已讀尚未儲存，請重試。", "Read status was not saved. Retry.", "既読を保存できません。再試行してください。", "읽음 상태를 저장하지 못했습니다.")} <button onClick={() => setReadError(false)}>{tx("重試", "Retry", "再試行", "다시 시도")}</button></p> : null}
      {rows.map(row => <article className={styles.notice} key={row.id} data-unread={!row.read_at}>
        <div className={styles.noticeHeader} data-notice-id={row.read_at ? undefined : row.id}>
          <h3>{row.title || tx("帳號消息", "Account notice", "アカウント通知", "계정 알림")}</h3>
          <span className={styles.state}>{row.read_at ? <><Check size={13} />{tx("已讀", "Read", "既読", "읽음")}</> : tx("未讀", "Unread", "未読", "읽지 않음")}</span>
        </div>
        <p className={styles.body}>{row.body}</p>
        <footer><time dateTime={row.created_at}>{new Date(row.created_at).toLocaleString(lang === "zh" ? "zh-TW" : lang, { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</time>
          <Link href={accountNotificationHref(row, lang)} onClick={() => {
            if (!row.read_at) void markRead([row.id]);
            if (accountNotificationHref(row, lang).endsWith("#pending-ai-music-challenges")) window.dispatchEvent(new Event("aipoger:open-pending-challenges"));
          }}>{row.type === "listen_bar_track_comment" ? tx("查看作品與評論", "View work and comments", "作品とコメントを見る", "작품과 댓글 보기") : tx("查看詳情", "View details", "詳細を見る", "자세히 보기")}<ArrowUpRight size={15}/></Link>
        </footer>
      </article>)}
      {loading ? <p role="status">{tx("讀取通知中…", "Loading notifications…", "通知を読み込み中…", "알림 불러오는 중…")}</p> : !error && !rows.length ? <p className={styles.empty}>{unreadOnly ? tx("沒有未讀消息。", "No unread notifications.", "未読の通知はありません。", "읽지 않은 알림이 없습니다.") : tx("收到評論與互動消息後，會在這裡告訴你。", "Comments and interaction notices will appear here.", "コメントや交流の通知がここに表示されます。", "댓글과 활동 알림이 여기에 표시됩니다.")}</p> : null}
      {hasMore ? <button className={styles.more} disabled={loading} onClick={() => void load(rows.at(-1))}>{tx("更早的消息", "Earlier messages", "以前の通知", "이전 알림")}</button> : null}
    </div> : null}
  </section>;
}
