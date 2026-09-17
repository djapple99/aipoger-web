import test from "node:test";
import assert from "node:assert/strict";
import { entries, renderChoiceAdmin, viewModules } from "./helpers/choice-admin-view-runtime.mjs";

test("actual admin page renders published management and personal entry, not an official editor",()=>{
  const html=renderChoiceAdmin();
  assert.match(html,/已發布 Choice/);
  assert.match(html,/href="\/profile\/choice"/);
  assert.match(html,/深夜選曲/);
  assert.doesNotMatch(html,/建立草稿|加入本週 Choice|上傳封面|新增一期/);
  assert.match(html,/aria-label="搜尋已發布 Choice"/);
  assert.match(html,/aria-pressed="true"/);
  assert.match(renderChoiceAdmin({query:"no-such-choice"}),/沒有符合條件/);
  assert.doesNotMatch(renderChoiceAdmin({query:"no-such-choice"}),/<article/);
});

test("actual list binds feature toggles and deletion to the correct typed collection",()=>{
  const calls=[], {list}=viewModules();
  const tree=list.PublishedChoiceList({entries,featuredKey:"creator:sample-a",busy:false,onFeature:key=>calls.push(key),onDelete:entry=>calls.push(entry.id)});
  const buttons=[];
  function visit(node){
    if(Array.isArray(node)){node.forEach(visit);return}
    if(!node||typeof node!=="object")return;
    if(node.type==="button")buttons.push(node);
    visit(node.props?.children);
  }
  visit(tree);
  assert.equal(buttons.length,4);
  buttons.forEach(button=>button.props.onClick());
  assert.deepEqual(calls,[null,"sample-a","official:sample-b","sample-b"]);
});
