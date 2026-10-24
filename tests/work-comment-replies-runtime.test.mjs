import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './helpers/choice-runtime.mjs';
const nodes = x => Array.isArray(x) ? x.flatMap(nodes) : x && typeof x === 'object' ? [x, ...nodes(x.props?.children)] : [];
const text = x => Array.isArray(x) ? x.map(text).join('') : x && typeof x === 'object' ? text(x.props?.children) : typeof x === 'string' ? x : '';
function mount({ canReply = true, failFirst = false, lang = 'zh' } = {}) {
  let cursor = 0, dirty = true, tree; const slots = [], calls = [];
  const state = { replies: [{ id: 'original-reply', commentId: 'root', name: 'Stage name', text: '原本的創作者回覆', createdAt: '' }], canReplyIds: canReply ? ['root'] : [], save: async (commentId, body, id) => {
    calls.push({ commentId, body, id }); if (failFirst && calls.length === 1) throw new Error('network');
    state.replies.push({ id: 'new-reply', commentId, name: 'Stage name', text: body, createdAt: '' }); return 2;
  } };
  const react = { useEffect() {}, useRef(v) { return slots[cursor++] ??= { current: v }; }, useState(v) { const i = cursor++; if (!(i in slots)) slots[i] = v; return [slots[i], v => { slots[i] = typeof v === 'function' ? v(slots[i]) : v; dirty = true; }]; } };
  const Component = loadTs('src/components/work-comment-replies.tsx', { react, 'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) }, '@/lib/supabase': { supabase: {} }, './home-editorial.module.css': { default: {} } }).default;
  const render = () => { cursor = 0; dirty = false; tree = Component({ commentId: 'root', lang, state }); };
  const flush = async () => { for (let i = 0; i < 6; i++) { await new Promise(setImmediate); if (dirty) render(); } };
  render();
  return { state, calls, flush, render, text: () => text(tree), find: type => nodes(tree).find(n => n.type === type)?.props, button: value => nodes(tree).find(n => n.type === 'button' && text(n) === value)?.props };
}
test('reply failure keeps the draft and request ID; retry renders the saved reply and server-confirmed reward', async () => {
  const ui = mount({ failFirst: true }); ui.button('繼續回覆').onClick(); await ui.flush();
  ui.find('textarea').onChange({ target: { value: '謝謝你聽見副歌的細節！' } }); await ui.flush();
  ui.find('form').onSubmit({ preventDefault() {} }); await ui.flush();
  assert.equal(ui.find('textarea').value, '謝謝你聽見副歌的細節！'); assert.ok(ui.text().includes('內容已保留'));
  ui.find('form').onSubmit({ preventDefault() {} }); await ui.flush();
  assert.equal(ui.calls.length, 2); assert.equal(ui.calls[0].id, ui.calls[1].id); assert.equal(ui.calls[0].body, ui.calls[1].body);
  assert.ok(ui.text().includes('原本的創作者回覆')); assert.ok(ui.text().includes('謝謝你聽見副歌的細節！')); assert.ok(ui.text().includes('+2 Credit')); assert.equal(ui.find('textarea'), undefined);
});
test('public viewers read the thread; losing creator permission hides controls without removing public replies', async () => {
  const guest = mount({ canReply: false }); assert.equal(guest.find('button'), undefined); assert.ok(guest.text().includes('原本的創作者回覆'));
  const creator = mount(); creator.button('繼續回覆').onClick(); await creator.flush(); assert.ok(creator.find('textarea'));
  creator.state.canReplyIds = []; creator.render(); assert.equal(creator.find('form'), undefined); assert.ok(creator.text().includes('原本的創作者回覆'));
});
for (const lang of ['en','ja','ko']) test(`reply controls use localized copy (${lang})`, () => {
  const ui = mount({ lang }); const copy=loadTs('src/lib/work-reply-copy.ts').workReplyCopy(lang); assert.ok(ui.text().includes(copy.author+' · Stage name')); assert.ok(ui.button(copy.again));
});
