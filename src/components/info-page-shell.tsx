"use client";

import Image from "next/image";
import Link from "next/link";
import { AIPOGER_BRAND_LOGO, AIPOGER_CONTACT_EMAIL, AIPOGER_SOCIAL_LINKS } from "@/lib/brand";
import { fontRighteous } from "@/lib/fonts";
import { useI18n } from "@/lib/i18n";

type InfoPageKind = "about" | "partners" | "hook-guide" | "ai-music-bible";

type ResourceLink = {
  title: string;
  href: string;
  note: string;
};

type Section = {
  title: string;
  body: string;
  items?: string[];
  links?: ResourceLink[];
};

type InfoPageContent = {
  navTitle: string;
  title: string;
  lead: string;
  contactLabel?: string;
  youtubeLabel?: string;
  sections: Section[];
  cards: Array<{ label: string; value: string; detail: string; href?: string }>;
  primaryCta: string;
  secondaryCta: string;
};

const mail = AIPOGER_CONTACT_EMAIL;
const youtubeChannel = "https://www.youtube.com/@djapple2000";
const aipogerTutorialPlaylist = "https://youtube.com/playlist?list=PLm4XZTsplHgQLZG-4sm-y3LZTrbnxSPHs&si=7W976U7M4lK0E7z3";

const content: Record<InfoPageKind, { zh: InfoPageContent; en: InfoPageContent }> = {
  about: {
    zh: {
      navTitle: "關於愛播歌",
      title: "愛播歌是一個以 AI 原創音樂交流為核心的平台。",
      lead:
        "AIPOGER 愛播歌提供 AI 音樂創作者挑戰最強抓波Drop Battle、參與鬥歌、交流播放與觀眾投票的服務。我們鼓勵原創、尊重授權，並以維護創作者、聽眾與權利人的權益為平台基本原則。",
      contactLabel: "聯絡我們",
      cards: [
        { label: "Platform", value: "AI Music", detail: "Drop Battle、傷心酒吧 Bar Heartbreak、創作者交流與觀眾投票" },
        { label: "Policy", value: "Original Only", detail: "僅接受原創、已授權或具合法使用依據的音樂內容" },
        { label: "Contact", value: "Email", detail: mail, href: `mailto:${mail}` },
      ],
      sections: [
        {
          title: "平台定位",
          body:
            "愛播歌不是音樂授權代理、唱片發行公司或法律審查機構，而是 AI 音樂創作者的交流與展示平台。使用者應自行確認上傳內容的來源、授權狀態與使用權限。",
          items: ["AI 音樂 Drop 上傳與鬥歌", "觀眾投票與留言交流", "傷心酒吧 Bar Heartbreak 播放分享", "創作者作品曝光與活動延伸"],
        },
        {
          title: "著作權與上傳原則",
          body:
            "依台灣著作權相關規範，音樂作品、歌詞、錄音、表演及其網路利用可能涉及重製、公開傳輸等權利。使用者不得上傳未取得授權的商業歌曲、翻唱、改編、取樣、伴奏、人聲、歌詞或其他可能侵害第三方權利的內容。",
          items: ["上傳者需保證作品為本人原創、AI 生成且具合法使用權", "不得使用未授權的人聲、旋律、歌詞、取樣或錄音", "不得以「沒有營利」作為免責理由", "如有權利爭議，平台得要求補充授權證明"],
        },
        {
          title: "下架與處理機制",
          body:
            "若平台接獲權利人通知、合理懷疑內容涉及侵權，或使用者違反平台規範，愛播歌有權先行限制公開、移除內容、暫停帳號功能，並視情況保存紀錄或配合合法程序處理。",
          items: ["涉嫌侵權音樂可先行下架", "重複違規者可限制或停止服務", "權利人可提供作品資訊、權利證明與侵權連結", "平台會以電子郵件作為主要聯絡管道"],
        },
        {
          title: "聯絡方式",
          body:
            "商務合作、內容下架通知、權利主張、平台建議或一般問題，請寄信至 aipoger99@gmail.com。來信建議包含聯絡人、爭議內容網址、作品名稱、權利證明或具體說明，以利快速處理。",
          links: [
            {
              title: "寄信給愛播歌",
              href: `mailto:${mail}`,
              note: mail,
            },
            {
              title: "經濟部智慧財產局：網路使用者與通知取下機制",
              href: "https://www.tipo.gov.tw/tw/copyright/766-4758.html",
              note: "參考 ISP 通知／取下與網路侵權基礎說明。",
            },
            {
              title: "經濟部智慧財產局：沒有營利，翻唱仍需授權嗎？",
              href: "https://www.tipo.gov.tw/tw/copyright/774-5064.html",
              note: "參考音樂上傳、重製、公開傳輸與授權說明。",
            },
          ],
        },
        {
          title: "重要聲明",
          body:
            "本頁內容為平台使用原則與一般著作權基礎說明，不構成法律意見。實際個案仍應依相關法律、主管機關解釋、權利歸屬、授權契約與法院判斷為準。",
        },
      ],
      primaryCta: "聯絡愛播歌",
      secondaryCta: "查看 Drop Battle 規則",
    },
    en: {
      navTitle: "About AIPOGER",
      title: "AIPOGER is a platform for original AI music exchange.",
      lead:
        "AIPOGER provides Drop Battle uploads, battles, Bar Heartbreak sharing, and audience voting for AI music creators. The platform encourages originality, respects licensing, and protects creators, listeners, and rights holders.",
      contactLabel: "Contact",
      cards: [
        { label: "Platform", value: "AI Music", detail: "Drop Battle, Bar Heartbreak, creator exchange, audience voting" },
        { label: "Policy", value: "Original Only", detail: "Only original, licensed, or lawfully usable music content is allowed" },
        { label: "Contact", value: "Email", detail: mail, href: `mailto:${mail}` },
      ],
      sections: [
        {
          title: "Platform Position",
          body:
            "AIPOGER is not a music licensing agency, record label, or legal review service. Users are responsible for confirming the source, license status, and usage rights of any uploaded content.",
          items: ["AI music Drop Battle uploads and battles", "Audience voting and comments", "Bar Heartbreak sharing", "Creator exposure and activity extensions"],
        },
        {
          title: "Copyright And Upload Principles",
          body:
            "Music, lyrics, recordings, performances, and online uses may involve reproduction and public transmission rights. Users may not upload unauthorized commercial songs, covers, adaptations, samples, instrumentals, vocals, lyrics, or any content that may infringe third-party rights.",
          items: ["Uploaders must confirm their work is original, AI-generated, and lawfully usable", "No unauthorized vocals, melodies, lyrics, samples, or recordings", "Non-commercial use is not automatically exempt", "AIPOGER may request proof of authorization when needed"],
        },
        {
          title: "Removal And Enforcement",
          body:
            "If AIPOGER receives a rights-holder notice, reasonably suspects infringement, or identifies a policy violation, the platform may restrict public access, remove content, suspend account functions, preserve records, or cooperate with lawful procedures.",
          items: ["Potentially infringing music may be removed", "Repeat violations may lead to service restrictions", "Rights holders should provide content URLs and proof of rights", "Email is the primary contact channel"],
        },
        {
          title: "Contact",
          body:
            "For partnership, takedown notices, rights claims, platform suggestions, or general inquiries, contact aipoger99@gmail.com. Please include your contact information, the disputed content URL, work title, proof of rights, and a clear description.",
          links: [
            {
              title: "Email AIPOGER",
              href: `mailto:${mail}`,
              note: mail,
            },
          ],
        },
        {
          title: "Notice",
          body:
            "This page provides platform principles and general copyright information only. It is not legal advice. Specific cases depend on applicable law, authority interpretations, rights ownership, license agreements, and court decisions.",
        },
      ],
      primaryCta: "Contact AIPOGER",
      secondaryCta: "Read Drop Battle Rules",
    },
  },
  partners: {
    zh: {
      navTitle: "廣告與合作",
      title: "AI 音樂品牌合作與廣告投放",
      lead:
        "AIPOGER 的合作位置不是單純 banner，而是可以和 Drop Battle、傷心酒吧 Bar Heartbreak、教學內容、MV 企劃一起整合的音樂場景。",
      contactLabel: "合作洽談",
      cards: [
        { label: "Placement", value: "舞台曝光", detail: "首頁、鬥歌場、傷心酒吧 Bar Heartbreak、活動頁" },
        { label: "Content", value: "教學整合", detail: "Suno / AI 工具教學、案例示範、歌曲企劃" },
        { label: "Campaign", value: "主題賽事", detail: "品牌指定題目、風格週、創作者挑戰" },
      ],
      sections: [
        {
          title: "適合投放的對象",
          body:
            "AI 音樂工具、AI 影像工具、音樂硬體、課程平台、活動單位、酒吧展演空間、音樂品牌與想接觸創作者的產品。",
          items: ["AI 音樂與影像工具推廣", "活動或品牌指定 Drop Battle Challenge", "YouTube 頻道 @djapple2000 教學影片與社群曝光", "傷心酒吧 Bar Heartbreak 公播歌單或主題夜合作"],
        },
        {
          title: "合作形式初稿",
          body:
            "可從輕量曝光到完整企劃。初期建議先用月合作或單檔活動測試：包含網站曝光、社群內容、教學置入、主題 battle 與成效回報。",
        },
        {
          title: "合作原則",
          body:
            "品牌要和音樂創作有關，內容要對創作者有幫助。AIPOGER 不做硬塞式廣告，而是把產品放進真實的創作流程與聽歌情境。",
        },
      ],
      primaryCta: "洽談合作",
      secondaryCta: "查看 Drop Battle 規則",
    },
    en: {
      navTitle: "Ads & Partnership",
      title: "AI Music Brand Partnerships And Advertising",
      lead:
        "AIPOGER partnerships can live inside Drop Battles, Bar Heartbreak, creator education, and music-video campaigns instead of feeling like a flat banner.",
      contactLabel: "Partnership",
      cards: [
        { label: "Placement", value: "Stage Exposure", detail: "Home, battle arena, Bar Heartbreak, campaign pages" },
        { label: "Content", value: "Education", detail: "AI tool tutorials, examples, and song concepts" },
        { label: "Campaign", value: "Theme Battles", detail: "Sponsored prompts, style weeks, creator challenges" },
      ],
      sections: [
        {
          title: "Best Fit",
          body:
            "AI music tools, AI video tools, music hardware, courses, events, venues, music brands, and products that want to reach creators.",
          items: ["AI music and video tool promotion", "Sponsored Drop Battle Challenges", "YouTube @djapple2000 tutorial integration", "Bar Heartbreak playlists or theme nights"],
        },
        {
          title: "Formats",
          body:
            "Start light or build a full campaign: site exposure, social content, tutorial placement, theme battles, and performance reporting.",
        },
        {
          title: "Principle",
          body:
            "The brand should support music creation. AIPOGER is built for contextual promotion inside real creator workflows and listening moments.",
        },
      ],
      primaryCta: "Discuss Partnership",
      secondaryCta: "Read Drop Battle Rules",
    },
  },
  "hook-guide": {
    zh: {
      navTitle: "Drop Battle 規則",
      title: "什麼是最強抓波Drop Battle 以及鬥歌點數規則",
      lead:
        "在 AIPOGER，最強抓波Drop Battle 不只是副歌，也可以是前奏、drop、旋律句、節奏口號或一句讓人上癮的聲音設計。鬥歌比的是短時間內抓住聽眾的能力。",
      cards: [
        { label: "Drop", value: "15-45 秒", detail: "用最短時間說服耳朵" },
        { label: "Vote", value: "一人一票", detail: "截止前可改投" },
        { label: "APC", value: "公測免入場", detail: "先讓大家鬥起來" },
      ],
      sections: [
        {
          title: "Drop 的由來",
          body:
            "Drop 原本指音樂裡能勾住聽眾記憶的段落。流行歌裡常見於副歌，但在舞曲、嘻哈、電子與 AI 音樂裡，任何讓人想再聽一次的聲音都可以成為 Drop。",
        },
        {
          title: "基本比賽規則初稿",
          body:
            "創作者上傳歌曲後裁切 Drop，系統只配對相同歌曲種類的對手。公測期先取消 APC 入場門檻，讓創作者可以直接進入 Battle；觀眾每場只能投一次票。",
          items: ["每場以 A / B 兩方對決", "公測期免 APC 參戰，正式經濟規則之後再開", "若跨階配對，仍以音樂類型與等級接近為優先", "觀眾一人一票，截止前可改投", "最後投票命中勝方獲得 100 APC 參與獎勵", "禁止上傳非本人授權或侵權歌曲"],
        },
        {
          title: "點數與等級制度初稿",
          body:
            "APC 是平台內的參與點數。公測期 APC 不再阻擋 Battle，只用來呈現參與、獎勵、應援與榮譽感，讓核心鬥歌流程先跑順。",
          items: ["第一階熱血音樂工匠：Lv.1-Lv.3，每贏 10 場升一級", "第二階潮流音樂大師：Lv.4-Lv.7，每贏 20 場升一級，可取得推薦歌曲與 prompt 販售資格", "第三階殿堂級音樂師尊：Lv.8-Lv.10，每贏 50 場升一級，可取得個人頁面空間與 prompt 販售資格", "公測期不扣雙方參戰點數", "投票命中勝方獲得 100 APC 參與獎勵", "傷心酒吧 Bar Heartbreak 是累積曝光與互動點數入口"],
        },
        {
          title: "階級名稱",
          body:
            "等級名稱會出現在個人狀態與規則頁，讓勝場不只是數字，而是創作者在 AIPOGER 的身份標記。",
          items: ["Lv.1 訊號啟動者 Signal Starter", "Lv.2 旋律達人 Melody Crafter", "Lv.3 詞曲鬼匠 Lyric Ghost", "Lv.4 流行領航員 Pop Navigator", "Lv.5 優美旋律之王 Melody Monarch", "Lv.6 超狂動感領航員 Rhythm Pilot", "Lv.7 魔幻聲空雕塑家 Sonic Sculptor", "Lv.8 百大 DJ 泰坦 Top 100 Titan", "Lv.9 靈性薩滿法老王 Spirit Pharaoh", "Lv.10 交響樂之教皇 Symphony Pope"],
        },
        {
          title: "評分精神",
          body:
            "不只比音量或製作規格，而是比 Drop 是否鮮明、記憶點是否成立、情緒是否到位、AI 工具是否被用得有個人風格。",
        },
      ],
      primaryCta: "開始鬥歌",
      secondaryCta: "去傷心酒吧",
    },
    en: {
      navTitle: "Drop Battle Rules",
      title: "What Drop Battle Is And How Battle Points Work",
      lead:
        "On AIPOGER, a Drop can be a chorus, intro, drop, melodic phrase, chant, rhythm idea, or any addictive sound design that grabs the listener fast.",
      cards: [
        { label: "Drop", value: "15-45s", detail: "Convince the ear fast" },
        { label: "Vote", value: "One Vote", detail: "Switch before close" },
        { label: "APC", value: "Beta Free Entry", detail: "Let battles move first" },
      ],
      sections: [
        {
          title: "Where Drop Comes From",
          body:
            "A Drop is the memorable musical idea that catches the listener. In pop it often appears in the chorus, but in dance, hip-hop, electronic, and AI music, any replayable sound can be the Drop.",
        },
        {
          title: "Battle Rules Draft",
          body:
            "Creators upload a track, cut a Drop, and get matched only with the same song category. During public beta, APC entry stakes are disabled so creators can enter Battle directly.",
          items: ["A / B battle format", "No APC entry stake during public beta", "Cross-stage matches still prioritize close level and music category", "One vote per listener; votes can be switched before close", "Correct final voters receive a 100 APC participation reward", "Only original or properly licensed AI music is allowed"],
        },
        {
          title: "Points And Levels Draft",
          body:
            "APC is the platform participation point. During public beta it does not block Battle entry; it is used for rewards, support, progression, and status.",
          items: ["Stage 1 Hot-Blooded Music Artisan: Lv.1-Lv.3, level up every 10 wins", "Stage 2 Trend Music Master: Lv.4-Lv.7, level up every 20 wins, recommended songs and prompt selling access", "Stage 3 Hall-Level Music Master: Lv.8-Lv.10, level up every 50 wins, creator page space and prompt selling access", "No fighter entry stake is charged during public beta", "Correct final voters receive 100 APC", "Bar Heartbreak is the exposure and engagement path"],
        },
        {
          title: "Rank Names",
          body:
            "Rank titles turn wins into creator identity inside AIPOGER.",
          items: ["Lv.1 Signal Starter", "Lv.2 Melody Crafter", "Lv.3 Lyric Ghost", "Lv.4 Pop Navigator", "Lv.5 Melody Monarch", "Lv.6 Rhythm Pilot", "Lv.7 Sonic Sculptor", "Lv.8 Top 100 Titan", "Lv.9 Spirit Pharaoh", "Lv.10 Symphony Pope"],
        },
        {
          title: "Judging Spirit",
          body:
            "The platform rewards memorable Drops, clear emotion, personal taste, and creative use of AI tools, not just loudness or production polish.",
        },
      ],
      primaryCta: "Start Battle",
      secondaryCta: "Go to Bar Heartbreak",
    },
  },
  "ai-music-bible": {
    zh: {
      navTitle: "AI 音樂練功聖經",
      title: "AI 音樂練功聖經與教學資源",
      lead:
        "這頁是給 AIPOGER 創作者的練功清單：先看愛波哥教學建立觀念，再用官方文件補工具細節，最後用提示詞、歌詞、音訊參考與版權觀念把作品做得更穩。",
      youtubeLabel: "愛波哥教學播放列表",
      cards: [
        { label: "Start", value: "愛波哥cheers", detail: "ai 工具tool 學習心得分享播放列表", href: aipogerTutorialPlaylist },
        { label: "Core", value: "Suno / Udio", detail: "先練兩大主流文字生歌工具" },
        { label: "Skill", value: "Prompt + Drop", detail: "把曲風、情緒、段落、聲音設計講清楚" },
      ],
      sections: [
        {
          title: "第一層：先看愛波哥的中文教學",
          body:
            "建議初學者先從中文實戰影片建立流程感：怎麼下 prompt、怎麼聽結果、怎麼修歌詞、怎麼把 Drop 做得更像作品，而不是只靠運氣抽卡。",
          links: [
            {
              title: "愛波哥cheers：ai 工具tool 學習心得分享",
              href: aipogerTutorialPlaylist,
              note: "AIPOGER 官方推薦起手式，適合繁體中文創作者先打底。",
            },
          ],
        },
        {
          title: "第二層：Suno 基礎到進階",
          body:
            "Suno 適合快速做完整歌曲雛形。練功順序可以從 Simple Mode 開始，再進 Custom / 自訂歌詞，最後練習用自己的哼唱或音訊當靈感來源。",
          links: [
            {
              title: "Suno：Simple Mode 入門",
              href: "https://help.suno.com/en/articles/2462273",
              note: "理解最基本的文字生成歌曲流程。",
            },
            {
              title: "Suno：自訂歌詞與 Custom Mode",
              href: "https://help.suno.com/en/articles/2415873",
              note: "學會用自己的歌詞與更細的描述控制作品。",
            },
            {
              title: "Suno：用自己的聲音或音訊開始創作",
              href: "https://help.suno.com/en/articles/3197313",
              note: "適合把哼唱、旋律靈感或聲音片段延伸成歌曲。",
            },
          ],
        },
        {
          title: "精選五個外部資源",
          body:
            "這五個先放在練功清單最前面：一個 Suno 官方起手教學，一個 Suno 音訊進階，一個 Udio prompt 官方教學，一個 Stable Audio 設定指南，一個社群資源中心。",
          links: [
            {
              title: "Suno 官方教學：Make a song in Simple Mode",
              href: "https://help.suno.com/en/articles/2462273",
              note: "Suno 官方 Help Center，適合初學者理解最基本的文字生成歌曲流程。",
            },
            {
              title: "Suno 官方進階：Create Music with Audio",
              href: "https://help.suno.com/en/articles/3197313",
              note: "把哼唱、旋律想法或音訊片段丟進 Suno 延伸成歌曲。",
            },
            {
              title: "Udio 官方教學：Prompt Like a Master",
              href: "https://help.udio.com/en/articles/10716541-prompt-like-a-master",
              note: "官方 prompt 寫法，包含主題、曲風、情緒、樂器、歌詞與 vocal 控制。",
            },
            {
              title: "Stable Audio 官方指南：User Guide",
              href: "https://stableaudio.com/user-guide/interface",
              note: "理解 prompt strength、seed、input audio 等音訊生成參數。",
            },
            {
              title: "r/SunoAI：Community Resource Hub",
              href: "https://www.reddit.com/r/SunoAI/comments/1plkgl8/community_resource_hub_tools_converters_guides_etc/",
              note: "社群整理的工具、轉檔、mastering、管理器與交流資源。",
            },
          ],
        },
        {
          title: "第三層：Udio 與音訊工作流",
          body:
            "Udio 適合拿來練 prompt、歌詞生成、延伸與音訊參考。做 battle 時，可以用它測不同情緒與曲風版本，再挑最有記憶點的 Drop。",
          links: [
            {
              title: "Udio：Create Your First Song",
              href: "https://help.udio.com/en/articles/10715838-create-your-first-song",
              note: "從描述歌曲、選長度到生成的官方入門。",
            },
            {
              title: "Udio：Prompt Like a Master",
              href: "https://help.udio.com/en/articles/10716541-prompt-like-a-master",
              note: "學會把主題、曲風、情緒、樂器與標籤寫進 prompt。",
            },
            {
              title: "Udio：Create Music with Your Own Audio",
              href: "https://help.udio.com/en/articles/10754328-create-music-with-your-own-audio",
              note: "了解上傳音訊後的 extend、inpaint、remix、style 等流程。",
            },
          ],
        },
        {
          title: "第四層：提示詞、設定與靈感資料庫",
          body:
            "當你已經會生成歌，真正的差距會出現在提示詞與聽感判斷：曲風要具體、情緒要明確、樂器與節奏要有方向，並且知道哪些設定會影響輸出。",
          links: [
            {
              title: "Stable Audio：User Guide",
              href: "https://stableaudio.com/user-guide/interface",
              note: "看 prompt library、input audio、prompt strength、seed 等音訊生成參數。",
            },
            {
              title: "HookGenius：Suno Guides & Tutorials",
              href: "https://hookgenius.app/learn/",
              note: "整理 Suno 入門、設定、歌詞格式、metatags、版權與變現等主題。",
            },
            {
              title: "Jam：AI Music Prompting Guide",
              href: "https://jam.com/resources/ai-music-prompting-guide",
              note: "偏通用的 AI 音樂 prompt 寫法，可拿來做 prompt 檢查表。",
            },
          ],
        },
        {
          title: "練功順序建議",
          body:
            "一週內先做 10 首短 Drop，不急著做完整歌。每首只練一件事：曲風、情緒、歌詞段落、drop、vocal tone、音訊參考、封面與 MV。能重複做出好 Drop，才進 battle。",
          items: ["每天至少重做同一 prompt 3 版，聽差異", "把喜歡的結果反推成 prompt 模板", "歌詞用 [Verse] / [Chorus] / [Bridge] 分段", "只上傳自己有權利使用的音訊與歌詞"],
        },
      ],
      primaryCta: "看愛波哥教學",
      secondaryCta: "開始鬥歌",
    },
    en: {
      navTitle: "AI Music Bible",
      title: "AI Music Training Bible And Learning Resources",
      lead:
        "AIPOGER's learning map for creators: start with Aipoger's Chinese tutorials, then use official docs for tool details, and practice prompts, lyrics, audio references, Drops, and copyright discipline.",
      youtubeLabel: "Aipoger Tutorial Playlist",
      cards: [
        { label: "Start", value: "愛波哥cheers", detail: "AI tools and music learning playlist", href: aipogerTutorialPlaylist },
        { label: "Core", value: "Suno / Udio", detail: "Practice the two major text-to-song workflows" },
        { label: "Skill", value: "Prompt + Drop", detail: "Define style, emotion, sections, and sound design clearly" },
      ],
      sections: [
        {
          title: "Layer 1: Start With Aipoger's Tutorials",
          body:
            "Chinese-speaking creators should start with real workflow videos: prompting, listening, revising lyrics, and building Drops that feel intentional instead of random.",
          links: [
            {
              title: "愛波哥cheers: AI Tools & Music Learning Playlist",
              href: aipogerTutorialPlaylist,
              note: "The recommended AIPOGER starting point for Traditional Chinese creators.",
            },
          ],
        },
        {
          title: "Layer 2: Suno Basics To Advanced",
          body:
            "Suno is strong for fast full-song drafts. Start with Simple Mode, move into Custom lyrics, then practice creating from your own voice or audio ideas.",
          links: [
            { title: "Suno: Simple Mode", href: "https://help.suno.com/en/articles/2462273", note: "Basic text-to-song workflow." },
            { title: "Suno: Custom Lyrics", href: "https://help.suno.com/en/articles/2415873", note: "Use your own lyrics and more detailed context." },
            { title: "Suno: Create Music With Audio", href: "https://help.suno.com/en/articles/3197313", note: "Turn voice, melody ideas, or audio clips into songs." },
          ],
        },
        {
          title: "Five Strong External Resources",
          body:
            "Start here: one official Suno beginner guide, one Suno audio workflow guide, one official Udio prompting guide, one Stable Audio settings guide, and one community resource hub.",
          links: [
            { title: "Suno Official: Make a song in Simple Mode", href: "https://help.suno.com/en/articles/2462273", note: "Official Suno Help Center guide for basic text-to-song creation." },
            { title: "Suno Official: Create Music with Audio", href: "https://help.suno.com/en/articles/3197313", note: "Use voice, melody ideas, or audio clips as starting material." },
            { title: "Udio Official: Prompt Like a Master", href: "https://help.udio.com/en/articles/10716541-prompt-like-a-master", note: "Prompt structure for theme, genre, mood, instruments, lyrics, and vocals." },
            { title: "Stable Audio Official: User Guide", href: "https://stableaudio.com/user-guide/interface", note: "Prompt strength, seed, input audio, and generation controls." },
            { title: "r/SunoAI: Community Resource Hub", href: "https://www.reddit.com/r/SunoAI/comments/1plkgl8/community_resource_hub_tools_converters_guides_etc/", note: "Community tools, converters, mastering helpers, managers, and discussion resources." },
          ],
        },
        {
          title: "Layer 3: Udio And Audio Workflows",
          body:
            "Use Udio to practice prompts, lyrics, extensions, and audio references. For battles, test emotional and stylistic variants, then choose the Drop with the strongest memory.",
          links: [
            { title: "Udio: Create Your First Song", href: "https://help.udio.com/en/articles/10715838-create-your-first-song", note: "Official beginner workflow." },
            { title: "Udio: Prompt Like a Master", href: "https://help.udio.com/en/articles/10716541-prompt-like-a-master", note: "Prompt structure with topic, genre, mood, instruments, and tags." },
            { title: "Udio: Create Music With Your Own Audio", href: "https://help.udio.com/en/articles/10754328-create-music-with-your-own-audio", note: "Audio upload, extend, inpaint, remix, and style workflows." },
          ],
        },
        {
          title: "Layer 4: Prompting, Settings, And Reference Libraries",
          body:
            "Once you can generate songs, progress comes from sharper prompts and better listening judgment: concrete style, emotion, instrumentation, rhythm, and control settings.",
          links: [
            { title: "Stable Audio: User Guide", href: "https://stableaudio.com/user-guide/interface", note: "Prompt library, input audio, prompt strength, seed, and generation settings." },
            { title: "HookGenius: Suno Guides & Tutorials", href: "https://hookgenius.app/learn/", note: "Suno guides covering settings, lyrics, metatags, copyright, and monetization." },
            { title: "Jam: AI Music Prompting Guide", href: "https://jam.com/resources/ai-music-prompting-guide", note: "A general AI music prompting checklist." },
          ],
        },
        {
          title: "Practice Order",
          body:
            "Make 10 short Drops before chasing full songs. Each Drop should train one skill: genre, emotion, lyrics, drop, vocal tone, audio reference, cover art, or MV direction.",
          items: ["Generate 3 versions from the same prompt and compare", "Reverse-engineer good results into prompt templates", "Format lyrics with [Verse] / [Chorus] / [Bridge]", "Only upload audio and lyrics you have the rights to use"],
        },
      ],
      primaryCta: "Watch Aipoger Tutorials",
      secondaryCta: "Start Battle",
    },
  },
};

