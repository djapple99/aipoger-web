import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  TAIWANESE_LYRICS_CATEGORIES,
  TAIWANESE_LYRICS_ENTRIES,
} from "../src/lib/taiwanese-lyrics-lab.ts";
import {
  STEM_ENGINES,
  STEM_GOALS,
} from "../src/lib/stem-separation-guide.ts";
import {
  AI_PRODUCTION_FLOW,
  SUNO_GENRE_GROUPS,
  SUNO_LYRIC_MOVES,
  SUNO_PROMPT_MOVES,
  SUNO_STUDIO_MASTERING_FAMILY_OPTIONS,
} from "../src/lib/suno-practice-library.ts";
import {
  BEATPORT_STUDIO_MASTERING_MOVES,
  SUNO_STUDIO_MASTERING_MOVES,
} from "../src/lib/suno-studio-mastering-prompts.ts";
import {
  SUNO_ARTIST_DNA_ENTRIES,
  SUNO_INSPIRATION_SOURCE,
  SUNO_PROMPT_RECIPES,
  SUNO_RECIPE_GENRES,
} from "../src/lib/suno-inspiration-index.ts";
import {
  bibleCatalogDefaults,
  mergeBibleCatalog,
  sanitizeBiblePayload,
} from "../src/lib/ai-music-bible-content.ts";
import {
  PUBLIC_BIBLE_FAQ,
  SUNO_COMMAND_REFERENCE,
  SUNO_FEATURE_WATCH,
  SUNO_OFFICIAL_CROSS_CHECK_DATE,
  SUNO_PREFLIGHT_ITEMS,
  SUNO_PROBLEM_ROUTES,
  SUNO_QUICK_START_FIELDS,
  SUNO_RIGHTS_GUIDE,
  SUNO_TROUBLESHOOTING,
} from "../src/lib/suno-reference-guide.ts";

const practiceLibraryComponent = readFileSync(new URL("../src/components/suno-practice-library-section.tsx", import.meta.url), "utf8");
const inspirationIndexComponent = readFileSync(new URL("../src/components/suno-inspiration-index-section.tsx", import.meta.url), "utf8");
const referenceGuideComponent = readFileSync(new URL("../src/components/suno-reference-guide-section.tsx", import.meta.url), "utf8");
const commandReferenceComponent = readFileSync(new URL("../src/components/suno-command-reference-section.tsx", import.meta.url), "utf8");
const commandDockComponent = readFileSync(new URL("../src/components/bible-command-dock.tsx", import.meta.url), "utf8");
const publicFaqComponent = readFileSync(new URL("../src/components/public-bible-faq.tsx", import.meta.url), "utf8");
const biblePageComponent = readFileSync(new URL("../src/components/ai-music-bible-page.tsx", import.meta.url), "utf8");
const bibleRoute = readFileSync(new URL("../src/app/ai-music-bible/page.tsx", import.meta.url), "utf8");

test("Taiwanese lyrics lab keeps the PDF seed catalog complete and uniquely addressable", () => {
  assert.equal(TAIWANESE_LYRICS_ENTRIES.length, 38);
  assert.equal(new Set(TAIWANESE_LYRICS_ENTRIES.map((entry) => entry.key)).size, 38);
  assert.ok(TAIWANESE_LYRICS_ENTRIES.every((entry) => entry.meaning && entry.sunoWriting && entry.note));
});

