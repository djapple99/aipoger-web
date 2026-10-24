import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadTs, mockAdmin, uuid } from './helpers/choice-runtime.mjs';

const css = new Proxy({}, { get: (_, key) => String(key) });
const nothing = () => null;
const Link = ({ href, children }) => React.createElement('a', { href }, children);
const player = { useMusicPlayer: () => ({ playing: false, session: null }), musicPlayer: {} };
const work = { id: uuid(70), title: 'SSR 真實作品', artist: '公開舞台名', genre: 'pop', description: '作品介紹', videoId: 'NXeLr7SaePI',
  coverUrl: 'https://i.ytimg.com/vi/NXeLr7SaePI/hqdefault.jpg', publishedAt: '2026-10-24T08:00:00Z', audioUrl: '', lyrics: null, weeklyHearts: 2, workKind: 'single' };
function common(lang) {
  return {
    'next/link': { default: Link }, 'next/dynamic': { default: () => nothing },
    'next/navigation': { useRouter: () => ({}), notFound: () => { throw new Error('PUBLIC_404'); } },
    '@/lib/i18n': { useI18n: () => ({ lang, t: key => key }) },
    '@/lib/server-public-locale': { requestLang: async () => lang },
    '@/lib/music-player-store': player, '@/lib/supabase': { supabase: {} },
    '@/components/editorial-header': { default: nothing }, '@/components/work-image': { default: nothing },
    '@/components/share-button': { default: nothing }, '@/components/social-icons': { SocialIcon: nothing },
    './participation-guide': { default: nothing },
    './home-editorial.module.css': { default: css }, './mv-gallery.module.css': { default: css },
    './bible-home.module.css': { default: css }, './lyrics-popover.module.css': { default: css },
    '@/lib/use-mv-hearts': { useMvHearts: () => ({ hearts: {}, ready: false, busyId: null }) },
  };
}

for (const lang of ['zh', 'en', 'ja', 'ko']) test(`initial Home and MV HTML contains works without running client effects (${lang})`, () => {
  const mocks = common(lang);
  const Home = loadTs('src/components/home-editorial.tsx', mocks).default;
  const Mv = loadTs('src/components/mv-gallery.tsx', mocks).default;
  for (const [Component, initialData] of [[Home, { featured: [work], singles: [{ ...work, id: uuid(71), videoId: null }], week: {}, featureKind: 'mv' }],
    [Mv, { featured: [work], works: [work], channels: [] }]]) {
    const html = renderToStaticMarkup(React.createElement(Component, { initialData }));
    assert.ok(html.includes(work.title)); assert.ok(html.includes(work.artist));
    assert.ok(html.includes(`/works/${work.id}?lang=${lang}`));
    assert.ok(!html.includes('Finding works')); assert.ok(!html.includes('Lyrics not provided'));
  }
});

for (const lang of ['zh', 'en', 'ja', 'ko']) test(`public guide renders only approved FAQ content, localized CTA and stable metadata (${lang})`, async () => {
  const mocks = common(lang);
  mocks['@/components/bible-creation-cta'] = loadTs('src/components/bible-creation-cta.tsx', mocks);
  mocks['@/components/seo-json-ld'] = { default: nothing };
  const articles = loadTs('src/lib/bible-public-articles.ts');
  const page = loadTs('src/app/ai-music-bible/[slug]/page.tsx', mocks);
  for (const article of articles.publicBibleArticles(lang)) {
    const props = { params: Promise.resolve({ slug: article.slug }), searchParams: Promise.resolve({ lang }) };
    const html = renderToStaticMarkup(await page.default(props));
    assert.ok(html.includes(article.title));
    assert.ok(html.includes(article.summary.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll("'", '&#x27;')));
    assert.ok(html.includes(`/profile?lang=${lang}&amp;submit=1#submit-work`));
    assert.ok(html.includes(`/battle?lang=${lang}`));
    assert.ok(!html.includes('Finding works')); assert.ok(!html.includes('SOUND_DNA'));
    const metadata = await page.generateMetadata(props);
    assert.equal(metadata.alternates.canonical, `https://aipoger.com/ai-music-bible/${article.slug}?lang=${lang}`);
    assert.equal(Object.keys(metadata.alternates.languages).length, 5);
    assert.equal(metadata.openGraph.type, 'article');
    assert.match(metadata.openGraph.images[0].url, /^https:\/\/aipoger.com\/ai-music-bible\//);
    assert.equal(metadata.twitter.card, 'summary_large_image');
  }
  await assert.rejects(page.default({ params: Promise.resolve({ slug: 'private-member-recipe' }), searchParams: Promise.resolve({ lang }) }), /PUBLIC_404/);
});

test('public work route renders original identity and rejects hidden or unknown works', async () => {
  const mocks = common('zh');
  mocks['@/lib/server-home-discovery'] = { readPublicWorkDetail: async id => id === work.id ? { work, externalMedia: null } : null };
  mocks['@/lib/server-albums'] = { readPublicAlbums: async () => [] };
  mocks['@/lib/share-cover-source'] = { canRenderShareCover: () => true };
  mocks['@/components/album-view'] = { default: nothing };
  mocks['./work-client'] = { default: nothing };
  mocks['@/components/seo-json-ld'] = { default: nothing };
  const page = loadTs('src/app/works/[id]/page.tsx', mocks);
  const props = { params: Promise.resolve({ id: work.id }), searchParams: Promise.resolve({ lang: 'zh' }) };
  const html = renderToStaticMarkup(await page.default(props));
  assert.ok(html.includes(`<h1`)); assert.ok(html.includes(work.title)); assert.ok(html.includes(work.artist)); assert.ok(html.includes(work.description));
  const metadata = await page.generateMetadata(props);
  assert.equal(metadata.alternates.canonical, `https://aipoger.com/works/${work.id}?lang=zh`);
  assert.match(metadata.openGraph.images[0].url, /opengraph-image\?v=cover3-/);
  await assert.rejects(page.default({ ...props, params: Promise.resolve({ id: uuid(999) }) }), /PUBLIC_404/);
});

test('sitemap paginates published playlists, deduplicates, localizes real pages and fails on incomplete scans', async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.invalid'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'fixture-only';
  const admin = mockAdmin({ aipoger_choice_collections: [{ id: uuid(80), is_published: true, updated_at: '2026-10-24T08:00:00Z' }, { id: uuid(81), is_published: false }],
    aipoger_creator_choice_collections: [{ id: uuid(82), is_published: true }],
  });
  let fail = false;
  const { readPublicSitemap: sitemap } = loadTs('src/lib/server-public-sitemap.ts', {
    'next/cache': { unstable_cache: fn => fn }, '@supabase/supabase-js': { createClient: () => admin },
    '@/lib/server-home-discovery': { readPublicWorkIndex: async () => { if (fail) throw new Error('incomplete'); return [work, work, { ...work, id: uuid(83), workKind: 'album' }]; } },
    '@/lib/server-albums': { readPublicAlbums: async () => [] },
    '@/lib/server-public-battles': { readPublicBattles: async () => ({ live: [{ id: uuid(84) }], pool: [{ id: uuid(84) }], qCrash: [{ cardId: uuid(85) }] }) },
  });
  const rows = await sitemap(), urls = rows.map(row => row.url);
  assert.equal(new Set(urls).size, urls.length);
  for (const lang of ['zh', 'en', 'ja', 'ko']) {
    assert.ok(urls.includes(`https://aipoger.com/works/${work.id}?lang=${lang}`));
    assert.ok(urls.includes(`https://aipoger.com/choice/${uuid(82)}?lang=${lang}&kind=creator`));
  }
  assert.ok(!urls.some(url => url.includes(uuid(81)) || url.includes(uuid(83)) || /profile|setup|weekly-drop|listen-bar/.test(url)));
  assert.ok(!urls.some(url => /q-crash.*lang=(ja|ko)|earworm.*lang=(en|ja|ko)/.test(url)));
  assert.ok(rows.filter(row => row.url.includes('/works/')).every(row => row.lastModified === undefined));
  const entry = rows.find(row => row.url.includes(uuid(80))); assert.equal(entry.lastModified.toISOString(), '2026-10-24T08:00:00.000Z');
  assert.equal(new URL(entry.alternates.languages.ja).searchParams.get('kind'), 'official');
  assert.ok(admin.operations.every(op => op.action === 'read'));
  fail = true; await assert.rejects(sitemap(), /incomplete/);
});

