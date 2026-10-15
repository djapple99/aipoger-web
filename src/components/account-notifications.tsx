"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, ChevronDown, ChevronLeft, ChevronRight, ArrowUpRight, Check, Bookmark, Trash2, MoreVertical, ListFilter } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { creatorText } from "@/lib/creator-center-copy";
import { accountNotificationHref, accountNotificationSummary, ACCOUNT_NOTICE_PAGE_SIZE, type AccountNotification, type AccountNoticeAction } from "@/lib/account-notifications";
import { accountNoticeRequest } from "@/lib/account-notifications-client";
import { useAccountNotices } from "@/lib/use-account-notices";
import styles from "./account-notifications.module.css";

type Filter = "all" | "unread" | "kept";
export default function AccountNotifications({ userId }: { userId: string }) {
  const { lang } = useI18n();
  const tx = (zh: string, en: string, ja: string, ko: string) => creatorText(lang, zh, en, ja, ko);
  const count = useAccountNotices(userId, "inbox");
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<AccountNotification[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [busy, setBusy] = useState<string[]>([]);
  const [failed, setFailed] = useState<{ id: string; action: AccountNoticeAction } | null>(null);
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

  useEffect(() => {
    if (!menu) return;
    const outside = (event: PointerEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest("[data-notice-menu]")) setMenu(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        section.current?.querySelector<HTMLButtonElement>(`[data-menu-trigger="${menu}"]`)?.focus();
        setMenu(null);
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [menu]);

  const load = useCallback(async () => {
    const request = ++revision.current;
    setLoading(true); setError(false);
    try {
      const result = await accountNoticeRequest(userId, `?filter=${filter}&page=${page}`);
      if (!live.current || request !== revision.current) return;
      const lastPage = Math.max(0, Math.ceil(result.total / ACCOUNT_NOTICE_PAGE_SIZE) - 1);
      if (page > lastPage) { setPage(lastPage); return; }
      setRows(result.notices); setTotal(result.total);
      setExpanded(previous => result.notices.some((row: AccountNotification) => row.id === previous) ? previous : null);
    } catch {
      if (live.current && request === revision.current) setError(true);
    } finally {
      if (live.current && request === revision.current) setLoading(false);
    }
  }, [userId, filter, page]);
  useEffect(() => { if (open) void load(); }, [open, load]);

  const act = useCallback(async (id: string, action: AccountNoticeAction) => {
    if (pending.current.has(id)) return;
    pending.current.add(id); setBusy(previous => [...previous, id]); setFailed(null); setMenu(null);
    try {
      const result = await accountNoticeRequest(userId, "", [id], action);
      if (!live.current) return;
      if (action === "delete") {
        setRows(previous => previous.filter(row => row.id !== id));
        setExpanded(previous => previous === id ? null : previous);
        await load();
      } else if (!result.ids.includes(id)) {
        // Already read elsewhere, removed, or expired: fetch authoritative state.
        await load();
      } else {
        setRows(previous => previous.map(row => row.id !== id ? row : action === "read"
          ? { ...row, read_at: result.readAt } : { ...row, kept_at: result.keptAt }));
        if (action === "unkeep") await load();
      }
    } catch {
      if (live.current) setFailed({ id, action });
    } finally {
      pending.current.delete(id);
      if (live.current) setBusy(previous => previous.filter(value => value !== id));
    }
  }, [userId, load]);

  const chooseFilter = (value: Filter) => {
    setFilter(value); setPage(0); setExpanded(null); setMenu(null); setFailed(null);
  };
  const filters: [Filter, string][] = [
    ["all", tx("全部", "All", "すべて", "전체")],
    ["unread", tx("未讀", "Unread", "未読", "안 읽음")],
    ["kept", tx("已保留", "Kept", "保存済み", "보관")],
  ];
  const filterLabel = tx("通知篩選", "Filter notifications", "通知フィルター", "알림 필터");
  const unreadLabel = tx("未讀", "unread", "未読", "안 읽음");
  const readLabel = tx("已讀", "Read", "既読", "읽음");
  const keepLabel = tx("保留通知", "Keep notification", "通知を保存", "알림 보관");
  const unkeepLabel = tx("取消保留", "Stop keeping", "保存を解除", "보관 해제");
  const deleteLabel = tx("刪除通知", "Delete notification", "通知を削除", "알림 삭제");
  const controls = (row: AccountNotification, mobile = false) => <>
    <button className={styles.iconButton} aria-label={`${row.kept_at ? unkeepLabel : keepLabel}：${row.title}`} title={row.kept_at ? unkeepLabel : keepLabel}
      aria-pressed={!!row.kept_at} disabled={busy.includes(row.id)} onClick={() => void act(row.id, row.kept_at ? "unkeep" : "keep")}>
      <Bookmark size={18} fill={row.kept_at ? "currentColor" : "none"}/>{mobile ? <span>{row.kept_at ? unkeepLabel : keepLabel}</span> : null}
    </button>
    <button className={styles.iconButton} aria-label={`${deleteLabel}：${row.title}`} title={deleteLabel}
      disabled={busy.includes(row.id)} onClick={() => void act(row.id, "delete")}><Trash2 size={18}/>{mobile ? <span>{deleteLabel}</span> : null}</button>
  </>;

  return <section id="notifications" ref={section} className={styles.section} aria-label={tx("互動通知", "Notifications", "通知", "알림")}>
    <div className={styles.header}>
      <button className={styles.heading} aria-expanded={open} aria-controls="notification-list" onClick={() => { setOpen(value => !value); setMenu(null); }}>
        <Bell size={20}/><strong>{tx("互動通知", "Notifications", "通知", "알림")}</strong>
        <span className={count ? styles.unreadCount : styles.quiet} aria-label={`${count} ${unreadLabel}`}>{count}<span className={styles.countLabel}> {unreadLabel}</span></span>
        {!open ? <ChevronDown size={15}/> : null}
      </button>
      {open ? <>
        <div className={styles.filters} aria-label={filterLabel}>{filters.map(([value, label]) => <button key={value} aria-pressed={filter === value} disabled={busy.length > 0} onClick={() => chooseFilter(value)}>{label}</button>)}</div>
        <div className={styles.pagination}>
          <span className={styles.range} aria-live="polite">{total ? `${page * 3 + 1}–${Math.min(page * 3 + rows.length, total)} / ${total}` : "0"}</span>
          <button className={styles.iconButton} aria-label={tx("上一頁通知", "Previous notifications", "前の通知", "이전 알림")} disabled={loading || busy.length > 0 || page === 0} onClick={() => { setPage(value => value - 1); setExpanded(null); setMenu(null); }}><ChevronLeft size={19}/></button>
          <button className={styles.iconButton} aria-label={tx("下一頁通知", "Next notifications", "次の通知", "다음 알림")} disabled={loading || busy.length > 0 || (page + 1) * 3 >= total} onClick={() => { setPage(value => value + 1); setExpanded(null); setMenu(null); }}><ChevronRight size={19}/></button>
        </div>
        <label className={styles.mobileFilter} title={filterLabel}><ListFilter size={19}/>
          <select aria-label={filterLabel} value={filter} disabled={busy.length > 0} onChange={event => chooseFilter(event.target.value as Filter)}>{filters.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          {filter !== "all" ? <span className={styles.filterDot}/> : null}
        </label>
      </> : null}
    </div>
    {open ? <div id="notification-list" className={styles.content} aria-busy={loading}>
      {error ? <p role="alert">{tx("通知讀取失敗。", "Could not load notifications.", "通知を読み込めません。", "알림을 불러오지 못했습니다.")} <button onClick={() => void load()}>{tx("重試", "Retry", "再試行", "다시 시도")}</button></p> : null}
      {rows.map(row => <article key={row.id} className={styles.notice} data-unread={!row.read_at}>
        <div className={styles.row}>
          <button className={styles.summary} aria-expanded={expanded === row.id} aria-controls={`notice-${row.id}`} onClick={() => {
            setExpanded(previous => previous === row.id ? null : row.id); setMenu(null);
            if (expanded !== row.id && !row.read_at) void act(row.id, "read");
          }}>
            <span className={styles.state} aria-label={row.read_at ? readLabel : unreadLabel}>{row.read_at ? <Check size={16}/> : <span className={styles.dot}/>}</span>
            <span className={styles.title}>{accountNotificationSummary(row, lang) || tx("帳號消息", "Account notice", "アカウント通知", "계정 알림")}</span>
            <time dateTime={row.created_at} title={new Date(row.created_at).toLocaleString(lang === "zh" ? "zh-TW" : lang)}>{new Date(row.created_at).toLocaleDateString(lang === "zh" ? "zh-TW" : lang, { month: "numeric", day: "numeric" })}</time>
            <ChevronRight size={15} className={expanded === row.id ? styles.down : styles.arrow}/>
          </button>
          <div className={styles.desktopActions}>{controls(row)}</div>
          <div className={styles.mobileActions} data-notice-menu>
            {row.kept_at ? <Bookmark size={13} className={styles.keptMark} fill="currentColor"/> : null}
            <button className={styles.iconButton} aria-label={tx("通知操作", "Notification actions", "通知の操作", "알림 작업")} aria-expanded={menu === row.id} aria-controls={`notice-menu-${row.id}`} data-menu-trigger={row.id} onClick={() => setMenu(previous => previous === row.id ? null : row.id)}><MoreVertical size={19}/></button>
            {menu === row.id ? <div id={`notice-menu-${row.id}`} className={styles.menu}>{controls(row, true)}</div> : null}
          </div>
        </div>
        {expanded === row.id ? <div id={`notice-${row.id}`} className={styles.detail}>
          <h3>{row.title}</h3><p>{row.body}</p>
          <Link href={accountNotificationHref(row, lang)} onClick={() => {
            if (!row.read_at) void act(row.id, "read");
            if (accountNotificationHref(row, lang).endsWith("#pending-ai-music-challenges")) window.dispatchEvent(new Event("aipoger:open-pending-challenges"));
          }}>{row.type === "listen_bar_track_comment" ? tx("查看作品與評論", "View work and comments", "作品とコメントを見る", "작품과 댓글 보기") : tx("查看詳情", "View details", "詳細を見る", "자세히 보기")}<ArrowUpRight size={15}/></Link>
        </div> : null}
        {failed?.id === row.id ? <p role="alert" className={styles.failure}>{tx("操作尚未儲存。", "Change was not saved.", "変更を保存できません。", "변경 사항이 저장되지 않았습니다.")} <button onClick={() => void act(row.id, failed.action)}>{tx("重試", "Retry", "再試行", "다시 시도")}</button></p> : null}
      </article>)}
      {loading && !rows.length ? <p role="status">{tx("讀取通知中…", "Loading notifications…", "通知を読み込み中…", "알림 불러오는 중…")}</p> : !loading && !error && !rows.length ? <p className={styles.empty}>{filter === "unread" ? tx("沒有未讀通知。", "No unread notifications.", "未読の通知はありません。", "읽지 않은 알림이 없습니다.") : filter === "kept" ? tx("尚未保留通知。", "No kept notifications.", "保存した通知はありません。", "보관한 알림이 없습니다.") : tx("目前沒有通知。", "No notifications yet.", "通知はありません。", "아직 알림이 없습니다.")}</p> : null}
    </div> : null}
  </section>;
}