test("Bible editorial overrides are narrow, merge onto defaults, and preserve the catalog shape", () => {
  const defaults = bibleCatalogDefaults();
  const merged = mergeBibleCatalog([
    {
      content_kind: "prompt_move",
      content_key: "prompt-dna",
      payload: { title: { zh: "新版聲音 DNA" }, copy: { zh: "新版可複製公式" }, category: "lyric" },
      updated_by: null,
      updated_at: "2026-07-18T00:00:00.000Z",
    },
    {
      content_kind: "taiwanese_entry",
      content_key: "pronoun-me",
      payload: { sunoWriting: "新版阮", note: "新版測試說明" },
      updated_by: null,
      updated_at: "2026-07-18T00:00:00.000Z",
    },
  ]);
  assert.equal(merged.promptMoves.length, defaults.promptMoves.length);
  assert.equal(merged.lyricMoves.length, defaults.lyricMoves.length);
  assert.equal(merged.taiwaneseEntries.length, defaults.taiwaneseEntries.length);
  assert.equal(merged.promptMoves.find((item) => item.key === "prompt-dna").title.zh, "新版聲音 DNA");
  assert.equal(merged.promptMoves.find((item) => item.key === "prompt-dna").copy.zh, "新版可複製公式");
  assert.equal(merged.promptMoves.find((item) => item.key === "prompt-dna").category, "foundation");
  assert.equal(merged.taiwaneseEntries.find((item) => item.key === "pronoun-me").sunoWriting, "新版阮");
});

test("Bible editor payload sanitization rejects unknown shapes and caps editable values", () => {
  assert.equal(sanitizeBiblePayload(null), null);
  assert.equal(sanitizeBiblePayload({ __proto__: "unsafe" }), null);
  const payload = sanitizeBiblePayload({ title: { zh: "  可用標題  ", nope: "discard" }, evidence: "field", keywords: [" prompt ", 4] });
  assert.deepEqual(payload, { title: { zh: "可用標題" }, evidence: "field", keywords: ["prompt"] });
});

test("every Taiwanese lyrics lab entry uses a supported category", () => {
  const categories = new Set(TAIWANESE_LYRICS_CATEGORIES);
  assert.ok(TAIWANESE_LYRICS_ENTRIES.every((entry) => categories.has(entry.category)));
});

test("stem separation guide keeps ten unique engine families and seven goal routes", () => {
  assert.equal(STEM_ENGINES.length, 10);
  assert.equal(new Set(STEM_ENGINES.map((engine) => engine.key)).size, 10);
  assert.equal(STEM_GOALS.length, 7);
  assert.equal(new Set(STEM_GOALS.map((goal) => goal.key)).size, 7);
});

test("stem separation guide is bilingual, sourced, and points only to known engines", () => {
  const engineKeys = new Set(STEM_ENGINES.map((engine) => engine.key));

  assert.ok(STEM_ENGINES.every((engine) => (
    engine.name
    && engine.family.zh
    && engine.family.en
    && engine.access.zh
    && engine.access.en
    && engine.summary.zh
    && engine.summary.en
    && engine.bestFor.zh
    && engine.bestFor.en
    && engine.strengths.every((item) => item.zh && item.en)
    && engine.limits.every((item) => item.zh && item.en)
    && engine.sources.length > 0
    && engine.sources.every((source) => source.label && source.url.startsWith("https://"))
  )));
  assert.ok(STEM_GOALS.every((goal) => (
    goal.label.zh
    && goal.label.en
    && goal.pick.zh
    && goal.pick.en
    && goal.why.zh
    && goal.why.en
    && goal.engineKeys.length > 0
    && goal.engineKeys.every((key) => engineKeys.has(key))
  )));
});

