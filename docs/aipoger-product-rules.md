# AIPOGER Product Rules

Last updated: 2026-09-17 23:15 Asia/Taipei。主文件 2／6。

本次 Showtime 退役認證、月榜與收藏製作 Choice 為使用者最新確認規則，優先於 2026-09-17 23:09 roadmap 的待定細節與更早提案；本文件更新不代表已完成實作或正式部署。

This document is the product-rule source of truth for AIPOGER. Use it before changing Battle, Bar Heartbreak, AIPOGER Showtime, auth, upload, or deployment behavior.

## Product Principle

AIPOGER is an AI music community built around participation, battle, public listening, and creator honor.

The product should favor:

- Real creator activity over mock/demo content.
- Relative fairness over impossible absolute fairness.
- Clear public rules over hidden platform behavior.
- Early-stage limits that keep the room lively and manageable.
- Music-first language, not generic SaaS language.

## Social Publishing

Current behavior target:

- `/admin/social` is a semi-automated social publishing console, not a fully autonomous posting bot.
- Every generated post must remain a draft or review item until an admin explicitly approves it.
- Supported first-version sources are Battle result/report drafts and manually created scheduled drafts.
- Social post states should include `draft`, `needs_review`, `scheduled`, `published`, and `failed`.
- Use `60s Drop Battle`, `30-60 秒抓波`, and `drop / 抓波` in social copy. Do not return to `45 秒` as the current public spec.
- Battle report copy should use winner, vote count, genre, battle/result link, and clear CTA.
- A 0:0 no contest must not generate a Winner Circle post.
- Winner posts that become image/video/Reels content should use the winning creator's music as the background track when rights and platform workflow allow it.
- Instagram image and video posting must preserve the original crop/aspect setting whenever the platform UI offers it.
- The Social Desk connection indicator means only that the required runtime configuration exists. It must not claim delivery has been verified, and it must never send a test message automatically.
- Discord may publish directly through its official webhook only after a draft is approved and an admin explicitly presses that platform's send control.
- X may publish text/link posts only with a user-context access token carrying `tweet.write` (`X_USER_ACCESS_TOKEN` or `SOCIAL_X_USER_ACCESS_TOKEN`); an app-only bearer token is not a publishing credential.
- Instagram and YouTube remain draft/script/caption generators until their media and API workflows are fully verified. Facebook Groups remain manual. TikTok is excluded from the active Social Desk and new draft generation; historical targets and records remain intact.
- Facebook Groups must not be auto-posted through unstable browser automation or password-based login. For the AIPOGER group, provide copy, assets, and the group link for manual posting: `https://www.facebook.com/groups/aipoger`.
- Do not store social platform passwords. Tokens, webhooks, and API keys belong in environment variables or encrypted storage, never in repo, docs, or logs.
- If a platform token/webhook is not configured, show a disconnected/pending state and do not attempt publishing.

Public social entry:

- The public social icon cluster includes the AIPOGER LINE community invite alongside Discord, Instagram, and the Facebook group.
- LINE is the direct mobile action; a separate QR control opens a compact modal for desktop visitors, with the same canonical invite URL and a copy action.
- Keep the QR code out of the permanent homepage layout so it does not add clutter or create a useless mobile scan step.

## AIPOGER Choice 與社群發布

Daily Spotlight 已退役：它不再是傷心酒吧、Explore、`/admin/listen-bar` 或社群發布的工作流，也不建立新的單曲 Spotlight 替代品。

- 傷心酒吧負責投稿與公播；Explore 負責找歌、收藏、分享、明確自願的攻擂與正在升溫；Showtime 保留品牌，`/rank` 改為 `月榜 | Choice` 兩個頁籤，不再是認證作品庫。
- `AIPOGER Choice` 是唯一人為策展訊號：每個台灣週一週期一份、發布 5-10 首、不排名、可跨類型。任何登入帳號都可從 `/rank?lang=zh#choice-weekly` 的「製作我的 Choice」進入 `/profile/choice` 私人收藏選曲；來源涵蓋所有公開且可播放的收藏歌曲，不限認證、上架 30 天或受邀資格。owner 的 `/admin/showtime`、`/admin/choice` 保留官方策展管理入口，不再提供人工認證。完整選曲與週次規則見下方 Choice 章節。
- Choice 卡片使用策展者的個人資料封面，固定顯示日期、當期自訂標題、文章摘要、歌單 Heart、分享、評論與歌單圖示；策展者名稱與標題分開呈現，不得重複拼接。推薦文章直接放在卡片與公開頁標題旁，不另做文章 HUD。
- 歌單維持單一圖示：桌機 hover / focus 可快速看排序，點擊後開互動 HUD；手機點擊直接開 HUD。HUD 上方並排顯示當期標題／日期與推薦簡介，每首歌提供既有歌曲收藏愛心及播放，底部提供「全部播放」與完整分享頁入口；所有播放共用底部播放器。
- Choice 評論是歌單層級內容：公開可讀，登入後可留言，作者可刪除自己的留言，其他留言可檢舉。發布／撤回同一請求必須保存當下週次、標題、推薦文章與 owner 策展身分。
- 公開 Choice 分享頁必須在伺服器輸出專屬 Open Graph / Twitter metadata。一般創作者 Choice 與 owner 以 `愛波哥` 個人身分發布的 Choice，分享縮圖使用該策展者目前的 Profile 頭像；只有明確保存為 `官方 AIPOGER` 身分的 Choice 才使用品牌圖。分享標題與描述分別使用當期自訂標題與推薦文章，不得回退成全站通用 AIPOGER 卡片，也不得從標題猜測策展身分。
- `/today` 只作舊外部連結相容入口，固定以 307 導向 Choice；`/listen-bar?spotlight=...` 必須退化為正常傷心酒吧，不指定歌曲也不改變輪播。
- `listen_bar_daily_spotlights`、歷史素材與舊社群草稿只保留歷史資料，不再由 app 日常流程讀寫；本階段不刪資料、不跑 destructive SQL。
- `/admin/showtime` 不再是認證目錄，也不提供 30 天候選審閱、人工授證或每週授證額度。owner 仍可依既有權限編輯社群作品封面與顯示資料（歌名、創作者、AI 工具、類型、製作資訊、作品介紹、歌詞、YouTube、外部支持連結），或撤下公開展示；不得改寫音檔、歷史認證資料、Battle 戰績、票數、Heart 或代替創作者開啟接戰。`/admin/social` 是唯一社群草稿、批准與手動發布中控台。Choice 選曲不會建立社群草稿或自動外部發布；草稿需先批准，Discord 仍需明確按平台發布才送 webhook；Facebook 社團維持手動發布，Instagram 與 YouTube 維持草稿。TikTok 不在目前工作台或新增草稿流程，歷史資料保留。
- Discord 是社群擴散管道，不是產品規則來源。所有對外 CTA 應把聽歌、投票、按心、留言與投稿導回 AIPOGER 網站與 Choice。

## Auth Rules

- Anyone can listen to public music surfaces.
- Sign-in is required for uploading, protected voting/commenting, music analysis, Battle participation, and creator-owned track deletion. The anonymous Drop arena exception is defined in the Drop Battle section; Q Crash voting still requires sign-in.
- Bar Heartbreak voting and track comments require sign-in.
- Bar Heartbreak listening does not require sign-in.
- Bar Heartbreak must remain publicly listenable; do not block the radio/player behind auth.
- Music analysis entry and any future analysis API must require sign-in before upload, scoring, or report generation.
- These auth rules are system behavior rules. Do not surface them as a long rule block in the product UI unless a help/legal page explicitly needs them.
- A signed-in account can keep one active Heart per Bar Heartbreak track per Asia/Taipei calendar day. The active Heart is also a saved song.
- Re-pressing an active Heart on the same track cancels that day's Heart, removes the saved song, and decrements the shared total. The listener may Heart it again afterward.
- Removing a saved favorite is also available from the user's Profile saved-song manager, even while that day's Heart remains active. Profile removal is a direct saved-song management action: it removes only the saved record and does not fabricate, add, cancel, or recount a public Heart reaction.
- Public music surfaces must show total Heart count only as the public metric. They may light the viewer's own Heart button while today's Heart is active, but must not display a public favorite state, favorite-user count, or who saved the song; personal saved-song management belongs in the user's Profile.
- Explore AI Music and Bar Heartbreak must read and update the same `listen_bar_tracks` Heart totals for the same song; Explore must not create a separate favorite or Heart counter.
- Official and personal Choice workbenches must let signed-in curators preview eligible public, playable songs from their favorites before selecting them. Use the compact bottom audio player with play/pause, seek progress, and volume controls; unavailable audio stays visibly disabled rather than pretending to be playable. Choice selection uses its own checkbox, never the song Heart button.
- V1 allows creators to react to their own Bar Heartbreak song.

## Account Dock / 浮動帳號頭像

- The signed-in floating account avatar is always the Profile entry for every account, including owners. A Battle or account notice must never replace the avatar link with a notice-opening button.
- The notification bell is a separate, smaller control attached to the avatar. Clicking the avatar opens `/profile?lang=<lang>`; clicking the bell opens or expands the account-notice panel.
- Dragging is an enhancement, not the primary action: pointer capture must begin only after the pointer has moved more than 8px. A normal click must reach the Profile link, and a real drag must persist the edge-relative position across release, reload, and viewport resize.
- The dock listens for Supabase auth state changes so signed-in users, owners, sign-outs, and account switches receive the correct avatar and Profile entry without relying on a full page reload. Logged-out visitors continue to see the sign-in entry on routes where the dock is shown.
- Owner administration remains a second step from Profile (`/admin` and the owner-only management links); the floating avatar is not a hidden owner-only admin shortcut.

## Music Analysis / AI A&R Gate

