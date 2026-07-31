# AIPOGER Product Rules

Last updated: 2026-07-31

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

- 傷心酒吧只負責投稿與公播；Explore 負責找歌、收藏、分享、攻擂與正在升溫；Showtime 是認證作品庫。
- `AIPOGER Choice` 是唯一人為策展訊號：每週 5-10 首、不排名、可跨類型。Choice 主 CTA 是 `/rank?lang=zh#choice-weekly`；owner 主要從 `/admin/showtime` 的作品勾選模式建立週次、挑選公開 Showtime 認證作品或上架未滿滾動 30 x 24 小時的公開新歌、排序、發布與撤回，`/admin/choice` 保留為相同資料的直接管理入口。新歌入選 Choice 不會取得 Showtime 認證。
- Choice 卡片使用策展者的個人資料封面，固定顯示日期、當期自訂標題、文章摘要、歌單 Heart、分享、評論與歌單圖示；策展者名稱與標題分開呈現，不得重複拼接。推薦文章直接放在卡片與公開頁標題旁，不另做文章 HUD。
- 歌單維持單一圖示：桌機 hover / focus 可快速看排序，點擊後開互動 HUD；手機點擊直接開 HUD。HUD 上方並排顯示當期標題／日期與推薦簡介，每首歌提供既有歌曲收藏愛心及播放，底部提供「全部播放」與完整分享頁入口；所有播放共用底部播放器。
- Choice 評論是歌單層級內容：公開可讀，登入後可留言，作者可刪除自己的留言，其他留言可檢舉。發布／撤回同一請求必須保存當下週次、標題、推薦文章與 owner 策展身分。
- 公開 Choice 分享頁必須在伺服器輸出專屬 Open Graph / Twitter metadata。一般創作者 Choice 與 owner 以 `愛波哥` 個人身分發布的 Choice，分享縮圖使用該策展者目前的 Profile 頭像；只有明確保存為 `官方 AIPOGER` 身分的 Choice 才使用品牌圖。分享標題與描述分別使用當期自訂標題與推薦文章，不得回退成全站通用 AIPOGER 卡片，也不得從標題猜測策展身分。
- `/today` 只作舊外部連結相容入口，固定以 307 導向 Choice；`/listen-bar?spotlight=...` 必須退化為正常傷心酒吧，不指定歌曲也不改變輪播。
- `listen_bar_daily_spotlights`、歷史素材與舊社群草稿只保留歷史資料，不再由 app 日常流程讀寫；本階段不刪資料、不跑 destructive SQL。
- `/admin/showtime` 是 owner 的緊湊封面作品目錄：只列出目前已進 Showtime 且仍公開展示的認證作品，桌機每列 6 首、每頁 12 首。它不是傷心酒吧投稿或公播候選清單，也不提供候選認證入口；對創作者投稿的 AI Music 作品，owner 可改封面與顯示資料（歌名、創作者、AI 工具、類型、製作資訊、Showtime 評語／作品介紹、歌詞、YouTube、外部支持連結），或收回目前公開展示。不得改寫音檔、既有認證來源、Battle 戰績、票數、Heart 或重新開戰。`/admin/social` 是唯一社群草稿、批准與手動發布中控台。Choice 選曲不會建立社群草稿或自動外部發布；草稿需先批准，Discord 仍需明確按平台發布才送 webhook；Facebook 社團維持手動發布，Instagram 與 YouTube 維持草稿。TikTok 不在目前工作台或新增草稿流程，歷史資料保留。
- Discord 是社群擴散管道，不是產品規則來源。所有對外 CTA 應把聽歌、投票、按心、留言與投稿導回 AIPOGER 網站與 Choice。

## Auth Rules