const pageLinks = [
  { href: "/about", key: "about" as const },
  { href: "/partners", key: "partners" as const },
  { href: "/hook-guide", key: "hook-guide" as const },
  { href: "/ai-music-bible", key: "ai-music-bible" as const },
];

const rankSkillStages = [
  {
    stageZh: "第一階 熱血音樂工匠",
    stageEn: "Stage 1 Hot-Blooded Music Artisan",
    ruleZh: "每贏 10 場升級",
    ruleEn: "Level up every 10 wins",
    stake: "公測免 APC",
    accent: "orange",
    nodes: [
      { level: 1, zh: "訊號啟動者", en: "Signal Starter" },
      { level: 2, zh: "旋律達人", en: "Melody Crafter" },
      { level: 3, zh: "詞曲鬼匠", en: "Lyric Ghost" },
    ],
  },
  {
    stageZh: "第二階 潮流音樂大師",
    stageEn: "Stage 2 Trend Music Master",
    ruleZh: "每贏 20 場升級 解鎖推薦與 prompt 販售",
    ruleEn: "Level up every 20 wins Unlock featured songs and prompt selling",
    stake: "公測免 APC",
    accent: "cyan",
    nodes: [
      { level: 4, zh: "流行領航員", en: "Pop Navigator" },
      { level: 5, zh: "優美旋律之王", en: "Melody Monarch" },
      { level: 6, zh: "超狂動感領航員", en: "Rhythm Pilot" },
      { level: 7, zh: "魔幻聲空雕塑家", en: "Sonic Sculptor" },
    ],
  },
  {
    stageZh: "第三階 殿堂級音樂師尊",
    stageEn: "Stage 3 Hall-Level Music Master",
    ruleZh: "每贏 50 場升級 解鎖個人頁面空間",
    ruleEn: "Level up every 50 wins Unlock creator page space",
    stake: "公測免 APC",
    accent: "white",
    nodes: [
      { level: 8, zh: "百大 DJ 泰坦", en: "Top 100 Titan" },
      { level: 9, zh: "靈性薩滿法老王", en: "Spirit Pharaoh" },
      { level: 10, zh: "交響樂之教皇", en: "Symphony Pope" },
    ],
  },
] as const;

