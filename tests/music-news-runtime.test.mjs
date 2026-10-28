import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadTs } from './helpers/choice-runtime.mjs';
const { publishedMusicNews, musicNewsArticle, musicNewsCopy } = loadTs('src/lib/music-news.ts');
const article = musicNewsArticle("youtube-music-ai-labels");
const empty = () => null;
function mocks(lang) { return {
 'next/link':{default:({href,children,...props})=>React.createElement('a',{href,...props},children)},
 'next/image':{default:({src,alt,width,height})=>React.createElement('img',{src,alt,width,height})},
 'next/navigation':{notFound:()=>{throw new Error('NEWS_404');}},
 '@/lib/server-public-locale':{requestLang:async()=>lang},
 '@/components/editorial-header':{default:empty},'@/components/share-button':{default:empty},
 '@/components/music-news-discussion':{default:empty},
 '@/lib/server-news-popularity':{newsPopularity:async()=>({slugs:publishedMusicNews().map(a=>a.slug),status:'empty'})},
 '@/components/seo-json-ld':{default:({data})=>React.createElement('script',{type:'application/ld+json',dangerouslySetInnerHTML:{__html:JSON.stringify(data)}})},
};}
for(const lang of ['zh','en','ja','ko']) test(`news has crawlable content and truthful language (${lang})`, async()=>{
 const deps=mocks(lang), index=loadTs('src/app/news/page.tsx',deps), detail=loadTs('src/app/news/[slug]/page.tsx',deps);
 const Shelf=loadTs('src/components/latest-music-news.tsx',deps).default;
 const props={params:Promise.resolve({slug:article.slug}),searchParams:Promise.resolve({lang})};
 const indexHtml=renderToStaticMarkup(await index.default(props)), shelfHtml=renderToStaticMarkup(React.createElement(Shelf,{lang})), html=renderToStaticMarkup(await detail.default(props));
 for(const rendered of [indexHtml,html]){assert.ok(rendered.includes(article.title));assert.ok(!rendered.includes('Finding works'));}
 assert.ok(shelfHtml.includes(publishedMusicNews()[0].title));
 assert.ok(indexHtml.includes(musicNewsCopy[lang].title));assert.ok(shelfHtml.includes(musicNewsCopy[lang].latest));
 assert.ok(html.indexOf('30 秒先看懂')<html.indexOf('01 / 製作方式'));
 assert.ok(html.includes('愛波哥怎麼看'));assert.ok(html.includes('晚餐都涼了'));assert.ok(html.includes('<article lang="zh-Hant">'));
 assert.ok(html.includes('https://support.google.com/youtube/answer/17124251'));assert.ok(html.includes('https://support.google.com/youtube/answer/14328491'));
 assert.ok(html.includes('不是播放量或音樂分潤的保證'));assert.ok(html.includes('非實際操作介面'));
 if(lang!=='zh')assert.ok(html.includes(musicNewsCopy[lang].languageNote));
 const metadata=await detail.generateMetadata(props);
 assert.equal(metadata.alternates.canonical,'https://aipoger.com/news/youtube-music-ai-labels?lang=zh');
 assert.deepEqual(Object.keys(metadata.alternates.languages),['zh-Hant','x-default']);
 assert.equal(metadata.openGraph.type,'article');assert.equal(metadata.openGraph.locale,'zh_TW');
 assert.equal(metadata.openGraph.images[0].url,'https://aipoger.com/news/youtube-music-ai-labels.png');assert.equal(metadata.twitter.card,'summary_large_image');
 assert.ok(html.includes('"@type":"NewsArticle"'));assert.ok(html.includes('"inLanguage":"zh-Hant"'));
 assert.equal((await index.generateMetadata(props)).alternates.canonical,`https://aipoger.com/news?lang=${lang}`);
});
test('unknown news does not resolve to another article or enter static params',async()=>{
 const page=loadTs('src/app/news/[slug]/page.tsx',mocks('zh'));
 assert.equal(musicNewsArticle('missing-news'),undefined);
 assert.deepEqual(page.generateStaticParams(),publishedMusicNews().map(({slug})=>({slug})));
 assert.equal(page.generateStaticParams().length,5);
 await assert.rejects(page.default({params:Promise.resolve({slug:'missing-news'}),searchParams:Promise.resolve({})}),/NEWS_404/);
 assert.equal((await page.generateMetadata({params:Promise.resolve({slug:'missing-news'})})).robots.index,false);
});
test('news artwork is a real 1200 x 630 PNG',()=>{
 const bytes=readFileSync(new URL('../public/news/youtube-music-ai-labels.png',import.meta.url));
 assert.equal(bytes.subarray(1,4).toString(),'PNG');assert.equal(bytes.readUInt32BE(16),1200);assert.equal(bytes.readUInt32BE(20),630);
 assert.ok(bytes.length<150_000);
});

