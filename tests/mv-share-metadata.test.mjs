import assert from 'node:assert/strict';
import test from 'node:test';
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
  const shared = loadTs('src/lib/public-seo.ts');
  const workSeo = loadTs('src/lib/server-work-seo.ts', {
    'server-only': {}, '@/lib/public-seo': shared,
    '@/lib/choice-share': loadTs('src/lib/choice-share.ts'),
    '@/lib/share-cover-source': { canRenderShareCover: () => true },
  });
  const loaded = loadTs('src/app/mv/page.tsx', {
    'react/jsx-runtime': {}, 'next/navigation': { notFound() { throw new Error('404'); } },
    '@/components/mv-gallery': {}, '@/lib/mv-copy': loadTs('src/lib/mv-copy.ts'),
    '@/lib/server-public-locale': { requestLang: async value => shared.publicLang(value) },
    '@/lib/public-seo': shared, '@/lib/server-work-seo': workSeo,
    '@/lib/server-home-discovery': {
      readMvDiscovery: async () => ({ works: [] }),
      readPublicWorkDetail: async value => {
        const result = await load(value);
        return result ? { work: { genre: 'Pop', coverUrl: result.image?.url, ...result } } : null;
      },
    },
  });
  return query => loaded.generateMetadata({ searchParams: Promise.resolve(query) });
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
  assert.equal(metadata.alternates.canonical, `https://aipoger.com/works/${id}?lang=${lang}`);
  assert.equal(metadata.openGraph.url, metadata.alternates.canonical);
  const socialImage = metadata.openGraph.images[0];
  assert.match(socialImage.url, new RegExp(`^https://aipoger.com/works/${id}/opengraph-image\\?v=cover3-`));
  assert.equal(socialImage.width, 1200); assert.equal(socialImage.height, 630);
  assert.deepEqual(metadata.twitter.images, [socialImage.url]);
  for (const path of Object.values(metadata.alternates.languages)) assert.ok(path.includes(`/works/${id}?lang=`));
});

test('gallery has localized canonical metadata; unavailable requested works are not indexed and source outages retry', async () => {
  const metadata = await page(async () => null)({ lang: 'en' });
  assert.equal(metadata.alternates.canonical, 'https://aipoger.com/mv?lang=en');
  assert.equal(metadata.openGraph.images[0].alt, 'AIPOGER');
  assert.deepEqual(await page(async () => null)({ lang: 'en', track: id }), { robots: { index: false } });
  await assert.rejects(page(async () => { throw new Error('discovery offline'); })({ track: id }), /discovery offline/);
});