test("Suno prompt and lyric libraries keep unique, bilingual, sourced moves", () => {
  assert.equal(SUNO_PROMPT_MOVES.length, 118);
  assert.equal(SUNO_STUDIO_MASTERING_MOVES.length, 95);
  assert.equal(BEATPORT_STUDIO_MASTERING_MOVES.length, 45);
  assert.equal(SUNO_STUDIO_MASTERING_MOVES.filter((entry) => entry.category === "mastering").length, 95);
  assert.equal(SUNO_LYRIC_MOVES.length, 18);
  assert.deepEqual(
    SUNO_STUDIO_MASTERING_FAMILY_OPTIONS.map((option) => option.key),
    ["all", "house", "techno", "trance", "bass", "breaks", "global", "pop-urban", "dj-edit"],
  );
  assert.ok(SUNO_STUDIO_MASTERING_MOVES.every((entry) => entry.studioFamily));
  assert.equal(new Set(SUNO_STUDIO_MASTERING_MOVES.map((entry) => entry.studioFamily)).size, 8);
  assert.ok(BEATPORT_STUDIO_MASTERING_MOVES.some((entry) => entry.studioFamily === "dj-edit"));

  for (const entries of [SUNO_PROMPT_MOVES, SUNO_LYRIC_MOVES]) {
    assert.equal(new Set(entries.map((entry) => entry.key)).size, entries.length);
    assert.ok(entries.every((entry) => (
      entry.title.zh
      && entry.title.en
      && entry.summary.zh
      && entry.summary.en
      && entry.use.zh
      && entry.use.en
      && entry.copy.zh
      && entry.copy.en
      && ["official", "field", "version"].includes(entry.evidence)
      && entry.sources.length > 0
      && entry.keywords.length > 0
    )));
  }

  for (const key of [
    "two-field-routing",
    "vocal-identity-stack",
    "instrument-role-map",
    "section-density-arc",
    "fusion-four-part",
  ]) {
    assert.ok(SUNO_PROMPT_MOVES.some((entry) => entry.key === key));
  }
  assert.ok(SUNO_STUDIO_MASTERING_MOVES.some((entry) => entry.key === "studio-mastering-general"));
  assert.equal(
    SUNO_STUDIO_MASTERING_MOVES.some((entry) => entry.key === "studio-mastering-taiwanese-pop"),
    false,
  );
  for (const key of [
    "studio-mastering-big-band-swing",
    "studio-mastering-jazz-fusion",
    "studio-mastering-1950s-rockabilly",
    "studio-mastering-1980s-new-wave",
    "studio-mastering-2000s-indie-rock",
    "studio-mastering-k-pop-dance",
    "studio-mastering-chinese-gufeng",
    "studio-mastering-indian-classical-fusion",
    "studio-mastering-french-chanson",
    "studio-mastering-amapiano",
    "studio-mastering-full-symphony",
    "studio-mastering-chicago-blues",
  ]) {
    assert.ok(SUNO_STUDIO_MASTERING_MOVES.some((entry) => entry.key === key));
  }
  assert.equal(
    new Set(SUNO_STUDIO_MASTERING_MOVES.map((entry) => entry.copy.en)).size,
    SUNO_STUDIO_MASTERING_MOVES.length,
  );
  assert.ok(BEATPORT_STUDIO_MASTERING_MOVES.every((entry) => entry.key.includes("studio-mastering-beatport-")));
  assert.equal(BEATPORT_STUDIO_MASTERING_MOVES.some((entry) => entry.title.en.includes("DJ tools")), false);
  for (const decade of ["1950s", "1960s", "1970s", "1980s", "1990s", "2000s"]) {
    assert.ok(SUNO_STUDIO_MASTERING_MOVES.some((entry) => entry.keywords.includes(decade)));
  }
  for (const key of ["enriched-section-cue", "singability-edit"]) {
    assert.ok(SUNO_LYRIC_MOVES.some((entry) => entry.key === key));
  }
});

test("genre crate and production flow remain complete and bilingual", () => {
  const genreTerms = SUNO_GENRE_GROUPS.flatMap((group) => group.terms);

  assert.ok(genreTerms.length >= 80);
  assert.equal(new Set(genreTerms.map((term) => term.toLocaleLowerCase())).size, genreTerms.length);
  assert.ok(SUNO_GENRE_GROUPS.every((group) => group.key && group.label.zh && group.label.en && group.terms.length > 0));
  assert.equal(AI_PRODUCTION_FLOW.length, 6);
  assert.ok(AI_PRODUCTION_FLOW.every((step) => step.title.zh && step.title.en && step.body.zh && step.body.en));
  assert.ok(AI_PRODUCTION_FLOW.some((step) => step.body.zh.includes("A&R") && step.body.zh.includes("留言")));
  assert.ok(AI_PRODUCTION_FLOW.some((step) => step.title.zh.includes("發表") && step.body.zh.includes("Showtime") && step.body.zh.includes("Choice")));
});

