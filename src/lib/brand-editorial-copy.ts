import type { Lang } from "@/lib/locale";

type BrandCopy = {
  about: string; partners: string; home: string; aboutLabel: string; partnersLabel: string;
  aboutTitle: string[]; aboutLead: string; explore: string; community: string;
  mission: string[]; pillars: string[][]; policies: string[];
  partnersTitle: string[]; partnersLead: string; discuss: string; partnership: string;
  formats: string; rows: string[][]; emailTopic: string;
  contactTitle: string; contactLead: string; imageAlt: string;
};

const zh: BrandCopy = {
  about: "關於愛播歌", partners: "合作與聯絡", home: "精選", aboutLabel: "關於愛播歌", partnersLabel: "廣告與合作",
  aboutTitle: ["讓好聲音", "被聽見。"], aboutLead: "從 AI 音樂出發，讓創作被聽見，也讓喜歡有回應。", explore: "探索音樂", community: "認識社群",
  mission: ["為創作者，也為", "每雙願意聆聽的耳朵。"],
  pillars: [["聽見作品", "探索歌曲、MV 與創作者的聲音。"], ["留下回應", "用評論、評分與愛心，表達你的喜歡。"], ["累積舞台", "從作品出發，連結聽眾與創作者。"]],
  policies: ["原創與授權", "內容下架與權利通知", "聯絡愛播歌"],
  partnersTitle: ["讓品牌，", "走進音樂現場。"], partnersLead: "從工具教學、音樂 MV 到主題活動，讓合作走進創作者的日常。", discuss: "洽談合作", partnership: "合作洽談", formats: "合作可以這樣開始",
  rows: [["工具與教學", "把工具放進真實的創作流程。", "AI 音樂工具、AI 影像工具、音樂硬體、課程平台、活動單位、酒吧展演空間、音樂品牌與想接觸創作者的產品。可結合 YouTube 頻道 @djapple2000 教學影片與社群曝光，讓創作者看見工具的實際用法。"], ["音樂與 MV 企劃", "從聲音到影像，一起完成內容。", "品牌要和音樂創作有關，內容要對創作者有幫助。AIPOGER 不做硬塞式廣告，而是把產品放進真實的創作流程與聽歌情境。合作可包含歌曲企劃、MV 內容、網站曝光與社群內容。"], ["主題活動合作", "為創作者設計有參與感的主題。", "可從輕量曝光到完整企劃。初期建議先用月合作或單檔活動測試：包含網站曝光、社群內容、教學置入、主題 battle 與成效回報。也可討論品牌指定題目、風格週、創作者挑戰與公播歌單或主題夜合作。"]],
  emailTopic: "AIPOGER 合作洽談", contactTitle: "聊聊你的合作想法。", contactLead: "合作形式、主題與時程，歡迎來信。", imageAlt: "戴著耳機的女生坐在唱片間，閉眼享受音樂",
};
const en: BrandCopy = {
  about: "About AIPOGER", partners: "Partnerships", home: "Featured", aboutLabel: "About AIPOGER", partnersLabel: "Partnerships",
  aboutTitle: ["Good music", "deserves to be heard."], aboutLead: "Starting with AI music. A place for creators to be heard, and listeners to respond.", explore: "Explore music", community: "Meet the community",
  mission: ["For creators.", "For everyone who listens."], pillars: [["Discover music", "Find songs, music videos, and voices worth hearing."], ["Leave a response", "Share what you love with comments, ratings, and hearts."], ["Build a stage", "Connect listeners and creators through their work."]], policies: ["Original work & permissions", "Takedowns & rights notices", "Contact AIPOGER"],
  partnersTitle: ["Bring your brand", "into the music."], partnersLead: "From tool tutorials and music videos to themed events, make your brand part of a creator’s day.", discuss: "Let’s collaborate", partnership: "Partnership inquiries", formats: "Ways to work together",
  rows: [["Tools & tutorials", "Put your tools into a real creative workflow.", "For AI music and video tools, music hardware, courses, events, venues, music brands, and products that want to reach creators. Collaborations can include tutorials on YouTube @djapple2000 and social content that shows tools in use."], ["Music & video projects", "Build something together, from sound to screen.", "The brand should support music creation. AIPOGER works best when promotion lives inside real creator workflows, listener reactions, and tracks that are earning recognition. Formats can include song concepts, music videos, site exposure, and social content."], ["Themed events", "Give creators a reason to join in.", "Start light or build a full campaign: site exposure, social content, tutorial placement, theme battles, and performance reporting. Explore sponsored prompts, style weeks, creator challenges, airplay campaigns, or themed nights."]],
  emailTopic: "AIPOGER partnership inquiry", contactTitle: "Tell us what you have in mind.", contactLead: "Email us with your ideas, format, and timing.", imageAlt: "A woman in headphones sitting among records, enjoying music with her eyes closed",
};
const ja: BrandCopy = {
  ...en, about: "AIPOGERについて", partners: "コラボ・お問い合わせ", home: "注目", aboutLabel: "AIPOGERについて", partnersLabel: "広告・コラボレーション",
  aboutTitle: ["いい音楽を、", "聴いてもらえる場所へ。"], aboutLead: "AI音楽から始まる、創作が届き、好きという気持ちが返ってくる場所。", explore: "音楽を探す", community: "コミュニティを見る",
  mission: ["つくる人にも、", "耳を傾ける人にも。"], pillars: [["作品に出会う", "楽曲やMVを通じて、クリエイターの音に出会う。"], ["感想を届ける", "コメント、評価、ハートで好きな気持ちを伝える。"], ["ステージを育てる", "作品をきっかけに、リスナーとクリエイターがつながる。"]], policies: ["オリジナル作品と利用許諾", "削除申請と権利に関する通知", "AIPOGERへのお問い合わせ"],
  partnersTitle: ["ブランドを、", "音楽のある場所へ。"], partnersLead: "ツールの使い方、MV、テーマイベント。クリエイターの日常につながるコラボを。", discuss: "コラボを相談する", partnership: "コラボのご相談", formats: "こんなコラボから始められます",
  rows: [["ツールとチュートリアル", "実際の制作の中で、ツールの魅力を伝える。", "AI音楽・映像ツール、音楽機材、講座、イベント、音楽ブランドなど。YouTube @djapple2000のチュートリアルやSNSで、制作に役立つ使い方を紹介します。"], ["楽曲とMVの企画", "音から映像まで、一緒につくる。", "音楽制作に役立つコラボを大切にしています。楽曲やMVの企画、サイトでの紹介、SNSコンテンツなど、クリエイターの制作とリスナーの体験につながる形を考えます。"], ["テーマイベント", "クリエイターが参加したくなるテーマを。", "単発イベントから継続企画まで。テーマBattle、スタイル週間、クリエイターチャレンジ、プレイリストやテーマナイトなど、内容と期間に合わせて相談できます。"]],
  emailTopic: "AIPOGER コラボのご相談", contactTitle: "コラボのアイデアを聞かせてください。", contactLead: "内容、テーマ、ご希望の時期を添えてメールでご連絡ください。", imageAlt: "レコードに囲まれて座り、ヘッドホンで目を閉じて音楽を楽しむ女性",
};
const ko: BrandCopy = {
  ...en, about: "AIPOGER 소개", partners: "협업 및 문의", home: "추천", aboutLabel: "AIPOGER 소개", partnersLabel: "광고 및 협업",
  aboutTitle: ["좋은 음악이", "들리는 곳."], aboutLead: "AI 음악에서 시작해, 창작이 전해지고 좋아하는 마음이 돌아오는 공간.", explore: "음악 탐색", community: "커뮤니티 둘러보기",
  mission: ["만드는 사람을 위해,", "귀 기울이는 모두를 위해."], pillars: [["작품 발견", "곡과 MV를 통해 크리에이터의 소리를 만나보세요."], ["마음 전하기", "댓글, 평점, 하트로 좋아하는 마음을 표현하세요."], ["무대 만들기", "작품을 통해 청중과 크리에이터가 이어집니다."]], policies: ["창작물과 이용 허락", "콘텐츠 삭제 및 권리 관련 신고", "AIPOGER에 문의하기"],
  partnersTitle: ["브랜드를,", "음악이 있는 곳으로."], partnersLead: "도구 튜토리얼부터 MV, 테마 행사까지. 크리에이터의 일상에 함께하는 협업을 만듭니다.", discuss: "협업 문의", partnership: "협업 문의", formats: "이런 협업으로 시작할 수 있어요",
  rows: [["도구와 튜토리얼", "실제 창작 과정에서 도구의 가치를 보여주세요.", "AI 음악·영상 도구, 음악 장비, 강의, 행사, 음악 브랜드 등 크리에이터와 만나고 싶은 제품을 위한 협업입니다. YouTube @djapple2000 튜토리얼과 소셜 콘텐츠로 실제 사용법을 소개할 수 있습니다."], ["음악과 MV 기획", "소리부터 영상까지, 함께 완성해요.", "음악 창작에 도움이 되는 협업을 지향합니다. 곡과 MV 기획, 사이트 노출, 소셜 콘텐츠 등 크리에이터의 작업과 청중의 경험에 자연스럽게 이어지는 방식을 함께 고민합니다."], ["테마 행사 협업", "크리에이터가 참여하고 싶은 주제를 만들어보세요.", "단발 행사부터 장기 캠페인까지. 테마 배틀, 스타일 주간, 크리에이터 챌린지, 플레이리스트와 테마 나이트 등 주제와 일정에 맞춰 협의할 수 있습니다."]],
  emailTopic: "AIPOGER 협업 문의", contactTitle: "협업 아이디어를 들려주세요.", contactLead: "협업 방식, 주제, 일정을 이메일로 보내주세요.", imageAlt: "레코드 사이에 앉아 헤드폰을 쓰고 눈을 감은 채 음악을 즐기는 여성",
};
export const brandEditorialCopy = (lang: Lang): BrandCopy => ({ zh, en, ja, ko })[lang];
