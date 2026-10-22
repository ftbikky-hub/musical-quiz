/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, imports = {}) {
  const target = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve('../'+file),'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText,
    { exports: target, require: id => { if (id in imports) return imports[id]; throw new Error('Unexpected import '+id); }, URL, URLSearchParams, TextEncoder, Response, console });
  return target;
}
const model = load('lib/plans.ts');
const { normalizePlan, agendaEntries, planIcs, googleCalendarUrl } = model;
const input = (extra = {}) => normalizePlan({ title: 'ノートルダムの鐘', kind: 'theatre', status: 'applied', date: '2027-04-10', time: '13:00', deadline_date: '2026-10-25', deadline_time: '23:59', result_date: '2026-10-28', result_time: '15:00', ...extra });
const saved = (extra = {}) => ({ ...input(), id:'00000000-0000-4000-8000-000000000001', created_at:'', updated_at:'', ...extra });

test('plan validation rejects invalid dates, unsafe URLs, inconsistent times and excess values', () => {
  for (const value of [{date:'2027-02-29'}, {time:'24:01'}, {date:''}, {title:''}, {url:'javascript:alert(1)'}, {status:'__proto__'}, {kind:'toString'}, {end_date:'2027-01-01'}, {end_time:'12:00'}, {time:null,end_time:'14:00'}, {deadline_date:null,deadline_time:'13:00'}, {work_id:-1}]) assert.throws(()=>input(value));
  assert.equal(input({ time:'13:00:00', user_id:'other-user', id:'other-id' }).time,'13:00');
  assert.equal(Object.hasOwn(input({ user_id:'other-user' }),'user_id'),false);
  assert.equal(input({kind:'deadline'}).deadline_date,null);
});

test('agenda includes related deadlines and results in date order and separates cancelled/past records', () => {
  const rows = agendaEntries([saved(), saved({id:'cancelled',status:'cancelled'})], '2026-10-22');
  assert.deepEqual(Array.from(rows,e=>e.kind),['deadline','result','theatre']);
  assert.equal(agendaEntries([saved()], '2026-10-26')[0].kind,'result');
  assert.equal(agendaEntries([saved({status:'not_selected'})], '2026-10-22').length,0);
  assert(agendaEntries([saved({status:'not_selected'})], '2026-10-22',true).length>0);
  assert.equal(model.japanDate(new Date('2026-10-21T15:00:00Z')),'2026-10-22');
});

const ICAL = require('ical.js');
const importer = load('lib/plan-calendar-import.ts', { 'ical.js':ICAL, './plans':model });
const wrap = events => ['BEGIN:VCALENDAR','VERSION:2.0',...events.flatMap(lines=>['BEGIN:VEVENT',...lines,'END:VEVENT']),'END:VCALENDAR'].join('\r\n');
test('calendar import handles JST, UTC rollover and all-day exclusive end without importing unrelated data', () => {
  const result = importer.parsePlanCalendar(wrap([
    ['UID:tokyo','SUMMARY:劇団四季 観劇','DTSTART;TZID=Asia/Tokyo:20270410T130000','DTEND;TZID=Asia/Tokyo:20270410T160000','LOCATION:劇場','ATTENDEE:mailto:private@example.invalid'],
    ['UID:utc','SUMMARY:コンサート','DTSTART:20261021T150000Z','DTEND:20261021T170000Z'],
    ['UID:day','SUMMARY:抽選締め切り','DTSTART;VALUE=DATE:20261025','DTEND;VALUE=DATE:20261026'],
    ['UID:other','SUMMARY:別の用事','DTSTART:20261025T100000'],
  ]));
  assert.equal(result.candidates.length,4);
  assert.equal(result.candidates[0].plan.time,'13:00');
  assert.equal(result.candidates[1].plan.date,'2026-10-22'); assert.equal(result.candidates[1].plan.time,'00:00');
  assert.equal(result.candidates[2].plan.end_date,'2026-10-25'); assert.equal(result.candidates[2].plan.kind,'deadline');
  assert.equal(result.candidates[3].suggested,false);
  assert(!JSON.stringify(result).includes('private@example'));
});

test('calendar import reports recurring, invalid timezone, cancelled and duplicate events', () => {
  const result = importer.parsePlanCalendar(wrap([
    ['UID:recur','SUMMARY:毎週','DTSTART:20261025T100000','RRULE:FREQ=WEEKLY'],
    ['UID:zone','SUMMARY:時差','DTSTART;TZID=Unknown/Zone:20261025T100000'],
    ['UID:cancel','SUMMARY:中止','DTSTART:20261025T100000','STATUS:CANCELLED'],
    ['UID:same','SUMMARY:当落発表','DTSTART:20261025T100000'],
    ['UID:same','SUMMARY:重複','DTSTART:20261025T100000'],
  ]));
  assert.equal(result.recurring,1); assert.equal(result.skipped,3); assert.equal(result.candidates.length,1);
  assert.equal(result.candidates[0].plan.kind,'result');
  assert.throws(()=>importer.parsePlanCalendar('broken'));
});

