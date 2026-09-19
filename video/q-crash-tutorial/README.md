# AIPOGER Q Crash 使用教學片

16:9、1920×1080、30fps 的繁中字幕教學短片，說明 Q Crash 的完整流程：

1. 上傳兩首作品
2. 裁切最長 60 秒 Drop
3. 設定投票截止時間
4. 分享同一張 Q Crash 卡
5. 聽眾登入後重播、快轉、選 A／B 並確認送出
6. 截止後查看勝出作品與五角評分分布

另外包含一支「AI 音樂練功聖經」16:9 簡介片，介紹搜尋索引、Suno Control Desk、Prompt／歌詞／聲音 DNA、AI 拆軌、台語歌詞調音與共同驗證。

## 預覽與輸出

```bash
npm i
npm run dev
npx remotion still QCrashTutorial output/preview.png --frame=900 --scale=0.5
npx remotion render QCrashTutorial output/q-crash-tutorial-16x9.mp4 --codec=h264 --crf=18
npx remotion still BibleIntro output/bible-preview.png --frame=720 --scale=0.5
npx remotion render BibleIntro output/ai-music-bible-intro-16x9.mp4 --codec=h264 --crf=18
```

目前版本使用 AIPOGER 現有背景音樂，字幕與介面示意直接由 Remotion 動畫生成；之後可以再加入旁白、實際網站錄屏或替換示意作品名稱。
