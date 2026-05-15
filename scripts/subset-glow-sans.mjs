import fs from "node:fs";
import subsetFont from "subset-font";

/** 從 https://github.com/welai/glow-sans/releases 解壓 GlowSansSC-Normal-Regular.otf 後執行 */
const SOURCE = "src/assets/fonts/GlowSansSC-Normal-Regular.otf";
if (!fs.existsSync(SOURCE)) {
  console.error(`Missing ${SOURCE}. Download GlowSansSC-Normal-v0.93.zip first.`);
  process.exit(1);
}
const OUT = "src/assets/fonts/GlowSansSC-Normal-Regular.subset.woff2";
/** 與 i18n zh home_tagline 同步 */
const TEXT = "在 AI 節奏交鋒之處，流淌著真實的音樂血液";

const font = fs.readFileSync(SOURCE);
const out = await subsetFont(font, TEXT, { targetFormat: "woff2" });
fs.writeFileSync(OUT, out);
console.log(`Wrote ${OUT} (${out.length} bytes)`);