Current behavior target:

- The homepage `分析你的音樂` entry must open an AIPOGER-owned route first, not a localhost URL.
- Visitors who are not signed in should be sent to auth before they can upload or analyze a song.
- Signed-in users may continue to the configured analysis service when `NEXT_PUBLIC_MUSIC_ANALYSIS_URL` is set.
- If no production analysis service URL is configured, the entry should fail closed with a clear internal connection state rather than sending users to `127.0.0.1`.
- Analysis output is advisory. AI-assisted judgement should support creator decisions, not replace creator instinct.
- AIPOGER's analysis product should feel like an AI music A&R Gate, not a generic audio metric report.
- The analysis framework should combine sonic DNA, lyric diagnostic, market positioning, content-use fit, AIPOGER routing, and one or two actionable revision suggestions.
- Sonic DNA may cover rhythm, harmony, instrumentation, production texture, genre fusion, and energy arc, but the user-facing output should translate those traits into market meaning.
- Lyric diagnostic may cover cliche, hook clarity, emotional depth, register fit, singability, and structure. If lyrics are not provided, the report should clearly say the judgement is sound-led.
- Do not claim deep audio feature extraction unless the analysis service actually extracted audio features. If the service only has upload metadata and user-provided lyrics, phrase output as A&R judgement based on submitted data.
- User-facing analysis should not mention external Codex skills or implementation tools.

## AI Music Practice Bible / AI 音樂練功聖經

Current public entry and learning-surface rules:

- The homepage second lower navigation card is `AI 音樂練功聖經`, linking to `/ai-music-bible?lang=<lang>`. It replaces the old homepage-first `歌曲分析` card.
- The Bible is a member acquisition surface. Signed-out visitors see the normal Bible title and a clear value preview; do not turn the hero into a large sign-in advertisement. Open a focused system sign-in dialog only when they enter the Bible or press its practice action. The searchable Bible content is available only after sign-in, and the return path must be preserved.
- The Bible hero keeps a public, localized share action in both the signed-out value preview and the signed-in library. It shares `/ai-music-bible?lang=<lang>` through the system share sheet when available and falls back to copying the link; sharing the Bible itself does not require sign-in.
- Public listening remains the low-friction entrance: `/ai-music` and `/listen-bar` can play public music without sign-in. Hearts, saved favorites, comments, contributions, and the Bible require sign-in. On listening surfaces, request sign-in at the moment a protected action is pressed instead of placing login rules in the hero copy.
- After the member gate, the Bible includes a `LINE 實測討論區` field-room card with direct join and QR actions. It uses the same canonical LINE community URL as the public social cluster and is a handoff for sharing tests, questions, and new findings—not a replacement for the searchable Bible.
- A&R Gate is not deleted. `分析你的音樂` lives inside the Bible's practice map and toolbox as an optional second-opinion tool after a creator has made something.
- The Bible is a living, searchable practice database rather than one long static resource article. Its primary areas are prompts, lyrics, Stem separation, Drop practice, rights, AIPOGER tutorials, and the A&R tool.
- `Prompt 招式庫` and `歌詞控制` are the Bible's prompt-first practice surface. They adapt nine owner-provided Suno PDFs, DOCX files, a genre screenshot, the credited NuNaught community prompting guide, the expanded Studio Mastering prompt pack, and a modular instrument-tone pack into 163 bilingual prompt moves, 21 bilingual lyric-control moves, 93 normalized genre terms, a six-step production workflow, and the large inspiration indexes below.
- The modular `音色與混音` prompt pack adds 40 copyable directions for drums, drum machines, electric guitar and amps, piano and keys, synthesizers, bass, microphones and recording perspectives, effects, mix/master balance, acoustic guitar, strings, brass, and hand percussion. Brand and model names are only tonal references paired with audible traits; they are version-sensitive prompts, not exact hardware emulation or endorsement claims.
- The free `錄音室 Mastering` prompt category contains the original 55 genre-, culture-, or era-specific Style prompts—including five new Disco directions: 70s Classic Disco, Italo Disco, Eurodisco, Hi-NRG Disco, and Boogie / Post-Disco—plus 45 Beatport screenshot expansion prompts. The Beatport expansion covers every screenshot type except `DJ Tools / Acapellas`; `DJ Edits` remains included. These are generation directions with version-sensitive behavior, not guarantees of post-production mastering; users should export and measure the final master separately. The category keeps one main mastering filter and exposes 15 music-family filters: `Electronic`, `Hip-Hop`, `Soul & R&B`, `New Age & Ambient`, `Rock & Roll`, `Indie Dance`, `Disco & Funk`, `Jazz & Bossa`, `Pop`, `Classical & Cinematic`, `Latin & Caribbean`, `African & Amapiano`, `Asian & Middle Eastern`, `Country & Folk`, and `DJ Edit / Extended`. The family taxonomy describes musical culture and listening character; it is intentionally broader than the source screenshot's DJ-oriented genre columns.
- Studio Mastering Prompt audio examples use 15-second AIPOGER-owned MP3 clips generated from the corresponding Prompt direction. The library provides audited examples for all 100 free prompts, including the five new Disco directions. The 45 Beatport expansion clips are first-pass AIPOGER sound-direction sketches for demo listening, not formal mix/mastering references or guaranteed Suno renders. Each published clip exposes one preview action and routes playback through one fixed bottom queue player; do not autoplay or embed separate native audio controls in cards. Label every clip as a sound example whose actual Suno generations may vary.
- `Modern Taiwanese Pop` is withdrawn from the free searchable/copyable Studio Mastering library, not merely muted. Keep it out of the public catalog and audio mapping. It may return only through a separately approved paid-content product; do not expose a placeholder lock, price, checkout, or premium claim before that product exists.
- `聲音 DNA × Prompt 配方索引` is the Bible's large-reference navigator. It contains 772 searchable artist-reference entries: 771 from the supplied encyclopedia plus one explicitly labeled AIPOGER addition. It also contains 747 canonical prompt recipes from the supplied set of 750; three exact recipe duplicates are removed.
- Artist names are lookup references only. The copy action must export normalized sonic traits without the artist name and must state that direct imitation is not requested. The public UI must not reproduce the supplied encyclopedia as full pages or long prose.
- Every indexed recipe exposes Chinese labels for genre, vocal, mood, instrument, story, and texture while copying a concise English practice prompt. Search must work with Chinese and English terms.
- The large index uses two unmistakable database tabs, visible instructions, a live result count, wrapping filter targets of at least 44px, one-click copy, per-entry comments, and incremental paging. It must not render all 1,519 cards at once or hide filters behind horizontal mobile scrolling.
- Indexed material is source-derived field reference, not an official Suno guarantee. Source counts, the three removed duplicates, artist-name moderation risk, and model-version variability remain visible.
- Prompt and lyric search panels must explicitly explain that visitors can type a keyword or choose a category, show a live result count, keep inactive controls readable, and make the selected category unmistakable. Category options wrap on mobile instead of hiding behind a horizontal scrollbar.
- When `錄音室 Mastering` is selected, the Prompt panel exposes a second wrapping family filter with all 15 music families. Every Studio Mastering card shows its family badge, and changing the main Prompt category resets the family filter to `全部錄音室`.
- `愛波哥的 Suno 聖經 2026 V1` and `Suno AI God Mode Manual` substantially overlap and must be merged into one canonical set instead of published as duplicate cards. The older meta-tag sheet is folded into the same lyric-control taxonomy, and typo-heavy or over-stacked raw prompts are normalized into concise, copyable recipes.
- Every prompt and lyric move must keep a source summary and one of three confidence labels: official feature, AIPOGER field-tested, or version-sensitive. The supplied V4.5/V5 material is cross-checked against Suno's current V5.5 documentation; bracket tags and exact slider percentages remain probabilistic test signals, never guaranteed commands.
- NuNaught's Reddit `Suno Prompting Guide` and Apache-2.0 `suno-songwriting` skill remain internal credited community sources. Their two-field routing, vocal-identity, instrument-role, section-density, fusion-builder, combined-bracket, cue-count, and singability patterns are normalized into original bilingual practice cards; the public Bible does not expose the original-source buttons or attribution labels. Community heuristics such as 4-8 enriched cues or a target prompt length remain field-tested/version-sensitive guidance rather than official Suno limits.
- The signed-in Bible opens with an AIPOGER-designed `Suno Control Desk`: a Style / Lyrics / Title quick-start route, a copyable starter template, an eight-item pre-flight checklist, and symptom-led troubleshooting. Guidance such as starting with 4-7 compatible Style cues or comparing three renders is visibly labeled as field practice, never an official Suno limit or success guarantee.
- The signed-in Bible has one high-contrast sticky chapter dock rather than another floating action button. It supports visible chapter shortcuts plus `Command/Ctrl + K` and `/` command search, keyboard result navigation, Escape dismissal, and mobile horizontal scrolling without colliding with the draggable account dock.
- Version/feature watch and rights/release checks are first-class Bible chapters. Page update date and official-doc cross-check date are shown separately; version-sensitive behavior is not blended into official product facts. Rights guidance distinguishes generation access, commercial use, and copyright protection, links to current official guidance, and is presented as a release-risk check rather than legal advice.
- A compact, localized public starter and five-question FAQ may remain indexable outside the member gate. It can explain the three Suno input roles and high-level cautions, but it must not expose the complete prompt, lyric, artist-DNA, recipe, Stem, or Taiwanese member catalogs. The route publishes localized canonical/hreflang metadata plus `TechArticle` and `FAQPage` structured data; the visible FAQ and schema must contain the same answers.
- `AI 音樂製作小指南` belongs in a separate material-to-work workflow rather than being forced into Prompt or lyric categories. Do not present fixed loudness targets, future distribution predictions, fake mastering guarantees, or software-session claims as universal facts.
- `AI 拆軌避坑指南` is the Bible's second flagship database. It adapts the owner-provided `AI Stem Separation Guide 2026` into a complete Traditional Chinese and English decision guide with 10 engine families and 7 goal-based routes.
- The Stem guide must credit the source PDF, cross-check product claims against current official documentation, date the cross-check, and clearly distinguish confirmed behavior, version-dependent model results, and undisclosed engine details.
- Product wrappers must not be presented as distinct engines when they share an underlying provider, and unconfirmed model mappings such as FL Studio = Demucs must remain labeled as speculation rather than purchase guidance.
- The Stem guide must remind creators to compare the same reference track before paying and that separation does not grant sampling, remix, or publication rights.
- `Suno 台語歌詞調音實驗室` is the first flagship database. Its initial 38 rows come from the owner-provided `Suno 台語歌歌詞調教對照表` PDF and must remain searchable, category-filterable, and one-click copyable on desktop and mobile.
- The Taiwanese lab must clearly state that AI singing phonetic experiments and loan-character spellings are not recommended Taiwanese orthography. Model version, melody, and vocal timbre may change results.
- Community `有效` / `唱錯` feedback and new-row suggestions enter a moderated pending queue. They must never edit the public seed catalog directly.
- Public clients have no direct Data API access to `ai_music_bible_contributions`. Submission goes through the same-origin server route, with validation, a honeypot, per-request-fingerprint rate limiting, optional signed-in attribution, and service-role-only database access.
- Indexed-entry comments require sign-in to read, create, or delete. The API validates every catalog key, authenticates bearer tokens with `auth.getUser`, rejects foreign-origin writes, resolves identity server-side, rate-limits signed-in writers, allows deletion only by the comment owner, and keeps `ai_music_bible_entry_comments` service-role mediated with RLS enabled.
- `/admin/ai-music-bible` is the owner-only editorial workbench for small canonical-content fixes. It can override prompt moves, lyric moves, and the 38 Taiwanese lab rows without changing keys or provenance; deleting an override returns that row to the TypeScript default. The override table is RLS-enabled with no browser-role grants, and server routes verify the bearer token plus owner email before reading or writing.
- The main Bible and Taiwanese catalog must keep working if contribution storage is temporarily unavailable; only feedback/submission should show a compact failure state.

