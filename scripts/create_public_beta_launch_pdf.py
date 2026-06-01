from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Flowable,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


OUT_DIR = Path("/Users/huangyihong/Documents/GitHub/aipoger-web/docs")
PDF_PATH = OUT_DIR / "AIPOGER_public_beta_launch_guide_2026-05-21.pdf"


ORANGE = colors.HexColor("#ff6a00")
GOLD = colors.HexColor("#d9a441")
INK = colors.HexColor("#171717")
MUTED = colors.HexColor("#555555")
LIGHT = colors.HexColor("#f7f2ea")
PANEL = colors.HexColor("#fffaf2")
LINE = colors.HexColor("#e6dccf")
BLACK = colors.HexColor("#080808")


FONT_NAME = "AipoCJK"
pdfmetrics.registerFont(TTFont(FONT_NAME, "/System/Library/Fonts/STHeiti Medium.ttc", subfontIndex=0))


def style_sheet():
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="CoverKicker",
            fontName=FONT_NAME,
            fontSize=12,
            leading=18,
            textColor=GOLD,
            alignment=TA_CENTER,
            wordWrap="CJK",
            spaceAfter=8,
        )
    )
    styles.add(
        ParagraphStyle(
            name="CoverTitle",
            fontName=FONT_NAME,
            fontSize=31,
            leading=39,
            textColor=colors.white,
            alignment=TA_CENTER,
            wordWrap="CJK",
            spaceAfter=12,
        )
    )
    styles.add(
        ParagraphStyle(
            name="CoverSub",
            fontName=FONT_NAME,
            fontSize=13,
            leading=22,
            textColor=colors.HexColor("#e8e0d5"),
            alignment=TA_CENTER,
            wordWrap="CJK",
        )
    )
    styles.add(
        ParagraphStyle(
            name="H1",
            fontName=FONT_NAME,
            fontSize=19,
            leading=25,
            textColor=INK,
            wordWrap="CJK",
            spaceBefore=4,
            spaceAfter=9,
        )
    )
    styles.add(
        ParagraphStyle(
            name="H2",
            fontName=FONT_NAME,
            fontSize=13,
            leading=19,
            textColor=ORANGE,
            wordWrap="CJK",
            spaceBefore=9,
            spaceAfter=5,
        )
    )
    styles.add(
        ParagraphStyle(
            name="BodyCJK",
            fontName=FONT_NAME,
            fontSize=10.5,
            leading=16,
            textColor=INK,
            wordWrap="CJK",
            spaceAfter=5,
        )
    )
    styles.add(
        ParagraphStyle(
            name="Small",
            fontName=FONT_NAME,
            fontSize=8.6,
            leading=13,
            textColor=MUTED,
            wordWrap="CJK",
        )
    )
    styles.add(
        ParagraphStyle(
            name="TableHead",
            fontName=FONT_NAME,
            fontSize=9.2,
            leading=12,
            textColor=colors.white,
            alignment=TA_CENTER,
            wordWrap="CJK",
        )
    )
    styles.add(
        ParagraphStyle(
            name="Cell",
            fontName=FONT_NAME,
            fontSize=8.7,
            leading=12,
            textColor=INK,
            wordWrap="CJK",
        )
    )
    styles.add(
        ParagraphStyle(
            name="CellStrong",
            fontName=FONT_NAME,
            fontSize=9.1,
            leading=12.5,
            textColor=INK,
            wordWrap="CJK",
        )
    )
    styles.add(
        ParagraphStyle(
            name="Callout",
            fontName=FONT_NAME,
            fontSize=10.2,
            leading=16,
            textColor=INK,
            wordWrap="CJK",
            leftIndent=6,
            rightIndent=6,
            spaceAfter=4,
        )
    )
    return styles


class Rule(Flowable):
    def __init__(self, color=ORANGE, width=1.2, space=8):
        super().__init__()
        self.color = color
        self.width = width
        self.space = space

    def wrap(self, availWidth, availHeight):
        self.availWidth = availWidth
        return availWidth, self.space

    def draw(self):
        self.canv.setStrokeColor(self.color)
        self.canv.setLineWidth(self.width)
        self.canv.line(0, self.space / 2, self.availWidth, self.space / 2)


def p(text, style):
    return Paragraph(text, style)


def bullet(text, styles):
    return p(f"□ {text}", styles["BodyCJK"])


