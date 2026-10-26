import { BookOpen, FileCheck2, Scale } from "lucide-react";
import { musicNewsArticle } from "@/lib/music-news";

const sources = musicNewsArticle("suno-reservoir-lawsuit-commercial-rights")!.sources;
function Source({ index, label }: { index: number; label: string }) {
  return <a className="music-news-source" href={sources[index].url} target="_blank" rel="noopener noreferrer">{label} ↗</a>;
}
export default function SunoCommercialRightsArticle() {
  return <div className="music-news-article-body">
    <section className="music-news-essentials" aria-labelledby="news-essentials"><p className="music-news-kicker">30 秒先看懂</p><h2 id="news-essentials">平台被告、歌曲商用、著作權，分開看</h2>
      <ol><li><strong>新訴訟針對平台訓練等行為。</strong><span>Reservoir 於 10 月 21 日起訴 Suno。起訴內容是原告指控，不是法院判決。</span></li>
        <li><strong>商用許可要看適用條款。</strong><span>現行規則還涉及付費方案與合規下載，不能只看「我有訂閱」。</span></li>
        <li><strong>商用許可不等於完整著作權。</strong><span>作品的人類創作部分、第三方素材與發行平台要求，仍需各別確認。</span></li></ol>
      <p className="music-news-source-line"><Source index={0} label="起訴狀" /> · <Source index={2} label="Suno 條款" /> · <Source index={4} label="美國著作權局" /></p>
    </section>
    <div className="music-news-prose">
      <p className="music-news-lead">歌才剛做好，新聞又跳出「Suno 被告」。你可能第一個念頭是：等一下，那我這首還能發嗎？先把問題拆開，才知道自己該查哪一份資料。</p>
      <section aria-labelledby="news-lawsuit"><p className="music-news-section-number">01 / 這次發生什麼事</p><h2 id="news-lawsuit">Reservoir 提告，爭議涉及 1,050 首音樂著作</h2>
        <p>公開案件登錄顯示，Reservoir 及相關公司在 2026 年 10 月 21 日，於美國加州北區聯邦法院對 Suno 提起訴訟，案號為 26-cv-12305。<Source index={1} label="案件登錄" /></p>
        <p>起訴狀列出 1,050 首音樂著作，指控 Suno 未經許可複製、使用相關內容訓練模型，並提出其他相關侵權主張。這裡說的是詞曲等音樂著作，不能直接寫成「1,050 首用戶生成的歌曲被判侵權」。<Source index={0} label="起訴狀第 1–3 頁" /></p>
        <p>本文報導的是這份新起訴及其指控，不把原告的說法當成法院認定，也不據此替任何使用者的作品下結論。</p>
      </section>
      <section aria-labelledby="news-rights-layers"><p className="music-news-section-number">02 / 一張圖拆清楚</p><h2 id="news-rights-layers">同樣叫「權利」，其實在回答不同問題</h2>
        <figure className="music-news-classification"><div className="music-news-classification-grid">
          <div><Scale size={30} aria-hidden="true" /><span>01 / 平台與權利人</span><h3>訓練爭議</h3><p>模型用了什麼？有沒有取得許可？這是本次訴訟的一個核心。</p></div>
          <div><FileCheck2 size={30} aria-hidden="true" /><span>02 / 你與平台</span><h3>商用許可</h3><p>你適用哪版條款？哪個方案、哪種取得方式允許商用？</p></div>
          <div><BookOpen size={30} aria-hidden="true" /><span>03 / 你的作品</span><h3>著作權保護</h3><p>哪些部分是人的創作？有哪些第三方素材？適用哪裡的規定？</p></div>
        </div><figcaption>圖解／AIPOGER 整理的判讀層次。三者可能互相影響，不能拿其中一項替另外兩項作保。</figcaption></figure>
        <p>所以，「平台遭到起訴」不能直接推成「每個使用者都侵權」；反過來，「平台給我商用許可」也不能推成「任何歌詞、取樣、聲音都已經替我清好權利」。</p>
      </section>
      <section aria-labelledby="news-suno-terms"><p className="music-news-section-number">03 / 商用之前看哪裡</p><h2 id="news-suno-terms">別只翻出訂閱收據，還要核對取得方式</h2>
        <p>Suno 的 2026 年 9 月 3 日生效條款，將允許的商用與方案額度內、經官方認可管道取得的下載連結在一起。9 月更新的付費方案說明也以訂閱期間下載的歌曲說明商用權；不是作品放在資料庫裡，就一律可以拿去營利。<Source index={2} label="現行條款" /><Source index={3} label="付費方案說明" /></p>
        <p>條款並說明，已取得的合規下載，其商用權不會因後續取消訂閱而消失；但 Remix 另有限制，不能把一般歌曲的許可直接套過去。較早的作品或特殊方案，應核對當時適用版本與官方確認，不用一句「後來有付費」概括全部。<Source index={2} label="商用與 Remix 條款" /></p>
      </section>
      <section aria-labelledby="news-human-creation"><p className="music-news-section-number">04 / 能使用，和能保護</p><h2 id="news-human-creation">平台許可你發歌，與法律保護哪些部分，是兩件事</h2>
        <p>美國著作權局在 2025 年的報告中強調，人類對表達的創作貢獻是判斷重點；單靠提示詞，不代表對生成內容取得著作權。人寫的歌詞、對素材的創作性編排或修改，則可能需要各別分析。這是美國的說明，不能直接當成每個地區的共同結論。<Source index={4} label="官方報告公告" /></p>
        <p>Suno 自己的付費方案說明，也提醒商用許可並不保證著作權保護。對創作者來說，把自己寫了什麼、改了什麼、用了誰的素材記清楚，會比只留一張完成畫面更有用。<Source index={3} label="Suno 說明" /></p>
      </section>
      <aside className="music-news-opinion" aria-labelledby="news-opinion"><p className="music-news-kicker">愛波哥怎麼看 / OUR TAKE</p><h2 id="news-opinion">別讓一個大標題，替你做完所有判斷</h2>
        <p>我的看法是，創作者需要的是能查的資料。新聞一出就急著刪歌，或只說「我有付錢所以沒事」，都還沒回答作品本身的問題。</p>
        <p>真的要整理，我會先開一個作品資料夾：歌詞草稿、改編過程、授權紀錄、方案與下載日期，放在同一處。副歌可以讓人上頭，檔案管理就讓它清醒一點。</p>
        <p>訓練授權是否妥當，值得持續追；但我們也希望每個認真做歌的人，能說得清楚自己的創作與使用依據。這不是訂閱收據一張紙就能回答完的事。</p>
      </aside>
      <section className="music-news-actions" aria-labelledby="news-checklist"><h2 id="news-checklist">發行前，先把這三份資料存好</h2><ul>
        <li>適用條款、方案與作品取得紀錄，包含生成、下載及後製日期。</li>
        <li>自己與合作夥伴的創作分工，以及歌詞、取樣、人聲等素材來源與許可。</li>
        <li>發行商與上架平台的 AI 申報、署名及接收條件；不清楚的部分先向對方確認。</li>
      </ul><p>換你說：你發行 AI 作品時，最難確認的是平台授權、素材來源，還是發行商規則？<a className="music-news-source" href="#news-discussion">到下方聊聊 ↘</a></p></section>
    </div>
  </div>;
}
