import { MessagesSquare, ShoppingCart, Workflow } from "lucide-react";
import { musicNewsArticle } from "@/lib/music-news";

const sources = musicNewsArticle("easol-teammates-festival-ai-agents")!.sources;
function Source({ index, label }: { index: number; label: string }) {
  return <a className="music-news-source" href={sources[index].url} target="_blank" rel="noopener noreferrer">{label} ↗</a>;
}

export default function EasolTeammatesArticle() {
  return <div className="music-news-article-body">
    <section className="music-news-essentials" aria-labelledby="news-essentials"><p className="music-news-kicker">30 秒先看懂</p><h2 id="news-essentials">這次 AI 走進音樂節後台，處理的是營運</h2>
      <ol><li><strong>Easol 在 10 月 28 日宣布推出 Teammates。</strong><span>這組 AI 代理面向音樂節等體驗活動業者，使用 Easol 平台內的業務資料，支援客服、銷售與營運工作。</span></li>
        <li><strong>從回答問題，往執行工作前進。</strong><span>官方產品頁列出 Easol Agent、Sales Agent 與 Support Agent，涵蓋訂單處理、未完成購物追蹤、加購與舊客再接觸。</span></li>
        <li><strong>創作者先找自己的工作瓶頸。</strong><span>這是經營工具，不是生歌工具或新的音樂授權政策。是否需要採用，要看你有沒有相應的活動與訂單量；這是 AIPOGER 的建議。</span></li></ol>
      <p className="music-news-source-line"><Source index={0} label="Easol 發布的公告" /> · <Source index={1} label="Teammates 官方產品頁" /></p>
    </section>
    <div className="music-news-prose">
      <p className="music-news-lead">做音樂的人，工作清單很少只有「把歌做好」。一旦開始辦演出、開工作坊或經營售票活動，訂單、詢問與活動前的確認，也會一起進來。Easol 這次帶來的 AI 題目，就在這些幕後工作。</p>
      <section aria-labelledby="news-launch"><p className="music-news-section-number">01 / 發生了什麼事</p><h2 id="news-launch">把活動資料與執行工具放在同一套系統</h2>
        <p>Easol 於 2026 年 10 月 28 日美東時間 11:00，透過 PR Newswire 發布公司公告，宣布推出 Teammates。公告將它定位為在 Easol 平台內運作的 AI 代理，連結預訂、付款、行銷、客服與顧客資料，服務音樂節及其他體驗活動業者。<Source index={0} label="公司公告" /></p>
        <p>重點是它可以接觸業務脈絡並採取行動，而不只替團隊寫一段回覆。這也表示，要理解它的用途，得連同原本的訂單與營運系統一起看。本文依官方公開說明整理，本站未實測 Teammates；產品頁沒有另列獨立發布日期，本篇查核日為 10 月 29 日。</p>
      </section>
      <section aria-labelledby="news-agents"><p className="music-news-section-number">02 / 三種 AI 隊友怎麼分工</p><h2 id="news-agents">客服、銷售與跨流程工作，各有入口</h2>
        <figure className="music-news-classification"><div className="music-news-classification-grid">
          <div><Workflow size={30} aria-hidden="true" /><span>01 / Easol Agent</span><h3>跨流程的營運工作</h3><p>依平台內的預訂、付款等資料查找問題與機會，協助整理名單、處理訂單或更新網站內容。</p></div>
          <div><ShoppingCart size={30} aria-hidden="true" /><span>02 / Sales Agent</span><h3>跟進還沒完成的交易</h3><p>追蹤未完成購物、提出加購或交叉銷售，並重新接觸過去的顧客。</p></div>
          <div><MessagesSquare size={30} aria-hidden="true" /><span>03 / Support Agent</span><h3>把詢問接回訂單</h3><p>運用顧客與過往互動資料處理客服；官方列出的動作包含修改預訂與補寄票券。</p></div>
        </div><figcaption>圖解／AIPOGER 依官方產品說明自製的分工示意，非 Easol 實際介面。<Source index={2} label="Easol Agent" /> · <Source index={3} label="Sales Agent" /> · <Source index={4} label="Support Agent" /></figcaption></figure>
        <p>用一個簡化情境理解：有人選好活動方案卻沒結帳，有人已下單但還缺資料，也有人只是找不到票。這些問題看起來都像「有客人需要回覆」，背後要查的紀錄、可以執行的動作卻不同。以上是本站協助理解的情境，不是實測案例或成效保證。</p>
        <p>官方 Sales Agent 頁面提到，團隊可設定價格、訂金與折扣下限，也可選擇逐則核准訊息或採不同程度的自動化。Support Agent 頁面同樣列出自行處理與先交由人員核准的方式。具體部署時能開哪些權限，仍應向廠商核對。<Source index={3} label="銷售代理說明" /> · <Source index={4} label="客服代理說明" /></p>
      </section>
      <section aria-labelledby="news-creator-tools"><p className="music-news-section-number">03 / 跟 AI 音樂創作者有什麼關係</p><h2 id="news-creator-tools">先問卡在哪個流程，再問要用哪個 AI</h2>
        <p>從 AIPOGER 的角度看，這則消息值得注意的，是音樂產業的 AI 應用也在處理「作品之外的事」。生成旋律、調整聲音，解決創作流程；查訂單、追蹤詢問，解決經營流程。兩者可以出現在同一份事業裡，評估方法卻不同。</p>
        <p>如果你目前只是發歌、累積作品與聽眾，不用因為又有新 AI 上市，就替自己多開一張工具帳單。若你已經辦有固定售票量的演出、課程或活動，可以先觀察：團隊最常重做哪件事？資料散在哪裡？漏掉一次會造成什麼麻煩？有了答案，才比較能判斷工具是否合用。這是本站的流程建議，並非 Easol 的購買條件。</p>
      </section>
      <aside className="music-news-opinion" aria-labelledby="news-opinion"><p className="music-news-kicker">愛波哥怎麼看 / OUR TAKE</p><h2 id="news-opinion">讓 AI 接工作，先把交棒規則寫清楚</h2>
        <p>我們會先看「哪一步可以交出去」，再看「能省多少時間」。回覆活動地點、補齊名單，和更改訂單、提供折扣，承擔的責任不同。AI 能採取行動，團隊就更需要先說清楚它能做到哪裡、什麼情況要找人。</p>
        <p>營運判斷仍需有人負責，這是 AIPOGER 的編輯建議，不是我們替廠商保證的服務條款。客服回得快很好，答應出去的事也得有人接得住。工具有沒有幫上忙，最後要回到真實活動與顧客的經驗。</p>
      </aside>
      <section className="music-news-actions" aria-labelledby="news-checklist"><p className="music-news-section-number">04 / 現在可以做的三件事</p><h2 id="news-checklist">先盤點，再決定要不要多一位 AI 隊友</h2>
        <p>以下為 AIPOGER 給活動經營者的準備建議，不是廠商新增的文件要求。</p>
        <ul><li><strong>記下最常重複的工作：</strong>整理一週內的詢問類型、訂單例外與跟進步驟，先找最花時間、規則又相對清楚的一項。</li>
          <li><strong>畫出可以交棒的界線：</strong>哪些內容可直接回覆，哪些涉及價格、退款或額外承諾，需要指定人員決定；不要只寫一句「幫我顧好客人」。</li>
          <li><strong>評估資料、成本與接手方式：</strong>向廠商確認所需平台、資料存取範圍、計費與人工接手流程，再用真實工作量比較投入與幫助。</li></ul>
        <p>換你說：如果有一位 AI 隊友，你最想先交給它的，是整理資料、回答重複問題，還是跟進訂單？<a className="music-news-source" href="#news-discussion">到下方聊聊 ↘</a></p>
      </section>
    </div>
  </div>;
}