- Anyone can listen to public music surfaces.
- Sign-in is required for uploading, voting, commenting, music analysis, Battle participation, and creator-owned track deletion.
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
- Official and creator Choice workbenches must let curators preview a current Showtime track before adding it. Use the compact bottom audio player with play/pause, seek progress, and volume controls; unavailable audio stays visibly disabled rather than pretending to be playable.
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
- `Prompt 招式庫` and `歌詞控制` are the Bible's prompt-first practice surface. They adapt nine owner-provided Suno PDFs, DOCX files, a genre screenshot, the credited NuNaught community prompting guide, and the expanded Studio Mastering prompt pack into 73 bilingual prompt moves, 18 bilingual lyric-control moves, 93 normalized genre terms, a six-step production workflow, and the large inspiration indexes below.
- The free `錄音室 Mastering` prompt category contains 49 genre-, culture-, or era-specific Style prompts plus one general studio baseline. Its searchable range includes distinct jazz branches, 1950s–2000s recording aesthetics, Chinese gufeng / wuxia scoring, global forms, orchestral writing, rock, blues, country, gospel, pop, and electronic production. These are generation directions with version-sensitive behavior, not guarantees of post-production mastering; users should export and measure the final master separately.
- Studio Mastering Prompt audio examples use 15-second AIPOGER-owned MP3 clips. The library provides examples for all 50 free prompts total. Each card exposes one preview action and routes playback through one fixed bottom queue player; do not autoplay or embed separate native audio controls in cards. Label every clip as a sound example whose actual Suno generations may vary.
- `Modern Taiwanese Pop` is withdrawn from the free searchable/copyable Studio Mastering library, not merely muted. Keep it out of the public catalog and audio mapping. It may return only through a separately approved paid-content product; do not expose a placeholder lock, price, checkout, or premium claim before that product exists.
- `聲音 DNA × Prompt 配方索引` is the Bible's large-reference navigator. It contains 772 searchable artist-reference entries: 771 from the supplied encyclopedia plus one explicitly labeled AIPOGER addition. It also contains 747 canonical prompt recipes from the supplied set of 750; three exact recipe duplicates are removed.
- Artist names are lookup references only. The copy action must export normalized sonic traits without the artist name and must state that direct imitation is not requested. The public UI must not reproduce the supplied encyclopedia as full pages or long prose.
- Every indexed recipe exposes Chinese labels for genre, vocal, mood, instrument, story, and texture while copying a concise English practice prompt. Search must work with Chinese and English terms.
- The large index uses two unmistakable database tabs, visible instructions, a live result count, wrapping filter targets of at least 44px, one-click copy, per-entry comments, and incremental paging. It must not render all 1,519 cards at once or hide filters behind horizontal mobile scrolling.
- Indexed material is source-derived field reference, not an official Suno guarantee. Source counts, the three removed duplicates, artist-name moderation risk, and model-version variability remain visible.
- Prompt and lyric search panels must explicitly explain that visitors can type a keyword or choose a category, show a live result count, keep inactive controls readable, and make the selected category unmistakable. Category options wrap on mobile instead of hiding behind a horizontal scrollbar.
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
- Drop Battle creators may opt in to publish the complete song only if the Drop reaches AIPOGER Showtime. If they do not opt in, Showtime must only expose the Drop clip. The complete song must not be publicly playable by default.
- When complete-song publishing is enabled, the Battle Room still uses only the Drop clip; `Full Song` is a Showtime extension state, not a battle playback rule.
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
- A battle with fewer than 3 distinct audience voters (0-2) is audience-insufficient / no contest: it must not create a result card, enter Showtime, update official song battle stats, write win/loss history, or open the defender/rematch window.
- A battle with at least 3 distinct audience voters is an official Drop Battle result and may feed Showtime, update per-song battle stats, and open the defender/rematch window.
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
- AIPOGER Showtime only consumes official Drop Battle results with at least 3 distinct audience voters.
- Battle history should focus on the song, not the fighter profile. Cards may show per-song challenge count, wins, losses, ties, and win rate.
- V1 song battle stats do not open URL upload or a full creator song-library UI. They only group the same creator's repeated Drop Battle entries by normalized song title and show battle count, wins, losses, votes, win rate, and Showtime count.
- Waiting cards should provide a `約人鬥歌` share action.
- Live or public-voting cards should provide an `邀請觀戰投票` share action.

### Q Crash / 非同步 Drop Battle