test("expanded Studio Mastering prompts are discoverable by genre, culture, and era", () => {
  const matchingKeys = (term) => {
    const query = term.toLocaleLowerCase();
    return SUNO_STUDIO_MASTERING_MOVES.filter((entry) => [
      entry.title.zh,
      entry.title.en,
      entry.summary.zh,
      entry.summary.en,
      entry.use.zh,
      entry.use.en,
      entry.copy.zh,
      entry.copy.en,
      ...entry.keywords,
    ].join(" ").toLocaleLowerCase().includes(query)).map((entry) => entry.key);
  };

  assert.ok(matchingKeys("jazz").length >= 7);
  assert.deepEqual(matchingKeys("1980s").sort(), ["studio-mastering-1980s-arena-rock", "studio-mastering-1980s-new-wave"]);
  assert.deepEqual(matchingKeys("印度").sort(), ["studio-mastering-bollywood-pop", "studio-mastering-indian-classical-fusion"]);
  assert.ok(matchingKeys("交響").includes("studio-mastering-full-symphony"));
  assert.ok(matchingKeys("獨立搖滾").includes("studio-mastering-2000s-indie-rock"));
  assert.ok(matchingKeys("French").includes("studio-mastering-french-chanson"));
  assert.ok(matchingKeys("古風").includes("studio-mastering-chinese-gufeng"));
  assert.ok(matchingKeys("wuxia").includes("studio-mastering-chinese-gufeng"));
});

test("Prompt and lyric finders explain their controls and expose clear states", () => {
  assert.match(biblePageComponent, /118 招 Prompt/);
  assert.match(biblePageComponent, /118 prompt moves/);
  assert.match(biblePageComponent, /document\.title = BIBLE_DOCUMENT_TITLES\[lang\]/);
  assert.match(practiceLibraryComponent, /找你需要的 Prompt 招式/);
  assert.match(practiceLibraryComponent, /Jazz、1980s、印度、交響、側鏈/);
  assert.match(practiceLibraryComponent, /找你需要的歌詞控制/);
  assert.match(practiceLibraryComponent, /aria-live="polite"/);
  assert.match(practiceLibraryComponent, /aria-pressed=\{selected\}/);
  assert.match(practiceLibraryComponent, /錄音室類型/);
  assert.match(practiceLibraryComponent, /STUDIO FAMILY/);
  assert.match(practiceLibraryComponent, /promptStudioFamily/);
  assert.match(practiceLibraryComponent, /清除 Prompt 搜尋/);
  assert.match(practiceLibraryComponent, /清除歌詞搜尋/);
  assert.match(practiceLibraryComponent, /目前顯示前 \$\{PROMPT_PREVIEW_COUNT\} 招，還有/);
  assert.match(practiceLibraryComponent, /收起，只看前 \$\{PROMPT_PREVIEW_COUNT\} 招/);
  assert.match(practiceLibraryComponent, /aria-controls="prompt-move-results"/);
  assert.match(practiceLibraryComponent, /還有 \$\{genreResults\.length - GENRE_PREVIEW_COUNT\} 組曲風分類/);
  assert.match(practiceLibraryComponent, /aria-controls="genre-crate-content"/);
  assert.match(practiceLibraryComponent, /展開 \$\{lyricResults\.length\} 招歌詞控制/);
  assert.match(practiceLibraryComponent, /aria-controls="production-flow-content"/);
  assert.doesNotMatch(practiceLibraryComponent, /showAllPrompt \|\| promptSearch \|\| promptCategory !== "all"/);
  assert.doesNotMatch(practiceLibraryComponent, /showAllLyric \|\| lyricSearch \|\| lyricCategory !== "all"/);
  assert.doesNotMatch(practiceLibraryComponent, /閱讀 Reddit 原文|Read Reddit guide|查看開源 Skill|View open skill/);
  assert.doesNotMatch(practiceLibraryComponent, /NEW SOURCE · COMMUNITY FIELD GUIDE/);
  assert.match(practiceLibraryComponent, /官方文件核對：2026-07-28/);
  assert.doesNotMatch(practiceLibraryComponent, /mt-3 flex gap-2 overflow-x-auto pb-1/);
});

