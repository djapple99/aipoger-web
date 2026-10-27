import { ClipboardList, FileCheck2, Landmark, Music2, Video } from "lucide-react";
import { musicNewsArticle } from "@/lib/music-news";

const sources = musicNewsArticle("sba-creator-small-business-guidance")!.sources;
function Source({ index, label }: { index: number; label: string }) {
  return <a className="music-news-source" href={sources[index].url} target="_blank" rel="noopener noreferrer">{label} ↗</a>;
}

export default function SbaCreatorBusinessArticle() {
  return <div className="music-news-article-body">
    <section className="music-news-essentials" aria-labelledby="news-essentials"><p className="music-news-kicker">30 秒先看懂</p><h2 id="news-essentials">分類更清楚，經營也可以更有準備</h2>
      <ol><li><strong>美國 SBA 釐清影音創作者分類。</strong><span>10 月 15 日公布指引，符合範圍的事業可從 NAICS 5121 中，選擇符合主業的分類。</span></li>
        <li><strong>分類指引不保證貸款或補助。</strong><span>原本符合條件的創作者就可能獲支援；這次沒有新增普遍適用的創作者補助。</span></li>
        <li><strong>台灣創作者可以先整理經營紀錄。</strong><span>這是美國 SBA 的指引。本站建議從收入、成本與合作合約開始，建立自己的創作帳本。</span></li></ol>
      <p className="music-news-source-line"><Source index={0} label="SBA 公告" /> · <Source index={1} label="補助說明" /></p>
    </section>
    <div className="music-news-prose">
      <p className="music-news-lead">一首歌上架之前，你可能同時當製作人、剪輯師、美術和宣傳。等到有人找你合作，還得切換成報價、合約與對帳模式。創作者的工作，早就不只按下發布那一刻。</p>
      <section aria-labelledby="news-sba-guidance"><p className="music-news-section-number">01 / 這次發生什麼事</p><h2 id="news-sba-guidance">SBA 把影音創作者的事業分類說得更清楚</h2>
        <p>美國小型企業管理局（SBA）於 2026 年 10 月 15 日，發布首份針對創作者事業的小企業分類指引。以原創影音製作、發行為主要活動、符合範圍的事業，可從 NAICS 5121「電影與影片產業」中，辨認最符合主業的六位數代碼，用於 SBA 方案資格判定。<Source index={0} label="官方公告" /></p>
        <p>公告同時說明：符合各方案要求的創作者事業，原本就可能取得 SBA 支援。這次釐清的是分類方式，並非創作者直到現在才有資格被當成企業。<Source index={0} label="原有資格與新指引" /></p>
        <p>這也讓新聞的重點更具體：一個人同時製作、剪輯、發行和經營內容時，如何描述自己的主要事業，終於有了更明確的參考。</p>
      </section>
      <section aria-labelledby="news-business-layers"><p className="music-news-section-number">02 / 一張圖看懂</p><h2 id="news-business-layers">分類、申請、核准，是不同階段</h2>
        <figure className="music-news-classification"><div className="music-news-classification-grid">
          <div><ClipboardList size={30} aria-hidden="true" /><span>01 / 這次釐清</span><h3>事業分類</h3><p>依主要活動，找到適合的產業代碼，說清楚自己在經營什麼。</p></div>
          <div><FileCheck2 size={30} aria-hidden="true" /><span>02 / 仍須核對</span><h3>方案資格</h3><p>符合分類之後，還要逐項確認想申請的方案要求。</p></div>
          <div><Landmark size={30} aria-hidden="true" /><span>03 / 個別審核</span><h3>實際核准</h3><p>提出申請後仍有審核，分類本身不保證取得貸款或合約。</p></div>
        </div><figcaption>圖解／AIPOGER 依 SBA 公告整理的判讀層次，非申請流程畫面或核准承諾。<Source index={0} label="公告依據" /></figcaption></figure>
        <p>補助也要分開看。SBA 的一般說明指出，它不提供用於一般創業或擴張的補助；研發、出口等特定用途另有規定。因此，這則新聞不能寫成「創作者現在都能領一筆補助」。<Source index={1} label="SBA 補助說明" /></p>
      </section>
      <section aria-labelledby="news-music-and-video"><p className="music-news-section-number">03 / 和做音樂的你有什麼關係</p><h2 id="news-music-and-video">MV、音樂教學與頻道經營，是值得關注的連結</h2>
        <p>對 AIPOGER 的讀者，我們會把這則消息連到 MV 製作、音樂教學與影音頻道經營：有些人從做一首歌開始，後來持續拍影片、接合作，也開始面對收入和成本。這是本站選擇這個題目的原因。</p>
        <figure className="music-news-flow"><div><Video size={28} aria-hidden="true" /><h3>5121 / 電影與影片產業</h3><p>這次指引談到的影音範圍；仍要依實際主業選擇細項。</p></div><div><Music2 size={28} aria-hidden="true" /><h3>5122 / 錄音產業</h3><p>美國分類另列錄音產業，不能把所有音樂工作都套進 5121。</p></div><figcaption>圖解／美國 NAICS 產業組別對照，並非替個別創作者判定分類。<Source index={2} label="官方分類" /></figcaption></figure>
        <p>對主要在台灣經營的讀者，這則公告也沒有直接開放在地補助或貸款。我們能帶回來的，是一個經營提醒：作品集之外，也替自己的創作留下一份清楚的事業紀錄。</p>
        <p>至於 AI 歌曲的商用許可、素材授權與著作權，仍要各自確認。事業分類回答的是「你在經營什麼」，作品權利回答的是「這份內容可以怎麼使用」；整理時，兩份資料都留好。</p>
      </section>
      <aside className="music-news-opinion" aria-labelledby="news-opinion"><p className="music-news-kicker">愛波哥怎麼看 / OUR TAKE</p><h2 id="news-opinion">把創作當一回事，也把經營照顧好</h2>
        <p>我覺得這則新聞值得寫，是因為它碰到創作者很真實的一面：你可能還沒成立團隊，卻早已一個人做著整個團隊的事。</p>
        <p>做音樂的人習慣整理音軌，收入和合約也可以用同樣的耐心整理。不用第一天就做出一份厚厚的商業計畫，先能回答：這首花了多少成本、這次合作交付什麼、對方可以用到什麼時候。</p>
        <p>把這些記清楚，談下一次合作時就少猜一點。副歌可以循環三十次，找不到的合約就別循環找三十次了。</p>
      </aside>
      <section className="music-news-actions" aria-labelledby="news-checklist"><p className="music-news-section-number">04 / 這週可以做的事</p><h2 id="news-checklist">先開一份創作帳本，整理這三件事</h2>
        <p>以下是 AIPOGER 的經營建議，不是 SBA 申請文件清單。用你習慣的試算表或資料夾就能開始。</p>
        <ul><li><strong>收入與成本：</strong>分開記錄平台收入、接案、授權及合作款項；工具訂閱、發行費、素材與後製支出，也留下收據或付款紀錄。</li>
          <li><strong>合作與交付：</strong>把報價、合約、發票或收據集中存放，註記交付版本、付款日期、使用範圍與期限。</li>
          <li><strong>作品與授權：</strong>替每首作品保存歌詞草稿、版本、合作分工與素材許可；使用 AI 工具時，也記下適用方案及相關取得紀錄。</li></ul>
        <p>不必等到收入變多才開始。先把最近一件作品整理好，下次就有格式可以沿用。</p>
        <p>換你說：你目前最想整理的是創作成本、合作報價，還是作品授權？<a className="music-news-source" href="#news-discussion">到下方聊聊 ↘</a></p>
      </section>
    </div>
  </div>;
}