- `Q Crash` is the asynchronous 60-second Drop Battle mode. Existing live Drop Battle remains unchanged.
- The public promise is: `兩首 60 秒 Drop，不用等人到齊，讓大家在自己的時間決定哪首歌勝出。`
- Every Q Crash has exactly two work seats, A and B. The same creator may intentionally compare two own versions, or a second creator may accept the shared/targeted invitation and lock their own work into seat B.
- Both Drops must use the existing cropper, remain at or below 60 seconds, and use the same fixed music genre. Voting starts only after two distinct queue/work entries are locked.
- Same-title works display explicit `版本 A` / `版本 B` labels. Results are work-first: winner storage uses the winning queue/work identifier, and the creator is read from that work.
- Simple voting windows are `30 minutes`, `2 hours` (default), `6 hours`, and `24 hours`. The server sets `voting_ends_at` when work B locks; neither creator may extend or edit the deadline afterward.
- A pending invitation expires after 24 hours. Creator cancellation or expiry produces no public vote, result, stats, history, or Showtime progress.
- Guests may open the card, listen to both Drops, see time remaining, and share. Voting requires sign-in and must return the listener to the same Q Crash card after auth.
- Each signed-in non-participant account gets exactly one immutable vote per Q Crash. Work owners cannot vote, including a creator who owns both A and B.
- Selecting work A or B is a reversible client-side draft, not a submitted vote. The listener may replay, seek, or switch sides until pressing the explicit confirm-submit control; only that confirmation writes the sealed vote, and the submitted vote remains immutable.
- After the confirmed vote, that audience account may optionally save one comment of at most 120 characters for the Q Crash. The voter may update or delete their own comment. While voting is open, only that voter may see their saved comment; all visible voter comments are revealed only after settlement, so comments never expose an audience count or momentum signal before the deadline.
- Q Crash comments are qualitative context only. They do not change the winner vote, five-axis feedback, official audience threshold, Battle record, or Showtime eligibility.
- Q Crash votes remain in a server-only sealed vote store while voting is open. No visitor, participant, or host may see counts, percentages, total voter count, a leader, or another signal that reveals the result before the deadline.
- Winner voting and five-axis feedback are separate actions. Each of the five feedback keys (`rhyme`, `impact`, `melody`, `emotion`, and `structure`) may be selected once per work by each signed-in non-participant account; every selection is immutable, and work owners cannot submit feedback.
- Open-card feedback is private to the current listener. Before settlement, the public/API surface may show only which keys that listener already selected; it must not return aggregate feedback totals, comparisons, progress, or a winner-shaped radar.
- The server/cron settles from `voting_ends_at`; browser time is never authoritative. After settlement, 0-2 distinct signed-in non-participant listeners is audience-insufficient/no result. At least 3 establishes an official Drop Battle result.
- Official Q Crash results copy the sealed votes into the existing official Battle archive/stat path, save `winner_queue_id`, archive both works' five-axis feedback, and show the winning work's pentagon distribution. Insufficient results publish no feedback radar and update none of those official paths.
- Official ties reuse the stable formal Drop Battle tie breaker. Creator identity never changes the winner rule.
- Q Crash V1 does not open the live rematch window. A repeat comparison creates a new Q Crash.
- Public sharing uses the existing `/b/{shortId}` Battle arena link once voting starts. Both work owners share the same battle ID and card; the system must never clone a second card for the second creator.
- Battle Pool renders one Q Crash matchup card per Q Crash card/battle ID. Its A and B queue rows must be removed from the ordinary waiting-card list so one battle never appears as two separate cards.
- Battle Pool visually separates the modes: Q Crash matchup cards live directly below the Q Crash introduction in a blue/cyan section, while official and public Drop Battle cards stay in their own red/orange `Drop Battle 公開挑戰池` section. Genre filters belong to the public Drop section and do not hide Q Crash cards.
- Account limits reuse Drop roles: opening Q Crash occupies the founder state; a different creator accepting seat B occupies their challenger state. When one creator owns both works, Q Crash occupies only that creator's founder state.
- Front-stage UI stays hot and DJ-battle-led: desktop uses two side-by-side work seats, mobile stacks them, every work exposes a lyrics HUD with a clear `歌詞未提供` state, and one fixed bottom player switches between A and B. Do not render Q Crash as a survey, leaderboard, or plain poll card.

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
- Official Gatekeeper Drop results follow the same audience threshold rules as normal Drop Battle: 0-2 distinct voters audience-insufficient/no result, 3+ distinct voters official/Showtime eligible.

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
- Finished 24H battles with a winner feed Showtime as winner records.
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

Authoritative detailed spec: `docs/heartbreak-bar-v1-survival-radio.md`.

Current rules:

- Bar Heartbreak main rotation contains creator submissions only.
- Official AIPOGER songs do not count as active public-pool songs.
- If there are no community submissions, hidden fallback store music may prevent a silent station; it must not count toward survival results.
- Public listening supports 12 playback choices: all public airplay plus the 11 fixed music genres.
- Each fixed music genre has its own 36-track public pool. With the current 11 genres, the full public-pool capacity is 396 community songs.
- New submissions must include a fixed music genre. Do not silently default missing genre values to `Original 自我風格`.
- New Bar Heartbreak audio submissions accept MP3, M4A, AAC, or OGG only, with a 30MB single-file limit. Do not accept new WAV or AIFF submissions in the public or admin Bar Heartbreak upload surfaces.
- The upload form must preview the selected genre outcome before submit: direct public airplay while the genre is under 36 active public songs, or same-genre Challenger once the genre is full.
- New submissions enter the selected genre's public pool immediately while that genre has fewer than 36 active public songs.
- From 2026-07-07 onward, existing songs are not retroactively removed, but a creator cannot upload a genre again while that creator already has 5 or more active public-pool songs in that same genre. The genre must be reduced to 4 active public songs before the creator can upload the 5th again.
- From 2026-07-07 onward, when a creator has 30 or more active public-pool songs across all Bar Heartbreak genres, that creator can successfully upload at most 1 active song per Taiwan day. Removed, hidden, rejected, inactive, and non-public songs do not count toward the 30 public-song threshold.
- Once the selected genre already has 36 active public songs, new submissions enter same-genre Challenger and receive 36-hour protection before public-pool promotion.
- Challenger promotion must also respect the per-creator, per-genre 5-public-song cap; a Challenger cannot move into public airplay if it would keep that creator at or above the same-genre public cap.
- Creator Challenger slots use a per-creator, per-genre 3/2/1 ladder based on that creator's active public-pool songs in the same genre: 0-2 public songs allows up to 3 active Challengers, 3-5 public songs allows up to 2 active Challengers, and 6+ public songs allows up to 1 active Challenger.
- Public-pool songs do not occupy Challenger slots and are not removed by this limit; they only reduce the creator's new Challenger concurrency.
- A creator may remove their own Challenger songs.
- A creator may remove their own public-pool songs.
- Challenger protection period: 36 hours.
- A Challenger can be played, reacted to, and commented on during protection, but it is not evicted.
- Per-track comments are persistent. A signed-in listener can edit their own Bar Heartbreak track comments. When someone comments on a creator's Bar Heartbreak track, the creator receives an account notification unless they commented on their own song.
- A Challenger becomes eligible to move into the same-genre public pool after 36 hours. The old 1-positive-reaction promotion gate is retired.
- Own reaction remains allowed in V2, but it is only public support and does not guarantee survival.
- Judgement interval: every 8 hours.
- `GET /api/listen-bar/process-rotation` is a manual/monitoring dry-run preview only.
- Real promotion/removal requires the protected `POST` route with `LISTEN_BAR_ROTATION_ENABLED=true`.
- Public-pool elimination runs per genre only when that genre has more than 36 public songs.
- Elimination must never bring an active genre public pool below 36 songs.
- Each elimination pass removes at most the overflow above 36 inside overfull genre pools, capped at 3 low-performing public-pool songs.
- If songs have the same positive reaction count, remove the older song first.
- If a genre public pool is at or below 36 songs, elimination stops for that genre and no refill action is needed.
- The legacy 30-day `completed` removal rule is retired and must not remove songs.
- Public pool target: 36 songs per genre, currently 396 songs across 11 genres. Challenger priority airplay can still surface protected new submissions.
- Public airplay support, comments, and retention may inform curation, but Bar Heartbreak must not present `30 hearts`, `7 public days`, or `30 days` as current public Showtime-entry promises.
- Once a song is persistently certified into Showtime, it leaves Bar Heartbreak public/submission-visible lists and Explore challenge surfaces while retaining its source track, Hearts, favorites, comments, battle records, and recognition history.
- A listener must sign in to press Heart or comment. Pressing Heart on a Bar Heartbreak track creates that day's active Heart and saves the track to the listener's favorites; re-pressing Heart cancels both. Removing it later from favorites in Profile remains a separate saved-song action and does not cancel or recount the active Heart reaction.
- Profile `收藏歌曲` is the user's saved-song manager. It should support batch selection and batch removal of saved favorites, while keeping historical Heart reactions intact.
- Creator and listener accounts use the same fixed bottom queue player for Profile saved songs. Each saved-song row exposes one play action; play/pause, seek, previous/next, mobile volume, and close controls live in the shared player. Do not bring back invisible playback or separate native audio controls inside saved-song rows.
- Profile creator-song management should list songs in pages of 10. Profile creator-song management for the user's own Bar Heartbreak songs should support batch selection and batch removal from the public/battle surfaces through the creator-owned remove flow.
- Bar Heartbreak's room-message surface should be titled `傷心的故事傾訴留言`, not `AI 音樂交流區`. General room messages are temporary and retained for 24 hours; the read and cleanup paths must use the same 24-hour cutoff for database and storage fallback data.
- Explore AI Music cards sourced from Bar Heartbreak must display the same total Heart count as the Bar Heartbreak track and send Heart reactions through the same Bar Heartbreak reaction path.
- New submissions get priority after the current song finishes; each priority batch starts when the first upload arrives, airs up to 8 new uploads within 1 hour, and pushes overflow to the next hour.
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