Comment moderation:

- `/admin/comments` is the owner-only centralized desk for persistent Bar Heartbreak track comments, Choice collection comments, and Bible indexed-entry comments. Live room chat remains a separate transient surface.
- The desk supports author/body/target search, source and status filters, report-first review, target deep links, pagination, refresh, internal notes, hide, restore, report resolution, and two-step permanent deletion.
- Hide is the default moderation action: it preserves the row, moderator, timestamp, and internal note while removing it from public/member APIs. Permanent deletion is explicitly destructive and must require a second confirmation.
- Comment moderation tables are server mediated with RLS enabled and no anon/authenticated Data API grants. Owner actions authenticate bearer tokens with `auth.getUser` and owner email allowlisting.

## Drop Battle

Current behavior:

- Drop Battle uses a short drop cut rather than the full song.
- Drop Battle clips have a hard maximum of 60 seconds. Creators may cut shorter clips; the recommended public range is about 30-60 seconds so the hook/drop has enough time to reach its payoff without turning the battle into full-song listening.
- Drop Battle complete-song publication still requires the winning creator's explicit upload-time consent and an official result. Retiring Showtime certification grants no new full-song rights: without that consent, only the authorized Drop clip may be exposed. Complete audio must not be publicly playable by default or republished as a community song automatically.
- When complete-song publishing is enabled, the Battle Room still uses only the Drop clip; `Full Song` is an authorized post-result playback state, not a battle playback rule or certification.
- The complete-song decision is made during the original upload and is immutable for client-side edits. The upload form does not require a YouTube link yet; it only records whether the creator agrees to release the full work after an official win.
- After an official result, only the winning creator may submit or update a YouTube MV URL. The server verifies the official 3-voter result, winning queue ownership, and upload-time full-song consent before saving it; admins cannot replace the creator's URL.
- A submitted YouTube MV link is shown only on the official Battle Record and its corresponding authorized archived work. Historical Showtime links and authorized audio remain compatible; full-song playback still requires upload-time consent. The Battle Room remains Drop-only.
- Drop Battle quick start options are relative to successful battle-card publishing: `發布後 10 / 15 / 20 分鐘`. Custom start time is an absolute user-selected time and should not move with upload/cutting duration.
- `battle_queue.expires_at` is only a cleanup/expiry deadline. It must never be used as a Battle start time; opening time must come from `scheduled_start_at` or `cancellation_evaluation_at`.
- Fast start options must calculate the visible start time only after the queue/battle data has been successfully written. Do not pre-render a time label that ignores upload, cutting, or network duration.
- Automatic pairing must not inherit an old or stale `expires_at` value as tomorrow's start time.
- Shared Drop Battle links must enter the specific battle arena directly. If nobody has challenged yet, the arena must show the accept-challenge state; if a challenger already joined, the same link must enter the live/waiting arena.
- Public share URLs should stay short: Drop arena uses `/b/{shortId}`, Drop result card uses `/r/{shortId}`, 24H queued card uses `/d/{shortId}`, and 24H live battle uses `/h/{shortId}`. These routes may redirect internally to the canonical full route.
- Drop Battle share preview images should be black background with the white AIPOGER logo as the main visual.
- Open Drop Battle arena links are publicly enterable. Anonymous visitors may vote, send arena danmaku, and tap feedback/reaction buttons inside the Battle arena only.
- Accepting a challenge, uploading a challenger Drop, opening a new Battle card, cancelling a creator-owned Battle, and claiming a rematch slot still require sign-in.
- Anonymous Battle arena access does not change Bar Heartbreak rules: Bar Heartbreak listening stays public, but reactions/comments/uploads/removals still require sign-in.
- The Battle Pool is an index, not the destination for a shared arena link. Legacy `focusBattle` / `focusQueue` URLs should redirect to `/battle/[id]`.
- If a shared `/battle/[id]` link points to an already-ended Drop Battle with no active rematch, send the visitor to Bar Heartbreak (`/listen-bar`) instead of the Battle Pool or a dead arena.
- If the ended Drop Battle still has an open/claimed/uploaded rematch path, keep the visitor in the battle flow: stay on the source arena for open/claimed rematch, or redirect to the next battle when `next_battle_id` exists.
- The same battle/match group should appear only once in the Battle Pool, even if both fighters have queue rows.
- Both participants in an unfinished Drop Battle should be able to cancel from the arena or eligible Battle Pool card.
- Finished Drop Battles open a short king-of-the-hill rematch window only after the result is official: at least 3 distinct audience voters, a valid winner, no existing next battle, and a formal Drop Battle type. The window is 5 seconds to claim the challenger slot, then 120 seconds for the challenger to upload their Drop.
- If nobody claims the 5-second rematch slot, the battle should go directly to the result card and should not leave a lingering rematch card.
- A battle with fewer than 3 distinct audience voters (0-2) is audience-insufficient / no contest: it must not create a result card, update official song battle stats, write win/loss history, or open the defender/rematch window.
- A battle with at least 3 distinct audience voters is an official Drop Battle result and may create an official archive, update per-song battle stats, and open the defender/rematch window. It does not grant certification or monthly chart points.
- The official-result audience threshold counts distinct listeners only: one signed-in `battle_votes.user_id` or one anonymous `battle_guest_votes.guest_id` per battle. Fighter participation does not count toward the 3-audience minimum.
- A user may hold one active Drop founder/open-card intent and one active Drop challenger intent at the same time.
- A creator may deliberately challenge their own open Drop Battle card when they want listeners to compare two same-genre songs from the same account. This is only allowed through a specific target card; automatic random pairing should not auto-match the creator against themself.
- Drop Battle and 24H Full Song can coexist for the same account; their active limits are separate.
- Drop Battle challenge cards expire automatically after at most 24 hours and are cancelled by cleanup.
- Open Drop states include `searching`, `waiting`, `waiting_challenge`, `public_voting`, and `ghost_battle`.
- If no immediate same-genre opponent is available, the user may open a Drop Battle challenge card or go to Bar Heartbreak to find listeners/opponents.
- Duplicate active Drop audio should be blocked by audio hash when the column exists.
- The Battle Pool genre filter shows only the fixed music genres. It must not show `全部風格` / `All Styles`; the default unselected state still displays all official Gatekeeper Drops and open Battle cards.
- Clicking an already selected Battle Pool genre clears the selection and returns to the unselected all-content view.
- The Battle Pool first viewport is a compact working stage, not a poster or dashboard. Its quick navigation order is `Explore Music`, `Bar Heartbreak`, `Battle Records`, `Showtime`, and `Drop Rules`; share remains a separate command. Fake waveforms, decorative play controls, deck/EQ decoration, and oversized navigation cards must not push the public challenge pool below the first viewport.
- Battle Records / 對戰記錄 must not preserve under-threshold battle outcomes. Public result cards require the official 3-distinct-audience threshold.
- Historical Showtime Battle records and their authorized audio remain preserved. New official Battle results belong to Battle Records; Showtime monthly charts never consume Battle results as ranking inputs.
- Battle history should focus on the song, not the fighter profile. Cards may show per-song challenge count, wins, losses, ties, and win rate.
- V1 song battle stats do not open arbitrary URL upload or a full creator song-library UI. The only external link exception is the narrow post-win YouTube MV release link described above.
- Waiting cards should provide a `約人鬥歌` share action.
- Live or public-voting cards should provide an `邀請觀戰投票` share action.

### Q Crash / 非同步 Full Song Battle

