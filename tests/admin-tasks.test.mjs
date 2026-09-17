import assert from "node:assert/strict";
import test from "node:test";
import { loadTs, mockAdmin, mocksFor, request } from "./helpers/choice-runtime.mjs";
import * as tasks from "../src/lib/admin-tasks.ts";

function api(admin, owner = true) {
  return loadTs("src/app/api/admin/tasks/route.ts", { ...mocksFor(admin),
    "@/lib/admin-emails": { isAdminEmail: () => owner },
    "@/lib/server-monthly-charts": { monthlyChartAdmin: () => admin } });
}
function seed() {
  const admin = mockAdmin({ content_reports: [{ id: "db", status: "resolved", target_type: "comment" }, { id: "open", status: "open", target_type: "song" }],
    aipoger_choice_collections: [{ id: "draft", is_published: false }, { id: "published", is_published: true }],
    listen_bar_tracks: [{ id: "new", created_at: new Date().toISOString(), is_active: true, review_status: "approved" }, { id: "hidden", created_at: new Date().toISOString(), is_active: false }, { id: "old", created_at: "2020-01-01", is_active: true }],
    social_posts: [{ id: "review", status: "needs_review", social_post_targets: [{ platform: "instagram", status: "draft" }] }, { id: "retired", status: "failed", social_post_targets: [{ platform: "tiktok", status: "failed" }] }, { id: "done", status: "published", social_post_targets: [{ platform: "x", status: "published" }] }] });
  admin.rpc = async () => ({ data: { pendingMonths: [{ count: 2 }, { count: 1 }] }, error: null });
  admin.storage.from = () => ({ download: async () => ({ data: new Blob([JSON.stringify([{ id: "db", status: "open", target_type: "comment" }, { id: "storage", status: "reviewing", target_type: "comment" }])]), error: null }) });
  return admin;
}
test("owner tasks require authenticated owner before touching any task source", async () => {
  for (const [token, owner, status] of [[null,true,401],["invalid",true,401],["valid",false,403]]) {
    const admin = seed(); let rpc = 0; admin.rpc = async () => { rpc++; };
    assert.equal((await api(admin,owner).GET(request(null,token))).status,status);
    assert.equal(admin.operations.length,0); assert.equal(rpc,0);
  }
});
test("summary deduplicates reports, counts cross-month ties and actionable visible tasks only", async () => {
  const admin = seed(), response = await api(admin).GET(request(null));
  assert.equal(response.status,200); assert.match(response.headers.get("cache-control"),/no-store/);
  const body = await response.json();
  assert.deepEqual(body.counts,{charts:3,reports:1,comments:1,social:1});
  assert.equal(tasks.adminTaskTotal(body),6);
  assert.ok(!JSON.stringify(body).includes("storage"));
  assert.ok(admin.operations.every(x=>x.action === "read"));
  assert.ok(admin.operations.every(x=>!["listen_bar_tracks","aipoger_choice_collections"].includes(x.table)));
  assert.equal(tasks.adminTaskTotal({...body,counts:{...body.counts,promotion:100,choice:100}}),6);
});
test("task readers paginate beyond 1000 and preserve unavailable counts as null", async () => {
  const admin = seed(); admin.tables.content_reports=Array.from({length:1003},(_,i)=>({id:String(i),status:"open",target_type:"song"}));
  admin.rpc=async()=>({error:{message:"private database failure"}});
  const body=await (await api(admin).GET(request(null))).json();
  assert.equal(body.counts.charts,null);assert.equal(body.counts.reports,1003);assert.equal(body.counts.comments,2);
  assert.equal(admin.operations.filter(x=>x.table==="content_reports").length,2);
  assert.ok(!JSON.stringify(body).includes("private database failure"));
});
test("missing report relation uses storage fallback; network failure never masquerades as empty", async () => {
  const admin=seed(), from=admin.from;
  admin.from=table=>table==="content_reports"?{select(){return this},order(){return this},range:async()=>({error:{code:"PGRST205"}})}:from(table);
  let body=await (await api(admin).GET(request(null))).json();assert.equal(body.counts.comments,2);
  admin.storage.from=()=>({download:async()=>({error:{message:"network timeout"}})});
  body=await (await api(admin).GET(request(null))).json();assert.equal(body.counts.comments,null);assert.equal(body.counts.reports,null);
});
test("unavailable source keeps last count; confirmed zero clears it; all four labels", () => {
  const previous={counts:Object.fromEntries(tasks.ADMIN_TASKS.map(t=>[t.id,t.id==="charts"?2:0])),checkedAt:"old"};
  const unknown={counts:{...previous.counts,charts:null},checkedAt:"new"};
  assert.equal(tasks.adminTaskTotal(tasks.mergeAdminTasks(previous,unknown)),2);
  assert.equal(tasks.adminTaskTotal(tasks.mergeAdminTasks(previous,{...unknown,counts:{...unknown.counts,charts:0}})),0);
  for(const lang of ["zh","en","ja","ko"])assert.match(tasks.adminTaskLabel(lang,3),/3/);
});