- Any recurring AIPOGER Bar Heartbreak monitoring task must use the 2026-07-01 / 2026-07-02 genre-pool rules as the active rule set.
- Do not use a global 88-song pool as the current monitoring target. Historical references to 88-song capacity eviction may remain only as legacy moderation-note keys or repair context.
- As of 2026-07-06, production has an explicit DB guard that blocks legacy/global 88-song public-pool removals and unmarked public-pool removals. Capacity eviction may only use the `36-song genre public pool capacity rotation eviction.` note, and only when that same genre has more than 36 active public tracks. Creator/admin/moderation removals must carry explicit creator/admin/moderation notes.
- Production monitoring should treat `GET /api/listen-bar/process-rotation` as dry-run preview unless a separate, explicit release task enables protected mutation.
- Any system capacity removal from a genre at or below 36 active public tracks is a rule violation unless it is an explicit creator/admin/moderation removal rather than automated capacity eviction.

Product language:

- Use `Challenger`, `挑戰池`, `挑戰席位`, `正在拼人氣`.
- Avoid calling Challenger a waiting room in user-facing copy.
- Avoid implying Bar Heartbreak is a ranking chart.
- Bar Heartbreak is an AI music survival radio, not a leaderboard.

## Explore AI Music / AI 音樂作品

The homepage first-layer low-pressure entry is `探索 AI 音樂`, linking to `/ai-music`.

Surface positioning:

- Bar Heartbreak is the AI music public airplay pool and submission entry. Creators submit there first; eligible public submissions rotate by genre and also appear on Explore AI Music.
- Explore AI Music is the public uploaded-works wall. It is catalog mode for public uploads that meet display conditions, not a certification surface.
- Showtime is the certified works archive. Once a work enters Showtime, it may be played, saved, shared, and curated, but it must not accept new challenges.

This page is the AI music works browser. It should:

