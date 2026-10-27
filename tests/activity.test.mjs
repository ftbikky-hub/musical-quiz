import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile,readdir } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import { PGlite } from '@electric-sql/pglite';
const root=new URL('../',import.meta.url);
async function load(file,imports={}){const out={};vm.runInNewContext(ts.transpileModule(await readFile(new URL(file,root),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,{exports:out,require:id=>{if(id in imports)return imports[id];throw new Error('Unexpected import '+id)},Response,URL,URLSearchParams,TextEncoder,console});return out;}
const plans=await load('lib/plans.ts'),model=await load('lib/activity.ts',{'./plans':plans});
const now=new Date('2026-10-27T03:00:00Z');
const input=(extra={})=>({kind:'movie',date:'2026-10-20',time:null,title:'映画の名前',venue:'映画館',city:'横浜',memo:'',...extra});
test('minimal activity validation permits unknown time but rejects future dates, missing places and invalid kinds',()=>{
 assert.equal(model.normalizeActivity(input(),now).time,null);
 for(const patch of [{date:'2026-10-28'},{date:'2026-02-30'},{venue:''},{title:''},{kind:'deadline'},{kind:'toString'},{time:'25:00'}])assert.throws(()=>model.normalizeActivity(input(patch),now));
 const fields=model.normalizeActivity(input({time:'13:00:00',user_id:'someone',source_plan_id:'anything',latitude:35}),now);
 assert.equal(fields.time,'13:00');assert(!('user_id' in fields));assert(!('source_plan_id' in fields));assert(!('latitude' in fields));
});
test('activity filtering supports years and categories without implying a time for undated hours',()=>{
 const rows=[{...input(),id:'one'},{...input({kind:'concert',date:'2025-10-01',title:'ライブ'}),id:'two'},{...input({time:'13:00'}),id:'three'}];
 assert.equal(model.filterActivity(rows,'2025','','')[0].id,'two');
 assert.equal(model.filterActivity(rows,'','concert','').length,1);
 assert.equal(model.filterActivity(rows,'','','映 画 の 名 前').length,2);
 assert.equal(model.filterActivity(rows,'','','横浜').length,3);
 assert.equal(model.filterActivity(rows,'','','')[0].id,'three');
});
const uid='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002',planId='00000000-0000-4000-8000-000000000003';
const files=await readdir(new URL('supabase/migrations/',root));
const schema=await readFile(process.env.ACTIVITY_SQL_FILE||new URL('supabase/migrations/'+files.find(f=>f.endsWith('_activity_records.sql')),root),'utf8');
for(const defaults of [false,true])test(`activity ACL/RLS and source plan independence (automatic grants ${defaults})`,async()=>{
 const db=new PGlite();try{
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;grant usage on schema public to anon,authenticated,service_role;create schema auth;create table auth.users(id uuid primary key);insert into auth.users values('${uid}');`);
  if(defaults)await db.exec('alter default privileges in schema public grant all on tables to anon,authenticated,service_role');
  await db.exec(await readFile(new URL('supabase/migrations/20261022000000_personal_plans.sql',root),'utf8'));
  const before=(await db.query("select relacl::text from pg_class where oid='personal_plans'::regclass")).rows;
  await db.exec(schema);
  assert.deepEqual((await db.query("select relacl::text from pg_class where oid='personal_plans'::regclass")).rows,before);
  assert.equal((await db.query("select relrowsecurity from pg_class where oid='activity_records'::regclass")).rows[0].relrowsecurity,true);
  for(const role of ['anon','authenticated','service_role'])for(const op of ['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'])assert.equal((await db.query('select has_table_privilege($1,$2,$3) as ok',[role,'activity_records',op])).rows[0].ok,role==='service_role'&&['SELECT','INSERT','UPDATE','DELETE'].includes(op));
  await db.exec('set role service_role');
  await db.query("insert into personal_plans(id,user_id,title,kind,date) values($1,$2,'公演','theatre','2026-10-01')",[planId,uid]);
  await db.query("insert into activity_records(user_id,kind,date,title,venue,source_plan_id) values($1,'theatre','2026-10-01','公演','劇場',$2)",[uid,planId]);
  await assert.rejects(db.query("insert into activity_records(user_id,kind,date,title,venue,source_plan_id) values($1,'theatre','2026-10-01','重複','劇場',$2)",[uid,planId]),/duplicate key/);
  await db.query("update activity_records set title='記録側だけ変更'");
  assert.equal((await db.query('select title from personal_plans')).rows[0].title,'公演');
  await db.query('delete from personal_plans where id=$1',[planId]);
  assert.equal((await db.query('select source_plan_id from activity_records')).rows[0].source_plan_id,null);
  await db.exec('delete from activity_records');await db.exec('reset role');
 }finally{await db.close()}
});

async function harness(member=uid){
 const records=[{...input(),id:uid,user_id:uid},{...input({title:'他の人の映画'}),id:other,user_id:other}];
 const source={id:planId,user_id:uid,date:'2026-10-01',kind:'concert',status:'confirmed'};
 const db={from(table){let filters={},action='read',body;const q={select:()=>q,eq:(k,v)=>{filters[k]=v;return q},order:()=>q,range:async()=>({data:records.filter(r=>r.user_id===filters.user_id),error:null}),
 insert:v=>{action='insert';body=v;return q},update:v=>{action='update';body=v;return q},delete:()=>{action='delete';return q},
 single:async()=>{assert.equal(action,'insert');records.push({...body,id:'created'});return {data:{id:'created'},error:null}},
 maybeSingle:async()=>{if(table==='personal_plans')return {data:source.id===filters.id&&source.user_id===filters.user_id?source:null,error:null};const row=records.find(r=>r.id===filters.id&&r.user_id===filters.user_id);if(row&&action==='update')Object.assign(row,body);if(row&&action==='delete')records.splice(records.indexOf(row),1);return {data:row||null,error:null}}};return q}};
 const memberModule={getCurrentJournalMember:async()=>member?{id:member}:null},admin={'supabaseAdmin':db};
 const errors=await load('lib/personal-plan-store.ts',{'@/lib/supabase/admin':admin,'@/lib/journal-members':memberModule});
 const store=await load('lib/activity-store.ts',{'@/lib/supabase/admin':admin,'@/lib/journal-members':memberModule,'./personal-plan-store':errors});
 const ids=await load('lib/member-names.ts');
 const imports={'@/lib/activity':model,'@/lib/plans':plans,'@/lib/member-names':ids,'@/lib/activity-store':store,'@/lib/personal-plan-store':errors};
 return{records,source,route:await load('app/api/activity/route.ts',imports),detail:await load('app/api/activity/[id]/route.ts',imports)};
}
const req=(method,id,value=input(),origin='https://theatre.test')=>new Request('https://theatre.test/api/activity'+(id?'/'+id:''),{method,headers:{origin},...(method==='GET'?{}:{body:JSON.stringify(value)})});
test('activity endpoints enforce selected owner, ignore owner injection, validate source ownership and deny CSRF',async()=>{
 const h=await harness();const ctx={params:Promise.resolve({id:other})};
 assert.equal((await h.detail.GET(req('GET',other),ctx)).status,404);
 assert.equal((await h.detail.PATCH(req('PATCH',other),ctx)).status,404);
 assert.equal((await h.detail.DELETE(req('DELETE',other),ctx)).status,404);
 assert.equal((await h.route.POST(req('POST','',input(),'https://evil.test'))).status,403);
 assert.equal((await h.route.POST(req('POST','',input({user_id:other,source_plan_id:planId})))).status,201);
 assert.equal(h.records.at(-1).user_id,uid);assert.equal(h.records.at(-1).source_plan_id,planId);
 h.source.user_id=other;
 assert.equal((await h.route.POST(req('POST','',input({source_plan_id:planId})))).status,404);
 const ownCtx={params:Promise.resolve({id:uid})};
 assert.equal((await h.detail.PATCH(req('PATCH',uid,input({title:'編集した映画',user_id:other})),ownCtx)).status,200);
 assert.equal(h.records[0].user_id,uid);assert.equal(h.records[0].title,'編集した映画');
 assert.equal((await h.detail.DELETE(req('DELETE',uid),ownCtx)).status,200);assert.equal(h.records.length,2);
 const unauth=await harness(null);assert.equal((await unauth.route.GET()).status,401);
});
