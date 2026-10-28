import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile,readdir } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import { PGlite } from '@electric-sql/pglite';
const root=new URL('../',import.meta.url);
async function load(file,imports={}){const out={};vm.runInNewContext(ts.transpileModule(await readFile(new URL(file,root),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{exports:out,require:id=>{if(id in imports)return imports[id];throw Error(id)},Response,URL,console});return out;}
const map=await load('lib/activity-map.ts');
const travel=await load('lib/activity-travel-scene.ts',{'./activity-map':map});
test('express journey moves the camera and train at national and local scales, including nearby arrivals',()=>{
 const osaka={latitude:34.7,longitude:135.49},tokyo={latitude:35.657,longitude:139.762},akasaka={latitude:35.672,longitude:139.738};
 const a=travel.travelScene(osaka,tokyo,0),b=travel.travelScene(osaka,tokyo,1);
 assert(Math.abs(a.camera[0]-b.camera[0])>30);assert(Math.abs(a.screen[0]-b.screen[0])>250);
 const local=travel.travelScene(akasaka,tokyo,.5);assert(local.zoom>a.zoom*10);
 const first=travel.travelScene(tokyo,tokyo,0),last=travel.travelScene(tokyo,tokyo,1);
 assert(first.nearby);assert(Math.abs(first.screen[0]-last.screen[0])>250);
 const expected=map.projectPlace(tokyo.longitude,tokyo.latitude);assert(Math.abs(last.point[0]-expected[0])<1e-8);assert(Math.abs(last.point[1]-expected[1])<1e-8);
 for(const p of [0,.25,.5,.75,1])for(const scene of [travel.travelScene(osaka,tokyo,p),travel.travelScene(tokyo,tokyo,p)])assert([scene.zoom,scene.angle,...scene.point,...scene.camera,...scene.screen].every(Number.isFinite));
});
const readiness=await load('lib/activity-map-readiness.ts');
test('playback waits for both camera and tiles; failure and stale focus cannot release the next day',()=>{
 const states=[],g=readiness.createMemoryMapGate(s=>states.push(s));
 g.begin('day1');g.tileStart();g.moveEnd(true);assert.equal(states.at(-1).status,'loading');
 g.tileEnd();assert.equal(states.at(-1).status,'loading');g.paintReady();assert.equal(states.at(-1).status,'ready');assert.equal(states.at(-1).id,'day1');
 g.begin('day2');g.tileEnd();assert.equal(states.at(-1).status,'loading');
 g.moveEnd(false);assert.equal(states.at(-1).status,'loading');g.paintReady();assert.equal(states.at(-1).id,'day2');assert.equal(states.at(-1).status,'ready');
 g.begin('day3');g.tileError();g.tileEnd();g.moveEnd(false);assert.equal(states.at(-1).status,'failed');
 g.begin('day3-retry-pending');g.moveEnd(false);g.tileEnd();assert.equal(states.at(-1).status,'failed');
 g.retry();g.tileEnd();g.paintReady();assert.equal(states.at(-1).status,'ready');
 const n=states.length;g.dispose();g.begin('day4');g.tileEnd();assert.equal(states.length,n);
});
test('decoded tile rectangles must cover the entire viewport before revealing the destination',()=>{
 assert.equal(readiness.tilesCoverViewport([],500,500),false);
 assert.equal(readiness.tilesCoverViewport([{left:0,top:0,right:500,bottom:200}],500,500),false);
 assert.equal(readiness.tilesCoverViewport([{left:0,top:0,right:250,bottom:500},{left:250,top:0,right:500,bottom:500}],500,500),true);
 assert.equal(readiness.tilesCoverViewport([{left:0,top:0,right:100,bottom:500},{left:200,top:0,right:500,bottom:500}],500,500),false);
});
const row=(extra={})=>({id:'1',kind:'theatre',date:'2026-01-01',time:null,venue:'大阪四季劇場',city:'大阪',title:'作品',...extra});
test('venue identity is normalized without fuzzy guessing and unknown venues stay off the map',()=>{
 assert.equal(map.venueKey(' Ａ ホール ','東京'),map.venueKey('aホール','東京'));
 assert.notEqual(map.venueKey('ホール','東京'),map.venueKey('ホール','大阪'));
 assert(map.resolvePlace(row(),[]));assert.equal(map.resolvePlace(row({city:'札幌'}),[]),null);
 assert.equal(map.resolvePlace(row({venue:'似ている劇場'}),[]),null);
 const key=map.venueKey('大阪四季劇場','大阪');
 assert.equal(map.resolvePlace(row(),[{venue_key:key,latitude:35,longitude:135}]).latitude,35);
 for(const p of [{latitude:'35',longitude:135},{latitude:Infinity,longitude:135},{latitude:0,longitude:135},{latitude:35,longitude:0}])assert.throws(()=>map.normalizePlace({venue:'ホール',city:'東京',...p}));
 assert.equal(map.normalizePlace({venue:'ホール',city:'東京',latitude:35,longitude:135,user_id:'evil'}).user_id,undefined);
});
test('tower counts retain every visit; zoom separates nearby venues and replay groups unknown same-day order',()=>{
 const rows=[row(),row({id:'2',date:'2026-02-02',kind:'movie'}),row({id:'3',date:'2026-02-02',venue:'別の会場',city:'大阪'})];
 const places=[{venue_key:map.venueKey('別の会場','大阪'),latitude:34.7,longitude:135.5}];
 const towers=map.buildTowers(rows,places);assert.equal(towers.length,2);assert.equal(towers[0].records.length,2);
 assert.equal(map.clusterTowers(towers,1).length,1);assert.equal(map.clusterTowers(towers,64).length,1); // very close locations intentionally remain grouped
 const steps=map.replaySteps(rows);assert.equal(steps.length,2);assert.equal(steps[1].records.length,2);
 const separated=map.buildTowers([...rows,row({id:'4',venue:'舞浜アンフィシアター',city:'舞浜'})],places);
 assert.equal(map.clusterTowers(separated,1).length,2);
 assert.equal(map.buildTowers([row({venue:'未知'})],[]).length,0);
});
const files=await readdir(new URL('supabase/migrations/',root));
test('city views retain per-venue counts and separate colocated theatre labels without moving saved coordinates',()=>{
 const records=Array.from({length:9},(_,i)=>row({id:String(i)}));
 const towers=map.buildTowers(records,[]);
 const unit=map.towerFloorHeight(towers);assert.equal(unit,13);assert.equal(towers[0].records.length*unit,117);
 const spring={...towers[0],key:'spring',latitude:35.657,longitude:139.7618};
 const autumn={...spring,key:'autumn',records:records.slice(0,2)};
 assert.equal(map.towersInRegion([spring,autumn,...towers],'takeshiba').length,2);
 assert.equal(map.towersInRegion([spring,autumn,...towers],'tokyo').length,2);
 assert.equal(map.towersInRegion([spring,autumn,...towers],'kansai').length,1);
 const points=[{key:'spring',x:170,y:280,height:78},{key:'autumn',x:170,y:280,height:26},{key:'free',x:170,y:280,height:39}];
 const before=JSON.stringify(points),layout=map.spreadTowerLabels(points,340,590);
 assert.equal(JSON.stringify(points),before);assert.equal(layout.length,3);
 for(let i=0;i<layout.length;i++)for(let j=i+1;j<layout.length;j++){
   const a=layout[i],b=layout[j];assert(!(Math.abs(a.x-b.x)<137&&a.y+46>b.y-b.height-35&&a.y-a.height-35<b.y+46),'labels overlap');
 }
 assert.equal(JSON.stringify(layout),JSON.stringify(map.spreadTowerLabels([...points].reverse(),340,590)));
 assert.equal(map.shortVenue('JR東日本四季劇場［春］'),'四季劇場［春］');
});
const sql=await readFile(process.env.ACTIVITY_PLACES_SQL_FILE||new URL('supabase/migrations/'+files.find(f=>f.endsWith('_activity_places.sql')),root),'utf8');
const uid='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002';
for(const defaults of [false,true])test(`places replay explicit least privilege, ownership keys and RLS (defaults ${defaults})`,async()=>{
 const db=new PGlite();try{
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;grant usage on schema public to anon,authenticated,service_role;create schema auth;create table auth.users(id uuid primary key);insert into auth.users values('${uid}'),('${other}');create table existing_table(id integer);grant select on existing_table to authenticated;`);
  const before=(await db.query("select relacl::text from pg_class where oid='existing_table'::regclass")).rows;
  if(defaults)await db.exec('alter default privileges in schema public grant all on tables to anon,authenticated,service_role');
  await db.exec(sql);assert.deepEqual((await db.query("select relacl::text from pg_class where oid='existing_table'::regclass")).rows,before);
  assert.equal((await db.query("select relrowsecurity from pg_class where oid='activity_places'::regclass")).rows[0].relrowsecurity,true);
  for(const role of ['anon','authenticated','service_role'])for(const op of ['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'])assert.equal((await db.query('select has_table_privilege($1,$2,$3) as ok',[role,'activity_places',op])).rows[0].ok,role==='service_role'&&['SELECT','INSERT','UPDATE','DELETE'].includes(op));
  await db.exec('set role service_role');
  for(const user of [uid,other])await db.query('insert into activity_places(user_id,venue_key,latitude,longitude) values($1,$2,35,135)',[user,'same-venue']);
  await db.query('update activity_places set latitude=36 where user_id=$1',[uid]);
  assert.equal((await db.query('select latitude from activity_places where user_id=$1',[other])).rows[0].latitude,35);
  await assert.rejects(db.query('update activity_places set latitude=100'),/check constraint/);
  await assert.rejects(db.query("update activity_places set latitude='NaN'::double precision"),/check constraint/);
  await db.query('delete from activity_places where user_id=$1',[uid]);assert.equal((await db.query('select count(*)::integer as n from activity_places')).rows[0].n,1);
  await db.exec('reset role');
  for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(db.query('select * from activity_places'),/permission denied/);await assert.rejects(db.query('delete from activity_places'),/permission denied/);await db.exec('reset role');}
  await db.exec('grant select on activity_places to authenticated;set role authenticated');assert.equal((await db.query('select * from activity_places')).rows.length,0);
 }finally{await db.close()}
});
async function harness(member=uid){
 const saved=[{venue_key:map.venueKey('会場','東京'),latitude:35,longitude:135,user_id:other}];
 const records=[{id:'record',user_id:uid,venue:'会場',city:'東京'},{id:'other',user_id:other,venue:'他の会場',city:'大阪'}];
 const db={from(table){let filters={},action='read';const match=r=>Object.entries(filters).every(([k,v])=>r[k]===v);const q={select:()=>q,eq:(k,v)=>{filters[k]=v;return q},order:()=>q,range:async()=>({data:saved.filter(match).map(({user_id,...p})=>p),error:null}),limit:async()=>({data:records.filter(match),error:null}),upsert:async(v)=>{assert.equal(v.user_id,member);const i=saved.findIndex(r=>r.user_id===v.user_id&&r.venue_key===v.venue_key);if(i<0)saved.push(v);else saved[i]=v;return {error:null}},delete:()=>{action='delete';return q},then(resolve){if(action==='delete'){for(let i=saved.length-1;i>=0;i--)if(match(saved[i]))saved.splice(i,1);}return Promise.resolve({error:null}).then(resolve)}};return q}};
 const admin={supabaseAdmin:db},members={getCurrentJournalMember:async()=>member?{id:member}:null};
 const errors=await load('lib/personal-plan-store.ts',{'@/lib/supabase/admin':admin,'@/lib/journal-members':members});
 const store=await load('lib/activity-store.ts',{'@/lib/supabase/admin':admin,'@/lib/journal-members':members,'./personal-plan-store':errors});
 return {saved,route:await load('app/api/activity/places/route.ts',{'@/lib/activity-store':store,'@/lib/activity-map':map,'@/lib/personal-plan-store':errors})};
}
const body={venue:'会場',city:'東京',latitude:35,longitude:135};
const req=(method,value=body,origin='https://theatre.test')=>new Request('https://theatre.test/api/activity/places',{method,headers:{origin},body:JSON.stringify(value)});
test('place API rejects CSRF and unowned venues; ignores client owner; lists and deletes only selected member',async()=>{
 const h=await harness();assert.equal((await h.route.GET()).status,200);assert.equal((await (await h.route.GET()).json()).length,0);
 assert.equal((await h.route.POST(req('POST',body,'https://evil.test'))).status,403);
 assert.equal((await h.route.POST(req('POST',{...body,venue:'他の会場',city:'大阪'}))).status,404);
 assert.equal((await h.route.POST(req('POST',{...body,user_id:other}))).status,200);
 assert.equal(h.saved.length,2);assert.equal(h.saved[1].user_id,uid);
 assert.equal((await h.route.POST(req('POST',{...body,latitude:500}))).status,400);
 assert.equal((await (await h.route.GET()).json()).length,1);
 assert.equal((await h.route.DELETE(req('DELETE',body,'https://evil.test'))).status,403);
 assert.equal((await h.route.DELETE(req('DELETE'))).status,200);assert.equal(h.saved.length,1);assert.equal(h.saved[0].user_id,other);
 const anonymous=await harness(null);assert.equal((await anonymous.route.GET()).status,401);assert.equal((await anonymous.route.POST(req('POST'))).status,401);
});
