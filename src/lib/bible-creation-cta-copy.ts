import type { Lang } from "@/lib/locale";
const copy = {
  zh: { title: "把剛學的招式，放進下一首歌", body: "完成作品後，投稿給社群聽聽，或帶著它進入 Battle。", submit: "投稿作品", battle: "進入 Battle" },
  en: { title: "Ready to test your new track?", body: "Put these ideas into a song. Share your work with the community or take it into Battle.", submit: "Submit a Work", battle: "Enter Battle" },
  ja: { title: "学んだことを、次の一曲に。", body: "曲ができたらコミュニティに投稿するか、Battleで聴いてもらいましょう。", submit: "作品を投稿", battle: "Battleへ" },
  ko: { title: "배운 기법을 다음 곡에 담아 보세요", body: "완성한 작품을 커뮤니티에 공유하거나 Battle에서 들려주세요.", submit: "작품 올리기", battle: "Battle 입장" },
} as const;
export function bibleCreationCtaCopy(lang: Lang) { return copy[lang]; }
