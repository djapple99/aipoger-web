import { ClipboardList, ShieldCheck, Send } from "lucide-react";
import { musicNewsArticle } from "@/lib/music-news";

const sources = musicNewsArticle("easol-teammates-festival-ai-agents")!.sources;
function Source({ index, label }: { index: number; label: string }) {
  return <a className="music-news-source" href={sources[index].url} target="_blank" rel="noopener noreferrer">{label} ↗</a>;
}

export default function EasolTeammatesArticle() {
  return <div className="music-news-article-body">
    <section className="music-news-essentials" aria-labelledby="news-essentials"><p className="music-news-kicker">30 秒先看懂</p><h2 id="news-essentials">音樂節後台多了 AI，批准權還在主辦團隊</h2>
      <ol><li><strong>Easol 10 月 28 日宣布推出 Teammates。</strong><span>它把 AI 代理放進活動的預訂、客服與銷售流程；重點是營運工作，不是生成音樂。</span></li>
        <li><strong>客服 AI 提案，人員核准後執行。</strong><span>官方操作文件明確要求寄信與訂單動作經人工批准，不能把行銷頁的自動化描述直接當成可無人值守。</span></li>
        <li><strong>先核對總成本與台灣落地條件。</strong><span>平台月租、平台費、支付費與 AI 案件費要分開看；公開文件也不足以保證繁中結帳、新台幣或本地票務串接。</span></li></ol>
      <p className="music-news-source-line"><Source index={0} label="公司公告" /> · <Source index={7} label="客服操作文件" /> · <Source index={9} label="平台價格" /></p>
    </section>
    <div className="music-news-prose">
      <p className="music-news-lead">主辦音樂節的人，最懂開演前的後台長什麼樣：有人找不到票、有人想加一位朋友、有人問套票能不能換名字。這些詢問常跟現場準備一起湧進來。Easol 想用 AI 分擔的，就是這批有訂單、有規則，也有例外的工作。</p>
      <section aria-labelledby="news-launch"><p className="music-news-section-number">01 / 工具放在哪裡</p><h2 id="news-launch">使用活動資料，協助處理營運</h2>
        <p>Easol 於 2026 年 10 月 28 日美東時間 11:00，透過 PR Newswire 發布公司公告，宣布推出 Teammates。它在 Easol 既有平台內使用預訂、付款、行銷與顧客資料，面向音樂節等體驗活動業者。<Source index={0} label="公司公告" /></p>
        <p>官方將代理分成 Easol Agent、Sales Agent 與 Support Agent。這篇從主辦方的工作流程拆開看；本站未實測 Teammates、未註冊或聯絡廠商。產品與操作頁未另列相同的發布日期，以下均以 10 月 29 日讀到的公開內容為準。</p>
      </section>
      <section aria-labelledby="news-support"><p className="music-news-section-number">02 / 一封客服信怎麼走</p><h2 id="news-support">AI 查資料、擬稿；人員決定要不要送出</h2>
        <figure className="music-news-classification"><div className="music-news-classification-grid">
          <div><ClipboardList size={30} aria-hidden="true" /><span>01 / AI 提案</span><h3>讀信與核對訂單</h3><p>依來信、對話、關聯預訂與營運手冊，提出回覆草稿及建議動作。</p></div>
          <div><ShieldCheck size={30} aria-hidden="true" /><span>02 / 人員核准</span><h3>檢查內容與權限</h3><p>團隊可編輯草稿；改單、取消或退款的提案，須批准或拒絕。</p></div>
          <div><Send size={30} aria-hidden="true" /><span>03 / 執行與回覆</span><h3>核准後才往下做</h3><p>訂單動作獲准才執行，回覆仍由團隊審閱送出，不是自動寄信。</p></div>
        </div><figcaption>圖解／AIPOGER 依 Support Agent 操作文件自製，非產品介面或本站實測。<Source index={7} label="流程依據" /></figcaption></figure>
        <p>開始使用前，文件要求 Gmail 或 Outlook／Microsoft 365 信箱，以及有管理收件匣權限的公司 owner。連結後會匯入過去 12 個月郵件，配合網站、產品及規則建立知識與 Playbooks；主辦方可以檢視、修改手冊，並選擇哪些隊員能讀寫該信箱。這不是只丟一份常見問題就結束，還牽涉既有顧客通訊與團隊存取權。<Source index={7} label="設定與資料範圍" /></p>
        <p><strong>這裡有個必須看清楚的差異：</strong>行銷頁描述不同程度的自動化選擇，但操作文件明寫不會自動寄送，改單、取消與退款也不會在未批准下完成。我們採較保守、可核對的操作流程，不自行判定哪一頁過時，也不保證全自動模式已可用。<Source index={4} label="行銷頁" /> · <Source index={7} label="操作文件" /></p>
        <p>官方 Boots in the Park 案例提供了主辦方情境：跨五個城市的音樂節，客服要應對改名、加票、重寄票、轉讓與退款；案例也寫明團隊先批准每次變更，再由代理執行。這是 Easol 發布的客戶案例，並非本站訪談或獨立成效調查；本文不引用其中效率百分比。<Source index={8} label="官方音樂節案例" /></p>
      </section>
      <section aria-labelledby="news-sales"><p className="music-news-section-number">03 / 套票與加購怎麼接</p><h2 id="news-sales">同一份預訂資料，才能接得上後續工作</h2>
        <p>依官方說明，Easol Agent 可找出資料未填齊、尚未訂接駁等顧客與營運機會；Sales Agent 則處理未完成購物跟進、團體詢問、既有預訂加購與舊客再接觸。Sales 頁面列出價格、訂金與折扣底線，也可選擇訊息批准程度。這些是廠商的功能描述，不代表每次跟進都會成交。<Source index={2} label="營運代理" /> · <Source index={3} label="銷售代理" /></p>
        <p>主辦方可以用「門票、住宿、接駁是否在同一筆資料裡」理解這套設計。套票越複雜，回覆前越需要核對庫存、付款與顧客已買的內容。但平台內共用資料，不能直接推論能同步任何台灣票務商；掃票工具及現場人工營運服務，也不該通通算成 AI 能力。</p>
      </section>
      <section aria-labelledby="news-cost"><p className="music-news-section-number">04 / 費用要拆開算</p><h2 id="news-cost">平台起價，不是完整的 AI 報價</h2>
        <p>截至 10 月 29 日，官方 Pricing 頁的 Stride 方案標示月租 <strong>$250 起</strong>、按營收計的 Easol 平台費 <strong>2% 起</strong>，另有支付處理費；Pro 為客製報價。這是頁面所列的平台起價，不能把 2% 當成總費率，也不能自行認定起價已包含全部 Teammates 費用。實際幣別、稅額、費基與 AI 方案要拿完整報價核對。<Source index={9} label="官方平台價格" /></p>
        <p>客服 AI 另有 Agent Resolved 計費文件：只有符合「由代理完整處理」定義的案件才計費，按週結算；首次解決後有七天確認期，重開案件會影響最終分類，頁面未公開每件單價。這個帳務名稱不代表沒有人工批准；若團隊實質重寫回覆或自行做訂單動作，也會影響分類。<Source index={10} label="案件定義與計費" /></p>
        <p>本站建議把月租、平台交易費、支付費、AI 案件費，再加上資料遷移與人員核稿時間，一起放進預算。小型派對尤其值得先算「目前花多少時間」，再比較導入後的整體投入，不只看一個漂亮的起價。</p>
      </section>
      <section aria-labelledby="news-taiwan"><p className="music-news-section-number">05 / 台灣主辦人先查這些</p><h2 id="news-taiwan">有翻譯草稿，不等於全站繁中結帳</h2>
        <p>官方顧客幣別文件的清單未列 TWD，並說未涵蓋的幣別預設顯示 USD。這不能單獨回答台灣公司能否開戶或用本地銀行收款，但已足以提醒：新台幣售票呈現與結算條件，都得另行確認。<Source index={11} label="官方幣別說明" /></p>
        <p>一般網站頁面可使用翻譯工具；帳戶、登入、結帳及顧客郵件則由 Easol 管理翻譯，文件所列語言沒有中文，這些頁面也不能直接用 GTranslate 外掛翻譯。Support Agent 的翻譯草稿，是另一項客服功能，不能據此保證整套購票流程已支援繁中。<Source index={12} label="網站與結帳語言" /> · <Source index={7} label="客服翻譯草稿" /></p>
        <p>台灣公司收款資格、本地銀行、發票、LINE Pay、ibon、KKTIX 串接，在這次查到的資料中均未獲確認。我們把它們列為採用前要問清楚的項目，不寫成一定支援，也不武斷說完全不支援。</p>
      </section>
      <aside className="music-news-opinion" aria-labelledby="news-opinion"><p className="music-news-kicker">愛波哥怎麼看 / OUR TAKE</p><h2 id="news-opinion">多場次值得評估，批准權不能一起外包</h2>
        <p>對多場次、套票複雜、客服量大的團隊，這類工具值得評估，因為問題常常不在「不會回信」，而在「回信前要查太多地方」。小型活動則未必要立刻搬平台；把規則與訂單整理清楚，本來就能先省下一些反覆確認。這是編輯分析，不是實測推薦。</p>
        <p>營運判斷仍需有人負責，是 AIPOGER 的建議；Easol 的 Creator Terms 也將顧客服務、退款與必要資料授權等責任放在主辦業者身上。我們不把「資料在同一個平台運作」擴大成資料不離平台、或不供任何訓練的保證。<Source index={13} label="業者條款" /></p>
      </aside>
      <section className="music-news-actions" aria-labelledby="news-checklist"><p className="music-news-section-number">06 / 示範時請真的走一遍</p><h2 id="news-checklist">五項驗收，比一句「AI 會處理」有用</h2>
        <p>以下是本站給主辦人的驗收建議，不是廠商已完成的保證。</p>
        <ul><li><strong>中文與台灣收款：</strong>從手機選票走到結帳、付款與通知，確認語言、幣別、銀行與發票需求。</li>
          <li><strong>既有票務資料同步：</strong>用真實套票情境核對庫存、付款、名單與更新延遲，問清楚能接哪些系統。</li>
          <li><strong>退款與調價批准：</strong>誰能批准、超過底線怎麼擋、錯誤提案如何拒絕，請廠商示範。</li>
          <li><strong>AI 單價與總費率：</strong>取得平台、支付、案件計費及重開案件的完整書面口徑。</li>
          <li><strong>資料與錯誤恢復：</strong>確認可輸出什麼、如何刪除、誰能看郵件，以及誤改訂單後如何接手恢復。</li></ul>
        <p>換你說：你的活動後台最容易塞車的，是票務資料、套票加購，還是開演前那一波客服？<a className="music-news-source" href="#news-discussion">到下方聊聊 ↘</a></p>
      </section>
    </div>
  </div>;
}