function RankSkillTree({ isZh }: { isZh: boolean }) {
  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-4">
      <div className="grid gap-4 lg:grid-cols-3">
        {rankSkillStages.map((stage, stageIndex) => {
          const color =
            stage.accent === "orange"
              ? "border-orange-300/35 bg-orange-500/10 text-orange-100"
              : stage.accent === "cyan"
                ? "border-cyan-200/35 bg-cyan-300/10 text-cyan-100"
                : "border-white/25 bg-white/[0.07] text-white";
          const line =
            stage.accent === "orange"
              ? "from-orange-500/80 to-orange-200/30"
              : stage.accent === "cyan"
                ? "from-cyan-400/80 to-cyan-100/30"
                : "from-white/80 to-white/25";

          return (
            <div key={stage.stageZh} className="relative rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              {stageIndex > 0 && (
                <div className="pointer-events-none absolute -left-4 top-1/2 hidden h-px w-4 bg-gradient-to-r from-white/8 to-white/35 lg:block" />
              )}
              <div className={`rounded-xl border px-4 py-3 ${color}`}>
                <p className={`${fontRighteous.className} text-[11px] uppercase tracking-[0.28em] opacity-75`}>
                  {stage.stake}
                </p>
                <h3 className="mt-2 text-lg font-black">{isZh ? stage.stageZh : stage.stageEn}</h3>
                <p className="mt-1 text-xs leading-5 opacity-70">{isZh ? stage.ruleZh : stage.ruleEn}</p>
              </div>
              <div className="relative mt-4 grid gap-3 pl-4">
                <div className={`absolute bottom-6 left-[1.38rem] top-4 w-px bg-gradient-to-b ${line}`} />
                {stage.nodes.map((node) => (
                  <div key={node.level} className="relative flex items-center gap-3">
                    <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-black ${color}`}>
                      {node.level}
                    </div>
                    <div className="min-w-0 rounded-xl border border-white/10 bg-black/38 px-3 py-2">
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-200/80">Lv.{node.level}</p>
                      <p className="mt-1 text-sm font-black leading-5 text-white">{isZh ? node.zh : node.en}</p>
                      <p className="mt-0.5 text-xs leading-5 text-zinc-500">{isZh ? node.en : node.zh}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function InfoPageShell({ kind }: { kind: InfoPageKind }) {
  const { lang } = useI18n();
  const isZh = lang === "zh";
  const data = content[kind][lang];
  const isPolicyPage = kind === "about";

  const primaryHref =
    kind === "partners" || kind === "about" ? `mailto:${mail}` : kind === "ai-music-bible" ? aipogerTutorialPlaylist : "/battle/setup";
  const secondaryHref = kind === "partners" || kind === "about" ? "/hook-guide" : kind === "ai-music-bible" ? "/battle/setup" : "/listen-bar";

  return (
    <main className={`relative min-h-screen overflow-hidden px-5 py-6 text-zinc-100 md:px-10 ${isPolicyPage ? "bg-[#070707]" : "bg-[#050505]"}`}>
      <div
        className={`pointer-events-none absolute inset-0 ${
          isPolicyPage
            ? "[background:linear-gradient(180deg,#080808_0%,#050505_100%)]"
            : "[background:radial-gradient(circle_at_18%_14%,rgba(255,106,0,0.24),transparent_34%),radial-gradient(circle_at_82%_18%,rgba(0,202,255,0.16),transparent_30%),linear-gradient(180deg,#050505_0%,#090706_48%,#050505_100%)]"
        }`}
      />
      <div
        className={`pointer-events-none absolute inset-0 ${
          isPolicyPage
            ? "opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px)] [background-size:100%_4rem]"
            : "opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:58px_58px]"
        }`}
      />

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <Link href="/" className="inline-flex items-center gap-3 rounded-full border border-white/12 bg-white/[0.04] px-3 py-2 text-sm font-bold text-zinc-200 transition hover:border-orange-300/60 hover:text-white">
            <Image src={AIPOGER_BRAND_LOGO} alt="AIPOGER" width={34} height={34} className="h-8 w-8 rounded-full object-cover" />
            <span>{isZh ? "返回首頁" : "Back Home"}</span>
          </Link>

          <nav className="flex flex-wrap justify-end gap-2">
            {pageLinks.map((item) => {
              const active = item.key === kind;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full border px-4 py-2 text-xs font-bold tracking-[0.14em] transition ${
                    active
                      ? "border-orange-300 bg-orange-500 text-black"
                      : "border-white/12 bg-white/[0.04] text-zinc-300 hover:border-cyan-200/60 hover:text-white"
                  }`}
                >
                  {content[item.key][lang].navTitle}
                </Link>
              );
            })}
          </nav>
        </header>

        <section className={`grid gap-8 py-6 lg:grid-cols-[1.02fr_0.98fr] lg:items-center ${isPolicyPage ? "min-h-[26rem]" : "min-h-[34rem]"}`}>
          <div>
            <p className={`${fontRighteous.className} text-sm uppercase tracking-[0.42em] text-orange-300/80`}>AIPOGER</p>
            <h1
              className={`mt-5 max-w-4xl font-black text-white ${
                isPolicyPage
                  ? "text-[clamp(2.15rem,4.4vw,4.2rem)] leading-[1.04]"
                  : "text-[clamp(2.45rem,5.2vw,5rem)] leading-[1.12] tracking-normal"
              }`}
            >
              {data.title}
            </h1>
            <p className={`mt-6 max-w-3xl text-base leading-8 text-zinc-300 ${isPolicyPage ? "md:text-lg md:leading-9" : "md:text-xl md:leading-9"}`}>{data.lead}</p>
            {data.contactLabel && (
              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold">
                <a href={`mailto:${mail}`} className="inline-flex items-center gap-2 text-orange-200 transition hover:text-orange-100">
                  <span className="text-zinc-500">{data.contactLabel}</span>
                  <span>{mail}</span>
                </a>
                {data.youtubeLabel && (
                  <a href={youtubeChannel} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-cyan-100 transition hover:text-white">
                    <span className="text-zinc-500">{data.youtubeLabel}</span>
                    <span>@djapple2000</span>
                  </a>
                )}
              </div>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              {AIPOGER_SOCIAL_LINKS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-xs font-black text-zinc-300 transition hover:border-cyan-200/60 hover:text-white"
                >
                  {social.label} <span className="text-zinc-500">{social.handle}</span>
                </a>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={primaryHref} className="inline-flex h-12 items-center gap-2 rounded-full bg-orange-500 px-6 text-sm font-black tracking-[0.12em] text-black transition hover:bg-orange-300">
                {data.primaryCta}
                <ArrowIcon />
              </Link>
              <Link href={secondaryHref} className="inline-flex h-12 items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-6 text-sm font-bold text-zinc-100 transition hover:border-cyan-200/60 hover:bg-white/[0.08]">
                {data.secondaryCta}
              </Link>
            </div>
          </div>

          <div className="grid gap-3">
            {data.cards.map((card) => {
              const Wrapper = card.href ? "a" : "div";
              return (
              <Wrapper key={card.label} href={card.href} target={card.href ? "_blank" : undefined} rel={card.href ? "noreferrer" : undefined} className={`group rounded-2xl border border-white/10 bg-black/48 p-5 backdrop-blur transition hover:border-orange-300/45 ${isPolicyPage ? "shadow-none" : "shadow-[0_20px_80px_rgba(0,0,0,0.38)]"}`}>
                <p className={`${fontRighteous.className} text-xs uppercase tracking-[0.34em] text-cyan-200/70`}>{card.label}</p>
                <p className={`mt-3 font-black text-white ${isPolicyPage ? "text-2xl md:text-3xl" : "text-3xl md:text-4xl"}`}>{card.value}</p>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{card.detail}</p>
              </Wrapper>
            )})}
          </div>
        </section>

        <section className="grid gap-4 pb-12 lg:grid-cols-2">
          {data.sections.map((section, index) => (
            <article
              key={section.title}
              className={`rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur md:p-7 ${
                index === 0 ? "lg:col-span-2" : ""
              }`}
            >
              <div className="mb-4 h-px w-full bg-gradient-to-r from-orange-500/70 via-white/12 to-transparent" />
              <h2 className="text-2xl font-black text-white md:text-3xl">{section.title}</h2>
              <p className="mt-4 text-base leading-8 text-zinc-300">{section.body}</p>
              {(section.title === "階級名稱" || section.title === "Rank Names") && (
                <RankSkillTree isZh={isZh} />
              )}
              {section.items && section.title !== "階級名稱" && section.title !== "Rank Names" && (
                <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                  {section.items.map((item) => (
                    <li key={item} className="rounded-xl border border-white/10 bg-black/32 px-4 py-3 text-sm leading-6 text-zinc-200">
                      {item}
                    </li>
                  ))}
                </ul>
              )}
              {section.links && (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {section.links.map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      className="group rounded-xl border border-white/10 bg-black/32 px-4 py-3 transition hover:border-orange-300/55 hover:bg-white/[0.055]"
                    >
                      <p className="text-sm font-black text-white group-hover:text-orange-200">{item.title}</p>
                      <p className="mt-2 text-sm leading-6 text-zinc-400">{item.note}</p>
                    </a>
                  ))}
                </div>
              )}
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
