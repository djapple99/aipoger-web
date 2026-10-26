import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const modulePath = process.env.AIPOGER_CREDIT_PGLITE_MODULE;
const slug = 'youtube-music-ai-labels';
const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
test('PostgreSQL news discussion: private grants, unique likes, retry-safe comments, rate guard, moderation and stable pagination', { skip: !modulePath && 'Set AIPOGER_CREDIT_PGLITE_MODULE' }, async t => {
  const { PGlite } = await import(pathToFileURL(modulePath).href); const db = new PGlite(); t.after(() => db.close());
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key); grant usage on schema public to service_role;');
  for (let i=1;i<=30;i++) await db.query('insert into auth.users values($1)', [uuid(i)]);
  const sql = await readFile(new URL('../supabase/migrations/20261026132404_music_news_discussion.sql', import.meta.url), 'utf8');
  await db.exec(sql); await db.exec(sql);
  for (const role of ['anon','authenticated']) {
    for (const table of ['music_news_likes','music_news_comments']) {
      const result = await db.query('select has_table_privilege($1,$2,\'select\') or has_table_privilege($1,$2,\'insert\') allowed',[role,table]); assert.equal(result.rows[0].allowed, false);
    }
    for (const fn of ['read_music_news_discussion(text,uuid,timestamptz,uuid)','set_music_news_like(uuid,text,boolean)','save_music_news_comment(uuid,text,uuid,text,text)']) assert.equal((await db.query('select has_function_privilege($1,$2,\'execute\') allowed',[role,fn])).rows[0].allowed,false);
  }
  assert.equal((await db.query("select count(*)::int n from pg_class where relname in ('music_news_likes','music_news_comments') and relrowsecurity")).rows[0].n,2);
  assert.equal((await db.query("select has_table_privilege('service_role','auth.users','select') allowed")).rows[0].allowed,false);
  await db.exec('set role service_role');
  const call = async (sql,args) => (await db.query(sql,args)).rows[0].data;
  const like = (user,liked) => call('select public.set_music_news_like($1,$2,$3) data',[uuid(user),slug,liked]);
  const save = (user,request,body='我的看法',article=slug) => call('select public.save_music_news_comment($1,$2,$3,$4,$5) data',[uuid(user),article,uuid(request),'Saved Stage',body]);
  const read = (cursor=null) => call('select public.read_music_news_discussion($1,$2,$3,$4) data',[slug,uuid(1),cursor?.createdAt??null,cursor?.id??null]);
  assert.deepEqual(await like(1,true),{ liked:true,likeCount:1 }); assert.equal((await like(1,true)).likeCount,1); assert.equal((await like(2,true)).likeCount,2);
  assert.deepEqual(await like(1,false),{ liked:false,likeCount:1 }); assert.equal((await like(1,false)).likeCount,1); await like(1,true);
  const first=await save(1,100); assert.equal(first.replayed,false); assert.equal((await save(1,100)).replayed,true);
  await assert.rejects(save(1,100,'different'),/NEWS_REQUEST_CONFLICT/);
  await assert.rejects(save(1,100,'我的看法','another-article'),/NEWS_REQUEST_CONFLICT/);
  for(let i=101;i<112;i++) await save(1,i);
  await assert.rejects(save(1,112),/NEWS_RATE_LIMIT/); assert.equal((await save(1,100)).replayed,true);
  for(let i=2;i<=25;i++) await save(i,200+i);
  const page=await read(); assert.equal(page.comments.length,20); assert.equal(page.commentCount,36); assert.ok(page.nextCursor); assert.equal(page.likeCount,2); assert.equal(page.liked,true);
  const next=await read(page.nextCursor); assert.equal(next.comments.length,16); assert.equal(next.nextCursor,null);
  assert.equal(new Set([...page.comments,...next.comments].map(c=>c.id)).size,36);
  assert.ok(!JSON.stringify(page).includes('user_id')); assert.ok(!JSON.stringify(page).includes('request_id'));
  await db.query("update public.music_news_comments set moderation_status='hidden' where id=$1",[first.comment.id]);
  assert.equal((await read()).commentCount,35); await assert.rejects(save(1,100),/NEWS_COMMENT_UNAVAILABLE/);
  await db.query("update public.music_news_comments set moderation_status='visible' where id=$1",[first.comment.id]); assert.equal((await read()).commentCount,36);
  await assert.rejects(save(26,500,' '),/NEWS_INVALID_INPUT/); await assert.rejects(save(26,501,'🎵'.repeat(1001)),/NEWS_INVALID_INPUT/);
  assert.equal((await save(26,502,'🎵'.repeat(1000))).comment.body.length,2000);
  await db.exec('reset role');
  await db.exec("create function public.qa_fail_news() returns trigger language plpgsql as $$ begin raise exception 'qa failure'; end $$; create trigger qa_fail_news before insert on public.music_news_comments for each row execute function public.qa_fail_news(); set role service_role;");
  await assert.rejects(save(27,503),/qa failure/); assert.equal((await db.query('select count(*)::int n from public.music_news_comments where user_id=$1',[uuid(27)])).rows[0].n,0);
});
