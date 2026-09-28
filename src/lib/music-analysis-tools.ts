export const ANALYSIS_TOOLS_CHECKED_AT = "2026-09-28";

export const ANALYSIS_TOOLS = [
  {
    "key": "tunebat",
    "name": "Tunebat",
    "href": "https://tunebat.com/analyzer",
    "source": "https://tunebat.com/analyzer"
  },
  {
    "key": "loudness",
    "name": "Loudness Penalty",
    "href": "https://www.loudnesspenalty.com/",
    "source": "https://www.loudnesspenalty.com/"
  },
  {
    "key": "cyanite",
    "name": "Cyanite",
    "href": "https://app.cyanite.ai/library",
    "source": "https://cyanite.ai/faq/"
  }
] as const;

export const ANALYSIS_COPY = {
  "zh": {
    "title": "分析你的音樂",
    "intro": "選一個適合的工具，到外站自己分析歌曲。先準備音檔，就能開始。",
    "toolsTitle": "你想先了解什麼？",
    "fileHint": "先準備 MP3 或 WAV。這些入口是分析網站；Suno／YouTube 分享連結通常不能直接代替音檔。",
    "open": "前往工具",
    "sourceLink": "官方說明",
    "checked": "免費條件核對",
    "external": "工具會在新分頁開啟。免費方案可能調整，以外站當下條件為準。",
    "usage": "怎麼使用",
    "back": "回到 Music Bible",
    "toolCopy": [
      {
        "question": "這首歌多快、什麼調？",
        "price": "BPM／調性免費",
        "description": "查節奏速度與調性，方便比較不同版本、安排人聲或重混。",
        "detail": "免登入可用基本分析；音檔在瀏覽器處理。情緒指標、儲存及下載報告屬付費功能。",
        "caution": "偵測是估計值；遇到半速、倍速或調性不準，仍要跟著歌曲確認。",
        "instructions": "選取音檔，等待分析完成，就能看到 BPM 與 Key。需要時直接抄下數值。"
      },
      {
        "question": "串流播放會降多少音量？",
        "price": "網頁分析免費",
        "description": "預估歌曲在 Spotify、YouTube 等服務的音量調整，並比較播放聽感。",
        "detail": "基本分析不需帳號或 Email，音檔不會上傳；可略過 Email 報告及付費外掛。",
        "caution": "負數不是品質扣分，也不是母帶目標；先聽調整後的聲音，再決定要不要修改。",
        "instructions": "選取 MP3 或 WAV，查看各平台的 dB 調整量，再試聽調整後的音量。"
      },
      {
        "question": "曲風、情緒與聲音特徵？",
        "price": "需註冊・每月免費 5 首",
        "description": "用音樂標籤補充你對曲風、情緒、樂器與人聲的描述，找作品方向。",
        "detail": "歌曲會上傳到 Cyanite。免費功能有限；超出額度需付費。",
        "caution": "標籤是參考，不代表歌詞診斷、商業成功或作品好壞。",
        "instructions": "註冊並登入後，上傳 MP3，到歌曲分析頁查看帳號可用的曲風、情緒等標籤。"
      }
    ]
  },
  "en": {
    "title": "Analyze Your Music",
    "intro": "Choose a tool and analyze your track on its website. Have your audio file ready to get started.",
    "toolsTitle": "What do you want to check?",
    "fileHint": "Have an MP3 or WAV ready. These links open analysis websites; a Suno or YouTube sharing link usually cannot replace an audio file.",
    "open": "Open tool",
    "sourceLink": "Official details",
    "checked": "Free plans checked",
    "external": "Tools open in a new tab. Free plans may change; check the provider’s current terms.",
    "usage": "How to use it",
    "back": "Back to Music Bible",
    "toolCopy": [
      {
        "question": "What tempo and key?",
        "price": "Free BPM & key",
        "description": "Estimate tempo and key to compare versions, plan vocals, or start a remix.",
        "detail": "Basic analysis works without signing in and processes audio in your browser. Mood metrics, saved results, and report downloads are paid features.",
        "caution": "Estimates can be wrong, including half- or double-tempo readings. Check them against the song.",
        "instructions": "Select an audio file and wait for the BPM and key results. Write down the values if needed."
      },
      {
        "question": "Will streaming turn it down?",
        "price": "Free web analyzer",
        "description": "Estimate playback level adjustments on Spotify, YouTube, and other services, then compare the sound.",
        "detail": "Basic analysis needs no account or email and does not upload audio. Skip the optional email report and paid plug-in.",
        "caution": "A negative value is not a quality score or mastering target. Listen before deciding to change anything.",
        "instructions": "Choose an MP3 or WAV, check each platform’s dB adjustment, then preview the adjusted playback."
      },
      {
        "question": "What genre, mood, and sound?",
        "price": "Account required · 5 free tracks/month",
        "description": "Use music tags to describe genre, mood, instruments, and vocals and explore the track’s direction.",
        "detail": "Audio is uploaded to Cyanite. Free features are limited; extra credits cost money.",
        "caution": "Tags are references, not lyric criticism, a quality verdict, or a prediction of commercial success.",
        "instructions": "Sign up, log in, and upload an MP3. Open the track’s analysis to view the genre, mood, and other tags available on your plan."
      }
    ]
  },
  "ja": {
    "title": "音楽を分析する",
    "intro": "目的に合うツールを選び、外部サイトで曲を分析しましょう。まず音声ファイルを用意してください。",
    "toolsTitle": "何を確かめたいですか？",
    "fileHint": "MP3 または WAV を用意してください。リンク先は分析サイトです。通常、Suno や YouTube の共有リンクだけでは分析できません。",
    "open": "ツールを開く",
    "sourceLink": "公式の説明",
    "checked": "無料条件の確認日",
    "external": "別タブで開きます。無料条件は変更される場合があるため、各サイトで確認してください。",
    "usage": "使い方",
    "back": "Music Bible に戻る",
    "toolCopy": [
      {
        "question": "テンポとキーを知りたい",
        "price": "BPM・キーは無料",
        "description": "テンポとキーの推定値を、別バージョンとの比較や歌唱、リミックスに役立てます。",
        "detail": "基本分析はログイン不要。音声はブラウザ内で処理されます。感情指標、結果の保存・ダウンロードは有料です。",
        "caution": "推定値です。倍速・半速やキーの誤判定もあるため、曲を聴いて確認しましょう。",
        "instructions": "音声ファイルを選ぶと分析が始まり、BPM とキーが表示されます。必要な値を書き留めてください。"
      },
      {
        "question": "配信で音量はどれだけ下がる？",
        "price": "Web 分析は無料",
        "description": "Spotify や YouTube などでの音量調整を推定し、再生時の聴こえ方を比較します。",
        "detail": "基本分析はアカウント・メール不要で、音声もアップロードされません。メールレポートと有料プラグインは任意です。",
        "caution": "マイナス値は品質の減点でもマスタリング目標でもありません。まず聴いて判断しましょう。",
        "instructions": "MP3 または WAV を選び、各サービスの音量調整値を確認。調整後の音も試聴できます。"
      },
      {
        "question": "ジャンルや雰囲気を言葉にしたい",
        "price": "登録必要・毎月 5 曲無料",
        "description": "ジャンル、ムード、楽器、ボーカルのタグを使って、曲の方向性を整理します。",
        "detail": "音声は Cyanite にアップロードされます。無料機能には制限があり、追加利用は有料。",
        "caution": "タグは参考情報です。歌詞の評価や作品の良し悪し、商業的成功を示すものではありません。",
        "instructions": "登録・ログイン後に MP3 をアップロードし、分析ページで利用可能なジャンルやムードのタグを確認します。"
      }
    ]
  },
  "ko": {
    "title": "내 음악 분석하기",
    "intro": "목적에 맞는 도구를 골라 외부 사이트에서 곡을 직접 분석하세요. 오디오 파일을 먼저 준비하면 됩니다.",
    "toolsTitle": "무엇을 확인하고 싶나요?",
    "fileHint": "MP3 또는 WAV 파일을 준비하세요. 링크는 분석 사이트로 연결됩니다. 보통 Suno나 YouTube 공유 링크만으로는 분석할 수 없습니다.",
    "open": "도구 열기",
    "sourceLink": "공식 안내",
    "checked": "무료 조건 확인일",
    "external": "새 탭에서 열립니다. 무료 조건은 변경될 수 있으니 해당 사이트를 확인하세요.",
    "usage": "사용 방법",
    "back": "Music Bible로 돌아가기",
    "toolCopy": [
      {
        "question": "템포와 조성이 궁금해요",
        "price": "BPM·조성 무료",
        "description": "템포와 조성을 추정해 버전 비교, 보컬 작업, 리믹스에 활용하세요.",
        "detail": "기본 분석은 로그인 없이 브라우저에서 처리됩니다. 감정 지표, 결과 저장과 다운로드는 유료입니다.",
        "caution": "추정값입니다. 절반·두 배 템포나 조성 오류가 있을 수 있으니 직접 들으며 확인하세요.",
        "instructions": "오디오 파일을 선택하고 분석이 끝나면 BPM과 조성을 확인하세요. 필요한 값은 적어 두면 됩니다."
      },
      {
        "question": "스트리밍에서 얼마나 작아질까요?",
        "price": "웹 분석 무료",
        "description": "Spotify, YouTube 등의 재생 음량 조정을 추정하고 소리를 비교합니다.",
        "detail": "기본 분석은 계정·이메일 없이 이용하며 오디오를 업로드하지 않습니다. 이메일 보고서와 유료 플러그인은 선택 사항입니다.",
        "caution": "음수는 품질 점수나 마스터링 목표가 아닙니다. 조정된 소리를 먼저 들어 보세요.",
        "instructions": "MP3 또는 WAV를 선택해 플랫폼별 dB 조정량을 확인하고, 조정된 음량으로 미리 들어 보세요."
      },
      {
        "question": "장르와 분위기를 알고 싶어요",
        "price": "가입 필요 · 매월 5곡 무료",
        "description": "장르, 분위기, 악기, 보컬 태그를 참고해 곡의 방향을 정리하세요.",
        "detail": "오디오가 Cyanite에 업로드됩니다. 무료 기능은 제한되며 추가 이용은 유료입니다.",
        "caution": "태그는 참고 자료이며 가사 평가, 작품의 좋고 나쁨, 상업적 성공을 뜻하지 않습니다.",
        "instructions": "가입 후 로그인하고 MP3를 업로드하세요. 곡 분석 페이지에서 이용 가능한 장르·분위기 태그를 확인할 수 있습니다."
      }
    ]
  }
} as const;
