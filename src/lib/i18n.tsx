'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

type Lang = 'zh' | 'en';

interface I18nContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggleLang: () => void;
  /** 可選 `vars`：將字串中的 `{{key}}` 取代為對應值（例如 `{{count}}`）。 */
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const dict: Record<Lang, Record<string, string>> = {
  zh: {
    home_title: 'AIPOGER 愛播歌',
    home_subtitle: 'Where AI Beats Bleed.',
    home_secondary_title: '愛播歌',
    home_tagline: '在 AI 節奏交鋒之處，流淌著真實的音樂血液',
    home_logo_alt: 'AIPOGER 愛播歌',
    home_coin_tooltip: 'AIPO Coin 餘額',
    home_profile_level: '段位',
    home_apc_balance: 'APC 點數',
    home_account_menu_aria: '帳戶選單',
    nav_home_aria: '回到主畫面',
    common_loading: '載入中…',
    auth_error: '登入發生錯誤，請再試一次',
    storage_upload_failed:
      '圖檔上傳失敗，請確認已登入、檔案小於上限，並已套用 Supabase 儲存桶允許的圖片格式（JPEG / PNG / WebP）。',
    setup_need_login: '請先登入再上傳頭像與封面。',
    btn_battle: '我要鬥歌',
    btn_watch: '觀戰聽歌',
    login: '登入',
    logout: '登出',
    aipo_coin: 'AIPO Coin',

    login_title: '登入',
    login_subtitle: 'Where AI Beats Bleed.',
    disclaimer_title: '免則聲明（請務必閱讀）',
    disclaimer_1: '不得上傳任何受版權保護的歌曲，您必須確保上傳的所有歌曲都是使用 AI 工具生成的原創作品，版權完全屬於您本人。若違反將立即下架並可能封鎖帳號。',
    disclaimer_2: '無論點擊鬥歌還是聽眾，都會進入免則聲明與登入帳號',
    disclaimer_3: '建議使用 Google 或社群 FB / Discord 認證，避免信箱註冊產生水軍',
    disclaimer_4: '選擇鬥歌者勝利的一方，系統會詢問是否願意提供歌曲作為首頁輪播歌單之一',
    disclaimer_5: '版權仍完全屬於您本人，我們僅取得首頁輪播使用權',
    disclaimer_6: '您可隨時寫信要求下架，我們會立即處理',
    disclaimer_7: '鬥歌場上傳的歌曲，我們會協助記錄上傳時間作為原創證明',
    login_methods: '僅支援以下方式登入',
    login_fb: '使用 Facebook 登入',
    login_google: '使用 Google 登入',
    login_agree: '登入即代表您已閱讀並同意上述免則聲明',

    step_setup: '填寫資料',
    step_hook: 'Hook 裁切',
    step_matchmaking: '配對中',
    step_battle: '鬥歌場',

    setup_title: '🎤 鬥歌資料填寫',
    setup_subtitle: '填完後進入 Hook 裁切',
    fighter_name: '鬥士名稱',
    song_name: '歌曲名稱',
    genre: '歌曲種類',
    genre_pop: '流行舞曲',
    genre_emotion: '感人抒情',
    genre_rock: '熱血搖滾',
    genre_edm: '動感電音',
    genre_custom: '自我風格',
    ai_tool: '使用什麼 AI 工具製作',
    ai_other: '其他（自行填寫）',
    upload_avatar: '上傳頭像（可選）',
    upload_cover: '上傳歌曲封面（可選）',
    start_hookcut: '🚀 開始 Hook 裁切 →',

    mq_searching: '尋找對手',
    mq_genre: '風格',
    mq_searching_hint: '搜尋中…',
    mq_cancel: '取消配對',
    mq_found: '🎉 配對成功！',
    mq_found_hint: '風格對決即時開始',
    mq_entering: '即將進入鬥歌場',
    mq_countdown: 's',

    battle_title: '🎤 鬥歌擂台',
    battle_back: '← 首頁',
    battle_loading: '載入擂台上…',
    deck_a: 'DECK A',
    deck_b: 'DECK B',
    playing: '播放中',
    standby: '待機中',
    vote_a: '投票給 A 隊',
    vote_b: '投票給 B 隊',
    voted: '✓ 已投票',
    chat_placeholder: '說點什麼…',
    chat_send: '發送',
    no_messages: '還沒有人留言，快來發言！',
    total_votes: '票已投',
    watch_page_title: '觀戰鬥歌',
    watch_live_section: '進行中的鬥歌',
    watch_no_battles: '目前沒有進行中的鬥歌。去配對開一場，或稍後再刷新。',
    watch_enter: '進入擂台',
    watch_list_error: '無法載入鬥歌列表',
    watch_bypass_list: '開發模式（AUTH_BYPASS）下不查詢列表；關閉後可看到 live 場次。',
    battle_list_title: '鬥歌場',
    battle_back_home: '返回首頁',
    first_attack: '先攻',

    arena_viewers: '觀戰 {{n}} 人',
    battle_not_found: '找不到這場戰鬥',
    battle_load_failed: '載入失敗',
    battle_back_home_link: '返回首頁',
    battle_vote_duplicate: '你已經投過票了！',
    battle_vote_total: '{{count}} 票已投',
    battle_wait_votes: '等待投票',
    battle_chat_title: '💬 實時彈幕',
    battle_deck_vote_line: '{{n}} 票',
    deck_play_aria: '播放',
    deck_pause_aria: '暫停',
  },
  en: {
    home_title: 'AIPOGER',
    home_subtitle: 'Where AI Beats Bleed.',
    home_secondary_title: 'AI Music Arena',
    home_tagline: 'Real music blood flows in AI rhythm battles',
    home_logo_alt: 'AIPOGER',
    home_coin_tooltip: 'AIPO Coin balance',
    home_profile_level: 'Rank',
    home_apc_balance: 'APC',
    home_account_menu_aria: 'Account menu',
    nav_home_aria: 'Back to home',
    common_loading: 'Loading…',
    auth_error: 'Something went wrong. Please try again.',
    storage_upload_failed:
      'Image upload failed. Make sure you are signed in, within the size limit, and using JPEG, PNG, or WebP (see Supabase bucket MIME allowlist).',
    setup_need_login: 'Please sign in to upload your avatar and cover art.',
    btn_battle: 'Battle!',
    btn_watch: 'Watch & Listen',
    login: 'Login',
    logout: 'Logout',
    aipo_coin: 'AIPO Coin',

    login_title: 'Login',
    login_subtitle: 'Where AI Beats Bleed.',
    disclaimer_title: 'Terms of Service (Please Read)',
    disclaimer_1: 'You must ensure all uploaded songs are AI-generated original works. Any copyright infringement will result in immediate removal and possible account suspension.',
    disclaimer_2: 'Both battlers and audience must agree to the terms and login',
    disclaimer_3: 'We recommend Google or social auth (FB/Discord) to avoid spam',
    disclaimer_4: 'After voting, winners may be asked if they consent to homepage rotation',
    disclaimer_5: 'Copyright remains yours; we only get homepage rotation rights',
    disclaimer_6: 'You can request removal anytime and we will process immediately',
    disclaimer_7: 'We will timestamp uploads as proof of originality',
    login_methods: 'Supported login methods',
    login_fb: 'Login with Facebook',
    login_google: 'Login with Google',
    login_agree: 'By logging in, you agree to the terms above',

    step_setup: 'Fill Info',
    step_hook: 'Hook Cut',
    step_matchmaking: 'Matchmaking',
    step_battle: 'Battle Arena',

    setup_title: '🎤 Battle Info',
    setup_subtitle: 'After this, cut your Hook',
    fighter_name: 'Fighter Name',
    song_name: 'Song Name',
    genre: 'Song Genre',
    genre_pop: 'Pop Dance',
    genre_emotion: 'Emotional Ballad',
    genre_rock: 'Rock / Metal',
    genre_edm: 'EDM / Electronic',
    genre_custom: 'Custom Style',
    ai_tool: 'AI Tool Used',
    ai_other: 'Other (specify)',
    upload_avatar: 'Upload Avatar (optional)',
    upload_cover: 'Upload Cover Art (optional)',
    start_hookcut: '🚀 Start Hook Cut →',

    mq_searching: 'Finding Opponent',
    mq_genre: 'Style',
    mq_searching_hint: 'Searching…',
    mq_cancel: 'Cancel Matchmaking',
    mq_found: '🎉 Match Found!',
    mq_found_hint: 'Style battle starting soon',
    mq_entering: 'Entering Battle Arena',
    mq_countdown: 's',

    battle_title: '🎤 Battle Arena',
    battle_back: '← Home',
    battle_loading: 'Loading arena…',
    deck_a: 'DECK A',
    deck_b: 'DECK B',
    playing: 'Playing',
    standby: 'Standby',
    vote_a: 'Vote for A',
    vote_b: 'Vote for B',
    voted: '✓ Voted',
    chat_placeholder: 'Say something…',
    chat_send: 'Send',
    no_messages: 'No messages yet — be the first!',
    total_votes: 'votes cast',
    watch_page_title: 'Watch battles',
    watch_live_section: 'Live now',
    watch_no_battles: 'No live battles right now. Start matchmaking or check back later.',
    watch_enter: 'Enter arena',
    watch_list_error: 'Could not load the battle list.',
    watch_bypass_list: 'Auth bypass mode is on — list is not fetched. Turn it off to see live battles.',
    battle_list_title: 'Battle hall',
    battle_back_home: 'Back to home',
    first_attack: 'First attack',

    arena_viewers: '{{n}} watching',
    battle_not_found: 'This battle was not found.',
    battle_load_failed: 'Could not load the arena.',
    battle_back_home_link: 'Back to home',
    battle_vote_duplicate: 'You have already voted.',
    battle_vote_total: '{{count}} votes cast',
    battle_wait_votes: 'Waiting for votes',
    battle_chat_title: '💬 Live chat',
    battle_deck_vote_line: '{{n}} votes',
    deck_play_aria: 'Play',
    deck_pause_aria: 'Pause',
  },
};

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window !== 'undefined') {
      const fromUrl = new URLSearchParams(window.location.search).get('lang');
      if (fromUrl === 'en' || fromUrl === 'zh') return fromUrl;
      return (localStorage.getItem('aipoger_lang') as Lang) ?? 'zh';
    }
    return 'zh';
  });

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    if (typeof window !== 'undefined') {
      localStorage.setItem('aipoger_lang', l);
    }
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === 'zh' ? 'en' : 'zh');
  }, [lang, setLang]);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      let s = dict[lang][key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          s = s.replaceAll(`{{${k}}}`, String(v));
        }
      }
      return s;
    },
    [lang],
  );

  // Sync lang to URL param so all pages can read it
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('lang', lang);
    window.history.replaceState(null, '', url.toString());
  }, [lang]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = lang === 'zh' ? 'zh-Hant' : 'en';
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}