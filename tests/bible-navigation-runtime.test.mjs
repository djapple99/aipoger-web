import assert from 'node:assert/strict';
import test from 'node:test';
import { mountMv, text } from './helpers/mv-runtime.mjs';
import { bibleCatalogDefaults } from '../src/lib/ai-music-bible-content.ts';
const css = { default: new Proxy({}, { get: (_, key) => key }) };
const icons = new Proxy({}, { get: (_, key) => key });

test('Bible chapter reopens on a repeated anchor and keeps its child mounted', async t => {
  const listeners = new Map(), timers = [], scrolled = [];
  const window = { location: { hash: '' }, addEventListener: (event, fn) => listeners.set(event, fn), removeEventListener: event => listeners.delete(event), setTimeout: fn => timers.push(fn) };
  const document = { getElementById: id => ({ scrollIntoView: () => scrolled.push(id) }) };
  const ui = await mountMv(t, 'src/components/bible-chapter.tsx', { name: 'library', title: 'Library', description: 'Moves', targets: ['bible-move-*'], children: 'original content' }, { 'lucide-react': icons, './bible-home.module.css': css }, { window, document });
  const content = () => ui.nodes().find(n => n.props?.id === 'chapter-library');
  assert.equal(content().props.hidden, true);
  window.location.hash = '#bible-move-prompt-dna'; listeners.get('hashchange')(); await ui.flush();
  assert.equal(content().props.hidden, false);
  ui.find('button').onClick(); await ui.flush(); assert.equal(content().props.hidden, true);
  listeners.get('hashchange')(); await ui.flush(); assert.equal(content().props.hidden, false);
  timers.forEach(fn => fn()); assert.ok(scrolled.includes('bible-move-prompt-dna'));
  assert.equal(text(content()), 'original content');
});

test('Bible home categories use the real catalog and copy full text, not the summary', async t => {
  const catalog = bibleCatalogDefaults(), writes = [], destinations = [];
  const ui = await mountMv(t, 'src/components/bible-home.tsx', { locale: 'zh', catalog, loading: false, error: false, onRetry() {}, onCommunity() {} }, { 'lucide-react': icons, './bible-home.module.css': css, '@/lib/brand': { AIPOGER_TUTORIAL_PLAYLIST_URL: 'https://example.com/tutorials' }, '@/lib/bible-navigation': { navigateBible: id => destinations.push(id) } }, { navigator: { clipboard: { writeText: async value => writes.push(value) } }, window: { setTimeout() {} } });
  const button = label => ui.nodes().find(n => n.type === 'button' && text(n) === label)?.props;
  button('錄音室 Mastering').onClick(); await ui.flush();
  const item = catalog.promptMoves.find(item => item.category === 'mastering');
  button(item.title.zh).onClick(); assert.deepEqual(destinations, [`bible-move-${item.key}`]);
  const copy = ui.nodes().find(n => n.props?.['aria-label'] === `複製 ${item.title.zh}`);
  await copy.props.onClick(); await ui.flush();
  assert.deepEqual(writes, [item.copy.zh]); assert.ok(ui.text().includes('已複製'));
});

test('Bible loading errors offer retry instead of an empty successful catalog', async t => {
  let retried = false;
  const ui = await mountMv(t, 'src/components/bible-home.tsx', { locale: 'zh', catalog: {promptMoves: [], lyricMoves: [], taiwaneseEntries: []}, loading: false, error: true, onRetry() { retried = true; }, onCommunity() {} }, { 'lucide-react': icons, './bible-home.module.css': css, '@/lib/brand': { AIPOGER_TUTORIAL_PLAYLIST_URL: 'https://example.com/tutorials' }, '@/lib/bible-navigation': { navigateBible() {} } });
  assert.ok(ui.text().includes('招式暫時載入失敗'));
  ui.nodes().find(n => n.type === 'button' && text(n) === '重新載入').props.onClick(); assert.equal(retried, true);
});