test("Suno control desk keeps the P0 quick start, pre-flight, and troubleshooting sets complete", () => {
  assert.equal(SUNO_QUICK_START_FIELDS.length, 3);
  assert.deepEqual(SUNO_QUICK_START_FIELDS.map((item) => item.key), ["style", "lyrics", "title"]);
  assert.equal(SUNO_PREFLIGHT_ITEMS.length, 8);
  assert.equal(new Set(SUNO_PREFLIGHT_ITEMS.map((item) => item.key)).size, 8);
  assert.equal(SUNO_TROUBLESHOOTING.length, 6);
  assert.equal(new Set(SUNO_TROUBLESHOOTING.map((item) => item.key)).size, 6);
  assert.ok(SUNO_TROUBLESHOOTING.every((item) => item.symptom.zh && item.symptom.en && item.likely.zh && item.likely.en && item.move.zh && item.move.en));
  assert.match(referenceGuideComponent, /id="suno-control-desk"/);
  assert.match(referenceGuideComponent, /id="suno-preflight"/);
  assert.match(referenceGuideComponent, /id="suno-troubleshooting"/);
  assert.match(referenceGuideComponent, /內含 5 個實戰工具區/);
  assert.match(referenceGuideComponent, /展開完整起手式/);
  assert.match(referenceGuideComponent, /aria-controls="suno-control-desk-content"/);
  assert.match(referenceGuideComponent, /window\.addEventListener\("hashchange", openForHash\)/);
  assert.match(referenceGuideComponent, /document\.querySelector\(target\)\?\.scrollIntoView/);
  assert.match(referenceGuideComponent, /4–7 個 Style 重點與三版比較是實測工作法，不是 Suno 官方限制/);
});

test("version watch and rights guide point to official Suno guidance with separate dates", () => {
  assert.equal(SUNO_OFFICIAL_CROSS_CHECK_DATE, "2026-07-28");
  assert.equal(SUNO_FEATURE_WATCH.length, 3);
  assert.equal(SUNO_RIGHTS_GUIDE.length, 4);
  assert.ok([...SUNO_FEATURE_WATCH, ...SUNO_RIGHTS_GUIDE].every((item) => item.source.url.startsWith("https://help.suno.com/")));
  assert.match(referenceGuideComponent, /id="suno-version-watch"/);
  assert.match(referenceGuideComponent, /id="rights-release"/);
  assert.match(referenceGuideComponent, /這裡是風險檢查，不是法律意見/);
});

test("Suno command reference covers fields, tags, controls, editing, and problem routes", () => {
  assert.equal(SUNO_COMMAND_REFERENCE.length, 7);
  assert.equal(new Set(SUNO_COMMAND_REFERENCE.map((item) => item.key)).size, SUNO_COMMAND_REFERENCE.length);
  assert.deepEqual(new Set(SUNO_COMMAND_REFERENCE.map((item) => item.kind)), new Set(["field", "tag", "control", "edit"]));
  assert.ok(SUNO_COMMAND_REFERENCE.every((item) => (
    item.title.zh
    && item.title.en
    && item.syntax.zh
    && item.syntax.en
    && item.effect.zh
    && item.effect.en
    && item.caution.zh
    && item.caution.en
    && item.version.zh
    && item.version.en
    && ["official", "field", "version"].includes(item.evidence)
    && item.source.url.startsWith("https://")
    && item.keywords.length > 0
  )));
  assert.equal(SUNO_PROBLEM_ROUTES.length, 4);
  assert.equal(new Set(SUNO_PROBLEM_ROUTES.map((item) => item.key)).size, SUNO_PROBLEM_ROUTES.length);
  assert.ok(SUNO_PROBLEM_ROUTES.every((item) => item.title.zh && item.title.en && item.body.zh && item.body.en && item.href.startsWith("#")));
  assert.match(commandReferenceComponent, /id="suno-command-reference"/);
  assert.match(commandReferenceComponent, /PROBLEM ROUTER/);
  assert.match(commandReferenceComponent, /搜尋：Verse、滑桿、唱不清楚、Song Editor/);
  assert.match(commandReferenceComponent, /aria-pressed={kind === item}/);
  assert.match(commandReferenceComponent, /複製範例/);
  assert.match(commandReferenceComponent, /標籤是提示，不是保證命令/);
});