- `Q Crash` is the asynchronous Full Song Battle mode. Existing live Drop Battle remains unchanged.
- The public promise is: `兩首完整歌曲，不用等人到齊，讓大家在自己的時間決定哪首歌勝出。`
- Every Q Crash has exactly two work seats, A and B. The same creator may intentionally compare two own versions, or a second creator may accept the shared/targeted invitation and lock their own work into seat B.
- Q Crash does not crop audio. Each work is a complete Track supplied either as a public HTTPS Suno link or as an uploaded MP3/WAV. Q Crash does not require matching genres: each work keeps its own fixed genre tag for display, search, and later analysis, while voting starts only after two distinct queue/work entries are locked.
- Q Crash stores one unified Track contract: `source_type` is `suno` or `upload`, `source_url` stores the public Suno link or the private Storage object key, and `title`, `creator`, `cover_url`, and optional `duration_seconds` describe the work. A Suno source is resolved at runtime through the public page's media metadata and Suno's anonymous playback-rights handshake; the Q Crash same-origin player decrypts the encrypted stream just in time in memory when needed. AIPOGER never persists, stores in Storage, transcodes, or crops the Suno audio. If the public media source or playback-rights handshake cannot be resolved, the work is unavailable for playback and must not silently send the listener to Suno. Uploaded audio stays as the original full file.
- Every Q Crash submitter must confirm `I confirm that I created this track or have permission from the rights holder.` before the server records the work.
- Each work may attach its own JPG, PNG, WebP, or GIF cover during the Q Crash upload flow. The cover belongs to that submitted queue/work, is copied to the matching battle side, and must not be inferred only from the creator's current profile cover; if no work cover is supplied, the profile cover remains the fallback.
- Same-title works display explicit `版本 A` / `版本 B` labels. Results are work-first: winner storage uses the winning queue/work identifier, and the creator is read from that work.
- Q Crash voting windows are `30 minutes`, `2 hours` (default), `12 hours`, or a custom window from 30 minutes up to 3 days. The server sets `voting_ends_at` when work B locks; neither creator may extend or edit the deadline afterward.
- A pending invitation expires after 24 hours. Creator cancellation or expiry produces no public vote, result, stats, or history.
- Guests may open the card, listen to both full songs, choose their own listening duration, see time remaining, and share. Voting requires sign-in and must return the listener to the same Q Crash card after auth; no complete-song, minimum-seconds, or playback-completion threshold is required.
- A guest's selected A/B choice is a local draft and must survive the sign-in round trip. Returning from Email, Google, or Facebook auth must use a full-page navigation to the exact Q Crash URL; the return target is cleared only after that destination has actually loaded. The restored choice is never auto-submitted.
- Each signed-in non-participant account gets exactly one immutable vote per Q Crash. Work owners cannot vote, including a creator who owns both A and B.
- Selecting work A or B is a reversible client-side draft, not a submitted vote. The listener may replay, seek, or switch sides until pressing the explicit confirm-submit control; only that confirmation writes the sealed vote, and the submitted vote remains immutable.
- The explicit confirm-submit action stays in a fixed, high-contrast vote dock while voting is available. It must remain visible with or without the fixed A/B player, clearly distinguish selection from submission, and change to `登入並投作品 A/B` for signed-out listeners.
- Before confirming the vote, that audience account may optionally enter one comment of at most 120 characters; the comment and A/B vote are written in the same confirmation action. After submission, the comment cannot be added, edited, or deleted. While voting is open, comments remain sealed; all visible voter comments are revealed only after settlement, so comments never expose an audience count or momentum signal before the deadline.
- Q Crash comments are qualitative context only. They do not change the winner vote, five-axis feedback, official audience threshold, Battle record, or monthly chart score.
- Q Crash votes remain in a server-only sealed vote store while voting is open. No visitor, participant, or host may see counts, percentages, total voter count, a leader, or another signal that reveals the result before the deadline.
- Owner analytics may privately record an estimated, session-deduplicated Q Crash funnel: opened, played both works, selected A/B, encountered sign-in, and confirmed submission. Playback analytics are guidance only and never a voting requirement. These live engagement counts are owner-only and must never leak into the public card, participant card, API payload, comments, or pre-deadline result UI.
- Winner voting and five-axis feedback are separate actions. Each of the five feedback keys (`rhyme`, `impact`, `melody`, `emotion`, and `structure`) may be selected once per work by each signed-in non-participant account; every selection is immutable, and work owners cannot submit feedback.
- Open-card feedback is private to the current listener. Before settlement, the public/API surface may show only which keys that listener already selected; it must not return aggregate feedback totals, comparisons, progress, or a winner-shaped radar.
- The server/cron settles from `voting_ends_at`; browser time is never authoritative. After settlement, 0-2 distinct signed-in non-participant listeners is audience-insufficient/no result. At least 3 establishes an official Q Crash result.
- Official Q Crash results copy the sealed votes into the existing official Battle archive/stat path, save `winner_queue_id`, archive both works' five-axis feedback, and show the winning work's pentagon distribution. Insufficient results publish no feedback radar and update none of those official paths.
- Official Q Crash archives appear in Battle Records as a distinct cyan `Q Crash 戰報` section and link back to the same interactive Q Crash card (`/b/{shortId}`), so the public can replay both works and continue the post-result conversation.
- After an official result, a signed-in non-participant may record a separate A/B preference. It is replaceable, may be counted publicly after settlement, and never changes the sealed winner vote, five-axis feedback, audience threshold, song stats, Battle history, or monthly chart score. Work owners cannot submit it.
- Legacy Battle archives without an explicit public source marker remain stored for recovery and analytics but are hidden from the public Battle Records list. New formal Drop Battle archives must write `source: drop_battle`; Q Crash archives write `source: q_crash`.
- Official ties reuse the stable formal Drop Battle tie breaker. Creator identity never changes the winner rule.
- Q Crash V1 does not open the live rematch window. A repeat comparison creates a new Q Crash.
- Public sharing uses the existing `/b/{shortId}` Battle arena link once voting starts. Both work owners share the same battle ID and card; the system must never clone a second card for the second creator.
- Q Crash sharing copy should sound like a real friend asking for a listen, for example `這兩首歌到底哪首比較好聽啊？我有點選不出來！進來聽完整歌曲，幫我決定哪首勝出！`; avoid formal system copy such as `不用等人到齊，決定哪首歌勝出` as the primary share invitation.
- Q Crash language behavior is intentionally simple: `zh` uses Traditional Chinese; `en`, `ja`, and `ko` all use English copy and English share metadata. The shared URL must preserve the selected display language policy so the recipient sees the matching copy and controls.
- Battle Pool renders one Q Crash matchup card per Q Crash card/battle ID. Its A and B queue rows must be removed from the ordinary waiting-card list so one battle never appears as two separate cards.
- Battle Pool visually separates the modes: Q Crash matchup cards live directly below the Q Crash introduction in a blue/cyan section, while official and public Drop Battle cards stay in their own red/orange `Drop Battle 公開挑戰池` section. Genre filters belong to the public Drop section and do not hide Q Crash cards.
- Account limits reuse Drop roles: opening Q Crash occupies the founder state; a different creator accepting seat B occupies their challenger state. When one creator owns both works, Q Crash occupies only that creator's founder state.
- Front-stage UI stays hot and DJ-battle-led: desktop uses two side-by-side work seats, mobile stacks them, every work exposes a lyrics HUD with a clear `歌詞未提供` state, and one fixed bottom player switches between A and B. Do not render Q Crash as a survey, leaderboard, or plain poll card.
- Owner-only `/admin/q-crash` is an editorial workbench for each Q Crash work: the owner may replace or remove its display cover and attach one external HTTPS complete-version link. It must show one combined A/B Q Crash card, lock edits while voting is open, keep a stable private Storage cover path, and write an audit row for every change. It must never edit the submitted full-song source, votes, five-axis feedback, winner, official audience count, stats, or Battle archive.
- The complete-version editorial link is hidden during pending, joining, and voting states and becomes visible only after an official `q_crash_finished` result, on the Q Crash card and Q Crash section of Battle Records. It opens the external page in a new tab; it is separate from the submitted source and never replaces the shared in-app full-song player during active voting.

Official Gatekeeper Drops:

- AIPOGER may keep up to four owner-managed official Drop challenge templates in the Battle Pool.
- These official cards are templates, not normal `battle_queue` rows. They must not be consumed or disappear when someone challenges them.
- Only owner/admin accounts can upload, update, enable, or disable official Gatekeeper Drop audio, cover art, and lyrics.
- Owner/admin does not set a start time for official Gatekeeper Drops. The official song stays there as a standing gate.
- Owner/admin must choose the official Gatekeeper Drop genre from the same standard genre menu used by Battle upload. Do not use free-text genre entry for these cards.
- Official Gatekeeper Drop audio accepts standard AIPOGER audio formats with a 100MB single-file limit. The owner/admin upload flow must use the same 60-second Drop cropper used by normal Drop Battle.
- Official Gatekeeper Drop cover art accepts JPG, PNG, and GIF with a 10MB single-file limit. Lyrics are optional and stored with the official template.
- Production must have `supabase/20260618_official_gatekeeper_drops.sql` and `supabase/20260619_official_gatekeeper_media.sql` applied before audio, cover art, and lyrics can all be saved.
- Public cards should say `歡迎任何人來挑戰 AIPOGER 官方關卡`, show the actual song name, `GATE` number, and genre/type badge, and avoid wording like `官方守門戰：傷心酒吧`.
- The official Gatekeeper Drop card section must not repeat a separate heading/subheading such as `官方 DROP 挑戰` / `歡迎任何人來挑戰`; the card itself carries the gatekeeper context.
- The card guidance copy should highlight `歡迎挑戰這首官方 Drop，設定開戰時間並分享拉人投票。看看你的歌能不能打`.
- The `挑戰這首 Drop` action should sit in the same action row as `5 秒預播`.
- Public official Gatekeeper cards should only expose the same 5-second teaser behavior as normal Battle cards. Do not show full audio controls or let visitors play the whole stored Drop from the Battle Pool card.
- Official Gatekeeper Drop lyrics do not need to expand on the Battle Pool card. Lyrics may remain stored on the template and copied into the created Battle Room, where listeners can view them in context.
- A challenger can choose the start time using the normal Drop Battle schedule rules: quick 10 / 15 / 20 minutes after successful battle creation, or a custom time within 24 hours.
- When a challenger submits, the system creates a per-challenge battle instance: one copied official defender queue plus one challenger queue. Official audio, lyrics, and cover art must be copied into the defender side so the created Battle Room behaves like a normal Battle Room for listening, lyrics, cover display, watching, and sharing.
- The copied official defender queue must not count as the owner's personal active Drop Battle intent, must not notify the owner as if they personally entered a battle, and must not pollute owner-facing active battle limits.
- The challenger side counts as an active challenger intent until that battle ends or is cancelled. Owner/admin may also challenge their own official Gatekeeper Drop; the copied defender side still must not count as a personal active founder intent.
- Official Gatekeeper Drop results follow the same audience threshold rules as normal Drop Battle: 0-2 distinct non-participant voters audience-insufficient/no result, 3+ distinct non-participant voters official. No result grants Showtime certification or monthly chart points.

Initial operating target:

- Public Drop challenge cards should be limited to 10 open cards across the platform.
- This is a product target and should be enforced before upload or before Battle queue insert, so storage and UI do not fill with stale challenges.

## 24H Full Song Battle

Current visibility:

- 24H Full Song Battle is currently hidden from the front-stage product.
- Do not present 24H Battle as a primary gameplay mode in pitch decks, public onboarding, homepage copy, or new-user explanations unless the user explicitly reopens it.
- Keep the implementation rules below as retained system behavior, not as current public positioning.

Current behavior:

- 24H Full Song uses the complete uploaded song.
- Each account can keep only one active 24H Full Song entry at a time.
- `queued`, `matched`, and `live` 24H entries block starting another 24H entry.
- `finished`, `cancelled`, and `expired` 24H entries release the account to start another 24H entry.
- 24H Full Song is not limited to one per calendar day.
- 24H queued entries can be accepted by another creator.
- Retain actual settled 24H winner records and historical authorized audio; they do not grant new Showtime certification or monthly chart points.
- Duplicate active 24H audio should be blocked by audio hash when the column exists.
- 24H queued cards should share with `/d/{shortId}` and 24H live battles should share with `/h/{shortId}`.
- Battle history should focus on the full song entry, not the creator profile. Cards may show per-song challenge count, wins, losses, ties, and win rate.
- Queued cards should provide a `約人鬥歌` share action.
- Live cards should provide an `邀請觀戰投票` share action.

Initial operating target:

- `queued + live` 24H Full Song battles should be limited to 10 active battles across the platform.
- Count both queued and live because live battles hold space for 24 hours.
- This limit is about flow control and bandwidth, not only storage size.
- The user-facing message should be direct: `目前 24H Full Song 鬥歌場已滿，請稍後再來。`

## Bar Heartbreak

This section is the authoritative Bar Heartbreak rule set. Historical detailed design is retained through the old document redirect.

Current rules:

- Bar Heartbreak main rotation contains creator submissions only.
- Official AIPOGER songs do not count as active public-pool songs.
- If there are no community submissions, hidden fallback store music may prevent a silent station; it must not appear as a creator submission.
- Public listening supports 12 playback choices: all public airplay plus the 11 fixed music genres.
- New submissions must include a fixed music genre. Do not silently default missing genre values to `Original 自我風格`.
- New Bar Heartbreak audio submissions accept MP3, M4A, AAC, or OGG only, with a 30MB single-file limit. Do not accept new WAV or AIFF submissions in the public or admin Bar Heartbreak upload surfaces.
- Bar Heartbreak is a continuous listening and immediate-submission surface, curated by the owner after publication. No pre-publication manual listening gate is added.
- There is no per-genre or total library capacity. Genre controls show actual publicly playable track counts, never capacity denominators.
- New eligible submissions enter public airplay immediately. Challenger admission, seat limits, 36-hour protection, survival days and automatic capacity elimination are retired.
- Creator uploads (confirmed 2026-09-17 22:27 Asia/Taipei): every creator may successfully submit at most three own community songs in a personal 168-hour window. The first successful submission after rollout starts the window; at expiry, the next successful submission starts a fresh window. No calendar-Monday reset or carryover. Deleting, hiding, or changing the display status of a successfully submitted song never refunds quota. Failed/rolled-back uploads, metadata edits, listening, favorites, and Choice selection do not consume it; existing songs are not backfilled or changed. An atomic database counter independent of track deletion enforces the limit, including concurrent requests. This replaces the old 30-public-songs / one-per-Taiwan-day rule. The existing five-active-public-songs-per-genre cap remains; official-library uploads are outside the community-submission allowance.
- Existing active, visible Challenger records become public without modifying creation time, audio, reactions or recognition. Previously hidden/removed/rejected works are not restored.
- Both GET and POST `/api/listen-bar/process-rotation` are inert compatibility responses, even if an old environment flag or caller remains. Vercel no longer schedules rotation. Database `process_listen_bar_rotation_limits()` is also inert; explicit creator/owner/admin/moderation removals remain supported.
- Previously Showtime-certified community songs that are public and playable remain in Bar airplay and appear on Explore using the original track ID, audio, Hearts, favorites and comments. Historical certification never excludes them from either listening surface. Explicit `ai_music_showtime_public_removed_at` and all existing hide/removal/moderation restrictions still apply. No duplicate upload or new publication time is created.
- Battle-only archives do not become `listen_bar_tracks` automatically: clip-only, audience-insufficient and nonpublic full-song records must never be republished as full tracks.
- Returning historical Showtime songs are not relabeled NEW. Reset their challenge state to showcase/closed; only the creator's explicit opt-in after that reset, with a prepared defender Drop and the normal eligibility checks, may reopen challenges. Do not infer consent from an old `open` value or historical recognition.
- The owner may hide/unhide or soft-remove tracks through the existing admin console without writing a custom review. The system records its standard action note and preserves recovery data. No unrelated existing tracks are removed during this release.
- Submission copy explains immediate publication, ongoing owner curation, no permanent listing guarantee, and the Bar message board for questions. Room messages retain their existing 24-hour lifetime.
- Per-track comments remain persistent and require sign-in. Playback is a personal queue, independent of other listeners.

- A listener must sign in to press Heart or comment. Pressing Heart on a Bar Heartbreak track creates that day's active Heart and saves the track to the listener's favorites; re-pressing Heart cancels both. Removing it later from favorites in Profile remains a separate saved-song action and does not cancel or recount the active Heart reaction.
- Profile `收藏歌曲` is the user's saved-song manager. It should support batch selection and batch removal of saved favorites, while keeping historical Heart reactions intact.
- Creator and listener accounts use the same fixed bottom queue player for Profile saved songs. Each saved-song row exposes one play action; play/pause, seek, previous/next, mobile volume, and close controls live in the shared player. Do not bring back invisible playback or separate native audio controls inside saved-song rows.
- Profile creator-song management should list songs in pages of 10. Profile creator-song management for the user's own Bar Heartbreak songs should support batch selection and batch removal from the public/battle surfaces through the creator-owned remove flow.
- `Profile / 我的作品` is the single metadata editor for all of a creator's community songs, including previously certified works; remove the separate locked Showtime-work editing split. Creators may edit their own cover and permitted display metadata, lyrics, YouTube and external support links under existing validation/review rules. Metadata edits never replace audio, alter ownership, rewrite historical recognition, actual Battle wins/losses, votes or Hearts, reset publication age/upload quota, restore removed works, or change challenge consent. Challenge settings remain a separate explicit action in the same own-works area; pending-battle Drop locks still apply.
- Bar Heartbreak's room-message surface should be titled `傷心的故事傾訴留言`, not `AI 音樂交流區`. General room messages are temporary and retained for 24 hours; the read and cleanup paths must use the same 24-hour cutoff for database and storage fallback data.
- Explore AI Music cards sourced from Bar Heartbreak must display the same total Heart count as the Bar Heartbreak track and send Heart reactions through the same Bar Heartbreak reaction path.
- Bar, Explore, Showtime/Choice and Profile saved music use one root-mounted player. Choosing a song or genre starts a queue snapshot; navigating between pages does not replace or pause it. New uploads appear in the library immediately and enter a newly selected queue; timed priority insertion is retired. Bar repeats its selected genre (including a one-track genre), while finite playlists stop at the end. Previous follows listening history within the session. Seeking/skipping never sends a vote or removes a song.
- Bar Heartbreak upload metadata should stay compact: user-entered creator name, AI tool, and album/mood are limited to 12 CJK characters or about 24 English characters; one-line song description is limited to 16 CJK characters or about 32 English characters. Auto-detected song titles are not subject to this compact metadata limit.
- Bar Heartbreak submissions may include one optional YouTube MV URL. The public now-playing metadata row shows it only as a compact `看 MV` / `Watch MV` action; it must not replace audio playback or interrupt the radio. Creators can add or edit this URL from their own track detail form, and admins can edit it from `/admin/listen-bar`.
- `/admin/listen-bar` track management must use a dropdown filter for the fixed 11 music genres. Do not bring back a primary `待補類型` filter, badge, or empty state for normal admin management. Upload preview and every track card expose only one play action and route audio through one fixed bottom preview player with play/pause, seek, volume, and close controls; switching songs replaces the shared player instead of leaving native audio controls inside cards. Metadata and bulk-metadata saves must preserve the current visibility, genre, month, search, sort, and page view, especially when the owner is reviewing by upload time. `/admin/listen-bar` track management paginates songs at 10 per page; `選取本頁` applies only to the current page while accumulated selected songs can still be processed in bulk.
- `/admin/listen-bar` opens on active/on-air songs only, and names that primary view `全部上架`. Hidden songs are available through `只看下架`; removed songs are excluded from both views and available only through the dedicated `已移除` filter, where restore remains available. Do not add a duplicate `隱藏下架` view. A song whose `created_at` is within the rolling seven-day window shows `NEW`; metadata edits must not restart that window. The owner-only `promotion_checked_at` checkbox records whether external promotion has been recorded and completed; it is separate from `promoted_at`, which records public-pool promotion.
- Daily Spotlight 已退役；`/today` 固定導向 AIPOGER Choice，傷心酒吧不再讀取或指定 Spotlight 歌曲。
- Bar Heartbreak top-right hero controls should stay minimal; primary actions belong in the lower hero action strip. The strip should group `我要播歌`, bar sharing, `探索 AI 音樂`, `Drop Battle`, and `Showtime`; `Drop Battle` sits directly beside `探索 AI 音樂` and links to the public Battle Pool. Do not put `練功聖經` or `關於愛波哥` in this hero action strip.
- Bar Heartbreak hero signage must be localizable live text, not a bitmap containing fixed Chinese copy. The title/subtitle can use a dark gold plaque treatment, but language switching must keep working. On mobile, the hero action strip first row is `我要播歌` / `分享吧台` / `Showtime`; `探索 AI 音樂` and `Drop Battle` sit side by side on the second row.
- Bar Heartbreak share URLs must use short routes. The whole bar uses `/l/all?lang=...`; selected genre sharing uses `/l/{genreIndex}?lang=...` and must reopen `/listen-bar` with that genre selected.
- The Bar Heartbreak Battle ticker in the hero action strip is an actual moving marquee. Do not regress it to a static truncated line.