- Use the main title `AI 音樂作品`.
- Highlight the subtitle `依照風格快速瀏覽作品，聽歌、送愛心，或向你喜歡的作品發起挑戰。` in bright yellow so it reads as the page's quick action promise.
- Include a compact upload prompt: `上傳音樂讓大家看到你的作品，請從傷心酒吧投稿。`, linking to the Bar Heartbreak submission area.
- Explore header is a compact, centered catalog stage: eyebrow, a single live `[作品庫] {count} 首公開作品 · 11 種風格` marker, title, yellow subtitle, yellow Bar Heartbreak submission link, cross-surface navigation, and the local `依類型 | 正在升溫` control share one central axis. It must not become a large hero or delay the first visible covers.
- The fixed `/guide.png` icon-only GUIDE button replaces visible `這裡怎麼玩？` text and `<details>`. It opens an accessible HUD dialog that explains style browsing, Heart-to-favorite/Profile management, the red `接戰` state badge and prepared 60s defender Drop, the three non-participant-vote official-result threshold, and the fact that Showtime works no longer accept challenges. It must support X, Escape, backdrop close, focus trapping, focus return, and mobile scrolling without being covered by the mini player.
- Do not let fake waveform, `Live Drop Signal`, `60s READY`, dashboard stats, or a long gameplay explainer delay the first visible covers.
- Within the works browser, provide a local `依類型 | 正在升溫` / `By Style | Hot Now` control. `依類型` remains the default and preserves the 11 genre lanes and rolling seven-day NEW ordering. `正在升溫` is a same-page recent-discovery view, not Showtime, Choice, or a claim of cross-genre absolute strength. It uses the same compact cover-led work cards as the genre lanes: horizontal card browsing on mobile and a 3 / 4 / 6-card responsive grid on desktop. It must not revert to a wide leaderboard row or table layout.
- Hot Now / 正在升溫 only uses explainable 7-day signals from real data: distinct account Heart supporters first, audience votes from officially established Battles second, latest qualified interaction third, then `created_at desc` and `id desc`. It must not use all-time Heart totals, unverified play counts, mock values, or an opaque Heat Score. Official Battle votes count only when the archive meets the 3 distinct non-participant audience threshold.
- Hot Now may show Showtime works with a gold `SHOWTIME` state and no challenge action. Works with no recent valid signal stay at the bottom as `正在累積` / `Building recent support` and receive no fabricated rank number. A ranked card may show a small `#01`-style badge and a one-line real recent-signal reason, but those must not turn the catalog into a large rank table. Hidden, removed, moderation-held, Explore-retired, invalid-genre, inactive, or unplayable works remain excluded.
- Do not show internal verification wording such as `真實資料，不含 mock` or `Real records only` in the public page UI.
- Group real works by the current 11 fixed music genres.
- Show at most 6 works per genre before `看更多`.
- No standalone `最新上架` / `New Arrivals` / `72 小時新歌` shelf, section, route, independent `看更多`, or category label may be added to Explore. The rolling seven-day NEW window is both the badge and sorting window: eligible NEW works lead their own genre lane, and lanes with NEW works lead the wall by their newest NEW `created_at desc`; lanes without NEW works retain the fixed 11-genre order. A work uses `created_at`, then `id desc` for same-time stability. Never use `updated_at` to restore NEW exposure after metadata edits.
- Within a genre lane, NEW works sort new-to-old before established works. Established works keep public positive-reaction priority, then `created_at desc`, then `id desc`. In the collapsed first 6 cards, one creator may expose at most one NEW work in that genre; their other NEW works remain in the same lane's `看更多` result. This compact-lane rule does not hide the work, suppress established high-reaction works, or affect the expanded list.
- Only already display-eligible works participate: community/public, active, playable, using a current valid genre, with a cover or approved fallback, and not hidden, removed, moderation-held, or Explore-retired. Sorting refreshes on initial load, manual refresh, or the normal 5-10 minute refresh only; it must not reshuffle while a visitor is scrolling.
- Keep cards music-platform-like: cover, song title, creator, AI tool, heart count, and challenge count.
- Challenge-ready cards must show a red angled `接戰` corner badge on the cover's top-right. This badge means the original creator is ready to accept a challenge; it is not the attack action. The bottom `攻擂` button remains the challenge action.
- Show the `接戰` badge only when the work is visible on Explore, playable, not Showtime-certified, not retired, not hidden/removed/moderation-held, the creator set the track to `等人挑戰`, and a defender 60s Drop is prepared. Do not show the badge for showcase/closed/custom-only works, missing defender Drop, Showtime works, retired works, or unplayable/incomplete tracks.
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
- Pending invites expire if the defender has not answered by the scheduled start time. Expired, rejected, under-threshold, or unstarted invites create no result, no Showtime progress, and no win/loss for either side.
- The same challenger may not keep more than one pending Explore attack invite against the same track.
- If the defender rejects, the challenge ends without result, stats, or win/loss history. If the defender accepts, the battle starts according to the scheduled time.
- A challenger may send at most 6 Explore attack invites per Taiwan day.
- Explore direct-challenge official records require at least 3 distinct non-participant audience voters. Ties go to the defender (`fighter_a`). Under 3 voters displays audience-insufficient/no result.
- A non-Showtime Explore work that is open to defense enters Showtime after 6 official defense successes from Explore-origin attacks. Only accepted, started, official battles with at least 3 distinct non-participant voters count; defender rejects, timeouts, audience-insufficient/no-contest results, unstarted battles, creator self-start/custom battles, and unestablished battles do not count. Ties that meet the audience threshold count as defender wins. The same challenger may contribute at most 1 defense success toward the same track.
- `/ai-music` must show each non-Showtime work's defense progress, for example `守擂進度 4 / 6，再守下 2 場正式挑戰，進入 Showtime`.
- A non-Showtime Explore work retires from the public uploaded-works wall and stops accepting challenges after 8 official losses. Only losses from battles with at least 3 distinct non-participant voters count; rejected, expired, under-threshold, or unstarted invites do not count.
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
- Earworm results live in their own server-written table. They do not write to `battle_votes`, `battle_guest_votes`, Battle archives, wins/losses, defense progress, Showtime certification, or public ranking.
- Signed-in answers upsert one latest service-only aggregate input per account and track in `earworm_track_reactions`; a retest replaces that account's earlier input for the same track. These rows exist only to deduplicate and calculate public affinity. They are not a user-facing preference history. Guest answers calculate the local personality result but never enter the public aggregate.
- Explore and Bar Heartbreak may show `好感度 N%` for the same `listen_bar_tracks.id`. The score is `(love×4 + replay×3 + okay×1) / (distinct valid accounts×4)`, rounded to an integer. A public percentage appears only after 20 distinct signed-in accounts; below that threshold works with aggregate samples say `好感度累積中`. No card may add `你的反應` or another per-listener answer label.
- Blind affinity is a discovery signal only. It is separate from Heart, Bar survival, Battle votes/results, defense progress, Choice, Showtime, and every public ranking/order.
- The API revalidates all 10 track IDs, public/playable state, reaction values, and non-negative observed listening seconds before saving. Client-computed personality output is never trusted as the authoritative stored result.
- The V2 personality and affinity migrations create only server-written result/reaction storage plus a server-only aggregate view and their indexes/RLS grants; they do not create a formal Earworm vote table or call any point-award RPC.