test("Bible command search exposes high-contrast navigation and keyboard controls", () => {
  assert.match(commandDockComponent, /搜尋整本聖經/);
  assert.match(commandDockComponent, /event\.metaKey \|\| event\.ctrlKey/);
  assert.match(commandDockComponent, /event\.key === "\/"/);
  assert.match(commandDockComponent, /ArrowDown/);
  assert.match(commandDockComponent, /ArrowUp/);
  assert.match(commandDockComponent, /role="dialog"/);
  assert.match(commandDockComponent, /aria-modal="true"/);
  assert.match(commandDockComponent, /overflow-x-auto/);
});

test("public starter stays compact, multilingual, and indexable without exposing the member catalog", () => {
  assert.deepEqual(Object.keys(PUBLIC_BIBLE_FAQ).sort(), ["en", "ja", "ko", "zh"]);
  assert.ok(Object.values(PUBLIC_BIBLE_FAQ).every((entries) => entries.length === 5));
  assert.match(publicFaqComponent, /AIPOGER PUBLIC STARTER/);
  assert.match(publicFaqComponent, /공개 스타터/);
  assert.match(publicFaqComponent, /公開スターター/);
  assert.match(publicFaqComponent, /useI18n/);
  assert.match(publicFaqComponent, /setLang\(activeLang\)/);
  assert.doesNotMatch(publicFaqComponent, /SUNO_ARTIST_DNA_ENTRIES|SUNO_PROMPT_RECIPES/);
  assert.match(bibleRoute, /"@type": "TechArticle"/);
  assert.match(bibleRoute, /"@type": "FAQPage"/);
  assert.match(bibleRoute, /summary_large_image/);
  assert.match(bibleRoute, /dangerouslySetInnerHTML/);
});

test("artist encyclopedia and AIPOGER additions become 772 unique, searchable sonic DNA references", () => {
  assert.equal(SUNO_ARTIST_DNA_ENTRIES.length, 772);
  assert.equal(SUNO_INSPIRATION_SOURCE.artist.suppliedEntries, 771);
  assert.equal(SUNO_INSPIRATION_SOURCE.artist.curatedEntries, 1);
  assert.equal(SUNO_INSPIRATION_SOURCE.artist.canonicalEntries, 772);
  assert.equal(new Set(SUNO_ARTIST_DNA_ENTRIES.map((entry) => entry.key)).size, 772);
  assert.equal(new Set(SUNO_ARTIST_DNA_ENTRIES.map((entry) => entry.artist.toLocaleLowerCase())).size, 772);
  assert.ok(SUNO_ARTIST_DNA_ENTRIES.every((entry) => (
    entry.artist
    && (entry.source === "aipoger" || (entry.sourcePage >= 3 && entry.sourcePage <= 38))
    && entry.tags.length >= 2
    && entry.summaryZh.length === 4
    && entry.prompt.includes("no direct artist imitation")
    && entry.searchText.includes(entry.artist.toLocaleLowerCase())
  )));

  const jocelynBrown = SUNO_ARTIST_DNA_ENTRIES.find((entry) => entry.artist === "Jocelyn Brown");
  assert.ok(jocelynBrown);
  assert.equal(jocelynBrown.source, "aipoger");
  assert.equal(jocelynBrown.sourcePage, null);
  assert.ok(jocelynBrown.summaryZh.includes("電子音樂"));
  assert.match(jocelynBrown.sourcePrompt, /powerhouse, soulful female lead vocal/i);
  assert.match(jocelynBrown.prompt, /gospel house/);
  assert.doesNotMatch(jocelynBrown.prompt, /Jocelyn Brown/i);
});

