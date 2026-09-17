import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const read = (file) => readFileSync(new URL(`../src/${file}`,import.meta.url),'utf8');
const home = read('app/page.tsx');
const info = read('components/info-page-shell.tsx');
const about = read('app/about/layout.tsx');
const transpile = (source) => ts.transpileModule(source,{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX},
}).outputText;
function evaluate(source,mocks = {}) {
  const loaded={exports:{}};
  new Function('require','module','exports',transpile(source))((name) => {
    assert.ok(name in mocks,`Unexpected import ${name}`);
    return mocks[name];
  },loaded,loaded.exports);
  return loaded.exports;
}
const jsx=(type,props) => ({type,props});
const jsxRuntime={jsx,jsxs:jsx,Fragment:'fragment'};
function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== 'object') return [];
  return [tree,...nodes(tree.props?.children)];
}
function text(tree) {
  if (Array.isArray(tree)) return tree.map(text).join(' ');
  if (tree && typeof tree === 'object') return text(tree.props?.children);
  return typeof tree==='string' ? tree : '';
}
const ast=ts.createSourceFile('home.tsx',home,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function declaration(name,predicate) {
  let found;
  const visit=(node) => {
    if (predicate(node) && node.name?.getText(ast)===name) found=node;
    ts.forEachChild(node,visit);
  };
  visit(ast);
  assert.ok(found,`Missing ${name}`);
  return found;
}
const prompts=evaluate(`${declaration('homeActionPrompts',ts.isFunctionDeclaration).getText(ast)}\nexports.prompts=homeActionPrompts;`).prompts;
const infoLinks=new Function('isZh','lang','withLang','aiMusicBibleHref','t','choiceWeeklyHref',
  `return (${declaration('infoLinks',ts.isVariableDeclaration).initializer.getText(ast)});`);
const locale=evaluate(read('lib/locale.ts'));
const languages={
  zh:{chart:'月排行榜',saved:'自己收藏的歌曲',headline:'本月上榜歌曲',own:'自己的作品編排'},
  en:{chart:'Monthly charts',saved:'their saved songs',headline:'Monthly charts',own:'from their own works'},
  ja:{chart:'月間チャート',saved:'お気に入りに保存した曲',headline:'月間チャート',own:'自分の作品からChoice'},
  ko:{chart:'월간 차트',saved:'즐겨찾기에 저장한 곡',headline:'월간 차트',own:'자신의 작품으로 Choice'},
};

for (const [lang,copy] of Object.entries(languages)) {
  test(`home Showtime prompt and entry describe monthly charts and Choice (${lang})`,() => {
    const prompt=prompts(lang).rank;
    const body=Array.isArray(prompt.body) ? prompt.body.join(' ') : prompt.body;
    assert.equal(prompt.title,'AIPOGER Showtime');
    assert.ok(body.includes(copy.headline));
    assert.ok(body.includes('Choice'));
    const links=infoLinks(lang==='zh',lang,(href) => `${href}?lang=${lang}`,'/bible',(key) => key,'/rank#choice-weekly');
    const entry=links.find((link) => link.title==='AIPOGER Showtime');
    assert.equal(entry.href,`/rank?lang=${lang}`);
    assert.ok(entry.desc.includes(copy.chart));
    assert.ok(entry.desc.includes('Choice'));
  });

  test(`About rendered introduction uses saved songs, not certification or own uploads (${lang})`,() => {
    const shell=evaluate(info,{
      'react/jsx-runtime':jsxRuntime,'next/link':{default:'link'},
      '@/lib/brand':{AIPOGER_CONTACT_EMAIL:'test@example.com',AIPOGER_SOCIAL_LINKS:[]},
      '@/lib/fonts':{fontRighteous:{className:'font'}},'@/lib/i18n':{useI18n:() => ({lang})},
    });
    const rendered=text(shell.default({kind:'about'}));
    assert.ok(rendered.toLowerCase().includes(copy.chart.toLowerCase()));
    assert.ok(rendered.includes(copy.saved));
    assert.equal(rendered.includes(copy.own),false);
    assert.doesNotMatch(rendered,/Showtime 封存|Showtime records for wins|winning records can become|move winning tracks/);
  });

  test(`About metadata and structured data use the same localized Showtime description (${lang})`,async () => {
    const layout=evaluate(about,{
      'react/jsx-runtime':jsxRuntime,'next/headers':{headers:async () => new Headers({'x-aipoger-lang':lang})},
      '@/components/seo-json-ld':{default:'jsonld'},'@/lib/locale':locale,
    });
    const metadata=await layout.generateMetadata();
    assert.ok(metadata.description.toLowerCase().includes(copy.chart.toLowerCase()));
    assert.ok(metadata.description.includes('Choice'));
    assert.deepEqual(Object.keys(metadata.alternates.languages),['zh-Hant','en','ja','ko']);
    const structured=nodes(await layout.default({children:null})).find((node) => node.type==='jsonld').props.data;
    assert.equal(structured.description,metadata.description);
    assert.equal(structured.name,metadata.title);
    assert.equal(structured.url,`https://aipoger.com/about?lang=${lang}`);
    assert.equal(structured.inLanguage,lang==='zh' ? 'zh-Hant' : lang);
  });
}

test('public entries do not restore the retired certified archive or winner-only Choice promise',() => {
  assert.doesNotMatch(home,/被聽眾認可的 AI 音樂在這裡上台|Choice Weekly 也會從這裡長出來|will grow from these records|Weekly Choiceの候補|Weekly Choice 후보/);
  assert.doesNotMatch(info,/Showtime 封存勝利|Showtime records for wins and heat|Showtime record"/);
});
