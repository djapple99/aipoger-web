import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { loadTs, uuid } from "./helpers/choice-runtime.mjs";

const storage = "https://project.supabase.co";
const cover = `${storage}/storage/v1/object/public/listen-bar-covers/choice/cover.webp`;
const coverModel = loadTs("src/lib/choice-share-cover.ts", { "@/lib/listen-bar": { LISTEN_BAR_COVER_BUCKET: "listen-bar-covers" } });
const share = loadTs("src/lib/choice-share.ts");

test("cover previews fetch only the configured public cover bucket", () => {
  assert.equal(coverModel.isChoiceStorageCover(cover, storage), true);
  for (const value of ["http://project.supabase.co/storage/v1/object/public/listen-bar-covers/a.jpg", "https://other.test/a.jpg", `${storage}/storage/v1/object/private/listen-bar-covers/a.jpg`, `${storage}/storage/v1/object/public/private/a.jpg`, "not a URL", cover.replace("https://", "https://user:password@")]) {
    assert.equal(coverModel.isChoiceStorageCover(value, storage), false, value);
  }
});

test("share URLs preserve collection, language and a stable cover-specific cache version", () => {
  for (const kind of ["creator", "official"]) for (const lang of ["zh", "en", "ja", "ko"]) {
    const path = share.choiceSharePath(uuid(1), kind, lang, cover);
    const url = new URL(path, "https://aipoger.com");
    assert.equal(url.pathname, `/choice/${uuid(1)}`);
    assert.equal(url.searchParams.get("kind"), kind);
    assert.equal(url.searchParams.get("lang"), lang);
    assert.equal(url.searchParams.get("share"), share.choiceCoverVersion(cover));
    assert.equal(path, share.choiceSharePath(uuid(1), kind, lang, cover));
    assert.notEqual(path, share.choiceSharePath(uuid(1), kind, lang, `${cover}?updated`));
  }
});

function imageRoute(choice) {
  return loadTs("src/app/choice/[id]/share-image/route.ts", {
    sharp: { default: sharp },
    "@/lib/server-choice-share-metadata": { loadChoiceShareMetadata: async () => choice },
    "@/lib/choice-share-cover": { isChoiceStorageCover: url => coverModel.isChoiceStorageCover(url, storage) },
  }).GET;
}

test("playlist metadata points to its own JPEG cover and agrees with the share buttons in all languages", async () => {
  for (const kind of ["creator", "official"]) {
    const choice = { kind, title: "酒到濃時愛聽歌", curatorName: "愛波哥", intro: "這是歌單介紹", imageUrl: cover };
    const { generateMetadata } = loadTs("src/app/choice/[id]/page.tsx", {
      "@/lib/server-choice-share-metadata": { loadChoiceShareMetadata: async () => choice },
      "@/lib/choice-share-cover": { isChoiceStorageCover: url => coverModel.isChoiceStorageCover(url, storage) },
      "./choice-client": { default: () => null },
    });
    for (const lang of ["zh", "en", "ja", "ko"]) {
      const metadata = await generateMetadata({ params: Promise.resolve({ id: uuid(1) }), searchParams: Promise.resolve({ lang }) });
      assert.equal(metadata.openGraph.title, choice.title);
      assert.equal(metadata.openGraph.description, choice.intro);
      assert.equal(new URL(metadata.openGraph.url).pathname + new URL(metadata.openGraph.url).search, share.choiceSharePath(uuid(1), kind, lang, cover));
      assert.deepEqual(metadata.openGraph.images[0], { url: `https://aipoger.com${share.choiceShareImagePath(uuid(1), cover)}`, alt: choice.title, width: 800, height: 800, type: "image/jpeg" });
      assert.equal(metadata.twitter.images[0], metadata.openGraph.images[0].url);
      assert.equal(metadata.alternates.canonical, metadata.openGraph.url);
    }
  }
});

test("published cover thumbnail is a small 800px JPEG and preserves the complete artwork", async () => {
  const input = await sharp({ create: { width: 1600, height: 800, channels: 4, background: "#ee6600" } }).webp().toBuffer();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, cover); assert.equal(options.redirect, "error");
    return new Response(input, { headers: { "Content-Type": "image/webp" } });
  };
  try {
    const response = await imageRoute({ imageUrl: cover })(new Request("https://aipoger.com"), { params: Promise.resolve({ id: uuid(1) }) });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "image/jpeg");
    assert.match(response.headers.get("cache-control"), /s-maxage=300/);
    const output = Buffer.from(await response.arrayBuffer());
    assert.ok(output.byteLength < 200_000);
    const metadata = await sharp(output).metadata();
    assert.equal(metadata.width, 800); assert.equal(metadata.height, 800); assert.equal(metadata.format, "jpeg");
    const pixel = await sharp(output).extract({ left: 400, top: 100, width: 1, height: 1 }).raw().toBuffer();
    assert.ok(pixel[0] < 30 && pixel[1] < 30, "wide cover must be contained, not cropped");
  } finally { globalThis.fetch = originalFetch; }
});

test("unpublished, missing and untrusted covers do not fetch or produce a thumbnail", async () => {
  const originalFetch = globalThis.fetch; let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error("must not fetch"); };
  try {
    for (const choice of [null, { imageUrl: "" }, { imageUrl: "https://untrusted.test/private.jpg" }]) {
      const response = await imageRoute(choice)(new Request("https://aipoger.com"), { params: Promise.resolve({ id: uuid(1) }) });
      assert.equal(response.status, 404); assert.equal(response.headers.get("cache-control"), "no-store");
    }
    assert.equal(calls, 0);
  } finally { globalThis.fetch = originalFetch; }
});

test("failed cover downloads are retryable and never cached as successful images", async () => {
  const originalFetch = globalThis.fetch; const originalError = console.error;
  console.error = () => {};
  try {
    for (const response of [new Response(null, { status: 404 }), new Response("not an image", { headers: { "Content-Type": "text/html" } }), new Response(null, { headers: { "Content-Type": "image/jpeg", "Content-Length": String(11 * 1024 * 1024) } })]) {
      globalThis.fetch = async () => response;
      const result = await imageRoute({ imageUrl: cover })(new Request("https://aipoger.com"), { params: Promise.resolve({ id: uuid(1) }) });
      assert.equal(result.status, 503); assert.equal(result.headers.get("cache-control"), "no-store");
    }
  } finally { globalThis.fetch = originalFetch; console.error = originalError; }
});

test("LINE crawlers get blocking metadata without dropping Next's existing crawler coverage", () => {
  const config = loadTs("next.config.ts").default;
  const { HTML_LIMITED_BOT_UA_RE } = loadTs("node_modules/next/dist/shared/lib/router/utils/html-bots.js");
  for (const agent of HTML_LIMITED_BOT_UA_RE.source.split("|")) {
    if (!agent.includes("[")) assert.ok(config.htmlLimitedBots.test(agent), agent);
  }
  for (const agent of ["facebookexternalhit/1.1; line-poker/1.0", "line-poker/1.0", "Line/14.0.0", "Mozilla/5.0 (iPhone) Line/26.1.0"]) assert.ok(config.htmlLimitedBots.test(agent), agent);
  assert.equal(config.htmlLimitedBots.test("Mozilla/5.0 Chrome/130 Safari/537.36"), false);
});
