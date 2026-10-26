import type { SunoTechnique } from "./suno-practice-library.ts";

type BoomBapSpec = {
  slug: string; region: "east-coast" | "west-coast" | "southern" | "lo-fi";
  titleZh: string; titleEn: string; summaryZh: string; summaryEn: string;
  useZh: string; useEn: string; prompt: string; keywords: string[];
};

// Transcribed from the owner's four screenshots, 2026-10-27.
// Similar styles retain their distinct prompt variants. No audio is commissioned.
const specs: readonly BoomBapSpec[] = [
  {
    slug: "east-golden-vinyl", region: "east-coast",
    titleZh: "東岸經典 Boom Bap・黑膠原味版", titleEn: "East Coast golden-era boom bap · raw vinyl",
    summaryZh: "90 BPM，以黑膠雜訊、厚 Kick、爵士鋼琴切片和 MPC Swing 建立粗礪紐約律動。", summaryEn: "90 BPM, vinyl crackle, heavy kicks, chopped jazz piano and MPC swing build a raw New York groove.",
    useZh: "東岸黃金年代、復古 Rap、刮碟與粗礪節拍", useEn: "Golden-era East Coast rap, turntable scratches and raw retro beats",
    prompt: "90s East Coast boom bap, 90 bpm, gritty vinyl crackle, heavy punchy kick, crisp tight snare, chopped jazz piano sample, upright double bass, MPC swing, raw unpolished hip hop beat, turntable scratches",
    keywords: ["Golden Era NY Vibe", "vinyl crackle", "MPC swing", "黑膠", "刮碟"],
  },
  {
    slug: "east-golden-mpc3000", region: "east-coast",
    titleZh: "東岸經典 Boom Bap・MPC3000 街頭版", titleEn: "East Coast golden-era boom bap · MPC3000",
    summaryZh: "同為 90 BPM，改以 MPC3000 Swing、老派街頭氛圍與刮碟 Ad-lib 區分版本。", summaryEn: "Another 90 BPM direction, distinguished by MPC3000 swing, old-school street feel and scratch ad-libs.",
    useZh: "紐約街頭敘事、老派 Cypher、刮碟點綴", useEn: "New York street storytelling, old-school cyphers and scratch accents",
    prompt: "90s East Coast boom bap, 90 bpm, gritty vinyl crackle, heavy punchy kick, crisp tight snare, chopped jazz piano sample, upright double bass, MPC3000 swing, raw old school hip hop, turntable scratch ad-libs",
    keywords: ["Golden Era NY", "MPC3000", "old school", "scratch ad-libs", "黃金年代"],
  },
  {
    slug: "east-jazz-warm-horns", region: "east-coast",
    titleZh: "東岸爵士 Boom Bap・暖銅管版", titleEn: "East Coast jazz boom bap · warm horns",
    summaryZh: "92 BPM，Rhodes、步行低音與過濾銅管切片，搭配輕鬆點頭的鼓組 Pocket。", summaryEn: "92 BPM, Rhodes, walking bass and filtered horn chops over a relaxed head-nodding pocket.",
    useZh: "爵士嘻哈、靈魂舒緩、溫暖敘事與夜間聆聽", useEn: "Jazz-hop, mellow soul, warm storytelling and late-night listening",
    prompt: "soulful boom bap, 92 bpm, warm jazz Rhodes chords, walking upright bassline, filtered horn chops, dusty acoustic drums, snappy rimshot snare, laid-back head-nodding groove, lo-fi analog warmth",
    keywords: ["Jazz Hop", "soulful", "Rhodes", "horn chops", "爵士", "靈魂", "銅管"],
  },
  {
    slug: "east-jazz-tape-rhodes", region: "east-coast",
    titleZh: "東岸爵士 Boom Bap・Rhodes 磁帶版", titleEn: "East Coast jazz boom bap · tape Rhodes",
    summaryZh: "92 BPM，保留 Fender Rhodes 與爵士步行低音，以 Rimshot 和懷舊磁帶飽和收束質感。", summaryEn: "92 BPM, Fender Rhodes and walking bass with rimshot accents and nostalgic tape saturation.",
    useZh: "Soul & Jazz Hop、舒適點頭律動、懷舊氛圍", useEn: "Soul and jazz-hop, easy head-nodding grooves and nostalgic moods",
    prompt: "soulful East Coast boom bap, 92 bpm, warm Fender Rhodes chords, walking upright bass, filtered brass chops, laid-back head-nodding swing, snappy rimshot snare, nostalgic tape saturation",
    keywords: ["Soul & Jazz Hop", "Fender Rhodes", "tape saturation", "爵士", "靈魂", "磁帶"],
  },
  {
    slug: "east-dark-drum-break", region: "east-coast",
    titleZh: "東岸暗黑 Boom Bap・失真鼓勁版", titleEn: "East Coast dark boom bap · gritty drum break",
    summaryZh: "88 BPM，陰冷鋼琴循環、失真黑膠與強硬鼓 Break，帶出壓抑街頭張力。", summaryEn: "88 BPM, eerie piano loops, distorted vinyl and forceful drum breaks create tense underground weight.",
    useZh: "地下硬核、暗黑 Rap、緊張街頭敘事", useEn: "Underground hardcore, dark rap and tense street narratives",
    prompt: "gritty underground boom bap, 88 bpm, dark eerie piano loop, distorted vinyl noise, hard-hitting boom-bap drum break, aggressive punchy bass, cold street tension, lo-fi aesthetic, raw old school hip hop",
    keywords: ["Gritty & Hardcore Underground", "distorted vinyl", "drum break", "暗黑", "地下", "硬核"],
  },
  {
    slug: "east-dark-sub-bass", region: "east-coast",
    titleZh: "東岸暗黑 Boom Bap・冷調重低音版", titleEn: "East Coast dark boom bap · cold sub bass",
    summaryZh: "88 BPM，小調鋼琴、黑膠底噪、狠勁實鼓與厚重 Sub，保留冷峻的東岸空氣。", summaryEn: "88 BPM, minor-key piano, dusty vinyl hiss, punchy acoustic drums and heavy sub bass keep a cold East Coast feel.",
    useZh: "冷調地下嘻哈、重低音段落、壓迫感畫面", useEn: "Cold underground hip-hop, sub-heavy sections and claustrophobic visuals",
    prompt: "dark gritty underground boom bap, 88 bpm, eerie minor piano loop, dusty vinyl hiss, aggressive punchy acoustic drums, heavy sub bass, cold street tension, lo-fi analog warmth, raw East Coast hip hop",
    keywords: ["Gritty Hardcore Queensbridge", "minor piano", "sub bass", "暗黑", "地下", "硬核", "重低音"],
  },
  {
    slug: "west-g-funk", region: "west-coast",
    titleZh: "西岸 G-Funk 融合 Boom Bap", titleEn: "West Coast G-funk hybrid boom bap",
    summaryZh: "92 BPM，口哨感高音合成器、圓滑 Moog Bass 與 Boom Bap 鼓點，鬆弛但重拍紮實。", summaryEn: "92 BPM, whistle-like synth leads, groovy Moog bass and boom-bap drums balance relaxed bounce with solid impact.",
    useZh: "西岸復古、放克街頭、晴朗加州與巡航畫面", useEn: "West Coast retro funk, sunny California scenes and cruising visuals",
    prompt: "90s West Coast boom bap, 92 bpm, funky sine wave whistle synth lead, deep groovy moog bassline, punchy acoustic boom bap drums, relaxed bounce, melodic funk guitar licks, sunny California vibe",
    keywords: ["West Coast G-Funk Hybrid", "G-Funk", "moog", "whistle synth", "放克", "加州"],
  },
  {
    slug: "west-cali-underground", region: "west-coast",
    titleZh: "西岸加州地下 Boom Bap・爵士取樣版", titleEn: "Cali underground golden-age boom bap",
    summaryZh: "94 BPM，明快爵士銅管、活潑 Bass Riff 與黑膠切片，帶出輕快多層的 MPC 律動。", summaryEn: "94 BPM, upbeat jazz horns, lively bass riffs and dusty vinyl chops build a playful layered MPC groove.",
    useZh: "九〇年代加州地下、輕快 Cypher、爵士取樣感節拍", useEn: "1990s Cali underground, playful cyphers and jazz-sample textures",
    prompt: "90s West Coast underground boom bap, 94 bpm, upbeat jazz horns, lively bass guitar riff, dynamic crisp drum break, dusty vinyl chops, playful bounce, rhythmic MPC groove, old school cypher vibe",
    keywords: ["Cali Underground Golden Age", "California", "MPC", "爵士", "加州", "地下", "取樣"],
  },
  {
    slug: "south-organic-soul", region: "southern",
    titleZh: "南方靈魂有機 Boom Bap・亞特蘭大律動", titleEn: "Southern organic soul boom bap · Atlanta",
    summaryZh: "86 BPM，現場鼓感、粗樸木吉他、南方靈魂銅管與放克 Bass，留下磁帶顆粒。", summaryEn: "86 BPM, live drum feel, rough acoustic guitar, Southern soul brass and funky bass retain gritty tape texture.",
    useZh: "有機南方嘻哈、靈魂敘事、溫厚樂團律動", useEn: "Organic Southern hip-hop, soulful storytelling and warm band grooves",
    prompt: "Southern soulful boom bap, 86 bpm, organic live drum feel, muddy acoustic guitar riffs, warm Southern soul brass, funky bass guitar, gritty analog tape drive, laid-back Atlanta groove",
    keywords: ["Dungeon Family Organic Soul", "Atlanta", "organic soul", "南方", "亞特蘭大", "有機", "靈魂"],
  },
  {
    slug: "south-texas-heavy", region: "southern",
    titleZh: "德州南方 Boom Bap・低調重拍版", titleEn: "Texas Southern boom bap · heavy low-slung groove",
    summaryZh: "84 BPM，慢沉 Kick、緊 Clap Snare、深沉教堂風琴與藍調電吉他，低頻厚而穩。", summaryEn: "84 BPM, sluggish heavy kicks, tight clap snares, deep church organ and bluesy guitar keep the bottom end weighty.",
    useZh: "休士頓街頭、慢速重拍、厚低頻與南方藍調感", useEn: "Houston street scenes, slow heavy beats and Southern blues texture",
    prompt: "heavy Southern boom bap, 84 bpm, sluggish heavy kick, snappy tight clap snare, deep church organ chords, bluesy electric guitar fills, thick bottom-end sub bass, relaxed Texas street vibe",
    keywords: ["Texas Chopped Vibe Boom Bap", "Texas", "Houston", "church organ", "南方", "德州", "休士頓", "重拍"],
  },
  {
    slug: "lofi-dusty-instrumental", region: "lo-fi",
    titleZh: "Lo-Fi 灰塵黑膠 Boom Bap・器樂版", titleEn: "Lo-fi dusty instrumental boom bap",
    summaryZh: "87 BPM，重度過濾爵士吉他、黑膠底噪、柔木質 Snare 與輕微泵動，營造懷舊循環。", summaryEn: "87 BPM, heavily filtered jazz guitar, vinyl static, mellow wooden snares and sidechain movement build a nostalgic loop.",
    useZh: "器樂節拍、沉浸式饒舌、懷舊低傳真氛圍", useEn: "Instrumental beats, immersive rap and nostalgic low-fidelity moods",
    prompt: "lo-fi dusty boom bap, 87 bpm, heavily filtered jazz guitar loops, textured vinyl static, muted kick, mellow wooden snare, sidechain compression, nostalgic melancholic vibe, SP-404 vinyl simulator feel",
    keywords: ["Lo-Fi Dusty Instrumental Boom Bap", "lofi", "lo-fi", "SP-404", "融合", "器樂", "低傳真", "黑膠"],
  },
];
const regionKeywords = {
  "east-coast": ["East Coast", "東岸", "紐約"],
  "west-coast": ["West Coast", "西岸"],
  southern: ["Southern", "南方"],
  "lo-fi": ["Lo-Fi", "融合特色"],
} as const;
export const BOOM_BAP_STUDIO_MOVES: SunoTechnique<"mastering">[] = specs.map(spec => ({
  key: `studio-mastering-boom-bap-${spec.slug}`, category: "mastering", studioFamily: "hip-hop",
  title: { zh: spec.titleZh, en: spec.titleEn }, summary: { zh: spec.summaryZh, en: spec.summaryEn },
  use: { zh: spec.useZh, en: spec.useEn }, copy: { zh: spec.prompt, en: spec.prompt },
  evidence: "version", sources: ["使用者提供的 Boom Bap Prompt 截圖（2026-10-27）"],
  keywords: ["boom bap", "boombap", "hip-hop", "hip hop", "rap", "嘻哈", "錄音室", ...regionKeywords[spec.region], ...spec.keywords],
  metadata: { platform: "Suno", model: null, modelVersion: null, lastVerifiedAt: null, status: "Experimental" },
}));
