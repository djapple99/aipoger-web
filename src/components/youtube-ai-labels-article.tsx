import { AudioLines, Mic2, SlidersHorizontal, Upload, FileCheck2 } from "lucide-react";
import { musicNewsSources } from "@/lib/music-news";

function Source({ index }: { index: number }) {
  return <a className="music-news-source" href={musicNewsSources[index].url} target="_blank" rel="noopener noreferrer">{index === 0 ? "官方公告" : "官方說明"} ↗</a>;
}
export default function YouTubeAiLabelsArticle() {
  return <div className="music-news-article-body">
    <section className="music-news-essentials" aria-labelledby="news-essentials"><p className="music-news-kicker">30 秒先看懂</p><h2 id="news-essentials">有在用 Suno，先記住這三件事</h2>
      <ol><li><strong>播放器開始出現 AI 音樂標示。</strong><span>YouTube Music 已宣布逐步推出，之後也會擴展到主 YouTube App。</span></li>
        <li><strong>製作方式要說清楚。</strong><span>整首生成、部分使用 AI 與一般修音，在官方指南裡有不同分類。</span></li>
        <li><strong>揭露本身不會取消影片營利資格。</strong><span>作品仍須符合其他平台規定；這也不是播放量或音樂分潤的保證。</span></li></ol>
      <p className="music-news-source-line"><Source index={0} /> · <Source index={1} /> · <Source index={2} /></p>
    </section>
    <div className="music-news-prose">
      <p className="music-news-lead">歌做好了，封面也好了，正準備按下上傳。現在，還有一件事值得多看一眼：這首歌的 AI，到底用在哪裡？</p>
      <p>YouTube 在 2026 年 10 月 14 日宣布，YouTube Music 開始替主要由生成式 AI 製作的歌曲加入標示。聽眾能從播放器上的提示了解製作資訊。平台會結合音樂合作夥伴提供的資料與自己的偵測工具，辨識相關內容。<Source index={0} /></p>
      <section aria-labelledby="news-production"><p className="music-news-section-number">01 / 製作方式</p><h2 id="news-production">先分清楚：整首生成，還是局部使用？</h2>
        <p>別看到「AI」兩個字，就急著把 Auto-Tune 也卸載了。YouTube 給音樂合作夥伴的指南，將製作資訊分成以下三類：</p>
        <figure className="music-news-classification"><div className="music-news-classification-grid">
          <div><AudioLines size={30} aria-hidden="true" /><span>01 / Fully Gen AI</span><h3>整首生成</h3><p>模型生成作曲、演奏與人聲。</p></div>
          <div><Mic2 size={30} aria-hidden="true" /><span>02 / Partly Gen AI</span><h3>局部參與</h3><p>例如 AI 配器，搭配自己錄的人聲。</p></div>
          <div><SlidersHorizontal size={30} aria-hidden="true" /><span>03 / No Gen AI</span><h3>一般修音</h3><p>例如標準音準修正、自動母帶處理。</p></div>
        </div><figcaption>圖解／AIPOGER 依官方範例整理。這是申報分類，不表示每類都會出現相同播放器標示。<Source index={1} /></figcaption></figure>
        <p>自己的歌詞、生成的伴奏、重新錄製的人聲，可能出現在同一件作品裡。申報時應依實際製作過程與官方定義判斷，不能只看「有沒有開過 AI 工具」。</p>
      </section>
      <section aria-labelledby="news-earnings"><p className="music-news-section-number">02 / 觸及與營利</p><h2 id="news-earnings">標示 AI，本身不會取消影片營利資格</h2>
        <p>YouTube 的一般影片揭露規則明確說明：揭露 AI 使用本身，不會限制影片的觀眾觸及，也不影響營利資格。作品仍須符合其他適用規定。<Source index={2} /></p>
        <p>這項說明與每首歌曲實際得到多少推薦、分到多少收益，是不同問題。這次 YouTube Music 公告並未完整交代音樂分潤的影響，不能直接推論「有標示就限流」，也不能保證「填完一定照常賺」。</p>
      </section>
      <section aria-labelledby="news-upload"><p className="music-news-section-number">03 / 上架前</p><h2 id="news-upload">自己上傳，或交給發行商，都要確認資訊</h2>
        <p>自己上傳 MV，可在 YouTube Studio 的上傳流程依實際情況填寫 AI 使用揭露；透過發行商交付歌曲，則要確認對方如何提交相關製作資訊。真人錄音搭配 AI 生成的 MV 畫面，也在官方指南的申報範例中。<Source index={1} /></p>
        <figure className="music-news-flow"><div><Upload size={26} aria-hidden="true" /><h3>自己上傳 MV</h3><p>YouTube Studio → AI 使用揭露</p></div><div><FileCheck2 size={26} aria-hidden="true" /><h3>透過發行商發歌</h3><p>確認發行商的 AI 資訊申報方式</p></div><figcaption>上架途徑示意，非實際操作介面。兩種途徑依各自流程填寫。</figcaption></figure>
        <p>平台也可能自行加上標示。依一般影片規則，若收到自動標示通知且認為判定有誤，可查看 Studio 提供的更正方式；部分來源的標示無法自行調整。<Source index={2} /></p>
      </section>
      <aside className="music-news-opinion" aria-labelledby="news-opinion"><p className="music-news-kicker">愛波哥怎麼看 / OUR TAKE</p><h2 id="news-opinion">把 AI 用在哪裡講清楚，也把自己的功夫留下來</h2>
        <p>我的看法是，製作資訊可以交代得更清楚。你花時間寫詞、挑版本、剪段落、重做編曲，這些選擇也值得讓人知道。</p>
        <p>同樣用 Suno，有人一口氣生成，有人為了副歌的一句轉音，改到晚餐都涼了。作品介紹裡補上製作過程，聽眾才有機會理解，你在這首歌裡做了哪些決定。</p>
        <p>我們建議簡單交代歌詞、音樂生成、後製與 MV 視覺各由誰完成。使用公開的創作者署名就好，照實寫，兩三句也可以。</p>
        <blockquote><p>歌詞由本人創作，使用 Suno 生成音樂與人聲，再自行完成段落剪輯及混音；MV 使用 AI 影像製作。</p><cite>製作說明範例，請依自己的實際流程調整</cite></blockquote>
        <p>這段文字不能取代平台要求的申報，但能成為作品履歷的一部分。對 AIPOGER 而言，我們希望聽眾有資訊可以判斷，也希望創作者的想法、取捨和完成作品的能力，都有機會被聽見。</p>
      </aside>
      <div className="music-news-actions"><h2>這次上架，先做兩件事</h2><ul><li>確認歌曲與 MV 各用了哪些 AI 製作環節，依平台或發行商要求填寫。</li><li>在作品介紹加上簡短製作說明，並保留自己的歌詞、剪輯與後製紀錄。</li></ul></div>
    </div>
  </div>;
}