Monitoring and automation baseline:

- Do not schedule Bar survival promotion or removal. Compatibility endpoints and RPC return zero mutations.
- Explicit creator/admin/moderation actions are permitted; automated capacity eviction is blocked at the database boundary.

Product language:

- Use listening, tracks and genre wording; do not present Challenger seats or survival status.
- Avoid implying Bar Heartbreak is a ranking chart.
- Bar Heartbreak is a continuous AI music listening space, not a daily survival game.
- On a first visit with no explicit URL language or saved preference, use Vercel country geo defaults: `CN` / `TW` → Traditional Chinese, `JP` → Japanese, `KR` → Korean, and every other country → English. A manual language choice is saved in the `aipoger_lang` cookie and always wins over geo detection. If country geo is unavailable, use the browser language only as a fallback.

## Explore AI Music / AI 音樂作品

The homepage first-layer low-pressure entry is `探索 AI 音樂`, linking to `/ai-music`.

Surface positioning:

- Bar Heartbreak is the AI music public airplay pool and submission entry. Creators submit there first; eligible public submissions rotate by genre and also appear on Explore AI Music.
- Explore AI Music is the public uploaded-works wall. It is catalog mode for public uploads that meet display conditions, not a certification surface.
- Showtime is the monthly charts and Choice surface, not a certification archive. Public playable community works, including historically certified and founder-migrated songs, remain discoverable on Explore and Bar. Chart placement or Choice selection neither grants nor removes challenge eligibility.

This page is the AI music works browser. It should:

- Use the main title `AI 音樂作品`.
- Highlight the subtitle `依照風格快速瀏覽作品，聽歌、送愛心，或向你喜歡的作品發起挑戰。` in bright yellow so it reads as the page's quick action promise.
- Include a compact upload prompt: `上傳音樂讓大家看到你的作品，請從傷心酒吧投稿。`, linking to the Bar Heartbreak submission area.
- Explore header is a compact, centered catalog stage: eyebrow, a single live `[作品庫] {count} 首公開作品 · 11 種風格` marker, title, yellow subtitle, yellow Bar Heartbreak submission link, cross-surface navigation, and the local `依類型 | 正在升溫` control share one central axis. It must not become a large hero or delay the first visible covers.
- The fixed `/guide.png` icon-only GUIDE button replaces visible `這裡怎麼玩？` text and `<details>`. It opens an accessible HUD dialog for style browsing, Heart-to-favorite/Profile management, the red `接戰` state badge and prepared 60s defender Drop, the three non-participant-vote official-result threshold, and creator-controlled challenge opt-in. Do not describe certification or six-defense promotion. It must support X, Escape, backdrop close, focus trapping, focus return, and mobile scrolling without being covered by the mini player.
- Do not let fake waveform, `Live Drop Signal`, `60s READY`, dashboard stats, or a long gameplay explainer delay the first visible covers.
- Within the works browser, provide a local `依類型 | 正在升溫` / `By Style | Hot Now` control. `依類型` remains the default and preserves the 11 genre lanes and rolling seven-day NEW ordering. `正在升溫` is a same-page recent-discovery view, not Showtime, Choice, or a claim of cross-genre absolute strength. It uses the same compact cover-led work cards as the genre lanes: horizontal card browsing on mobile and a 3 / 4 / 6-card responsive grid on desktop. It must not revert to a wide leaderboard row or table layout.
- Hot Now / 正在升溫 only uses explainable 7-day signals from real data: distinct account Heart supporters first, audience votes from officially established Battles second, latest qualified interaction third, then `created_at desc` and `id desc`. It must not use all-time Heart totals, unverified play counts, mock values, or an opaque Heat Score. Official Battle votes count only when the archive meets the 3 distinct non-participant audience threshold.
- Hot Now includes otherwise eligible historically certified works without a gold `SHOWTIME` certification badge. Its existing recent-discovery ordering is separate from the monthly Heart-only chart and must not be reused as monthly scores or ranks. Works with no recent valid signal stay at the bottom as `正在累積` / `Building recent support` and receive no fabricated rank number. Existing recent-order markers must remain scoped to Hot Now. Hidden, removed, moderation-held, Explore-retired, invalid-genre, inactive, or unplayable works remain excluded; challenge actions follow current explicit creator consent, not certification history.
- Do not show internal verification wording such as `真實資料，不含 mock` or `Real records only` in the public page UI.
- Group real works by the current 11 fixed music genres.
- Show at most 6 works per genre before `看更多`.
- No standalone `最新上架` / `New Arrivals` / `72 小時新歌` shelf, section, route, independent `看更多`, or category label may be added to Explore. The rolling seven-day NEW window is both the badge and sorting window: eligible NEW works lead their own genre lane, and lanes with NEW works lead the wall by their newest NEW `created_at desc`; lanes without NEW works retain the fixed 11-genre order. A work uses `created_at`, then `id desc` for same-time stability. Never use `updated_at` to restore NEW exposure after metadata edits.
- Within a genre lane, NEW works sort new-to-old before established works. Established works keep public positive-reaction priority, then `created_at desc`, then `id desc`. In the collapsed first 6 cards, one creator may expose at most one NEW work in that genre; their other NEW works remain in the same lane's `看更多` result. This compact-lane rule does not hide the work, suppress established high-reaction works, or affect the expanded list.
- Only already display-eligible works participate: community/public, active, playable, using a current valid genre, with a cover or approved fallback, and not hidden, removed, moderation-held, or Explore-retired. Sorting refreshes on initial load, manual refresh, or the normal 5-10 minute refresh only; it must not reshuffle while a visitor is scrolling.
- Keep cards music-platform-like: cover, song title, creator, AI tool, and heart count. Show challenge count when non-zero; zero record details remain available in the HUD.
- Challenge-ready cards must show a red angled `接戰` corner badge on the cover's top-right. This badge means the original creator is ready to accept a challenge; it is not the attack action. The bottom `攻擂` button remains the challenge action.
- Show the `接戰` badge only when the work is visible on Explore, playable, not retired or hidden/removed/moderation-held, the creator explicitly set the track to `等人挑戰`, and a defender 60s Drop is prepared. Previously certified works require fresh creator opt-in after the retirement reset. Do not show the badge for showcase/closed/custom-only works, missing defender Drop, retired works, or unplayable/incomplete tracks.
- A compact `NEW` badge lasts for the rolling 7 x 24 hours after `created_at`, and the same window controls Explore's NEW-first work and genre-lane ordering. `updated_at` must never restart either display or ordering. On Explore, `NEW` sits at the cover's top-left while the red `接戰` keeps the top-right; both remain readable on desktop and mobile. Bar Heartbreak shows the same visual state on the now-playing cover and beside visible queue/pool track titles, without changing Bar rotation rules. Do not label this state `Weekly`, because that wording belongs to AIPOGER Choice Weekly. This does not create a new-song shelf, route, category, or independent `看更多`.
- Heart buttons on cards and the mini player may light for the signed-in viewer when that viewer has an active Heart for the current Asia/Taipei day. Re-pressing the lit Heart cancels that day's Heart and its synchronized favorite; this remains private state feedback, not a public favorite/count UI.
- Show battle HUD details on desktop hover and provide an equivalent mobile expand action.
- Open playback through the fixed bottom mini player instead of expanding a player inside each card.
- The fixed bottom mini player must include a draggable playback progress bar with time labels, plus a lyrics action that opens lyrics as a HUD-style popup above the player. The lyrics HUD should scroll independently and include a side slider for scrubbing through the lyrics; missing lyrics should show a compact `歌詞未提供` state.
- Keep `Drop Battle` / `AI 音樂鬥歌場` as internal options from this page, not the homepage first-layer primary entry.
- `台語熊high` is a current fixed music genre. Treat old spaced labels such as `台語熊 High` only as aliases into `台語熊high`; do not display `City Pop / Disco / Funk 城市律動` or `心靈 Ambient 宇宙` as current category names.

