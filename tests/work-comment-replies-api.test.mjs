import assert from 'node:assert/strict';
import test from 'node:test';
import { loadTs, mockAdmin, uuid, USER, request } from './helpers/choice-runtime.mjs';
const trackId = uuid(20), commentId = uuid(21), listener = uuid(22);
function api({ owner = USER, visible = true, identityError = false, rpcError = null, anonymous = false } = {}) {
  const admin = mockAdmin({ listen_bar_tracks: [{ id: trackId, created_by: owner }], listen_bar_track_comments: [{ id: commentId, track_id: trackId, user_id: listener, moderation_status: 'visible' }, { id: uuid(23), track_id: trackId, user_id: USER, moderation_status: 'visible' }, { id: uuid(24), track_id: trackId, user_id: listener, moderation_status: 'hidden' }], work_comment_replies: [{ id: uuid(25), track_id: trackId, comment_id: commentId, display_name: 'Creator Stage', body: '公開回覆', moderation_status: 'visible', created_at: '2026-10-25' }, { id: uuid(26), track_id: trackId, comment_id: uuid(24), display_name: 'Creator Stage', body: 'Hidden parent content', moderation_status: 'visible' }] });
  if(anonymous){const get=admin.auth.getUser;admin.auth.getUser=async token=>{const r=await get(token);if(r.data.user)r.data.user.is_anonymous=true;return r;};}
  const calls = []; admin.rpc = async (name, args) => { calls.push({ name, args }); return { data: { reply: { id: uuid(30), commentId }, creditAwarded: 2 }, error: rpcError }; };
  const route = loadTs('src/app/api/work-comment-replies/route.ts', { '@/lib/server-mv-reviews': { mvReviewAdmin: () => admin }, '@/lib/server-home-discovery': { readPublicWorkDetail: async () => visible ? { work: { id: trackId } } : null }, '@/lib/server-public-identity': { loadPublicIdentity: async () => { if (identityError) throw new Error('offline'); return { displayName: 'Saved Stage Name' }; } }, 'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } } });
  const req = (body, token = 'valid') => ({ ...request(body, token), nextUrl: new URL('https://aipoger.com/api/work-comment-replies?trackId=' + trackId) });
  return { route, req, calls, admin };
}
test('public replies filter hidden parents, disclose no account IDs, and only the verified work creator can reply', async () => {
  const x = api(); const guest = await (await x.route.GET(x.req(null, null))).json(); assert.equal(guest.replies.length, 1); assert.deepEqual(guest.canReplyIds, []); assert.ok(!JSON.stringify(guest).includes('user_id'));
  assert.deepEqual((await (await x.route.GET(x.req())).json()).canReplyIds, [commentId]);
  const other = api({ owner: listener }); assert.deepEqual((await (await other.route.GET(other.req())).json()).canReplyIds, []);
  const hidden = api({ visible: false }); assert.equal((await hidden.route.GET(hidden.req())).status, 404);
});
test('reply writes bind verified actor and saved stage name, ignore forged reward/identity, and keep short replies', async () => {
  const x = api(); const r = await x.route.POST(x.req({ trackId, commentId, requestId: uuid(40), text: '  謝謝  ', userId: listener, displayName: 'Forged', creditAwarded: 200 })); assert.equal(r.status, 200);
  assert.deepEqual(x.calls, [{ name: 'save_work_comment_reply', args: { p_user: USER, p_track: trackId, p_comment: commentId, p_body: '謝謝', p_name: 'Saved Stage Name', p_request: uuid(40) } }]);
});
test('reply failures retain authoritative statuses and never publish on missing identity, auth or public eligibility', async () => {
  const body = { trackId, commentId, requestId: uuid(40), text: '回覆內容' };
  for (const [config, token, status] of [[{}, null, 401], [{}, 'bad', 401], [{anonymous:true}, 'valid', 401], [{ visible: false }, 'valid', 404], [{ identityError: true }, 'valid', 503]]) {
    const x = api(config); assert.equal((await x.route.POST(x.req(body, token))).status, status); assert.equal(x.calls.length, 0);
  }
  for (const text of ['', ' ', 'x'.repeat(281)]) { const x = api(); assert.equal((await x.route.POST(x.req({ ...body, text }))).status, 400); assert.equal(x.calls.length, 0); }
  for (const code of ['REPLY_CREATOR_ONLY', 'REPLY_SELF', 'REPLY_UNAVAILABLE']) { const x = api({ rpcError: { code: '42501', message: code } }); const r = await x.route.POST(x.req(body)); assert.equal(r.status, 403); assert.equal((await r.json()).code, code); }
});