## AIPOGER Showtime

AIPOGER Showtime is the front-stage name for the old Honor Board surface at `/rank`.

Legacy code, database tables, API routes, or historical docs may still use `honor_board` / Honor Board as internal terminology. Public-facing navigation, page title, share copy, and creator-facing eligibility copy should use `AIPOGER Showtime` or `Showtime`.

Showtime is not a numbered ranking.

Showtime is the certified archive, not a challenge surface:

- Works in Showtime no longer accept Explore direct challenges.
- Showtime records are not removed by later battle losses.
- Showtime works do not follow the 8-official-loss Explore retirement rule.
- Showtime status is a persisted recognition state. Do not dynamically promote public Bar Heartbreak songs into Showtime only because they reach old Heart thresholds.
- The 2026-07-10 founder catalog migration is a one-time owner-confirmed batch: eligible public community works with `public_time <= now() - 30 days` are migrated into Showtime, including works exactly 30 days old. This is not a public or recurring `30 days -> Showtime` promise. The public UI must not expose `30 days`, `early creator reward`, `batch migration`, or similar internal criteria.
- Creator-facing Showtime management may edit only public display metadata and approved external support URLs for the creator's own Showtime work. It must not edit audio, recognition source, battle stats, votes, wins/losses, Showtime status/time, or reopen Explore challenges.
- `support_url` must be an external HTTPS URL and may carry a short `support_url_label` explaining its purpose, for example `前往 YouTube 頻道`, `觀看 MV`, or `支持創作者`. The label and URL re-enter the existing review state on change; public cards display them only when approved. This must not introduce AIPOGER payment handling, money amounts, wallets, refunds, revenue sharing, or direct checkout flows.

Showtime display is a single certified-works catalog:

- Do not split the front stage into Drop victory boards, Bar Heartbreak heat boards, 24H boards, or source tabs.
- Official Drop Battle archive records, Explore defense-certified works, and Bar Heartbreak airplay-certified works all appear in the same playable catalog.
- Founder-catalog migrated works use normal recognition copy in this catalog; do not label them as founder, early reward, batch, or 30-day works.
- Month, style, and search filters may remain for browsing, but they are catalog controls, not separate ranking boards.
- Recognition source belongs inside the individual song introduction, using labels such as `正式 Battle 認證`, `探索守擂認證`, or `傷心酒吧公播認證`.
- Do not show duplicate Featured/Top sections above the same catalog results.
- `AIPOGER Choice` is the first public content shelf on `/rank`, before the Showtime heading, filters, and genre catalog. Render every published Choice as a compact square, cover-led editorial card. Creator Choices always use the creator's current profile avatar and display name. Only the owner workbench may explicitly choose per collection between the official AIPOGER brand identity and the owner's personal `愛波哥` identity; persist this choice as data and never infer it from the title. Every card shows the authored issue title without prepending another `curator Choice`, while curator and week date remain separate metadata. Cover play starts the playlist in order; the card exposes one tracklist icon, a visible share icon, comments, and the toggleable collection-level Choice save. Desktop hover/focus may reveal a compact order preview; clicking opens an interactive HUD on desktop/mobile. The HUD places the stored intro beside the title/date, gives each song its existing song-save Heart and play command, and includes Play All plus the full share-page link. The title is the large designed `AIPOGER CHOICE` wordmark only: do not show `CURATOR SETS`, circular avatars, a standalone article HUD, or the redundant public explanation `由創作者選出他們心目中的歌單`. Choice saves remain collection-level and separate from song saves; HUD song Hearts reuse the existing Showtime/song favorite record rather than creating Choice-only song totals. Choice remains non-ranked and is never an automated weekly winner.
- Showtime remains below Choice. Choice and Showtime share compact catalog density: two cards on mobile and six cards at normal desktop width. Both surfaces share one bottom queue player with seek, previous/next, and mobile volume controls.