If a source track does not explicitly allow direct challenge, it may be played, hearted, and shared, but it must not be presented as directly challengeable.

Explore direct challenge loop:

- Explore AI Music works that can be challenged come from the AI music public airplay / Bar Heartbreak `listen_bar_tracks` data flow, not from the old standalone Drop challenge pool.
- Creators manage each public-pool track's challenge state from Profile: `僅展示` / showcase, `等人挑戰` / open, or `自定開戰` / custom.
- `等人挑戰` requires the creator to prepare or select a defender 60s Drop first. If a track has `open` status but no prepared defender Drop, `/ai-music` must not light the challenge button and Profile should show `尚未準備守擂 Drop`.
- Open Explore challenges always use the 60s Drop Battle cropper. The challenger selects or uploads their own Drop, sets the start time, and sends an invite to the defender.
- When the challenger sends the invite, the system locks the defender's current prepared Drop by copying that Drop into the battle/queue rows. If the track has a pending attack invite, the defender cannot replace the prepared defender Drop.
- The created battle starts in a pending defender-acceptance state. While pending, the battle room allows both sides' 5-second previews and arena sharing, but voting is closed.
- Creating an Explore attack invite must write an in-app `battle_notifications` account notice for the defender. The right-top / 右上角通知 dock shows a red dot or unread number and must open a readable account-notice card; Explore attack invites route the defender to `Profile / 我的作品` -> `待接戰`.
- `待接戰` cards show the track title, challenger, genre, scheduled start time, defender 5-second preview, challenger 5-second preview, Accept, and Reject. The matching track row must also show that the defender Drop is locked while the invite is pending.
- Email is auxiliary only. It may point the defender back to AIPOGER, but it must not be the only notice path and must not contain direct accept/reject actions.
- Pending invites expire if the defender has not answered by the scheduled start time. Expired, rejected, under-threshold, or unstarted invites create no result and no win/loss for either side.
- The same challenger may not keep more than one pending Explore attack invite against the same track.
- If the defender rejects, the challenge ends without result, stats, or win/loss history. If the defender accepts, the battle starts according to the scheduled time.
- A challenger may send at most 6 Explore attack invites per Taiwan day.
- Explore direct-challenge official records require at least 3 distinct non-participant audience voters. Ties go to the defender (`fighter_a`). Under 3 voters displays audience-insufficient/no result.
- Six-defense certification is retired. Official defenses still retain their actual Battle outcomes, but no count triggers promotion, a badge, or removal from Explore/Bar. Preserve historical defense/eligibility data internally; do not present `0/6`, a certification progress bar, or a promise to enter Showtime.
- `/ai-music` keeps actual song battle wins/losses and challenge history available in its HUD. Never reset or fabricate Battle outcomes to retire certification or establish a chart.
- The existing 8-official-loss Explore retirement policy is not newly changed by this release: for tracks historically subject to it, 8 official losses retire the work from the public uploaded-works wall and stop challenges. Only battles with at least 3 distinct non-participant voters count; rejected, expired, under-threshold, or unstarted invites do not. Preserve the historical exemption for previously certified works using retained eligibility data; removing active certification must not silently extend the 8-loss policy to them. Main implementation work must preserve that boundary unless separately authorized. Neither this exemption nor chart eligibility implies challenge opt-in.
- The original Drop Battle Pool remains for temporary/open-card matchmaking and quick Drop Battle entry that does not start from Explore AI Music.

Drop cutting keyboard rule:

- The Drop cropper may keep Space as play/pause only when focus is not inside a text-editing target and no meta/ctrl/alt modifier or IME composition is active.
- Space must enter a normal blank character inside lyrics textarea, song title input, creator input, AI tool fields, genre select, notes/description fields, contenteditable areas, or `role="textbox"` widgets. It must not call `preventDefault` or toggle playback in those cases.

## Earworm / 耳朵蟲

Earworm is AIPOGER's ten-track music personality test. It is a listener discovery and recognition-data surface, not a formal Battle, ranking, or same-genre winner declaration.

- One test contains exactly 10 public, playable community works. Sampling should cover different current fixed genres before repeating a genre or creator.
- During the test, the genre label stays hidden. Reaction controls are available immediately: a first impression is valid, with no minimum listening time. Each work attempts automatic playback; choosing a reaction advances and starts the next work automatically. A visible `下一首` action records `無感` and advances immediately. If browser autoplay is blocked, show a direct resume-playback control.
- The result appears only after all 10 works have an answer. It shows one current primary listening direction, two nearby genres, and listening keywords; copy must say `目前最接近` rather than presenting a permanent psychological identity.
- Result actions use one top-to-bottom decision path: `去探索音樂`, `去傷心酒吧`, `看看為我挑的歌`, sharing, then retest. Explore and Bar Heartbreak are equal primary listening destinations and use the same large destination-card treatment. Do not show saved-result success badges or a separate result-save control in this action stack.
- A guest may finish and see the result without a save prompt. Signed-in completions save silently to the account; the result screen does not show a save control or a saved-state badge.
- Earworm has no APC reward, stake, daily point claim, or dependency on the Battle point economy. The completion value is the personality result, sharing, and continued genre listening.
- On an ordinary first Explore entry, AIPOGER may invite the visitor to start Earworm before browsing. The invitation must be dismissible with `先逛逛`; a skip is remembered for 7 days and a completion suppresses the invitation for 30 days. Track/share/genre/challenge deep links must bypass the invitation.
- Completing Earworm stores only the compact taste result needed for recommendations: primary genre, nearby genres, keywords, and completion time. Per-song reactions must not be kept in the browser profile or shown later as personal labels/history. The result's primary action returns to Explore `為你挑的歌`, where one compact recommendation mix is shown. The mix should be approximately 70% primary/nearby genres and 30% discovery; it must not change public catalog ordering, Battle eligibility, or Showtime state.
- Earworm results live in their own server-written table. They do not write to `battle_votes`, `battle_guest_votes`, Battle archives, wins/losses, historical defense/recognition data, or public ranking.
- Signed-in answers upsert one latest service-only aggregate input per account and track in `earworm_track_reactions`; a retest replaces that account's earlier input for the same track. These rows exist only to deduplicate and calculate public affinity. They are not a user-facing preference history. Guest answers calculate the local personality result but never enter the public aggregate.
- Explore and Bar Heartbreak may show `好感度 N%` for the same `listen_bar_tracks.id`. The score is `(love×4 + replay×3 + okay×1) / (distinct valid accounts×4)`, rounded to an integer. A public percentage appears only after 20 distinct signed-in accounts; below that threshold works with aggregate samples say `好感度累積中`. No card may add `你的反應` or another per-listener answer label.
- Blind affinity is a discovery signal only. It is separate from Heart, Bar survival, Battle votes/results, defense progress, Choice, Showtime, and every public ranking/order.
- The API revalidates all 10 track IDs, public/playable state, reaction values, and non-negative observed listening seconds before saving. Client-computed personality output is never trusted as the authoritative stored result.
- The V2 personality and affinity migrations create only server-written result/reaction storage plus a server-only aggregate view and their indexes/RLS grants; they do not create a formal Earworm vote table or call any point-award RPC.

## AIPOGER Showtime

AIPOGER Showtime is the front-stage name for the old Honor Board surface at `/rank`.

Legacy code, database tables, API routes, or historical docs may still use `honor_board` / Honor Board as internal terminology. Public-facing navigation, page title, share copy, and creator-facing eligibility copy should use `AIPOGER Showtime` or `Showtime`.

### Certification Retirement

- Keep the Showtime name and `/rank` route. The public tabs are `月榜 | Choice` / `Monthly Charts | Choice`; the default view is the current month. Choice stays non-ranked and separate from monthly song ranks.
- There is no active Showtime certification. Retire manual/airplay certification, six-defense certification, automatic Battle-win certification, age/Heart-based promotion, certification badges and certification progress. No invitation, certified work or prior upload is needed to curate Choice.
- Preserve every historical song and audio asset, stable IDs, existing favorites, comments, compatible share links, actual Battle wins/losses, recognition source/time and historical eligibility data. These historical fields are not current listing, editing, Choice or chart qualifications; the existing 8-loss historical exemption remains as specified in Explore rules.
- Public playable community songs, including founder-migrated and previously certified works, appear on both Explore and Bar. The old rule that they appear only in Showtime is retired. Do not recreate tracks, refresh their publication date, reset their Battle record, or force challenge opt-in.
- Previously certified tracks return with challenge state reset to showcase/closed. A creator must explicitly opt in again after the reset and prepare a defender Drop; old open flags do not constitute consent. Preserve actual ongoing Battle history and normal invitation acceptance checks.
- Hidden, removed, moderation-held, inactive, unplayable and otherwise restricted works remain restricted. Historical recognition is not permission to restore exposure. Preserve all historical audio without turning private full songs or Battle-only clips into newly public complete tracks.
- Historical migration fact only: the 2026-07-10 founder batch used `public_time <= now() - 30 days`. It was a one-time migration, not an active age threshold, recurring promise, or present-day certification/visibility restriction. Keep internal provenance without founder/certification reward copy in the public UI.
- Work metadata editing is merged into `Profile / 我的作品` under the ownership, audio/history protection and moderation rules above; no separate certified/locked-work editor. `support_url` remains an external HTTPS URL with an optional short `support_url_label`. URL or label changes re-enter review and appear publicly only when approved. Do not add platform payment handling, money amounts, wallets, refunds, revenue sharing or checkout.