test("750 supplied prompts become 747 unique bilingual recipes", () => {
  assert.equal(SUNO_INSPIRATION_SOURCE.recipes.suppliedEntries, 750);
  assert.equal(SUNO_INSPIRATION_SOURCE.recipes.canonicalEntries, 747);
  assert.equal(SUNO_INSPIRATION_SOURCE.recipes.exactDuplicatesRemoved, 3);
  assert.equal(SUNO_PROMPT_RECIPES.length, 747);
  assert.equal(SUNO_RECIPE_GENRES.length, 10);
  assert.equal(new Set(SUNO_PROMPT_RECIPES.map((entry) => entry.key)).size, 747);

  const signatures = SUNO_PROMPT_RECIPES.map((entry) => [
    entry.genre,
    entry.vocal,
    entry.mood,
    entry.instrument,
    entry.story,
    entry.texture,
  ].join("|"));
  assert.equal(new Set(signatures).size, 747);
  assert.ok(SUNO_PROMPT_RECIPES.every((entry) => (
    entry.genreZh
    && entry.vocalZh
    && entry.moodZh
    && entry.instrumentZh
    && entry.storyZh
    && entry.textureZh
    && entry.prompt.includes(entry.genre)
  )));
});

test("large inspiration index exposes clear search, filter, copy, comment, and paging controls", () => {
  assert.match(practiceLibraryComponent, /SunoInspirationIndexSection/);
  assert.match(practiceLibraryComponent, /id="suno-inspiration-index"/);
  assert.match(inspirationIndexComponent, /聲音 DNA × Prompt 配方索引/);
  assert.match(inspirationIndexComponent, /772 組參考風格/);
  assert.match(inspirationIndexComponent, /747 組去重配方/);
  assert.match(inspirationIndexComponent, /aria-live="polite"/);
  assert.match(inspirationIndexComponent, /aria-pressed={selected}/);
  assert.match(inspirationIndexComponent, /複製聲音 DNA/);
  assert.match(inspirationIndexComponent, /複製英文 Prompt/);
  assert.match(inspirationIndexComponent, /BibleEntryCommentsDialog/);
  assert.match(inspirationIndexComponent, /再展開 12 筆/);
  assert.match(inspirationIndexComponent, /收起，只看前 12 筆/);
  assert.match(inspirationIndexComponent, /展開搜尋 1,519 筆資料/);
  assert.match(inspirationIndexComponent, /aria-controls="suno-inspiration-index-content"/);
  assert.doesNotMatch(inspirationIndexComponent, /overflow-x-auto/);
});

test("long Bible datasets start compact and clearly expose remaining material", () => {
  assert.match(biblePageComponent, /visibleTaiwaneseEntries = showAllTaiwanese \? filteredEntries : filteredEntries\.slice\(0, TAIWANESE_PREVIEW_COUNT\)/);
  assert.match(biblePageComponent, /還有 \$\{filteredEntries\.length - TAIWANESE_PREVIEW_COUNT\} 筆實測資料/);
  assert.match(biblePageComponent, /aria-controls="taiwanese-lab-results"/);
  assert.match(biblePageComponent, /收起，只看前 \$\{TAIWANESE_PREVIEW_COUNT\} 筆/);
  assert.match(referenceGuideComponent, /const \[guideOpen, setGuideOpen\] = useState\(false\)/);
  assert.match(readFileSync(new URL("../src/components/stem-separation-guide-section.tsx", import.meta.url), "utf8"), /const \[expanded, setExpanded\] = useState<string \| null>\(null\)/);
  assert.match(readFileSync(new URL("../src/components/stem-separation-guide-section.tsx", import.meta.url), "utf8"), /展開優缺點/);
  assert.match(readFileSync(new URL("../src/components/stem-separation-guide-section.tsx", import.meta.url), "utf8"), /展開全部 \$\{engines\.length\} 類引擎/);
});
