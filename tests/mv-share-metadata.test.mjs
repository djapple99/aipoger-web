import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import { loadTs, uuid } from './helpers/choice-runtime.mjs';

const id = uuid(22);
const work = { id, title: '還沒學會忘記', artist: 'Junna Lin', description: '創作者的作品介紹', videoId: 'NXeLr7SaePI' };

function loader(works = [work]) {
  let reads = 0;
  const loaded = loadTs('src/lib/server-mv-share-metadata.ts', {
    'server-only': {}, './server-home-discovery': { readMvDiscovery: async () => { reads++; return { works }; } },
  });
  return { load: loaded.loadMvShareMetadata, reads: () => reads };
}

function page(load) {
  const compiled = ts.transpileModule(readFileSync(new URL('../src/app/mv/page.tsx', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const modules = {
    'react/jsx-runtime': {}, 'next/headers': { headers: async () => new Headers({ 'x-aipoger-lang': 'zh' }) },
    '@/components/mv-gallery': {}, '@/lib/mv-copy': loadTs('src/lib/mv-copy.ts'),
    '@/lib/locale': loadTs('src/lib/locale.ts'), '@/lib/server-mv-share-metadata': { loadMvShareMetadata: load },
  };
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', compiled)(name => {
    assert.ok(Object.hasOwn(modules, name), name); return modules[name];
  }, loaded, loaded.exports);
  return query => loaded.exports.generateMetadata({ searchParams: Promise.resolve(query) });
}

test('MV metadata selects the matching public work and highest available video cover', async t => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options }); return new Response(null, { headers: { 'content-type': 'image/jpeg' } });
  });
  const x = loader([{ ...work, id: uuid(23), videoId: 'aaaaaaaaaaa' }, work]);
  const result = await x.load(id);
  assert.equal(result.title, work.title);
  assert.equal(result.image.url, 'https://i.ytimg.com/vi/NXeLr7SaePI/maxresdefault.jpg');
  assert.equal(calls.length, 1); assert.equal(calls[0].options.method, 'HEAD');
  assert.equal(calls[0].options.redirect, 'error'); assert.ok(calls[0].options.signal);
  assert.equal('lyrics' in result, false);
});

test('missing high resolution thumbnails fall back to the same video, including network failures', async t => {
  for (const fallback of ['sddefault', 'hqdefault']) {
    const calls = [];
    t.mock.method(globalThis, 'fetch', async url => {
      calls.push(url);
      if (fallback === 'hqdefault') throw new Error('unavailable');
      return new Response(null, { status: url.includes('maxresdefault') ? 404 : 200, headers: { 'content-type': 'image/jpeg' } });
    });
    const result = await loader().load(id);
    assert.equal(result.image.url, `https://i.ytimg.com/vi/NXeLr7SaePI/${fallback}.jpg`);
    assert.equal(calls.length, 2);
    t.mock.restoreAll();
  }
});

test('invalid, hidden, missing, and non-video works expose no MV metadata or thumbnail requests', async t => {
  t.mock.method(globalThis, 'fetch', async () => { assert.fail('unexpected thumbnail fetch'); });
  const x = loader();
  for (const value of ['bad', '', id + '?private=1']) assert.equal(await x.load(value), null);
  assert.equal(x.reads(), 0);
  assert.equal(await loader([]).load(id), null);
  assert.equal(await loader([{ ...work, videoId: null }]).load(id), null);
  assert.equal(await loader([{ ...work, videoId: '../unsafe' }]).load(id), null);
});

for (const lang of ['zh', 'en', 'ja', 'ko']) test(`MV sharing preserves cover, identity and track in canonical and social URLs (${lang})`, async () => {
  const image = { url: 'https://i.ytimg.com/vi/NXeLr7SaePI/maxresdefault.jpg', width: 1280, height: 720 };
  const metadata = await page(async value => { assert.equal(value, id); return { ...work, image }; })({ lang, track: id, private: 'discard' });
  assert.equal(metadata.title.absolute, `${work.title} — ${work.artist}｜AIPOGER`);
  assert.ok(metadata.description.includes(work.description));
  assert.equal(metadata.alternates.canonical, `/mv?lang=${lang}&track=${id}`);
  assert.equal(metadata.openGraph.url, metadata.alternates.canonical);
  assert.equal(metadata.openGraph.images[0].url, image.url);
  assert.deepEqual(metadata.twitter.images, [image.url]);
  for (const path of Object.values(metadata.alternates.languages)) assert.ok(path.endsWith(`&track=${id}`));
});

test('gallery, unavailable work, repeated parameters and source failures retain generic safe metadata', async () => {
  for (const query of [{ lang: 'en' }, { lang: 'en', track: id }, { lang: ['en', 'ko'], track: [id, uuid(23)] }]) {
    const metadata = await page(async () => null)(query);
    assert.ok(!metadata.alternates.canonical.includes('track='));
    assert.equal(metadata.openGraph.images[0].alt, 'AIPOGER');
  }
  const metadata = await page(async () => { throw new Error('discovery offline'); })({ track: id });
  assert.equal(metadata.alternates.canonical, '/mv?lang=zh');
  assert.ok(!JSON.stringify(metadata).includes(work.title));
});
