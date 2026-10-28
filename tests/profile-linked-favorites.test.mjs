import test from 'node:test';
import assert from 'node:assert/strict';
import {NextRequest} from 'next/server.js';
import {loadTs,mockAdmin,mocksFor,track,favorite,USER} from './helpers/choice-runtime.mjs';
test('private favorite response preserves current playable external URLs through serialization; hidden and unsafe links stay unavailable',async()=>{
 process.env.NEXT_PUBLIC_SUPABASE_URL='https://example.test';process.env.SUPABASE_SERVICE_KEY='fixture';
 const admin=mockAdmin({listen_bar_tracks:[track(10,{audio_path:null,external_url:'https://youtu.be/dQw4w9WgXcQ'}),track(11,{audio_path:null,external_url:'https://youtu.be/dQw4w9WgXcQ',hidden_at:'now'}),track(12,{audio_path:null,external_url:'javascript:alert(1)'})]});
 [10,11,12].forEach(n=>favorite(admin,n)); admin.storage.getBucket=async()=>({data:{id:'listen-bar-data'}}); admin.favorites.records.forEach(r=>Object.assign(r,{comments:[],updatedAt:'2026-10-29'}));
 const route=loadTs('src/app/api/honor-board/interactions/route.ts',mocksFor(admin));
 const result=await route.GET(new NextRequest('https://example.test/api/honor-board/interactions?favorites=me',{headers:{authorization:'Bearer valid'}}));
 assert.equal(result.status,200,await result.clone().text());const data=await result.json();
 assert.equal(data.records.length,3);assert.equal(data.records[0].externalUrl,'https://www.youtube.com/watch?v=dQw4w9WgXcQ');assert.equal(data.records[1].externalUrl,null);assert.equal(data.records[2].externalUrl,null);
 assert.ok(data.records.every(r=>r.myFavorited));assert.ok(!JSON.stringify(data).includes(USER));
});