for(const slug of ['suno-reservoir-lawsuit-commercial-rights','spotify-believe-licensed-ai-remixes','sba-creator-small-business-guidance']) {
 test(`news renders its own body, sources and metadata: ${slug}`,async()=>{
  const story=musicNewsArticle(slug), page=loadTs('src/app/news/[slug]/page.tsx',mocks('zh'));
  const props={params:Promise.resolve({slug}),searchParams:Promise.resolve({lang:'zh'})};
  const html=renderToStaticMarkup(await page.default(props));
  assert.ok(html.includes(story.title));assert.ok(html.includes(story.deck));assert.ok(html.includes(story.coverCaption));
  assert.ok(!html.includes('晚餐都涼了')); // A valid slug must not fall back to the original YouTube body.
  assert.ok(html.indexOf('30 秒先看懂')<html.indexOf('01 /'));
  const json=JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  assert.deepEqual(json.citation,story.sources.map(x=>x.url));assert.equal(json.headline,story.title);
  assert.equal(json.mainEntityOfPage,`https://aipoger.com/news/${slug}?lang=zh`);
  const metadata=await page.generateMetadata(props);
  assert.equal(metadata.openGraph.images[0].url,`https://aipoger.com${story.cover}`);
  assert.equal(metadata.twitter.card,'summary_large_image');
  const bytes=readFileSync(new URL(`../public${story.cover}`,import.meta.url));
  assert.equal(bytes.subarray(1,4).toString(),'PNG');assert.equal(bytes.readUInt32BE(16),1200);assert.equal(bytes.readUInt32BE(20),630);assert.ok(bytes.length<150_000);
  if(slug.startsWith('suno')) { assert.ok(html.includes('不是法院判決'));assert.ok(html.includes('合規下載'));assert.ok(html.includes('2026 年 9 月 3 日')); }
  else if(slug.startsWith('spotify')) { assert.ok(html.includes('工具仍待推出'));assert.ok(html.includes('接受或拒絕'));assert.ok(html.includes('不能把它解讀成')); }
  else { assert.ok(html.includes('原本就可能取得 SBA 支援'));assert.ok(html.includes('不是 SBA 申請文件清單'));assert.ok(html.includes('5122 / 錄音產業')); }
 });
}
test('home keeps its existing cards while news index has one lead and all five accessible cover-only links',async()=>{
 const deps=mocks('zh'), Shelf=loadTs('src/components/latest-music-news.tsx',deps).default;
 const Index=loadTs('src/app/news/page.tsx',deps).default;
 const shelf=renderToStaticMarkup(React.createElement(Shelf,{lang:'zh'}));
 assert.equal((shelf.match(/class="music-news-card"/g)||[]).length,3);
 assert.equal((shelf.match(/data-news-card="companion"/g)||[]).length,2);
 const html=renderToStaticMarkup(await Index({searchParams:Promise.resolve({lang:'zh'})}));
 assert.equal((html.match(/class="music-news-card"/g)||[]).length,1);
 assert.ok(html.includes('熱門新聞'));assert.ok(html.includes('尚無互動'));
 const grid=html.split('class="music-news-cover-grid"')[1].split('</section>')[0];
 assert.equal((grid.match(/<article/g)||[]).length,5);
 assert.ok(!grid.includes('music-news-card-body'));assert.ok(!grid.includes('aria-hidden'));assert.ok(!grid.includes('tabindex="-1"'));
 for(const story of publishedMusicNews()) {assert.ok(grid.includes(`/news/${story.slug}?lang=zh`));assert.ok(grid.includes(`aria-label="${story.title}"`));assert.ok(grid.includes(story.cover));}
});

