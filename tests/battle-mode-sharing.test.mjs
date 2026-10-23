import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import { loadTs } from './helpers/choice-runtime.mjs';

const sharing = loadTs('src/lib/battle-mode-sharing.ts');
const langs = ['zh', 'en', 'ja', 'ko'];
const jsx = { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
function loadTsx(file, mocks, globals = {}) {
  const compiled = ts.transpileModule(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', ...Object.keys(globals), compiled)(name => {
    assert.ok(Object.hasOwn(mocks, name), name); return mocks[name];
  }, loaded, loaded.exports, ...Object.values(globals));
  return loaded.exports;
}

test('only the three public mode keys are accepted', () => {
  for (const mode of sharing.BATTLE_MODES) assert.equal(sharing.isBattleMode(mode), true);
  for (const mode of [null, undefined, '', 'private', '../drop', ['blind'], 'Blind']) assert.equal(sharing.isBattleMode(mode), false);
});

for (const lang of langs) test(`mode shares keep distinct covers, language, and destination (${lang})`, () => {
  const images = new Set();
  for (const mode of sharing.BATTLE_MODES) {
    const path = sharing.battleModeSharePath(mode, lang);
    const metadata = sharing.battleModeMetadata(mode, lang);
    assert.equal(path, `/battle?lang=${lang}&mode=${mode}#battle-mode-${mode}`);
    assert.equal(metadata.alternates.canonical, `https://aipoger.com${path.split('#')[0]}`);
    assert.equal(metadata.openGraph.url, metadata.alternates.canonical);
    const image = metadata.openGraph.images[0];
    assert.equal(image.url, `https://aipoger.com/images/battle-share/${mode}.png`);
    assert.equal(image.width, 1200); assert.equal(image.height, 630);
    assert.deepEqual(metadata.twitter.images, [image.url]);
    assert.equal(metadata.title.absolute, metadata.openGraph.title);
    assert.equal(metadata.twitter.title, metadata.openGraph.title);
    assert.equal(metadata.twitter.description, metadata.description);
    assert.ok(metadata.description.length > 10);
    for (const localized of Object.values(metadata.alternates.languages)) assert.ok(localized.endsWith(`&mode=${mode}`));
    images.add(image.url);
  }
  assert.equal(images.size, 3);
});

test('Japanese and Korean Q Crash shares preserve the established English copy policy', () => {
  const english = sharing.battleModeMetadata('q-crash', 'en');
  for (const lang of ['ja', 'ko']) {
    const metadata = sharing.battleModeMetadata('q-crash', lang);
    assert.equal(metadata.description, english.description);
    assert.equal(metadata.openGraph.locale, 'en_US');
    assert.ok(metadata.alternates.canonical.includes(`lang=${lang}`));
  }
});

test('committed covers are valid 1200×630 PNGs with different content', () => {
  const covers = sharing.BATTLE_MODES.map(mode => {
    const bytes = readFileSync(new URL(`../public/images/battle-share/${mode}.png`, import.meta.url));
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(bytes.readUInt32BE(16), 1200); assert.equal(bytes.readUInt32BE(20), 630);
    return bytes.toString('base64');
  });
  assert.equal(new Set(covers).size, 3);
});

test('Battle server metadata selects query mode and drops unrelated/private query data', async () => {
  const page = loadTsx('src/app/battle/page.tsx', {
    'next/headers': { headers: async () => new Headers({ 'x-aipoger-lang': 'ko' }) },
    './battle-client': {}, '@/lib/battle-mode-sharing': sharing, '@/lib/locale': loadTs('src/lib/locale.ts'),
  });
  const metadata = await page.generateMetadata({ searchParams: Promise.resolve({ mode: 'drop', private: 'secret', battleId: 'hidden' }) });
  assert.equal(metadata.alternates.canonical, 'https://aipoger.com/battle?lang=ko&mode=drop');
  assert.ok(!JSON.stringify(metadata).includes('secret'));
  for (const mode of ['invalid', ['blind', 'drop']]) {
    const result = await page.generateMetadata({ searchParams: Promise.resolve({ mode, lang: 'zh' }) });
    assert.equal(result.alternates.canonical, 'https://aipoger.com/battle?lang=zh');
  }
});

