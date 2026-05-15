import fs from "node:fs";
import subsetFont from "subset-font";

const I18N = "src/lib/i18n.tsx";
const SOURCE = "src/assets/fonts/GlowSansTC-Normal-Regular.otf";
const OUT = "src/assets/fonts/GlowSansTC-battle.subset.woff2";

if (!fs.existsSync(SOURCE)) {
  console.error(
    `Missing ${SOURCE}. Download GlowSansTC-Normal-v0.93.zip from https://github.com/welai/glow-sans/releases and extract GlowSansTC-Normal-Regular.otf into src/assets/fonts/.`,
  );
  process.exit(1);
}

const extra =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ…—，。、「」『』【】：；（）？！％・/@#&*+=_|•♪★☆♡♥\n ";

const raw = fs.readFileSync(I18N, "utf8");
const text = Array.from(new Set(`${raw}${extra}`)).sort().join("");

const font = fs.readFileSync(SOURCE);
const buf = await subsetFont(font, text, { targetFormat: "woff2" });
fs.writeFileSync(OUT, buf);
console.log(`Wrote ${OUT} (${buf.length} bytes)`);