Display principles:

- Use catalog/recognition language, not ranking-board language.
- Do not show mock records as real Showtime content.
- Showtime cards may expose a `歌詞` / `LYRICS` action when the archived or source track has lyrics.
- Drop Battle Showtime cards may expose `Full Song` only when the winning creator explicitly enabled complete-song public playback. Otherwise they should show or play only the archived Drop clip.
- If lyrics exist, open them in a readable modal and preserve line breaks.
- If lyrics are not provided, show `歌詞未提供` / `No Lyrics` instead of hiding the feature or implying an error.
- Lyrics are a viewing feature for recognized songs; they are not a creator song-library feature and do not require URL upload support in V1.

AIPOGER Choice Weekly:

- AIPOGER Choice is a creator-curated playlist direction presented as a Beatport-style square cover shelf above Showtime. The cover is the recommender identity cover until a dedicated Choice-cover authoring feature is explicitly shipped.
- It is not a separate ranking chart or automated weekly winner.
- The owner-managed `/admin/showtime` Choice workbench keeps weekly date, optional curation copy, 5-10 selected works, order, and publication state; `/admin/choice` exposes the same workflow directly. The selection pool includes currently public Showtime-certified works plus public, playable community uploads less than 30 x 24 hours old. A new release selected for Choice does not become Showtime-certified. Once selected, it remains playable in that Choice after the freshness window expires, unless it is later hidden, removed, inactive, unplayable, moderation-held, or Explore-retired.
- Choice selection is a compact cover catalog, not one tall metadata row per song: show six small cover-led options per desktop row, a minimal title/creator line, and an overlay add state. `/admin/choice` and `/profile/choice` must use this same density model.
- When the owner or eligible creator selects their first song before creating a weekly draft, the Choice UI must create that week’s draft first and then add the selected work. The overlay add control must not be disabled merely because no draft has been manually created yet.
- This official owner Choice remains separate from creator-published Choice. A creator who has at least one persisted Showtime-certified community work may use `/profile/choice` to create weekly 5-10-track Choice collections. Their own recognition grants curation access; the selection pool is the same cross-creator pool of currently public Showtime works and eligible 30-day new releases. Each creator can manage only their own drafts and published collections; a published creator Choice has its own share page and never replaces the official weekly Choice at `#choice-weekly`.
- The front-stage keeps `#choice-weekly` as the top Choice shelf anchor for homepage, `/today`, and older shared links.
- A public Choice card shows its existing recommendation article excerpt and active heart/save plus share controls. Its save may be toggled off by the same listener and must persist independently of all song reactions.
- Choice may later inform social drafts or DJ selection, but this management workflow does not auto-create drafts or publish externally.
- A published Choice has a functional public share page at `/choice/{id}?kind=official|creator`. The share page is a Beatport-style playlist surface: it keeps the curator identity, date, stored recommendation article, share action, collection-level Heart/save action, per-track play, Play All, tracklist, and the shared bottom queue player. It must not degrade to a static card or redirect back to `/rank` without playback.
- Signed-in listeners can see their saved Choice playlists in Profile through `/api/choice/saved`, open the same public playlist page, and remove a saved Choice directly. Choice saves remain separate from song Hearts, song totals, and saved-song management.

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
- Update `docs/aipoger-release-checklist.md` if a new verification step is needed.
- Update `docs/aipoger-ui-art-direction.md` if visual language or page identity changes.
