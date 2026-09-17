import assert from "node:assert/strict";
import test from "node:test";
import { renderOwnerAvatar } from "./helpers/owner-avatar-runtime.mjs";

test("actual avatar renders independent admin red badge without hijacking Profile or account notices",()=>{
  const html=renderOwnerAvatar(4,"zh",2);
  assert.match(html,/href="\/admin\?lang=zh#pending-tasks"/);assert.match(html,/aria-label="4 項後台待辦"/);
  assert.match(html,/href="\/profile\?lang=zh"/);assert.match(html,/帳號消息/);assert.match(html,/-left-1/);
  assert.doesNotMatch(renderOwnerAvatar(0),/pending-tasks/);
  assert.match(renderOwnerAvatar(120,"en"),/>99\+<\/a>/);
  assert.match(renderOwnerAvatar(1,"ja"),/管理タスク 1 件/);assert.match(renderOwnerAvatar(1,"ko"),/관리 작업 1건/);
});
