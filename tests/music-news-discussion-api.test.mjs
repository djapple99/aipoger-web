import assert from 'node:assert/strict';
import test from 'node:test';
import { loadTs, mockAdmin, uuid, USER, request } from './helpers/choice-runtime.mjs';
const slug = 'youtube-music-ai-labels';
const context = { params: Promise.resolve({ slug }) };
function setup({ anonymous = false, identityError = false, rpcError = null } = {}) {
  const admin = mockAdmin(); const calls = [];
  if (anonymous) admin.auth.getUser = async () => ({ data: { user: { id: USER, is_anonymous: true } } });
  admin.rpc = async (name, args) => {
    calls.push({ name, args });
    return { error: rpcError, data: name === 'read_music_news_discussion'
      ? { liked: false, likeCount: 2, commentCount: 1, comments: [{ id: uuid(20), displayName: 'Public alias', body: 'Public opinion', createdAt: '2026-10-26' }], nextCursor: null }
      : name === 'set_music_news_like' ? { liked: args.p_liked, likeCount: 3 }
      : { comment: { id: uuid(20), displayName: args.p_name, body: args.p_body }, commentCount: 2, replayed: false } };
  };
  const route = loadTs('src/app/api/news/[slug]/discussion/route.ts', {
    '@/lib/server-mv-reviews': { mvReviewAdmin: () => admin },
    '@/lib/server-public-identity': { loadPublicIdentity: async () => { if (identityError) throw new Error('private account detail'); return { displayName: 'Saved stage name' }; } },
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
  });
  const req = (body, token = 'valid', query = '') => ({ ...request(body, token), nextUrl: new URL(`https://aipoger.com/api/news/${slug}/discussion${query}`) });
  return { route, calls, req };
}
test('news comments are publicly readable; personalized results are never shared-cacheable', async () => {
  const x = setup(); const r = await x.route.GET(x.req(null, null), context); const data = await r.json();
  assert.equal(r.status, 200); assert.equal(data.comments[0].body, 'Public opinion'); assert.equal(data.signedIn, false);
  assert.equal(x.calls[0].args.p_user, null); assert.match(r.headers.get('cache-control'), /private, no-store/);
  assert.equal(r.headers.get('vary'), 'Authorization');
  assert.ok(!JSON.stringify(data).includes('user_id')); assert.equal(data.viewerName, null);
});
test('all news writes reject guests, invalid sessions and anonymous Supabase users before calling any RPC', async () => {
  for (const method of ['POST', 'PUT']) for (const token of [null, 'bad']) {
    const x = setup(); assert.equal((await x.route[method](x.req({ liked: true, body: 'Hello', requestId: uuid(22) }, token), context)).status, 401); assert.equal(x.calls.length, 0);
  }
  for (const method of ['POST', 'PUT']) {
    const x = setup({ anonymous: true }); assert.equal((await x.route[method](x.req({ liked: true, body: 'Hello', requestId: uuid(22) }), context)).status, 401); assert.equal(x.calls.length, 0);
  }
});
test('news writes use the verified actor and saved public name, ignoring forged identities, counts and Credit', async () => {
  const x = setup();
  assert.equal((await x.route.POST(x.req({ body: '  我的看法  ', requestId: uuid(22), userId: uuid(99), displayName: 'Forged', credit: 1000 }), context)).status, 201);
  assert.deepEqual(x.calls[0], { name: 'save_music_news_comment', args: { p_user: USER, p_slug: slug, p_request: uuid(22), p_name: 'Saved stage name', p_body: '我的看法' } });
  assert.equal((await x.route.PUT(x.req({ liked: true, userId: uuid(99), likeCount: 9000 }), context)).status, 200);
  assert.deepEqual(x.calls[1], { name: 'set_music_news_like', args: { p_user: USER, p_slug: slug, p_liked: true } });
});
test('news validation rejects unpublished targets, cross-site writes, malformed cursors and oversized Unicode comments', async () => {
  const x = setup();
  for (const method of ['GET', 'POST', 'PUT']) assert.equal((await x.route[method](x.req({ liked: true }), { params: Promise.resolve({ slug: 'unpublished' }) })).status, 404);
  for (const method of ['POST', 'PUT']) {
    const r = x.req({ liked: true }); r.headers.set('origin', 'https://other.example'); assert.equal((await x.route[method](r, context)).status, 403);
  }
  for (const body of ['', ' ', 'x'.repeat(1001), '🎵'.repeat(1001)]) assert.equal((await x.route.POST(x.req({ body, requestId: uuid(22) }), context)).status, 400);
  for (const query of ['?before=', '?beforeId=', '?before=2026-10-26', '?before=bad&beforeId='+uuid(22), '?before=2026-10-26&beforeId=evil']) assert.equal((await x.route.GET(x.req(null, null, query), context)).status, 400);
  assert.equal((await x.route.PUT(x.req({ liked: 'true' }), context)).status, 400); assert.equal(x.calls.length, 0);
  assert.equal((await x.route.POST(x.req({ body: '🎵'.repeat(1000), requestId: uuid(22) }), context)).status, 201);
});
test('news failures retain auth/rate/conflict status and disclose no database or identity errors', async () => {
  for (const [message, status] of [['NEWS_RATE_LIMIT', 429], ['NEWS_REQUEST_CONFLICT', 409], ['NEWS_COMMENT_UNAVAILABLE', 403], ['private database detail', 503]]) {
    const x = setup({ rpcError: { message } }); const r = await x.route.POST(x.req({ body: 'Hello', requestId: uuid(22) }), context);
    assert.equal(r.status, status); assert.ok(!JSON.stringify(await r.json()).includes(message));
  }
  const x = setup({ identityError: true }); assert.equal((await x.route.POST(x.req({ body: 'Hello', requestId: uuid(22) }), context)).status, 503); assert.equal(x.calls.length, 0);
});