test('read-only Q Crash catalog never settles expired voting cards; existing API default still settles once', async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.invalid'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'fixture-only';
  const card = { id: uuid(90), founder_queue_id: uuid(91), battle_id: uuid(92), status: 'q_crash_voting', voting_ends_at: '2020-01-01T00:00:00Z' };
  let settlements = 0;
  const query = { select: () => query, in: () => query, order: () => query, limit: () => query, returns: async () => ({ data: [card], error: null }) };
  const { qCrashCatalogResponse } = loadTs('src/lib/server-q-crash-catalog.ts', {
    '@supabase/supabase-js': { createClient: () => ({ from: () => query }) },
    '@/lib/server-q-crash': { settleQCrashBattle: async () => { settlements++; } },
    'next/server': { NextResponse: { json: value => Response.json(value) } },
  });
  assert.deepEqual((await (await qCrashCatalogResponse(false)).json()).cards, []); assert.equal(settlements, 0);
  await qCrashCatalogResponse(); assert.equal(settlements, 1);
});

test('missing and whitespace lyrics render no trigger or dialog, while real lyrics retain the control', () => {
  const { default: Lyrics } = loadTs('src/components/lyrics-popover.tsx', common('en'));
  for (const lyrics of [null, '', '   \n']) assert.equal(renderToStaticMarkup(React.createElement(Lyrics, { title: work.title, artist: work.artist, lyrics, lang: 'en' })), '');
  const html = renderToStaticMarkup(React.createElement(Lyrics, { title: work.title, artist: work.artist, lyrics: 'Real lyric', lang: 'en' }));
  assert.ok(html.includes('View lyrics')); assert.ok(!html.includes('Lyrics not provided'));
});


test('sitemap XML escapes query separators and attribute characters without changing actual URLs', () => {
  const { sitemapXml } = loadTs('src/lib/sitemap-xml.ts');
  const url = 'https://aipoger.com/choice/test?lang=zh&kind=creator';
  const xml = sitemapXml([{ url, alternates: { languages: { en: url.replace('zh', 'en') } } }]);
  assert.ok(xml.includes('<loc>https://aipoger.com/choice/test?lang=zh&amp;kind=creator</loc>'));
  assert.ok(xml.includes('href="https://aipoger.com/choice/test?lang=en&amp;kind=creator"'));
  assert.ok(!xml.includes('&kind=')); assert.ok(!xml.includes('&amp;amp;'));
});

for (const path of ['/works/' + uuid(70), '/ai-music-bible/short-prompts']) test(`editorial subpages suppress the legacy floating home and language controls (${path})`, () => {
  const mocks = { ...common('zh'), 'next/navigation': { usePathname: () => path }, 'next/image': { default: nothing },
    '@/components/lang-toggle': { default: () => { throw new Error('duplicate toggle'); } } };
  for (const name of ['nav-home-link', 'global-lang-toggle']) {
    const Component = loadTs(`src/components/${name}.tsx`, mocks).default;
    assert.equal(renderToStaticMarkup(React.createElement(Component)), '');
  }
});