### Monthly Charts

- Use Asia/Taipei calendar months: `[first day 00:00, next month's first day 00:00)`, not a rolling 30-day or Monday-week window. Offer an overall chart and current fixed-genre filters; use stable song IDs rather than titles or creator display names.
- The only score is distinct signed-in non-author accounts with an effective song Heart in that month. Each account contributes at most 1 per song per month, regardless of how many days it Hearts that song. Exclude the song's author by ownership identity, not display-name text.
- Existing public daily Heart/favorite behavior remains unchanged, including authors' ability to Heart their own songs; author Hearts simply contribute zero to the monthly chart. Cancellation/re-Heart recomputes current-month support from remaining effective records: an account counts while it has at least one effective Heart in that month, never more than once. Removing only a Profile favorite does not cancel or recount Hearts.
- At least 3 distinct non-author supporters are required for a formal numeric rank. Below 3, show an unranked building-support state rather than inventing a placement. This is a chart threshold, not a change to the separate 3-audience official Battle rule.
- Rank by monthly supporter count descending. Equal counts share competition ranks `1, 1, 3`; stable ID ordering may arrange tied rows but cannot break the tie or assign a different rank.
- Exclude cumulative/all-time Heart totals, favorites alone, Choice selections/collection Hearts/saves/comments, Battle wins or audience votes, Earworm affinity, play counts and invented composite scores. Explore Hot Now remains its separately defined discovery view, not a substitute monthly chart.
- Monthly eligibility covers all public, playable Bar songs with reliable song identity and effective Heart records; certification and publication age impose no extra condition. Explore-only 8-loss retirement does not unpublish a song from Bar or exclude it from monthly charts by itself. Actual hiding, removal, moderation, inactivity, unplayable audio and valid-genre restrictions remain enforced. A Battle-only archive is not automatically a full-song public catalog entry or chart candidate.
- The current month updates from effective records. At month close, freeze a monthly snapshot containing the actual period, scoring version, song IDs, supporter counts and ranks; retries must not create duplicate or changing settled results. Later Hearts belong to their own month and do not rewrite a frozen month.
- Start with the launch/current month only, using reliable effective records from that month. Do not reconstruct or fabricate pre-launch monthly standings from lifetime totals, certification dates or Battle history. Historical month selection exposes only real frozen snapshots accumulated from launch; absent snapshots provide no invented winners or movement arrows.
- Hiding or moderating a song after settlement still blocks public playback/exposure as required. Preserve its historical snapshot record and treatment state without rewriting original ranks or promoting another song to a fabricated historical win.
- Public responses expose aggregate support counts, not supporter identities or private favorites. Empty, below-threshold and unavailable-data states must remain honest; do not fill a Top 10 with mock records.

### AIPOGER Choice Weekly

- Any signed-in account may create and manage its own Choice through `/profile/choice`, reached from `製作我的 Choice` on Showtime's Choice tab or Profile favorites. No certification, invitation, creator level or uploaded work is required. Official owner Choice remains a separate identity/workflow in `/admin/showtime` and `/admin/choice`.
- The personal selection source is the user's private favorites across ALL currently public, playable songs, including older and formerly certified works; there is no 30-day cutoff or certification filter. Official selection uses the same public/playable eligibility boundary. A song may be in multiple curators' Choices without changing its source record.
- Keep song Heart/favorite, Choice-selection checkbox, and collection-level Choice save separate. Selecting or deselecting a song does not Heart/unheart or favorite/unfavorite it. Removing a favorite or cancelling a Heart must not remove an existing draft/published Choice selection; removing a Choice selection must not remove the favorite. Visibility and playback restrictions still apply independently.
- Selecting the first song automatically creates that week's draft, then adds the song. Reuse the existing weekly draft when one exists, including on retry; never disable first selection because a draft has not been created manually. Preserve draft continuation, selected list, ordering, title, introduction, preview, publish and withdrawal.
- Each account may publish one Choice collection per Asia/Taipei Monday week, `[Monday 00:00, next Monday 00:00)`, with 5-10 distinct songs. Drafts may have fewer; publish revalidates count, ownership and current public/playable eligibility. Withdrawal and editing reuse that week's collection rather than enabling a second issue. This calendar week is distinct from the personal 168-hour upload allowance.
- Ageing never removes a selected song. Later hiding, removal, inactivity, missing audio, moderation hold or applicable retirement must stop public playback without erasing historical selection data or restoring the song. Only the curator may edit their own collection; owner moderation can remove a Choice and its collection interactions without altering any selected song.
- Keep the existing compact square editorial cover shelf inside the Choice tab. Creator Choices use the curator's current Profile identity cover/avatar and display name. Only the owner may explicitly save `官方 AIPOGER` or personal `愛波哥` identity per collection; never infer it from the title. Keep issue title, curator and date separate.
- Cards retain the authored recommendation excerpt, sequential play, one tracklist icon, share, comments and toggleable collection-level Heart/save. Desktop hover/focus may preview order; clicking opens the existing interactive HUD on desktop/mobile, with title/date, intro, song Heart/favorite actions, individual play, Play All and full share-page link. Song actions reuse existing records, never Choice-only song totals. Do not add marketing explanations, a separate article HUD or duplicate Featured/Top shelves.
- Keep `#choice-weekly` compatible: homepage links, `/today` and older shares must select the Choice tab and reach its shelf. Published playlists retain `/choice/{id}?kind=official|creator`, curator identity, date, introduction, share, comments, collection save, tracklist, individual play and Play All; do not redirect away from the usable playlist.
- Signed-in listeners retain saved Choice playlists in Profile through `/api/choice/saved`, with direct open/remove actions. Collection interactions do not change song Hearts, monthly scores, Battle records or Explore ordering. Choice is curation, never certification or an automated weekly winner.
- Choice selection never auto-creates social drafts or publishes externally. Keep the existing approval and explicit-send requirements in the social publishing rules.

### Playback And Presentation

- Monthly charts use compact ranked cover rows; Choice retains its existing square-cover shelf. Both use the shared bottom queue player with play/pause, seek, previous/next and mobile volume. Chart play-all follows the displayed chart order; Choice playback follows curator order.
- Historical authorized Battle audio remains accessible through compatible archive/share paths without requiring a fake monthly rank. `Full Song` is available only with the winning creator's explicit complete-song authorization; otherwise expose only the authorized archived Drop clip.
- Retain lyrics viewing with preserved line breaks and a readable HUD/modal; absent lyrics show `歌詞未提供` / `No Lyrics`. Display actual metadata and compact functional controls, not certification labels or marketing copy explaining the redesign.

Creator stages:

- Stage 1: `熱血音樂工匠` / Lv.1-Lv.3
- Stage 2: `潮流音樂大師` / Lv.4-Lv.7
- Stage 3: `殿堂級音樂師尊` / Lv.8-Lv.10

## Storage And Bandwidth

Latest measured usage on 2026-05-29:

- Total Supabase Storage: about 1.78 GB.
- `battle-audio`: about 1.15 GB across 152 files.
- `listen-bar-audio`: about 606.5 MB across 62 files.
- `listen-bar-covers`: about 34.0 MB across 32 files.
- Largest observed file: about 44.7 MB.

Plan assumption:

- The project is believed to be on Supabase Pro.
- Supabase Pro includes 100 GB file storage.
- Storage is currently not the bottleneck if Pro is active.
- 24H Full Song bandwidth and playback load are more important early risks than raw storage.

Operating guidance:

- Keep 24H Full Song active count conservative at launch.
- Prefer blocking full-song uploads before storage upload when the global active cap is reached.
- Keep duplicate-file checks active for Battle and 24H surfaces.
- Consider cleanup policies for cancelled, expired, or orphaned uploaded files before public scale.

Mobile playback guidance:

- Bar Heartbreak exposes an in-page volume slider on mobile and desktop.
- Do not treat a changing percentage label as proof that mobile volume works. Some mobile browsers lock `HTMLMediaElement.volume`; after a user gesture, Bar Heartbreak must fall back to a Web Audio gain node while keeping normal native volume on browsers that support it.
- If the browser suspends the Web Audio context, the explicit resume-playback action must resume both the media element and the gain context. If neither native volume nor gain control is available, show a concise system-volume fallback instead of silently presenting a nonfunctional slider.

## Image Upload Moderation

Current behavior target:

- Adult non-explicit swimwear, stage looks, and tasteful sexy fashion images are allowed on avatars and cover art.
- Prohibited image content remains: explicit nudity, sex acts, porn/adult redirects, sexualized minors, graphic violence, self-harm, hate/discrimination, scams, gambling redirects, drugs/weapons, personal data exposure, impersonation, stolen brand assets, celebrity likeness misuse, and infringing content.
- User-facing upload rules should clearly distinguish `non-explicit sexy styling is allowed` from `pornographic or exploitative content is banned`.

## Deployment Safety

Before deploying changes that touch product rules:

- Confirm whether the change affects auth, upload, Battle queueing, Bar Heartbreak rotation, AIPOGER Showtime display, or storage.
- Update this document if a rule changes.
- Update `docs/aipoger-engineering.md` if a new verification step is needed.
- Update `docs/aipoger-experience.md` if visual language or page identity changes.

## Battle Records 月份與數字呈現

- 月份篩選同時適用 Drop 和 Q Crash 列表及全部聲稱本月的統計；不以不同的跨月最近 N 場混入本月。
- 單場票比顯示得票率（Vote share），不能標示跨場勝率。缺少雙方票數時不猜測百分比。
- 跨場 audienceCount 加總稱投票人次（Voter entries），不能當跨場不同觀眾人數。這不改任何正式票數、勝敗或歷史認證資料，也不計入 Showtime 月榜。
