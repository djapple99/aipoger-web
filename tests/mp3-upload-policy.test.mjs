import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectMp3,inspectMp3File,isMp3Upload,MP3_MAX_BYTES} from '../src/lib/mp3-upload-policy.ts';
import {mp3Frames} from './helpers/mp3-fixture.mjs';
test('every MP3 frame is checked, including VBR up to 320kbps and ordinary ID3 metadata',()=>{
 const bytes=mp3Frames();const info=inspectMp3(bytes);assert.equal(info.maxKbps,320);assert.equal(info.frames,4);assert.ok(info.duration>0.1);
 const id3=Buffer.from([73,68,51,4,0,0,0,0,0,4,0,1,2,3]);const tail=Buffer.alloc(128);tail.write('TAG');assert.equal(inspectMp3(new Uint8Array(Buffer.concat([id3,bytes,tail]))).frames,4);
 assert.equal(isMp3Upload({name:'Song.MP3',type:''}),true);assert.equal(isMp3Upload({name:'song.wav',type:'audio/mpeg'}),false);
});
test('renamed WAV/AIFF/MP4, ID3-only, free-format, Layer II, partial and oversized MP3 are rejected',async()=>{
 for(const text of ['RIFFxxxxWAVE','FORMxxxxAIFF','0000ftypM4A '])await assert.rejects(inspectMp3File(new File([text],'fake.mp3',{type:'audio/mpeg'})),/INVALID_MP3/);
 assert.throws(()=>inspectMp3(new Uint8Array([73,68,51,4,0,0,0,0,0,0])),/INVALID_MP3/);
 const free=mp3Frames();free[2]=0;assert.throws(()=>inspectMp3(free),/INVALID_MP3/);
 const layer2=mp3Frames();layer2[1]=253;assert.throws(()=>inspectMp3(layer2),/INVALID_MP3/);
 const partial=mp3Frames().slice(0,-1);assert.throws(()=>inspectMp3(partial),/INVALID_MP3/);
 assert.throws(()=>inspectMp3(new Uint8Array(MP3_MAX_BYTES+1)),/MP3_SIZE_LIMIT/);
 for(const extension of ['wav','aiff','m4a','aac','ogg','mp4'])await assert.rejects(inspectMp3File(new File([mp3Frames()],`song.${extension}`,{type:'audio/mpeg'})),/MP3_ONLY/);
});