test('direct blind listening entry also has the blind cover and its own canonical URL', () => {
  const metadata = sharing.battleModeMetadata('blind', 'zh', true);
  assert.equal(metadata.alternates.canonical, 'https://aipoger.com/battle/listen?lang=zh');
  assert.equal(metadata.openGraph.images[0].url, 'https://aipoger.com/images/battle-share/blind.png');
});

for (const lang of langs) test(`each rendered intro has an accessible share button beside its heading (${lang})`, () => {
  const component = loadTsx('src/components/battle-retro.tsx', {
    react: { useEffect: () => {} }, 'react/jsx-runtime': jsx, './participation-guide': 'guide',
    'next/navigation': { useSearchParams: () => new URLSearchParams() },
    'next/link': 'a', 'next/image': 'img',
    'lucide-react': { ArrowRight: 'arrow', Play: 'play', Swords: 'swords' },
    '@/lib/i18n': { useI18n: () => ({ lang }) }, '@/lib/battle-retro-copy': loadTs('src/lib/battle-retro-copy.ts'),
    './share-button': 'share-button', '@/lib/battle-mode-sharing': sharing,
    './battle-retro.module.css': {},
  });
  function nodes(value) {
    if (Array.isArray(value)) return value.flatMap(nodes);
    if (!value || typeof value !== 'object') return [];
    if (typeof value.type === 'function') return nodes(value.type(value.props));
    return [value, ...nodes(value.props?.children)];
  }
  const rendered = nodes([component.BattleRetroIntro(), component.DropRetroIntro()]);
  const sections = rendered.filter(node => node.type === 'section');
  assert.equal(sections.length, 3);
  for (const mode of sharing.BATTLE_MODES) {
    const section = sections.find(node => node.props.id === `battle-mode-${mode}`);
    assert.ok(section);
    const share = nodes(section).find(node => node.type === 'share-button');
    assert.equal(share.props.url, `https://aipoger.com${sharing.battleModeSharePath(mode, lang)}`);
    assert.equal(share.props.title, sharing.battleModeShareCopy(mode, lang).title);
    assert.ok(share.props.label.length > 5);
    assert.equal(share.props.iconOnly, true);
    const headingRow = nodes(section).find(node => node.type === 'div' && nodes(node).some(child => child.type === 'h2') && nodes(node).some(child => child.type === 'share-button') && !nodes(node).some(child => child.type === 'p'));
    assert.ok(headingRow, 'share button belongs to the heading row');
  }
});

test('mode anchors wait for the next frame and react to same-page mode changes', () => {
  let queryMode = 'blind'; const effects = [], frames = [], scrolled = [], cancelled = [];
  const window = { location: { hash: '#battle-mode-blind' },
    requestAnimationFrame: callback => frames.push(callback), cancelAnimationFrame: id => cancelled.push(id) };
  const document = { getElementById: id => ({ scrollIntoView: options => scrolled.push({ id, options }) }) };
  const component = loadTsx('src/components/battle-retro.tsx', {
    react: { useEffect: (callback, deps) => effects.push({ callback, deps }) }, 'react/jsx-runtime': jsx,
    'next/navigation': { useSearchParams: () => new URLSearchParams({ mode: queryMode }) },
    './participation-guide': 'guide', 'next/link': 'a', 'next/image': 'img', 'lucide-react': {},
    '@/lib/i18n': { useI18n: () => ({ lang: 'zh' }) }, '@/lib/battle-retro-copy': loadTs('src/lib/battle-retro-copy.ts'),
    './share-button': 'share-button', '@/lib/battle-mode-sharing': sharing, './battle-retro.module.css': {},
  }, { window, document });
  component.BattleModeShare({ mode: 'q-crash' });
  assert.equal(effects[0].callback(), undefined); assert.equal(frames.length, 0);
  queryMode = 'q-crash'; window.location.hash = '#battle-mode-q-crash';
  component.BattleModeShare({ mode: 'q-crash' });
  assert.notDeepEqual(effects[1].deps, effects[0].deps, 'changing the selected mode must rerun the anchor effect');
  const cleanup = effects[1].callback(); assert.equal(scrolled.length, 0);
  frames[0](); assert.deepEqual(scrolled, [{ id: 'battle-mode-q-crash', options: { block: 'start' } }]);
  cleanup(); assert.deepEqual(cancelled, [1]);
});
