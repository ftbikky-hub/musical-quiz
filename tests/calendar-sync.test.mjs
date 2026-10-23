import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import { PGlite } from '@electric-sql/pglite';
const root = new URL('../',import.meta.url);
const files = await readdir(new URL('supabase/migrations/',root));
const path = process.env.CALENDAR_SYNC_SQL_FILE || new URL('supabase/migrations/'+files.find(f=>f.endsWith('_personal_calendar_sync.sql')),root);
const sql = await readFile(path,'utf8');
const uid='00000000-0000-4000-8000-000000000001', other='00000000-0000-4000-8000-000000000002', hash='a'.repeat(64);
async function fixture(defaults=false) {
 const db=new PGlite();
 await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
 grant usage on schema public to anon,authenticated,service_role;
 create schema auth; create table auth.users(id uuid primary key);
 insert into auth.users values('${uid}'),('${other}');`);
 if(defaults)await db.exec('alter default privileges in schema public grant all on tables to anon,authenticated,service_role');
 await db.exec(await readFile(new URL('supabase/migrations/20261022000000_personal_plans.sql',root),'utf8'));
 await db.exec(sql);
 await db.query(`insert into personal_calendar_connections(user_id,token_hash,calendar_id,mode,expires_at) values($1,$2,'primary','all',now()+interval '10 days')`,[uid,hash]);
 return db;
}
const event=(extra={})=>({source_uid:'ical:uid1',title:'観劇 ノートルダムの鐘',date:new Date().toISOString().slice(0,10),time:'13:00',end_date:null,end_time:null,venue:'劇場',memo:'Googleメモ',kind:'theatre',url:'',...extra});
let seq=0;
async function sync(db,events,token=hash) {
 const from=new Date(Date.now()-86400000).toISOString().slice(0,10),through=new Date(Date.now()+365*86400000).toISOString().slice(0,10);
 const {rows}=await db.query('select sync_personal_calendar($1,$2,$3,$4,$5,$6::jsonb) as result',[token,'primary',from,through,new Date(Date.now()+(seq++)*20).toISOString(),JSON.stringify(events)]);
 return rows[0].result;
}
for(const defaults of [false,true])test(`sync grants and RLS with automatic grants ${defaults}`,async()=>{
 const db=await fixture(defaults);
 try{
  for(const table of ['personal_calendar_connections','personal_calendar_items']){
   assert.equal((await db.query(`select relrowsecurity from pg_class where oid=$1::regclass`,[table])).rows[0].relrowsecurity,true);
   for(const role of ['anon','authenticated','service_role'])for(const operation of ['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']){
    const actual=(await db.query('select has_table_privilege($1,$2,$3) as allowed',[role,table,operation])).rows[0].allowed;
    assert.equal(actual,role==='service_role'&&['SELECT','INSERT','UPDATE'].includes(operation));
   }
  }
  for(const role of ['anon','authenticated']){
   assert.equal((await db.query("select has_function_privilege($1,'sync_personal_calendar(text,text,date,date,timestamptz,jsonb)','EXECUTE') as allowed",[role])).rows[0].allowed,false);
  }
  await db.exec('set role service_role');
  const result=await sync(db,[event()]); assert.equal(result.added,1);
  assert.equal((await db.query('select count(*) as n from personal_plans')).rows[0].n,1);
  await db.exec('reset role');
 }finally{await db.close()}
});
test('atomic sync updates source fields, adopts existing ICS, protects local fields and isolates owners',async()=>{
 const db=await fixture();try{
  await db.query(`insert into personal_plans(user_id,source_uid,title,kind,status,date,time,venue,memo,deadline_date,work_id) values($1,'ical:uid1','観劇 ノートルダムの鐘','theatre','confirmed',$2,'13:00','劇場','私のメモ',$2,12),($3,'ical:uid1','別の人','theatre','planned',$2,'13:00','劇場','別のメモ',null,null)`,[uid,event().date,other]);
  assert.equal((await sync(db,[event()])).added,0);
  await db.query(`update personal_plans set title='私が付けた題名' where user_id=$1`,[uid]);
  const next=event({title:'Googleで変えた題名',time:'15:00',venue:'新劇場'});
  await sync(db,[next]);
  let p=(await db.query('select * from personal_plans where user_id=$1',[uid])).rows[0];
  assert.equal(p.title,'私が付けた題名'); assert.equal(p.time,'15:00:00'); assert.equal(p.venue,'新劇場');
  assert.equal(p.status,'confirmed'); assert.equal(p.memo,'私のメモ'); assert.equal(p.work_id,12); assert(p.deadline_date);
  assert.equal((await db.query('select title from personal_plans where user_id=$1',[other])).rows[0].title,'別の人');
  await assert.rejects(sync(db,[event({source_uid:'ical:new'}),event({source_uid:'ical:broken',date:'no-date'})]));
  assert.equal((await db.query("select count(*) as n from personal_plans where source_uid='ical:new'")).rows[0].n,0);
  await assert.rejects(sync(db,[next],'b'.repeat(64)),/invalid_connection/);
  assert.equal((await db.query('select title from personal_plans where user_id=$1',[uid])).rows[0].title,'私が付けた題名');
 }finally{await db.close()}
});
test('missing Google plans are cancelled, restored if untouched, with all-or-nothing removal guard and revocation',async()=>{
 const db=await fixture();try{
  await sync(db,[event()]);
  await db.query("update personal_plans set status='confirmed' where user_id=$1",[uid]);
  assert.equal((await sync(db,[])).cancelled,1);
  let p=(await db.query('select status from personal_plans')).rows[0];assert.equal(p.status,'cancelled');
  await sync(db,[event()]);assert.equal((await db.query('select status from personal_plans')).rows[0].status,'confirmed');
  const many=Array.from({length:12},(_,i)=>event({source_uid:'ical:many'+i}));await sync(db,many);
  await assert.rejects(sync(db,[]),/too_many_removed/);
  assert.equal((await db.query("select count(*) as n from personal_plans where status<>'cancelled'")).rows[0].n,12);
  await db.query('update personal_calendar_connections set revoked=true');
  await assert.rejects(sync(db,many),/invalid_connection/);
 }finally{await db.close()}
});
function transpile(file,imports={}){const output={};return readFile(new URL(file,root),'utf8').then(source=>{vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,{exports:output,require:id=>{if(id in imports)return imports[id];throw new Error('Unexpected import '+id)},URL,URLSearchParams,Response,TextEncoder,console});return output});}
const model=await transpile('lib/plans.ts');
const validation=await transpile('lib/calendar-sync.ts',{'./plans':model});
test('snapshot validation rejects unfiltered, duplicate, incomplete, stale and out-of-window data',()=>{
 const now=new Date(),date=model.japanDate(now);
 const body={version:1,complete:true,calendarId:'primary',from:date,through:date,startedAt:now.toISOString(),events:[event({date})]};
 const cfg={calendarId:'primary',mode:'keywords'};
 assert.equal(validation.calendarSyncSnapshot(body,cfg,now).events.length,1);
 for(const patch of [{complete:false},{events:[event({date,title:'別の用事'})]},{events:[event({date}),event({date})]},{startedAt:'2000-01-01'},{from:'1900-01-01'}])assert.throws(()=>validation.calendarSyncSnapshot({...body,...patch},cfg,now));
 assert.equal(validation.calendarSyncSnapshot({...body,events:[event({date,title:'別の用事'})]},{...cfg,mode:'all'},now).events[0].kind,'theatre');
});

const source=(await readFile(new URL('public/downloads/personal-calendar-sync.gs',root),'utf8')).replace('/* THEATRE_NOTES_CONFIG */ null',JSON.stringify({token:'t'.repeat(43),endpoint:'https://theatre.test/api/plans/calendar/sync',calendarId:'primary',mode:'keywords'}));
function gas(events=[],status=200,fail=false){
 const logs=[],sent=[],triggers=[{handler:'unrelated',id:'other'}],props=new Map();let released=0;
 const tz=(value,zone,pattern)=>{
  const d=new Date(value), parts=new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(d);
  const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));return pattern==='HH:mm'?`${p.hour}:${p.minute}`:`${p.year}-${p.month}-${p.day}`;
 };
 const calendar={getEvents:()=>{if(fail)throw new Error('no access');return events},getTimeZone:()=> 'Asia/Tokyo'};
 const context={Date,JSON,Error,Object,console:{log:s=>logs.push(s)},Session:{getScriptTimeZone:()=> 'Asia/Tokyo'},Utilities:{formatDate:tz},
  LockService:{getUserLock:()=>({tryLock:()=>true,releaseLock:()=>released++})},
  CalendarApp:{getDefaultCalendar:()=>calendar,getCalendarById:()=>calendar},
  PropertiesService:{getUserProperties:()=>({getProperty:k=>props.get(k),setProperty:(k,v)=>props.set(k,v)})},
  ScriptApp:{getProjectTriggers:()=>triggers.map(t=>({getHandlerFunction:()=>t.handler,getUniqueId:()=>t.id})),deleteTrigger:t=>{const index=triggers.findIndex(x=>x.id===t.getUniqueId());if(index>=0)triggers.splice(index,1)},
    newTrigger:handler=>({timeBased(){return this},everyMinutes(n){assert.equal(n,15);return this},create(){const t={id:String(Math.random()),handler};triggers.push(t);return {getUniqueId:()=>t.id}}})},
  UrlFetchApp:{fetch:(url,options)=>{sent.push({url,...options});return {getResponseCode:()=>status,getContentText:()=>JSON.stringify({added:events.length,updated:0,cancelled:0})}}}
 };
 vm.createContext(context);vm.runInContext(source,context);return{context,logs,sent,triggers,props,released:()=>released};
}
const gEvent=(extra={})=>({getTitle:()=> '観劇 ノートルダムの鐘',getLocation:()=> '劇場',getDescription:()=> 'Googleメモ',getId:()=> 'uid1',isRecurringEvent:()=>false,isAllDayEvent:()=>false,
 getStartTime:()=>new Date(Date.now()+86400000),getEndTime:()=>new Date(Date.now()+86400000+7200000),...extra});
test('Apps Script installs only its own 15-minute trigger and transmits selected events without logging token',()=>{
 const h=gas([gEvent(),gEvent({getTitle:()=> '別の用事',getLocation:()=> ''}),gEvent({isRecurringEvent:()=>true})]);
 h.context.setupPersonalCalendarSync();h.context.setupPersonalCalendarSync();
 assert.equal(h.triggers.filter(t=>t.handler==='syncPersonalCalendar').length,1);assert(h.triggers.some(t=>t.handler==='unrelated'));
 const payload=JSON.parse(h.sent[0].payload);assert.equal(payload.events.length,1);assert.equal(payload.events[0].source_uid,'ical:uid1');
 assert.equal(h.sent[0].followRedirects,false);assert.equal(h.sent[0].headers.Authorization,'Bearer '+'t'.repeat(43));
 assert(!h.logs.join('').includes('t'.repeat(43)));assert(h.logs.some(x=>x.includes('設定完了')));
 h.context.stopPersonalCalendarSync();assert.equal(h.triggers.length,1);assert.throws(()=>h.context.syncPersonalCalendar(),/先に/);
});
test('Apps Script aborts on fetch failure and revocation without claiming setup success',()=>{
 const noAccess=gas([],200,true);assert.throws(()=>noAccess.context.setupPersonalCalendarSync(),/no access/);assert.equal(noAccess.sent.length,0);assert.equal(noAccess.triggers.length,1);
 const revoked=gas([],401);assert.throws(()=>revoked.context.setupPersonalCalendarSync(),/期限切れ/);assert.equal(revoked.triggers.length,1);assert(!revoked.logs.some(x=>x.includes('設定完了')));
 const failed=gas([],503);assert.throws(()=>failed.context.setupPersonalCalendarSync(),/HTTP 503/);assert.equal(failed.triggers.length,1);
});
const crypto = await import('node:crypto');
test('sync endpoint accepts only a live bearer key and passes no client-supplied owner to the transaction',async()=>{
 const token='s'.repeat(43),tokenHash=crypto.createHash('sha256').update(token).digest('hex'),calls=[];
 let row={calendar_id:'primary',mode:'keywords',expires_at:new Date(Date.now()+86400000).toISOString(),revoked:false};
 const db={from(table){assert.equal(table,'personal_calendar_connections');return {select(){return this},eq(key,value){assert.equal(key,'token_hash');assert.equal(value,tokenHash);return this},async maybeSingle(){return {data:row,error:null}}}},async rpc(name,args){calls.push(args);assert.equal(name,'sync_personal_calendar');assert.equal(args.p_token_hash,tokenHash);assert(!('p_user_id' in args));return {data:{added:1},error:null}}};
 const route=await transpile('app/api/plans/calendar/sync/route.ts',{'node:crypto':crypto,'@/lib/supabase/admin':{supabaseAdmin:db},'@/lib/calendar-sync':validation});
 const today=model.japanDate(new Date());
 const body={version:1,calendarId:'primary',complete:true,startedAt:new Date().toISOString(),from:today,through:today,events:[event({date:today,user_id:other})],user_id:other};
 const request=(value=body,auth='Bearer '+token)=>new Request('https://theatre.test/api/plans/calendar/sync',{method:'POST',headers:{authorization:auth},body:JSON.stringify(value)});
 assert.equal((await route.POST(request())).status,200);assert.equal(calls.length,1);assert(!('user_id' in calls[0].p_events[0]));
 assert.equal((await route.POST(request(body,''))).status,401);
 assert.equal((await route.POST(request({...body,complete:false}))).status,400);
 row={...row,revoked:true};assert.equal((await route.POST(request())).status,401);
 row={...row,revoked:false,expires_at:'2000-01-01'};assert.equal((await route.POST(request())).status,401);
 row=null;assert.equal((await route.POST(request())).status,401);assert.equal(calls.length,1);
});
