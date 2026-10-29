import { ListMusic, FileCheck2, Users } from "lucide-react";
import { musicNewsArticle } from "@/lib/music-news";

const sources = musicNewsArticle("prs-soundtrack-uk-play-data-royalties")!.sources;
function Source({ index, label }: { index: number; label: string }) {
  return <a className="music-news-source" href={sources[index].url} target="_blank" rel="noopener noreferrer">{label} ↗</a>;
}

export default function PrsSoundtrackArticle() {
  return <div className="music-news-article-body">
    <section className="music-news-essentials" aria-labelledby="news-essentials"><p className="music-news-kicker">30 秒先看懂</p><h2 id="news-essentials">播放紀錄更具體，版稅分配才多一份依據</h2>
      <ol><li><strong>約 7,000 個英國場所的逐次播放資料。</strong><span>據 10 月 28 日公開新聞稿及 MBW 報導，Soundtrack 將提供商店、酒吧與公共空間的音樂使用紀錄。</span></li>
        <li><strong>PRS 預計 2026 年 12 月起納入分配。</strong><span>對象是詞曲作者、作曲家與音樂出版商；這是擴充既有資料合作，不是首次使用播放紀錄，也不是保證每人增收。</span></li>
        <li><strong>曲目資料還要對上權利資料。</strong><span>PRS 的詞曲權利與 PPL 的錄音權利要分開看；本案沒有宣布 AI 音樂的新接納或版稅資格規則。</span></li></ol>
      <p className="music-news-source-line"><Source index={0} label="公開新聞稿重刊" /> · <Source index={1} label="MBW 同日報導" /> · <Source index={2} label="官方權利與分配說明" /></p>
    </section>
    <div className="music-news-prose">
      <p className="music-news-lead">一首歌進了店裡的播放清單，和它後來能不能對到正確的版稅紀錄，是兩件需要接起來的事。PRS 與 Soundtrack 這次合作值得看的，就在中間那段資料：到底播了什麼，能不能留下更直接的依據？</p>
      <section aria-labelledby="news-announcement"><p className="music-news-section-number">01 / 這次多了什麼</p><h2 id="news-announcement">擴大直接紀錄的覆蓋範圍，12 月起計畫採用</h2>
        <p>Record of the Day 於 2026 年 10 月 28 日刊登一份明標「Press release」的合作新聞稿，MBW 同日也有報導。依這些資料，Soundtrack 將向 PRS for Music 提供約 7,000 個英國場所的逐次播放紀錄，PRS 計畫從 2026 年 12 月起納入版稅分配。<Source index={0} label="新聞稿重刊" /> · <Source index={1} label="報導" /></p>
        <p>截至本站 10 月 29 日查核，未在 PRS 或 Soundtrack 官網找到這則合作公告，因此以公開新聞稿及媒體報導歸因；兩篇可能使用同一份資料，不能當成兩組獨立調查。以下權利分工與作品登記背景，另行回查官方說明。</p>
        <p>新聞稿交代，PRS 原本就與背景音樂供應商合作。新增 Soundtrack 資料，是讓更多場所具有直接使用紀錄，減少在缺乏紀錄時對類比資料的依賴；不能解讀為所有估算從此取消。改善準確性與分配速度是合作目標，這次資料沒有提供可獨立驗證的增收成效。</p>
      </section>
      <section aria-labelledby="news-data"><p className="music-news-section-number">02 / 從播歌到分配</p><h2 id="news-data">有紀錄，還要知道作品和權利人是誰</h2>
        <figure className="music-news-classification"><div className="music-news-classification-grid">
          <div><ListMusic size={30} aria-hidden="true" /><span>01 / 音樂使用</span><h3>場所播了什麼</h3><p>此次合作擴充 Soundtrack 英國場所的逐次播放資料。</p></div>
          <div><FileCheck2 size={30} aria-hidden="true" /><span>02 / 資料匹配</span><h3>對上作品與權利</h3><p>使用紀錄需要與權利組織持有的作品及錄音資料核對。</p></div>
          <div><Users size={30} aria-hidden="true" /><span>03 / 依規則分配</span><h3>找到對應的受領者</h3><p>PRS 與 PPL 代表的權利不同，不能只憑「這首歌是我的」判斷。</p></div>
        </div><figcaption>圖解／AIPOGER 自製的使用資料與權利匹配概念圖，非平台介面或實際入帳紀錄。合作範圍依新聞稿；分配背景依官方說明。<Source index={0} label="合作資料" /> · <Source index={2} label="分配背景" /></figcaption></figure>
        <p>PPL PRS 的官方說明指出，兩個組織各自持有作品或錄音資料庫；取得逐曲使用資訊時，還會與所持資料核對。無法取得逐曲資訊的情況，則仍會使用其他方法。播放資料變多，改善的是分配依據的一環，不會自動替缺漏或衝突的權利資料補答案。<Source index={2} label="官方資料流程" /></p>
      </section>
      <section aria-labelledby="news-rights"><p className="music-news-section-number">03 / PRS 與 PPL 別混在一起</p><h2 id="news-rights">同一段聲音，背後可能有不同權利角色</h2>
        <p><strong>PRS for Music 代表詞曲作者、作曲家與音樂出版商，處理作品與歌詞的權利；PPL 則代表錄音的表演者與錄音權利人。</strong>PRS 官網也說明，PPL 與 PRS 成立合資公司 PPL PRS，提供商業場所使用的聯合授權 TheMusicLicence。對店家是聯合入口，背後的權利分工仍存在。<Source index={2} label="PPL PRS 說明" /> · <Source index={3} label="PRS 官網介紹 PPL" /></p>
        <p>所以，不能把這則 PRS 消息寫成所有 DJ、歌手或母帶持有人都會直接收到同一筆收入。某人可能同時擔任多個角色，但還是要看他持有或代表哪些權利，以及適用的登記與分配條件。本案也沒有公布固定「每播放一次多少錢」的新費率。</p>
      </section>
      <aside className="music-news-opinion" aria-labelledby="news-opinion"><p className="music-news-kicker">愛波哥怎麼看 / OUR TAKE</p><h2 id="news-opinion">作品被聽見，也要留得下能對上的資料</h2>
        <p>我們關心的不只是哪家店選了哪首歌，還有使用紀錄能不能接回作品與合作分工。發行完成之後，作品名、別名、作者與權利資料如果各說各話，後續核對就更費力。這是本站對資料管理的觀察，不是這次合作額外新增的申報規則。</p>
        <p>也把範圍守清楚：這不是全英國 DJ set 的自動辨識方案，不涵蓋所有現場演出，不能推論台灣店家或創作者已自動納入。對 AI 音樂創作者而言，它值得追蹤的是商業空間的使用資料；沒有宣布新的 AI 接納、著作權或版稅資格，不能拿來當「AI 歌曲現在都能領錢」的依據。</p>
      </aside>
      <section className="music-news-actions" aria-labelledby="news-checklist"><p className="music-news-section-number">04 / 從自己的作品資料做起</p><h2 id="news-checklist">先確認誰登記、哪些資料要一致</h2>
        <p>以 PRS 的官方登記情境為例，基本資料包括作品名、別名與時長；共同創作還要備妥約定分配與共同作者的 CAE／IPI 識別號。有出版商時，先確認是否已代為登記，避免重複。這是 PRS 的情境例子，不表示所有讀者都該加入 PRS 或照同一流程辦理。<Source index={4} label="PRS 官方作品登記說明" /></p>
        <ul><li><strong>核對作品資料：</strong>把對外名稱、別名與合作分工整理成可核對的一份紀錄。</li>
          <li><strong>確認登記窗口：</strong>已有出版商或權利管理組織，就先問清楚由誰處理，以及如何更正。</li>
          <li><strong>區分曝光與收入：</strong>進入商業播放場景，不等於已完成權利匹配，更不保證特定收入。</li></ul>
        <p>以上為 AIPOGER 的資料整理建議。換你說：作品發行後，你會追蹤它在哪些場景被播放，還是最常卡在作者與版本資料的核對？<a className="music-news-source" href="#news-discussion">到下方聊聊 ↘</a></p>
      </section>
    </div>
  </div>;
}
