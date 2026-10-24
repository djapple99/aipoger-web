import { creditCopy } from "./credit-copy";
export type GuideSurface = "explore" | "mv" | "showtime" | "battle";
const COPY = {
  "zh": {
    "trigger": "這裡怎麼玩？",
    "close": "關閉說明",
    "creditTitle": "目前能拿到的 Credit",
    "note": "會員 Credit、作品排行分數與正式 Battle 戰績各自計算。",
    "explore": {
      "title": "探索怎麼玩？",
      "sections": [
        {
          "title": "聽歌、支持、交流",
          "body": "依曲風或搜尋找歌，按封面播放；登入後可送愛心、收藏，並對別人的作品輸入 1–10 分（最多一位小數）、留下感受。從頭像進創作者中心投稿。"
        },
        {
          "title": "人氣 Top50 怎麼算",
          "body": "不同愛心支持者每人 3 分，加上每人的有效評分總和與盲聽偏好。相同聽眾對同歌的盲聽先平均；新歌上架 7 天內加 3 排行分，同總分新歌優先。"
        },
        {
          "title": "作品的推廣期",
          "body": "單曲通常公開推廣三個日曆月，期滿只退出展示。目前部分舊歌回歸至 2026 年 11 月 1 日台灣時間 00:00。"
        }
      ]
    },
    "mv": {
      "title": "MV 怎麼玩？",
      "sections": [
        {
          "title": "看作品、留下感受",
          "body": "按封面觀看，或啟動連播依目前搜尋與排序播放。登入後可送愛心、收藏與評分；分享鍵能把朋友帶到同一支作品。"
        },
        {
          "title": "一首作品，一份評價",
          "body": "歌曲與 MV 共用原作品、愛心、評論及 1–10 分評價，最多一位小數。每人每作品一個分數，送出後不能修改；文字評論可修改一次，不能自行刪除。作者可以留言，但不能自評。"
        },
        {
          "title": "本週支持與平均分",
          "body": "精選 MV 看台灣週一週期內不同非作者會員的愛心支持，同票可切換。平均評分與評分人數另外顯示；留言則數不直接變成支持票。"
        }
      ]
    },
    "showtime": {
      "title": "Showtime 怎麼玩？",
      "sections": [
        {
          "title": "聽 Choice，也做自己的歌單",
          "body": "播放、收藏、評論與分享策展歌單。登入後從自己的收藏歌曲挑選 5–10 首，每個台灣週一週期可發布一份 Choice；精選、最新、最多收藏是歌單瀏覽順序。"
        },
        {
          "title": "讓參與的人被看見",
          "body": "近 30 天的熱心樂評、活躍創作者與熱心評測者，各展示最多五人。樂評按有至少 20 字可見評論的不同他人作品計數；創作按有效投稿、評測按完成盲聽計數。"
        },
        {
          "title": "不同貢獻分開看",
          "body": "同作品補 MV 或修改評論不重複加件。人物榜不代表專業認證，也不另送 Credit；Choice 收藏不增加歌曲排行分數。"
        }
      ]
    },
    "battle": {
      "title": "Battle 怎麼玩？",
      "sections": [
        {
          "title": "先盲聽，用耳朵選",
          "body": "登入比較匿名 A/B，同曲風兩首各取第 15–45 秒。每側實際聽滿 8 秒後可選偏好或平手，也可拖曳重聽；成功作答直接接下一題，隨時能離開。"
        },
        {
          "title": "每題 3 Credit",
          "body": "有效作答選 A、B 或平手一律 3 Credit。每人同一歌曲配對只領一次；重播、重送、離開與播放失敗不另發點。"
        },
        {
          "title": "Q Crash 與 Drop Battle",
          "body": "兩種正式對戰保留原投票與資格規則。盲聽偏好影響探索人氣，與正式對戰票、勝負及戰績分開；不能花 Credit 購買票權或排名。"
        }
      ]
    }
  },
  "en": {
    "trigger": "How this works",
    "close": "Close guide",
    "creditTitle": "Credit available now",
    "note": "Member Credit, work popularity and official Battle results are counted separately.",
    "explore": {
      "title": "How Explore works",
      "sections": [
        {
          "title": "Listen, support, discuss",
          "body": "Browse by genre or search, then press a cover to play. Sign in to Heart, save, or rate another creator’s work from 1–10 with one decimal place and share your thoughts. Submit through Creator Center."
        },
        {
          "title": "Popularity Top50",
          "body": "Each distinct Heart supporter adds 3 points, plus current rating totals and blind preferences. Repeated comparisons of a work are averaged per listener. New works get 3 points for 7 days; newer works win score ties."
        },
        {
          "title": "Promotion period",
          "body": "Singles normally appear for three calendar months. Selected expired works return until Nov 1, 2026 at 00:00 Taiwan time. Expiry removes public promotion, without deleting the work."
        }
      ]
    },
    "mv": {
      "title": "How MV works",
      "sections": [
        {
          "title": "Watch and share your thoughts",
          "body": "Press a cover to watch, or play the full filtered list continuously. Sign in to Heart, save and rate. Share links take friends to the same work."
        },
        {
          "title": "One work, one rating",
          "body": "Music and MV share the original work, Hearts, comments and 1–10 rating, with one decimal place. Your score is final after submission. Comment text can be edited once and cannot be deleted by its author. Authors can comment, but cannot rate themselves."
        },
        {
          "title": "Weekly support and average ratings",
          "body": "Featured MVs use distinct non-author Heart supporters during the Taiwan Monday week. Tied works can be switched. Average ratings and rater counts are separate; comment counts do not become votes."
        }
      ]
    },
    "showtime": {
      "title": "How Showtime works",
      "sections": [
        {
          "title": "Listen to Choice, make your own",
          "body": "Play, save, discuss and share curated playlists. Sign in to select 5–10 saved playable tracks and publish one Choice per Taiwan Monday week. Featured, latest and most saved are playlist browsing orders."
        },
        {
          "title": "Community contributors",
          "body": "Up to five contributors per board over the last 30 days: reviewers of different people’s works with visible 20-character comments, creators with eligible submissions, and listeners completing blind comparisons."
        },
        {
          "title": "Keep each contribution distinct",
          "body": "Adding an MV or editing a comment does not create another work. Boards are participation counts, without certification or extra Credit. Saving a Choice does not add song popularity."
        }
      ]
    },
    "battle": {
      "title": "How Battle works",
      "sections": [
        {
          "title": "Let your ears choose",
          "body": "Sign in for anonymous A/B excerpts from 15–45 seconds of two same-genre tracks. Listen for 8 seconds on each side to choose or tie; seeking unlocks after listening. The next question starts after a successful answer; leave anytime."
        },
        {
          "title": "3 Credit per question",
          "body": "A, B and ties all earn 3 Credit for a valid answer. Each listener earns once per song pair. Replays, retries, leaving and playback failures do not award extra Credit."
        },
        {
          "title": "Q Crash and Drop Battle",
          "body": "Official voting and eligibility rules remain. Blind preferences affect Explore popularity separately from official votes, wins and records. Credit cannot buy voting power or ranks."
        }
      ]
    }
  },
  "ja": {
    "trigger": "ここでの遊び方",
    "close": "ガイドを閉じる",
    "creditTitle": "現在獲得できるCredit",
    "note": "会員Credit、作品の人気スコア、公式Battle戦績は別々に集計します。",
    "explore": {
      "title": "Exploreの遊び方",
      "sections": [
        {
          "title": "聴く・応援する・話す",
          "body": "ジャンルや検索で探し、カバーを押して再生。ログイン後はHeart・保存・他の人の作品への1〜10点評価（小数1桁）とコメントができます。投稿はクリエイターセンターから。"
        },
        {
          "title": "人気Top50",
          "body": "異なるHeart支持者1人につき3点に、有効な評価の合計とブラインド選好を加算。同じ人の同じ曲への選好は平均し、新曲は7日間3点加算。同点は新しい曲が先です。"
        },
        {
          "title": "作品の公開期間",
          "body": "通常は3暦月の公開紹介。一部の期限切れ作品は台湾時間2026年11月1日0時まで復帰します。期限切れで展示は終了しますが作品は削除しません。"
        }
      ]
    },
    "mv": {
      "title": "MVの遊び方",
      "sections": [
        {
          "title": "見る・感想を伝える",
          "body": "カバーで視聴、連続再生で検索・並べ替え後の全リストを再生。ログインするとHeart・保存・評価ができ、共有リンクで同じ作品を紹介できます。"
        },
        {
          "title": "同じ作品に評価を1件",
          "body": "音楽とMVは作品ID・Heart・コメント・1〜10点評価を共有。小数1桁まで。点数は送信後に変更できません。コメント文は1回だけ編集でき、投稿者による削除はできません。作者はコメントできますが自己評価はできません。"
        },
        {
          "title": "今週の応援と平均点",
          "body": "注目MVは台湾の月曜週内の異なる非作者Heart支持者数で選び、同票は切替可能。平均点と評価人数は別に表示し、コメント件数は票になりません。"
        }
      ]
    },
    "showtime": {
      "title": "Showtimeの遊び方",
      "sections": [
        {
          "title": "Choiceを聴く・作る",
          "body": "選曲リストを再生・保存・コメント・共有。ログイン後、保存した再生可能な曲から5〜10曲を選び、台湾の月曜週ごとに1件公開できます。注目・最新・最多保存は歌単の表示順です。"
        },
        {
          "title": "コミュニティの参加者",
          "body": "直近30日間のレビュー・投稿・ブラインド比較を各最大5人表示。レビューは他の人の異なる作品への20文字以上の可視コメント、投稿は有効作品、比較は完了問題を数えます。"
        },
        {
          "title": "貢献は別々に集計",
          "body": "MV追加・コメント編集は作品を増やしません。ランキングは参加数で、認証や追加Creditではありません。Choice保存は曲の人気点になりません。"
        }
      ]
    },
    "battle": {
      "title": "Battleの遊び方",
      "sections": [
        {
          "title": "耳で選ぶブラインド比較",
          "body": "ログインして同ジャンル2曲の15〜45秒を匿名A/Bで比較。各8秒聴くと選択・引き分けとシークが可能に。回答成功後は次の問題へ進み、いつでも退出できます。"
        },
        {
          "title": "1問につき3 Credit",
          "body": "有効回答はA・B・引き分けすべて3 Credit。同じ人と曲ペアで1回のみ。再生し直し・再送・退出・再生失敗は追加報酬になりません。"
        },
        {
          "title": "Q CrashとDrop Battle",
          "body": "公式投票・資格規則を維持。ブラインド選好はExplore人気に反映し、公式票・勝敗・戦績とは別です。Creditで票の力や順位は買えません。"
        }
      ]
    }
  },
  "ko": {
    "trigger": "여기서 어떻게 즐기나요?",
    "close": "안내 닫기",
    "creditTitle": "지금 받을 수 있는 Credit",
    "note": "회원 Credit, 작품 인기 점수, 공식 Battle 전적은 따로 계산합니다.",
    "explore": {
      "title": "Explore 이용 방법",
      "sections": [
        {
          "title": "듣고, 응원하고, 이야기해요",
          "body": "장르나 검색으로 찾아 커버를 눌러 재생하세요. 로그인 후 Heart·저장·다른 사람 작품의 1–10점 평가(소수 한 자리)와 댓글이 가능합니다. 업로드는 크리에이터 센터에서 합니다."
        },
        {
          "title": "인기 Top50",
          "body": "서로 다른 Heart 지지자 한 명당 3점에 유효한 평가 합계와 블라인드 선호를 더합니다. 같은 사람의 같은 곡 선호는 평균을 사용합니다. 신곡은 7일간 3점 추가, 동점이면 새 곡이 먼저입니다."
        },
        {
          "title": "작품 공개 기간",
          "body": "싱글은 보통 달력 기준 3개월 동안 소개합니다. 일부 만료 작품은 대만 시간 2026년 11월 1일 0시까지 돌아옵니다. 만료는 공개 소개 종료이며 삭제가 아닙니다."
        }
      ]
    },
    "mv": {
      "title": "MV 이용 방법",
      "sections": [
        {
          "title": "보고 감상을 나누세요",
          "body": "커버를 눌러 보거나 검색·정렬한 전체 목록을 연속 재생하세요. 로그인하면 Heart·저장·평가할 수 있고, 공유 링크는 같은 작품으로 연결됩니다."
        },
        {
          "title": "한 작품에 평가 하나",
          "body": "음악과 MV는 작품·Heart·댓글·1–10점 평가를 공유하며 소수 한 자리까지 가능합니다. 점수는 제출 후 변경할 수 없습니다. 댓글 내용은 한 번 수정할 수 있으며 작성자가 삭제할 수 없습니다. 작가는 댓글만 가능하며 자기 평가는 불가합니다."
        },
        {
          "title": "이번 주 지지와 평균 점수",
          "body": "대표 MV는 대만 월요일 주간의 서로 다른 비작가 Heart 지지자 수로 고르고 동률 작품은 전환할 수 있습니다. 평균 점수·평가자 수는 별도이며 댓글 수는 표가 아닙니다."
        }
      ]
    },
    "showtime": {
      "title": "Showtime 이용 방법",
      "sections": [
        {
          "title": "Choice를 듣고 만들어 보세요",
          "body": "큐레이션 목록을 재생·저장·댓글·공유하세요. 로그인 후 저장한 재생 가능한 곡 5–10개로 대만 월요일 주간마다 Choice 한 개를 공개할 수 있어요. 추천·최신·최다 저장은 목록 탐색 순서입니다."
        },
        {
          "title": "함께하는 사람들",
          "body": "최근 30일 리뷰·창작·블라인드 평가 기여자를 각 최대 5명 표시합니다. 리뷰는 다른 사람의 서로 다른 작품에 남긴 20자 이상 공개 댓글, 창작은 유효 업로드, 평가는 완료한 문제를 셉니다."
        },
        {
          "title": "기여는 각각 계산해요",
          "body": "MV 추가·댓글 수정은 새 작품으로 세지 않습니다. 인물 순위는 참여 수이며 인증이나 추가 Credit이 아닙니다. Choice 저장은 곡 인기 점수가 아닙니다."
        }
      ]
    },
    "battle": {
      "title": "Battle 이용 방법",
      "sections": [
        {
          "title": "귀로 고르는 블라인드 비교",
          "body": "로그인하여 같은 장르 두 곡의 15–45초를 익명 A/B로 비교하세요. 각 8초를 실제로 들으면 선택·무승부와 탐색이 열립니다. 답변 성공 후 다음 문제로 넘어가며 언제든 나갈 수 있어요."
        },
        {
          "title": "문제당 3 Credit",
          "body": "유효 답변은 A·B·무승부 모두 3 Credit. 같은 사람은 같은 곡 쌍에서 한 번만 받아요. 반복 재생·재전송·퇴장·재생 실패는 추가 보상이 없습니다."
        },
        {
          "title": "Q Crash와 Drop Battle",
          "body": "공식 투표·자격 규칙은 유지합니다. 블라인드 선호는 Explore 인기에 반영되며 공식 표·승패·전적과 별도입니다. Credit으로 투표 영향력이나 순위를 살 수 없습니다."
        }
      ]
    }
  }
} as const;
import { albumCopy } from "./album-copy";
export function participationGuideCopy(surface: GuideSurface, lang: string) {
  const locale = lang === "en" || lang === "ja" || lang === "ko" ? lang : "zh";
  const c = COPY[locale];
  return { ...c[surface], sections: [...c[surface].sections, ...(surface === "explore" || surface === "mv" ? [{ title: albumCopy(locale).rulesTitle, body: albumCopy(locale).rules }] : [])], trigger: c.trigger, close: c.close, creditTitle: c.creditTitle, creditBody: creditCopy(locale).rules, note: c.note };
}
