import { CircleCheck, Handshake, Music2, Radio } from "lucide-react";
import { musicNewsArticle } from "@/lib/music-news";

const sources = musicNewsArticle("spotify-believe-licensed-ai-remixes")!.sources;
function Source() {
  return <a className="music-news-source" href={sources[0].url} target="_blank" rel="noopener noreferrer">官方公告 ↗</a>;
}
export default function SpotifyBelieveRemixesArticle() {
  return <div className="music-news-article-body">
    <section className="music-news-essentials" aria-labelledby="news-essentials"><p className="music-news-kicker">30 秒先看懂</p><h2 id="news-essentials">有授權的 AI 改編，重點在怎麼參與</h2>
      <ol><li><strong>合作已宣布，工具仍待推出。</strong><span>它針對既有歌曲的 AI 翻唱、混音，不是所有人現在都能開用的文字生歌工具。</span></li>
        <li><strong>創作者需要分兩階段選擇。</strong><span>先表達願意被考慮，再決定是否接受 Spotify 的具體合作機會。</span></li>
        <li><strong>公告承諾原作參與者可獲收益。</strong><span>詳細分帳比例與更多控制條件仍待公開，不能先替大家算好收入。</span></li></ol>
      <p className="music-news-source-line"><Source /></p>
    </section>
    <div className="music-news-prose">
      <p className="music-news-lead">歌迷聽完你的歌，想再做一個自己的版本。如果能先問過你、把名字標清楚，也讓原作拿到收益，這件事就有得聊。先別急著按同意，分帳那一頁也要一起看。</p>
      <section aria-labelledby="news-agreement"><p className="music-news-section-number">01 / 這次宣布什麼</p><h2 id="news-agreement">Spotify 與 Believe 合作，讓授權改編有新入口</h2>
        <p>2026 年 10 月 20 日，雙方宣布合作，讓選擇參與的 Believe、TuneCore 藝人及廠牌，有機會加入 Spotify 即將推出的 AI 翻唱、混音體驗。<Source /></p>
        <p>官方描述的是對既有授權歌曲進行改編，預計作為 Premium 的付費加購功能。公告沒有提供確切售價、上線日或台灣開放時程；看到合作新聞，還不能直接當成今天就能使用的功能。<Source /></p>
      </section>
      <section aria-labelledby="news-consent"><p className="music-news-section-number">02 / 誰說了算</p><h2 id="news-consent">有 TuneCore 帳號，不代表所有作品自動加入</h2>
        <figure className="music-news-flow"><div><Handshake size={28} aria-hidden="true" /><h3>第一步：表達意願</h3><p>創作者先選擇，願意被考慮加入 AI 計畫。</p></div><div><CircleCheck size={28} aria-hidden="true" /><h3>第二步：再選具體機會</h3><p>收到 Spotify 合作機會後，仍可接受或拒絕。</p></div><figcaption>圖解／AIPOGER 依雙方公告整理的同意流程，非實際操作介面。<Source /></figcaption></figure>
        <p>對創作者來說，我們會特別看第二步的資料：究竟開放哪些作品、允許做哪些改編、有哪些署名與管理方式。這些需要具體條件，不能只靠新聞稿裡的方向就替自己的整個曲庫做決定。</p>
      </section>
      <section aria-labelledby="news-royalties"><p className="music-news-section-number">03 / 收益與曝光</p><h2 id="news-royalties">誰會拿到錢？先看公告有說到哪裡</h2>
        <p>公告表示，改編作品的播放會為參與的原作藝人及權利人產生權利金，並連回原曲及藝人。這提供了一條回到原創者的路，但連結不等於保證多幾萬次播放。<Source /></p>
        <figure className="music-news-flow"><div><Music2 size={28} aria-hidden="true" /><h3>原作授權 → 歌迷改編</h3><p>使用範圍須依具體參與條件確認。</p></div><div><Radio size={28} aria-hidden="true" /><h3>改編播放 → 連回原曲</h3><p>官方宣布原作參與者可獲權利金；實際分帳細節待公開。</p></div><figcaption>圖解／AIPOGER 整理合作方向，非收入預測或分潤公式。</figcaption></figure>
        <p>目前也不能把它解讀成「做改編的歌迷一定有分潤」。完整比例、結算方式、具體管理與退出條件，仍是後續應向發行商確認的項目；本次公告沒有把這些答案交代完整。</p>
      </section>
      <aside className="music-news-opinion" aria-labelledby="news-opinion"><p className="music-news-kicker">愛波哥怎麼看 / OUR TAKE</p><h2 id="news-opinion">讓歌被更多人玩，也要讓作者有得選</h2>
        <p>我覺得這個方向值得觀察。有人願意拿你的歌來改編，可能是他真的喜歡，甚至會帶另一群人回來認識原作。這是機會，還不是已經兌現的成績單。</p>
        <p>對獨立創作者，我最在意的是三件事：同意之前能不能看懂條件、聽眾找不找得到你、收益怎麼算。不要最後歌到處都聽得到，作者還在留言區自我介紹：「不好意思，這首原本是我的。」</p>
        <p>平台若能把同意、署名與分帳做清楚，改編就有機會成為新的創作交流。我們會繼續追正式工具與條件，等資訊完整，再評估值不值得加入。</p>
      </aside>
      <section className="music-news-actions" aria-labelledby="news-checklist"><h2 id="news-checklist">收到參與邀請時，先問這三題</h2><ul>
        <li>我能選哪些作品加入嗎？共同創作者與其他權利人的同意如何處理？</li>
        <li>我能知道哪些改編用了我的作品嗎？有哪些管理、申訴或退出方式？</li>
        <li>署名與原曲連結怎麼呈現？權利金如何計算、分配與查帳？</li>
      </ul><p>換你說：如果能選擇授權自己的歌給歌迷改編，你願意嗎？最在意署名、控制，還是收益？<a className="music-news-source" href="#news-discussion">到下方聊聊 ↘</a></p></section>
    </div>
  </div>;
}
