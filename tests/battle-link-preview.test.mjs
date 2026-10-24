import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs, USER, uuid } from './helpers/choice-runtime.mjs';
test('preview tokens bind source, measured duration, creator and expiry; sources cannot forge length',async()=>{
  const old=process.env.SUPABASE_SERVICE_ROLE_KEY;process.env.SUPABASE_SERVICE_ROLE_KEY='battle-tests-only';
  const oldFetch=globalThis.fetch;const urls=[];
  globalThis.fetch=async(url)=>{urls.push(url);return new Response('{"videoDetails":{"lengthSeconds":"213"}}');};
  try {
    const previewModule=loadTs('src/lib/server-battle-links.ts',{'@/lib/server-external-music':{resolveLinkPreview:async()=>({media:{provider:'youtube',url:'https://www.youtube.com/watch?v=5n-CNfo63Ng'},title:'Song',artist:'Stage',coverUrl:''})},'@/lib/server-home-discovery':{},'@/lib/server-creator-auth':{},'@/lib/q-crash-suno-media':{}});
    const p=await previewModule.resolveBattleLink('https://youtu.be/5n-CNfo63Ng',USER);
    assert.equal(p.duration,213);assert.equal(p.playback.seconds,213);assert.equal(previewModule.verifyBattlePreview(p.token,USER).duration,213);
    assert.equal(previewModule.verifyBattlePreview(p.token,uuid(2)),null);
    assert.equal(previewModule.verifyBattlePreview(p.token+'x',USER),null);
    globalThis.fetch=async()=>new Response('No duration here');
    await assert.rejects(previewModule.resolveBattleLink('x',USER),/SOURCE_DURATION_UNAVAILABLE/);
    assert.deepEqual(urls,['https://www.youtube.com/watch?v=5n-CNfo63Ng']);
  }finally{globalThis.fetch=oldFetch;if(old===undefined)delete process.env.SUPABASE_SERVICE_ROLE_KEY;else process.env.SUPABASE_SERVICE_ROLE_KEY=old;}
});
