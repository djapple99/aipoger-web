import { Library, ListMusic, Search } from "lucide-react";
import { musicNewsArticle } from "@/lib/music-news";

const sources = musicNewsArticle("deezer-ai-music-search-toggle")!.sources;
function Source({ index, label }: { index: number; label: string }) {
  return <a className="music-news-source" href={sources[index].url} target="_blank" rel="noopener noreferrer">{label} ↗</a>;
}

export default function DeezerAiSearchArticle() {
  return <div className="music-news-article-body">
    <section className="music-news-essentials" aria-labelledby="news-essentials"><p className="music-news-kicker">30 秒先看懂</p><h2 id="news-essentials">年底前的計畫，還不是已上線的按鈕</h2>
      <ol><li><strong>10 月 27 日重申年底前推出。</strong><span>Deezer 的 AI 音樂搜尋開關早在 10 月 13 日宣布；截至本站 10 月 28 日查核，兩份公告仍以預計推出表述。</span></li>
        <li><strong>聽眾可選擇過濾，也可關閉。</strong><span>對象是被偵測為全 AI 生成的歌曲、專輯及相關藝人搜尋結果，不能直接擴大到所有 AI 輔助創作。</span></li>
        <li><strong>創作者要分開看三層曝光。</strong><span>作品能否上架、能否進推薦，以及聽眾搜尋時能否看見，是三個問題。這是 AIPOGER 的判讀框架。</span></li></ol>
      <p className="music-news-source-line"><Source index={0} label="10 月 27 日公告" /> · <Source index={1} label="10 月 13 日功能說明與 FAQ" /></p>
    </section>
    <div className="music-news-prose">
      <p className="music-news-lead">歌已經發行，卻不一定出現在每個人的眼前。Deezer 這次重申的搜尋開關，讓做 AI 音樂的人多了一個需要理解的曝光條件：除了平台怎麼分發，聽眾也能選擇自己想看到什麼。</p>
      <section aria-labelledby="news-timeline"><p className="music-news-section-number">01 / 先把時間對好</p><h2 id="news-timeline">首次宣布在 13 日，27 日確認計畫仍在</h2>
        <p>Deezer 在 2026 年 10 月 13 日公布 AI 音樂開關；10 月 27 日的第三季公告再次提及，仍預計於 2026 年底前推出。這篇追蹤的是最新重申，不是把兩週前的消息包裝成今天新功能。<Source index={0} label="最新公告" /> · <Source index={1} label="首次公告" /></p>
        <p>因此，現在不能依這兩份資料告訴讀者「打開 App 就能設定」。實際開放時間、入口與操作方式，仍要等正式推出資訊；概念圖也不能拿來當操作教學。</p>
      </section>
      <section aria-labelledby="news-toggle"><p className="music-news-section-number">02 / 開關會改變什麼</p><h2 id="news-toggle">搜尋可過濾，創作分類要看清楚</h2>
        <p>依 10 月 13 日 FAQ，使用者啟用設定後，可從搜尋結果排除全 AI 生成的歌曲、專輯與相關藝人；關閉後可恢復在搜尋中接觸這類內容。功能針對全 AI 生成，有限 AI 輔助、仍屬較廣泛人類創作過程的音樂另作區分。<Source index={1} label="功能 FAQ" /></p>
        <p>這裡不適合替每首歌自行判定資格。用了哪個工具、人工改了多少，都不能靠一句「我有後製」就保證平台會如何分類；兩份公告也沒有提供這種豁免公式。</p>
      </section>
      <section aria-labelledby="news-three-layers"><p className="music-news-section-number">03 / 一張圖拆開</p><h2 id="news-three-layers">上架、推薦、搜尋，各有自己的問題</h2>
        <figure className="music-news-classification"><div className="music-news-classification-grid">
          <div><Library size={30} aria-hidden="true" /><span>01 / 曲庫</span><h3>作品能否上架</h3><p>發行與供應條件，要看平台及發行商要求；搜尋過濾不等於下架。</p></div>
          <div><ListMusic size={30} aria-hidden="true" /><span>02 / 推薦</span><h3>平台是否推薦</h3><p>Deezer 已有將偵測出的全 AI 歌曲排除於演算法推薦及編輯歌單的政策。</p></div>
          <div><Search size={30} aria-hidden="true" /><span>03 / 搜尋</span><h3>聽眾會看見什麼</h3><p>預計新增的開關，讓聽眾自行決定是否過濾相關搜尋結果。</p></div>
        </div><figcaption>圖解／AIPOGER 原創曝光層次概念圖，非 Deezer 產品介面。推薦政策與搜尋計畫依官方說明整理。<Source index={1} label="政策依據" /></figcaption></figure>
        <p>官方將既有推薦排除與這次搜尋計畫分開說明；不能把搜尋過濾寫成「全部 AI 歌曲下架」，也不能推成「全部沒有版稅」。至於作品實際如何被聽見、如何計酬，這兩則公告沒有替每個創作者給出結果。</p>
      </section>
      <aside className="music-news-opinion" aria-labelledby="news-opinion"><p className="music-news-kicker">愛波哥怎麼看 / OUR TAKE</p><h2 id="news-opinion">作品上了架，曝光功課才剛開始</h2>
        <p>對 AIPOGER，我們在意的是創作者有沒有把「發出去」和「被找到」分開想。上架不是推薦保證；即使作品仍在曲庫，聽眾的設定也可能改變他看見的搜尋結果。反過來，沒有被過濾，也不代表搜尋排名或播放量有保證。</p>
        <p>這提醒我們，發行時別只記一張「已上架」截圖。作品介紹、製作紀錄、可以直接聆聽的連結，以及讓聽眾願意再回來的理由，都值得一起準備。這是本站的曝光建議，不是 Deezer 新增的投稿規則。</p>
      </aside>
      <section className="music-news-actions" aria-labelledby="news-checklist"><p className="music-news-section-number">04 / 創作者現在可以做的事</p><h2 id="news-checklist">把資訊留清楚，別把時間花在猜偵測</h2>
        <p>以下是 AIPOGER 的準備建議，並非 Deezer 公布的新文件要求。</p>
        <ul><li><strong>保存真實製作紀錄：</strong>整理歌詞草稿、工程版本、素材許可與合作分工，如實記下 AI 工具參與的部分；不要事後編造製作過程。</li>
          <li><strong>向發行商核對資訊：</strong>確認發行商目前如何接收 AI 使用資訊、作品描述及更正需求；不把別的平台或舊版說明直接套用。</li>
          <li><strong>追蹤正式推出資訊：</strong>年底前留意官方更新。功能開放後，再以實際設定核對搜尋呈現，避免把測試帳號的一次結果當成所有人的體驗。</li></ul>
        <p>透明描述自己的創作，比猜「改多少才不會被判出來」更有用。人工剪輯不是豁免保證，這篇也不提供規避偵測的方法。</p>
        <p>換你說：你在發行之後，最常卡在上架確認、平台推薦，還是讓聽眾搜尋到作品？<a className="music-news-source" href="#news-discussion">到下方聊聊 ↘</a></p>
      </section>
    </div>
  </div>;
}
