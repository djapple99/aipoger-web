import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const code = ts.transpileModule(readFileSync(new URL('../src/components/choice-comments-dialog.tsx', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const nodes = n => Array.isArray(n) ? n.flatMap(nodes) : n && typeof n === 'object' ? [n, ...nodes(n.props?.children)] : [];
const text = n => Array.isArray(n) ? n.map(text).join('') : n && typeof n === 'object' ? text(n.props?.children) : n == null || typeof n === 'boolean' ? '' : String(n);
function mount(t, { guest = false, inline = true, lang = 'zh' } = {}) {
  let cursor = 0, dirty = true, tree, queue = [], authChange, failPost = false;
  const state = [], refs = [], effects = [], memo = [], requests = [];
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const react = {
    useState(initial) { const i = cursor++; if (!(i in state)) state[i] = initial; return [state[i], v => { state[i] = typeof v === 'function' ? v(state[i]) : v; dirty = true; }]; },
    useRef(initial) { return refs[cursor++] ??= { current: initial }; },
    useMemo(fn, deps) { const i = cursor++; if (!memo[i] || !same(memo[i].deps, deps)) memo[i] = { deps, value: fn() }; return memo[i].value; },
    useEffect(fn, deps) { const i = cursor++; if (!effects[i] || !same(effects[i].deps, deps)) queue.push(() => { effects[i]?.cleanup?.(); effects[i] = { deps, cleanup: fn() }; }); },
  };
  const session = guest ? null : { user: { id: 'listener' }, access_token: 'test-token' };
  const comment = { id: 'c1', displayName: 'Curator', body: 'Great songs', createdAt: '2026-09-21T12:00:00Z', isMine: false };
  const modules = { react, 'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    'lucide-react': {}, '@/components/report-button': { default: 'Report' }, '@/lib/auth-urls': { rememberAuthNextPath() {} },
    '@/lib/aipoger-choice': { AIPOGER_CHOICE_COMMENT_MAX_LENGTH: 1000 },
    '@/lib/supabase': { supabase: { auth: { getSession: async () => ({ data: { session } }), onAuthStateChange: fn => { authChange = fn; return { data: { subscription: { unsubscribe() {} } } }; } } } },
  };
  const document = { body: { style: { overflow: 'auto' } } };
  const window = { addEventListener() {}, removeEventListener() {}, location: { pathname: '/choice/id', search: '?lang=zh', hash: '#choice-comments', assign: url => requests.push({ redirect: url }) } };
  const fetch = async (url, init = {}) => {
    requests.push({ url, ...init });
    if (init.method === 'POST' && failPost) throw new Error('offline');
    return { ok: true, json: async () => init.method === 'POST' ? { comment: { ...comment, id: 'mine', isMine: true, body: JSON.parse(init.body).body } } : { schemaReady: true, comments: [comment] } };
  };
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', 'fetch', 'document', 'window', code)(name => { assert.ok(name in modules, name); return modules[name]; }, loaded, loaded.exports, fetch, document, window);
  const render = () => { cursor = 0; dirty = false; queue = []; tree = loaded.exports.default({ inline, open: true, collectionKind: 'creator', collectionId: 'id', title: 'Playlist', lang, onClose() {} }); queue.forEach(fn => fn()); };
  render(); t.after(() => effects.forEach(e => e?.cleanup?.()));
  return { requests, document, setFail: v => failPost = v, auth: (s) => authChange('SIGNED_OUT', s),
    async flush() { for (let i = 0; i < 8; i++) { await new Promise(r => setImmediate(r)); if (dirty) render(); } },
    all: () => nodes(tree), text: () => text(tree),
    find: (type, label) => { const n = nodes(tree).find(n => n.type === type && (!label || n.props['aria-label'] === label || text(n.props.children) === label)); assert.ok(n, `${type} ${label}`); return n.props; },
  };
}

test('inline comments are public and keep page scrolling; only the dialog locks the body', async t => {
  const ui = mount(t, { guest: true }); await ui.flush();
  assert.match(ui.text(), /Great songs/); assert.ok(ui.find('button', '登入後留下評論'));
  assert.equal(ui.all().some(n => n.props.role === 'dialog'), false);
  assert.equal(ui.document.body.style.overflow, 'auto');
  assert.equal(ui.requests[0].headers, undefined);
  const dialog = mount(t, { inline: false }); await dialog.flush();
  assert.equal(dialog.document.body.style.overflow, 'hidden');
  assert.ok(dialog.all().some(n => n.props.role === 'dialog'));
});

test('reply prepares a named comment, does not post while typing, and failed posts preserve text for retry', async t => {
  const ui = mount(t); await ui.flush();
  ui.find('button', '回覆').onClick(); await ui.flush();
  assert.equal(ui.find('textarea').value, '@Curator ');
  ui.find('textarea').onChange({ target: { value: '@Curator 很喜歡這份歌單！' } }); await ui.flush();
  assert.equal(ui.requests.filter(r => r.method === 'POST').length, 0);
  ui.setFail(true); await ui.find('form').onSubmit({ preventDefault() {} }); await ui.flush();
  assert.match(ui.text(), /評論送出失敗/); assert.equal(ui.find('textarea').value, '@Curator 很喜歡這份歌單！');
  assert.equal(ui.find('button', '送出評論').disabled, false);
  ui.find('button', '重新讀取').onClick(); await ui.flush();
  assert.equal(ui.find('textarea').value, '@Curator 很喜歡這份歌單！');
  ui.setFail(false); await ui.find('form').onSubmit({ preventDefault() {} }); await ui.flush();
  assert.equal(ui.find('textarea').value, ''); assert.match(ui.text(), /很喜歡這份歌單/);
  assert.ok(ui.find('button', '刪除自己的評論'));
});

test('signing out clears the draft and replaces the composer with sign-in', async t => {
  const ui = mount(t); await ui.flush();
  ui.find('textarea').onChange({ target: { value: 'Private draft' } }); await ui.flush();
  ui.auth(null); await ui.flush();
  assert.equal(ui.all().some(n => n.type === 'textarea'), false);
  ui.find('button', '登入後留下評論').onClick();
  assert.match(ui.requests.at(-1).redirect, /lang=zh&next=.*%23choice-comments/);
});

test('inline headings and guest actions use each supported language', async t => {
  for (const [lang, heading, signIn] of [['en', 'Choice comments', 'Sign in to comment'], ['ja', 'Choice コメント', 'ログインしてコメント'], ['ko', 'Choice 댓글', '로그인하고 댓글 쓰기']]) {
    const ui = mount(t, { guest: true, lang }); await ui.flush();
    assert.equal(text(ui.find('h2').children), heading); assert.ok(ui.find('button', signIn));
  }
});
