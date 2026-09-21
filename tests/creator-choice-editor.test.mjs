import test from 'node:test';
import assert from 'node:assert/strict';
import { toggleChoiceSelection, moveChoiceToPosition, choiceEditorSnapshot } from '../src/lib/creator-choice-editor.ts';
const song=i=>({id:String(i),sourceKind:'listen_bar_track',selectable:true,isPublic:true,audioUrl:'audio'});
test('selection batch caps at ten, preserves order and lets a removed slot be replaced',()=>{
 let selected=[];for(let i=0;i<12;i++)selected=toggleChoiceSelection(selected,song(i));
 assert.equal(selected.length,10);selected=toggleChoiceSelection(selected,song(4));selected=toggleChoiceSelection(selected,song(11));
 assert.deepEqual(selected.map(x=>x.id),['0','1','2','3','5','6','7','8','9','11']);
 assert.equal(toggleChoiceSelection([], {...song(3),isPublic:false}).length,0);
});
test('direct placement shifts the intervening songs without mutating the saved list',()=>{
 const saved=Array.from({length:10},(_,i)=>song(i));const moved=moveChoiceToPosition(saved,9,1);
 assert.deepEqual(moved.map(x=>x.id),['9','0','1','2','3','4','5','6','7','8']);assert.equal(saved[0].id,'0');
 assert.deepEqual(moveChoiceToPosition(moved,0,10),saved);assert.equal(moveChoiceToPosition(saved,0,11),saved);
});
test('conflict snapshot includes ordered source identities and all editable text',()=>{
 const snapshot=choiceEditorSnapshot({weekStart:'2026-09-21',title:'中文 Title',intro:'Text',isPublished:false,items:[song(1),song(2)]});
 assert.equal(snapshot.title,'中文 Title');assert.deepEqual(snapshot.items,[{sourceKind:'listen_bar_track',sourceId:'1'},{sourceKind:'listen_bar_track',sourceId:'2'}]);
});
