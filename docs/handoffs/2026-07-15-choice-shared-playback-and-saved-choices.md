# Choice 分享播放與收藏歌單

## 已完成

- `/choice/[id]` 改為可播放的公開 Choice 歌單頁，支援官方與創作者 Choice。
- 分享頁支援逐首播放、全部播放、曲目清單、底部順播播放器、拖曳進度、上一首／下一首與手機音量。
- 分享頁保留週次日期、策展身份、推薦文章與分享操作；歌單 Heart 使用既有 `aipoger_choice_collection_hearts`，可切換收藏。
- `/rank` 官方 Choice 分享連結改為唯一的 `/choice/{id}?kind=official`，創作者 Choice 使用 `/choice/{id}?kind=creator`。
- `/api/choice/saved` 與 Profile 收藏 Choice 區已加入，可開啟與取消收藏；未新增資料表，也未執行破壞性 SQL。

## 驗證

- `npm test`: 177 passed
- `npm run lint`: 0 errors，只有既有 `<img>` 與 Hook warnings
- `npx tsc --noEmit`: passed
- `npm run build`: passed
- Playwright local smoke: desktop/mobile shared Choice page、track play、bottom player、heart/share controls。

## 發布

- 待 production deploy 後，需確認 `/choice/{creator-choice-id}`、官方 `/choice/{official-choice-id}?kind=official`、登入 Profile 的收藏 Choice 與正式站音檔播放。