test('calendar links and RFC5545 export preserve unknown times, text and all-day duration', () => {
  const e = agendaEntries([saved({ time:null,end_date:'2027-04-11',title:'作品,名;\\\n次の行' })], '2027-04-01')[0];
  const url = new URL(googleCalendarUrl(e)); assert.equal(url.origin,'https://calendar.google.com');
  assert.equal(url.searchParams.get('dates'),'20270410/20270412');
  const parsed = importer.parsePlanCalendar(planIcs([e])); assert.equal(parsed.candidates.length,1);
  assert.equal(parsed.candidates[0].plan.title,'作品,名;\\\n次の行');
  assert.equal(parsed.candidates[0].plan.end_date,'2027-04-11');
  const timed = planIcs(agendaEntries([saved()], '2027-04-01'));
  assert(timed.includes('DTSTART;TZID=Asia/Tokyo:20270410T130000'));
  assert(!timed.includes('DTEND')); // 未発表の終了時刻を作らない。
  const long = planIcs([{...e,plan:{...e.plan,title:'鐘'.repeat(100)}}]);
  for (const line of long.split('\r\n')) assert(Buffer.byteLength(line,'utf8')<=75);
});

const owner = '00000000-0000-4000-8000-000000000001', other = '00000000-0000-4000-8000-000000000002';
function storeHarness(memberId = owner) {
  const rows=[{...saved(),user_id:owner},{...saved({id:other}),user_id:other}];
  const db={ from(table) {
    assert.equal(table,'personal_plans'); let filters={}, action='read', body;
    const q={ select:()=>q, eq:(key,value)=>{filters[key]=value;return q;}, order:()=>q,
      range:async()=>({data:rows.filter(r=>r.user_id===filters.user_id),error:null}),
      update: value=>{action='update';body=value;return q;}, delete:()=>{action='delete';return q;},
      maybeSingle:async()=>{const row=rows.find(r=>r.id===filters.id&&r.user_id===filters.user_id); if(row&&action==='update')Object.assign(row,body);if(row&&action==='delete')rows.splice(rows.indexOf(row),1);return {data:row||null,error:null};},
      upsert: (values,options)=>{assert.equal(options.ignoreDuplicates,true); for(const value of values) {assert.equal(value.user_id,memberId);rows.push({...saved(),...value});} return {select:async()=>({data:values.map(()=>({id:'new'})),error:null})};}
    };return q;
  }};
  const store=load('lib/personal-plan-store.ts',{'@/lib/supabase/admin':{supabaseAdmin:db},'@/lib/journal-members':{getCurrentJournalMember:async()=>memberId?{id:memberId}:null}});
  return {store,rows};
}
test('API denies missing login and cross-user access, ignores supplied owners, and enforces same-origin writes', async()=>{
  const h=storeHarness();
  const ids=load('lib/member-names.ts');
  const route=load('app/api/plans/[id]/route.ts',{'@/lib/plans':model,'@/lib/personal-plan-store':h.store,'@/lib/member-names':ids});
  const context={params:Promise.resolve({id:other})};
  const req=new Request('https://test/api/plans/'+other);
  assert.equal((await route.GET(req,context)).status,404);
  assert.equal((await route.PATCH(new Request(req.url,{method:'PATCH',headers:{origin:'https://test'},body:JSON.stringify(input())}),context)).status,404);
  assert.equal((await route.DELETE(new Request(req.url,{method:'DELETE',headers:{origin:'https://test'}}),context)).status,404);
  assert.equal(h.rows.length,2);
  assert.equal((await route.DELETE(new Request(req.url,{method:'DELETE',headers:{origin:'https://evil'}}),context)).status,403);
  const create=load('app/api/plans/route.ts',{'@/lib/plans':model,'@/lib/personal-plan-store':h.store});
  assert.equal((await create.POST(new Request('https://test/api/plans',{method:'POST',headers:{origin:'https://test'},body:JSON.stringify({...input(),user_id:other})}))).status,201);
  assert.equal(h.rows.at(-1).user_id,owner);
  const noLogin=storeHarness(null);
  const unauth=load('app/api/plans/route.ts',{'@/lib/plans':model,'@/lib/personal-plan-store':noLogin.store});
  assert.equal((await unauth.GET()).status,401);
});