def mini_table(rows, widths, styles, header=True):
    data = []
    for ridx, row in enumerate(rows):
        next_row = []
        for cell in row:
            style = styles["TableHead"] if header and ridx == 0 else styles["Cell"]
            next_row.append(p(cell, style))
        data.append(next_row)
    table = Table(data, colWidths=widths, hAlign="LEFT", repeatRows=1 if header else 0)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), BLACK if header else PANEL),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white if header else INK),
                ("GRID", (0, 0), (-1, -1), 0.45, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("BACKGROUND", (0, 1), (-1, -1), PANEL),
            ]
        )
    )
    return table


def callout(text, styles):
    table = Table([[p(text, styles["Callout"])]], colWidths=[170 * mm], hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#fff0df")),
                ("BOX", (0, 0), (-1, -1), 0.7, colors.HexColor("#ffc58f")),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    return table


def cover_page(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(BLACK)
    canvas.rect(0, 0, A4[0], A4[1], stroke=0, fill=1)
    canvas.setStrokeColor(ORANGE)
    canvas.setLineWidth(1.2)
    canvas.roundRect(18 * mm, 18 * mm, A4[0] - 36 * mm, A4[1] - 36 * mm, 8 * mm, stroke=1, fill=0)
    canvas.setStrokeColor(GOLD)
    canvas.setLineWidth(0.5)
    for y in range(38, 270, 18):
        canvas.line(24 * mm, y * mm, (210 - 24) * mm, y * mm)
    canvas.restoreState()


def normal_page(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(LIGHT)
    canvas.rect(0, 0, A4[0], A4[1], stroke=0, fill=1)
    canvas.setStrokeColor(ORANGE)
    canvas.setLineWidth(0.8)
    canvas.line(18 * mm, A4[1] - 16 * mm, A4[0] - 18 * mm, A4[1] - 16 * mm)
    canvas.setFont(FONT_NAME, 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(18 * mm, 12 * mm, "AIPOGER 公測作戰手冊")
    canvas.drawRightString(A4[0] - 18 * mm, 12 * mm, f"{doc.page}")
    canvas.restoreState()


def build():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    styles = style_sheet()
    doc = SimpleDocTemplate(
        str(PDF_PATH),
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title="AIPOGER 公測作戰手冊",
        author="AIPOGER",
    )

    story = []
    story += [
        Spacer(1, 62 * mm),
        p("AIPOGER PUBLIC BETA", styles["CoverKicker"]),
        p("明日公測<br/>操作與宣傳作戰手冊", styles["CoverTitle"]),
        p("版本 2026-05-21｜目標：讓第一批玩家敢上傳 Hook、敢 Battle、敢分享成果卡", styles["CoverSub"]),
        Spacer(1, 34 * mm),
        callout("一句話定位：AIPOGER 是 AI 音樂創作者的 Hook Warfare，丟 45 秒 Hook 上擂台，用作品、觀眾與社群反應決定誰的 Hook 更有記憶點。", styles),
        PageBreak(),
    ]

    story += [
        p("1. 明天先打這個重點", styles["H1"]),
        Rule(),
        callout("公測不要一次追求大流量。先抓 30 到 50 位真正會玩的人，讓他們完成一次上傳、一次 Battle、一次留言、一次分享。明天的勝利標準不是爆紅，是流程跑順、畫面有素材、社群開始講話。", styles),
        Spacer(1, 4),
    ]
    for item in [
        "公測入口先放在所有文案第一行：aipoger.com（正式上線前請再確認網址可正常登入與上傳）。",
        "主任務只給三步：上傳 45 秒 Hook、完成或接受一場 Battle、分享成果卡。",
        "若現場沒人配對，就引導到等待挑戰池與 傷心酒吧 Bar Heartbreak，避免使用者覺得白上傳。",
        "明天不要解釋太多制度，先賣感覺：AI 音樂終於可以上擂台。",
        "所有回報集中在同一個社群入口，避免訊息散掉。",
    ]:
        story.append(bullet(item, styles))

    story += [
        p("2. 公測日流程", styles["H1"]),
        mini_table(
            [
                ["時間", "動作", "目的"],
                ["今晚", "確認登入、上傳、Battle Pool、成果卡、傷心酒吧 Bar Heartbreak；準備 3 首示範歌與 1 支短影音。", "明天不要邊發邊修關鍵入口。"],
                ["明天 11:00", "先丟小圈測試：熟朋友、音樂創作者、Suno 學員、DJ 圈。", "先收真回饋，不急著廣發。"],
                ["明天 13:00", "YouTube 社群、Threads、IG Story 同步宣布公測。", "讓原本認識愛波哥的人先進來。"],
                ["明天 20:30", "開一場 20 到 30 分鐘直播或限時動態連發，現場示範上傳與成果卡。", "把冷啟動變成事件。"],
                ["隔天", "公布首日戰報：上傳數、Battle 數、最有記憶點 Hook、Bug 修正。", "讓公測看起來有進展。"],
            ],
            [25 * mm, 100 * mm, 45 * mm],
            styles,
        ),
        PageBreak(),
        p("3. 宣傳平台矩陣", styles["H1"]),
        mini_table(
            [
                ["平台", "明天怎麼用", "內容方向"],
                ["YouTube 頻道", "社群貼文＋Shorts；置頂留言放公測入口。", "愛波哥親自邀請：Suno 玩家來鬥 Hook。"],
                ["IG Reels / Story", "連發 3 則：概念、上傳畫面、成果卡。", "視覺要熱血，少講規則，多給畫面。"],
                ["TikTok", "發 15 秒挑戰片。", "開頭一句：你的 AI Hook 敢不敢上擂台？"],
                ["Threads", "用連續串文記錄公測進度。", "適合拉聊天、收 bug、找早期玩家。"],
                ["Facebook 社團", "投放到 AI 音樂、Suno、DJ、創作者社團；避免硬廣。", "用邀請測試語氣：找 30 位 AI 音樂創作者試玩。"],
                ["LINE 社群", "當作台灣玩家最快客服入口。", "低門檻，適合明天快速聚人。"],
                ["Discord", "作為長期玩家社群與戰績整理。", "頻道清楚，適合 Battle、作品、Bug、公告。"],
                ["Dcard", "可以晚一點發，等流程穩再丟。", "標題走好奇：AI 音樂現在可以 Battle 了。"],
            ],
            [31 * mm, 69 * mm, 70 * mm],
            styles,
        ),
        p("4. 社群架構", styles["H1"]),
        callout("明天建議先開 LINE 社群，因為進入門檻最低；Discord 同時準備好，當長期基地。LINE 負責快問快答，Discord 負責作品、規則、戰績、活動沉澱。", styles),
        mini_table(
            [
                ["頻道 / 分區", "用途"],
                ["公告", "只放公測入口、更新、已知問題、活動時間。"],
                ["新手報到", "讓大家貼創作者名稱、使用工具、想玩的曲風。"],
                ["丟 Hook 求戰", "放作品連結或截圖，讓其他人接受挑戰。"],
                ["傷心酒吧 Bar Heartbreak", "放完整歌、排播、聊天、讓 APC 不足或暫不 Battle 的人也能參與。"],
                ["成果卡分享", "集中收集贏家圖、短影音、戰報素材。"],
                ["Bug 回報", "格式固定：手機/瀏覽器/發生步驟/截圖。"],
            ],
            [45 * mm, 125 * mm],
            styles,
        ),
        PageBreak(),
        p("5. 宣傳片腳本", styles["H1"]),
        p("15 秒短片：明天最重要，先做這支。", styles["H2"]),
        mini_table(
            [
                ["秒數", "畫面", "旁白 / 字幕"],
                ["0-2", "Hook Warfare 招牌或 VS 畫面", "你的 AI Hook 敢不敢上擂台？"],
                ["2-5", "上傳 45 秒 Hook 畫面", "上傳一段最洗腦的副歌。"],
                ["5-9", "左右唱片 Battle 場景", "同類型作品直接開戰。"],
                ["9-12", "成果卡 WINNER 畫面", "贏了就拿榮譽成果卡。"],
                ["12-15", "網址＋社群入口", "AIPOGER 公測開跑，來鬥歌。"],
            ],
            [22 * mm, 75 * mm, 73 * mm],
            styles,
        ),
        p("30 秒短片：用來發 YouTube Shorts、Reels、TikTok。", styles["H2"]),
    ]
    for item in [
        "開頭 3 秒一定要有問題句：你做的 Suno Hook，真的夠抓耳嗎？",
        "中段展示流程：登入、上傳、選類型、進 Battle Pool、成果卡。",
        "最後放 CTA：明天公測，找第一批 AI 音樂鬥士。",
        "背景音建議用店歌「我整天都想起肖」或最有衝擊的 Hook，音量不要蓋掉字幕。",
    ]:
        story.append(bullet(item, styles))

    story += [
        p("6. 可直接貼的宣傳文案", styles["H1"]),
        p("短版", styles["H2"]),
        callout("AI 音樂終於可以上擂台了。AIPOGER Hook Warfare 公測開跑，丟 45 秒 Hook，找同類型對手 Battle，贏了生成成果卡。明天先找第一批測試鬥士，歡迎來玩、來挑戰、來抓 bug。入口：aipoger.com", styles),
        p("社群招募版", styles["H2"]),
        callout("我正在做一個 AI 音樂 Battle 網站 AIPOGER。玩法很直接：上傳 45 秒 Hook，進入 Battle Pool，同類型作品配對，觀眾投票，結果可以生成短影音成果卡。明天開公測，想找會玩 Suno、Udio、AI 音樂或本來就愛做歌的人一起試。", styles),
        PageBreak(),
        p("7. 公測任務設計", styles["H1"]),
        mini_table(
            [
                ["任務", "玩家要做什麼", "你要觀察什麼"],
                ["第一次登入", "確認帳號與頭像顯示正常。", "登入是否卡住、Google/Facebook 是否還有問題。"],
                ["上傳 Hook", "上傳 45 秒內音檔、封面、歌詞選填。", "是否理解欄位、是否知道下一步。"],
                ["等待挑戰", "沒人在線時進入 Battle Pool。", "玩家是否覺得安心，還是覺得沒反應。"],
                ["Battle / 投票", "播放、改投、看結果。", "投票時機、按鈕位置、音樂播放是否直覺。"],
                ["成果分享", "生成成果卡並分享。", "成果卡是否有榮譽感，字是否清楚。"],
                ["傷心酒吧 Bar Heartbreak", "排歌、聊天、給反應。", "無 Battle 時是否還願意留下來。"],
            ],
            [35 * mm, 68 * mm, 67 * mm],
            styles,
        ),
        p("8. 明天必追數字", styles["H1"]),
    ]
    for item in [
        "進站人數：知道宣傳有沒有帶人。",
        "完成登入數：判斷登入是否卡關。",
        "Hook 上傳數：這是核心指標。",
        "成功配對 / Battle 完成數：判斷玩法是否成立。",
        "成果卡分享數：判斷榮譽感是否成立。",
        "傷心酒吧 Bar Heartbreak 排播與留言數：判斷無人 Battle 時是否有留人效果。",
        "Bug 回報數與重複問題：隔天優先修最高頻問題。",
    ]:
        story.append(bullet(item, styles))

    story += [
        p("9. 風險與回覆話術", styles["H1"]),
        mini_table(
            [
                ["狀況", "回覆方式"],
                ["沒人配對", "你的 Hook 已進 Battle Pool，可以先離開；有人挑戰會通知，也可能進公開評分。"],
                ["不知道怎麼玩", "先上傳 45 秒最抓耳的副歌就好，規則之後再慢慢補。"],
                ["音樂版權疑慮", "請只上傳自己創作或有授權的作品；若涉及侵權，AIPOGER 有權下架。"],
                ["系統 bug", "請丟手機型號、瀏覽器、截圖、發生步驟，我們會優先修。"],
                ["APC 制度疑問", "公測先以體驗與榮譽感為主，點數制度會在流量穩定後逐步開放。"],
            ],
            [42 * mm, 128 * mm],
            styles,
        ),
        PageBreak(),
        p("10. 明天發布前檢查清單", styles["H1"]),
    ]
    for item in [
        "首頁店歌可播放，且不影響主要按鈕。",
        "Google / Facebook 登入至少各測一次。",
        "上傳 Hook、封面、歌詞、AI 工具其他欄位都測一次。",
        "Battle Pool 沒人時文案清楚，不讓使用者以為卡住。",
        "同類型歌曲才會 Battle 的規則確認正常。",
        "成果卡有 AIPOGER logo、鬥士名稱、封面、挑戰者資訊。",
        "傷心酒吧 Bar Heartbreak 可排播、可調音量、可留言、可給反應。",
        "準備一個 LINE 或 Discord 社群入口，所有貼文都放同一個入口。",
        "準備 3 張截圖與 1 支 15 秒短影音，避免臨時找素材。",
    ]:
        story.append(bullet(item, styles))

    story += [
        Spacer(1, 8),
        callout("明天建議口氣：不要說「平台功能都完成了」，而是說「第一版公測，找第一批 AI 音樂鬥士一起把玩法打磨出來」。這樣真實，也更容易讓大家願意回報問題。", styles),
    ]

    doc.build(story, onFirstPage=cover_page, onLaterPages=normal_page)
    print(PDF_PATH)


if __name__ == "__main__":
    build()