for(const lang of ['zh','en','ja','ko']) test(`news popularity status is truthful and links retain language (${lang})`,()=>{
 const Index=loadTs('src/components/music-news-index.tsx',mocks(lang)).default;
 const stories=publishedMusicNews(),slugs=[stories[2].slug,stories[0].slug];
 for(const [status,key] of [['ranked','popularOrder'],['empty','popularEmpty'],['unavailable','popularUnavailable']]) {
  const html=renderToStaticMarkup(React.createElement(Index,{articles:stories,lang,popularity:{slugs,status}}));
  assert.ok(html.includes(musicNewsCopy[lang][key]));
  const ranking=html.split('<aside')[1].split('</aside>')[0];
  assert.ok(ranking.indexOf(slugs[0])<ranking.indexOf(slugs[1]));
  for(const slug of slugs)assert.ok(ranking.includes(`/news/${slug}?lang=${lang}`));
 }
 assert.equal(renderToStaticMarkup(React.createElement(Index,{articles:[],lang,popularity:{slugs:[],status:'empty'}})),'');
});

test('news layout handles sparse editions and additional stories without duplication or empty slots',()=>{
 const Grid=loadTs('src/components/music-news-grid.tsx',mocks('zh')).default;
 const fixtures=Array.from({length:6},(_,i)=>({...article,slug:`fixture-${i}`,title:`Story ${i}`}));
 for(const count of [0,1,2,3,6])for(const surface of ['home','index']){
  const html=renderToStaticMarkup(React.createElement(Grid,{articles:fixtures.slice(0,count),lang:'ja',surface}));
  if(!count){assert.equal(html,'');continue;}
  assert.equal((html.match(/data-news-card="lead"/g)||[]).length,1);
  assert.equal((html.match(/data-news-card="companion"/g)||[]).length,Math.min(2,count-1));
  assert.equal((html.match(/class="music-news-card"/g)||[]).length,count);
  assert.equal(html.includes('music-news-companions'),count>1);
  for(let i=0;i<count;i++){assert.ok(html.includes(`/news/fixture-${i}?lang=ja`));assert.equal((html.match(new RegExp(`title="Story ${i}"`,'g'))||[]).length,1);}
 }
});

for(const lang of ['zh','en','ja','ko']) test(`Deezer news keeps its timeline, scope, sources and language links (${lang})`,async()=>{
 const slug='deezer-ai-music-search-toggle',story=musicNewsArticle(slug),deps=mocks(lang),page=loadTs('src/app/news/[slug]/page.tsx',deps);
 const props={params:Promise.resolve({slug}),searchParams:Promise.resolve({lang})};
 const html=renderToStaticMarkup(await page.default(props));
 assert.equal(publishedMusicNews()[0].slug,slug);
 assert.deepEqual([story.publishedOn,story.eventOn,story.verifiedOn],['2026-10-28','2026-10-27','2026-10-28']);
 assert.ok(html.indexOf('30 秒先看懂')<html.indexOf('01 / 先把時間對好'));
 for(const text of ['10 月 13 日','10 月 27 日','2026 年底前推出','尚未確認上線','全 AI 生成','關閉後','有限 AI 輔助','不代表搜尋排名或播放量有保證','並非 Deezer 公布的新文件要求','非 Deezer 產品介面'])assert.ok(html.includes(text),text);
 assert.ok(!html.includes('€133.8'));assert.ok(!html.includes('42 million'));
 const json=JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
 assert.equal(json.headline,story.title);assert.deepEqual(json.citation,story.sources.map(x=>x.url));
 assert.equal(json.mainEntityOfPage,`https://aipoger.com/news/${slug}?lang=zh`);
 const metadata=await page.generateMetadata(props);
 assert.equal(metadata.openGraph.images[0].url,`https://aipoger.com${story.cover}`);assert.equal(metadata.twitter.card,'summary_large_image');
 assert.ok(html.includes(`/news?lang=${lang}`));
 for(const other of publishedMusicNews().filter(x=>x.slug!==slug))assert.ok(html.includes(`/news/${other.slug}?lang=${lang}`));
 const bytes=readFileSync(new URL(`../public${story.cover}`,import.meta.url));
 assert.equal(bytes.subarray(1,4).toString(),'PNG');assert.equal(bytes.readUInt32BE(16),1200);assert.equal(bytes.readUInt32BE(20),630);assert.ok(bytes.length<150_000);
});
