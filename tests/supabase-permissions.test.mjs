import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';

const root = fileURLToPath(new URL('../supabase/', import.meta.url));
// この一覧にないSQLは勝手に実行せず、登録漏れとして失敗させる。
const sources = ['seed.sql', 'theater-log.sql', 'theater-log-social.sql',
  'archive-runs-cast-staff.sql', 'archive-works-venues.sql'];
const manual = ['archive-cast.sql', 'archive-name-selection-read.sql',
  'check-schedule-dependencies.sql', 'remove-schedule.sql', 'check-data-api-privileges.sql'];
const reviewedMigrations = ['migrations/20261022000000_personal_plans.sql', 'migrations/20261023091936_personal_calendar_sync.sql', 'migrations/20261027065532_activity_records.sql', 'migrations/20261027093002_activity_places.sql'];
const roles = ['anon', 'authenticated', 'service_role'];
const operations = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'];
const readonly = { anon: ['SELECT'], authenticated: ['SELECT'], service_role: [] };
const expectations = {
  shiki_works: { ...readonly, service_role: ['SELECT'] },
  shiki_theaters: { ...readonly, service_role: ['SELECT'] },
  theater_logs: { ...readonly, service_role: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'] },
  theater_log_casts: { ...readonly, service_role: ['SELECT', 'INSERT', 'DELETE'] },
  theater_log_photos: { ...readonly, service_role: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'] },
  theater_log_companions: { ...readonly, service_role: ['SELECT', 'INSERT', 'DELETE'] },
  archive_runs: readonly, archive_cast: readonly, archive_staff: readonly,
  archive_works: readonly, archive_venues: readonly,
};
const uid = '00000000-0000-4000-8000-000000000001';
const logId = '00000000-0000-4000-8000-000000000002';
async function sql(file) {
  const content = await readFile(path.join(root, file), 'utf8');
  // PGliteではpgcrypto拡張をロードできない。利用するgen_random_uuidはPG組み込み。
  return content.replace(/^create extension if not exists pgcrypto;$/mi, '');
}
async function fixture(oldDefaults = false) {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    grant usage on schema public to anon, authenticated, service_role;
    create schema storage;
    create table storage.buckets(id text primary key, name text, public boolean);
    create schema auth;
    create table auth.users(id uuid primary key);
    -- リポジトリにDDLがない依存先。ACLテスト専用の最小fixtureでありbaselineではない。
    create table public.cast_performers(id bigint primary key, name text unique not null);
    create table public.profiles(id uuid primary key references auth.users(id), display_name text);
    grant select on public.profiles to anon, authenticated;
    insert into auth.users values ('${uid}');
    insert into profiles values ('${uid}', '確認用');`);
  if (oldDefaults) await db.exec(`alter default privileges in schema public
    grant all on tables to anon, authenticated, service_role;`);
  return db;
}
async function asRole(db, role, statement) {
  await db.exec(`set role ${role}`);
  try { return await db.query(statement); }
  finally { await db.exec('reset role'); }
}
async function assertACL(db, tables) {
  for (const [table, expected] of Object.entries(tables)) {
    const { rows: [rls] } = await db.query(`select relrowsecurity from pg_class where oid = 'public.${table}'::regclass`);
    assert.equal(rls.relrowsecurity, true, `${table}: RLS`);
    for (const role of roles) for (const operation of operations) {
      const { rows: [row] } = await db.query(`select has_table_privilege($1, $2, $3) as allowed`, [role, `public.${table}`, operation]);
      assert.equal(row.allowed, expected[role].includes(operation), `${table}: ${role} ${operation}`);
    }
  }
}

test('every SQL and future migration must be registered for permission review', async () => {
  const files = (await readdir(root)).filter((name) => name.endsWith('.sql')).sort();
  assert.deepEqual(files, [...sources, ...manual].sort());
  assert.equal(await readFile(path.join(root, '../public/downloads/personal-plans-setup.sql'), 'utf8'), await readFile(path.join(root, reviewedMigrations[0]), 'utf8'));
  const migrations = await readdir(path.join(root, 'migrations')).catch((error) => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  assert.deepEqual(migrations.filter((name) => name.endsWith('.sql')).map(name => 'migrations/' + name).sort(), reviewedMigrations.slice().sort(),
    '新しいmigrationを検証順序と期待ACLに登録してください。未検証のまま通さないこと。');
});

for (const oldDefaults of [false, true]) test(`fresh SQL replay and least-privilege operations (old automatic grants: ${oldDefaults})`, async () => {
  const db = await fixture(oldDefaults);
  try {
    for (const file of sources) await db.exec(await sql(file));
    await assertACL(db, expectations);
    for (const role of ['anon', 'authenticated']) {
      for (const table of Object.keys(expectations)) await asRole(db, role, `select * from public.${table} limit 1`);
      await assert.rejects(asRole(db, role, `insert into theater_logs(watched_on, work_title, user_id) values ('2026-10-21','確認','${uid}')`), /permission denied/);
      await assert.rejects(asRole(db, role, `delete from shiki_works`), /permission denied/);
    }
    // サービス権限は実際のサーバー処理で必要な操作だけ。
    await asRole(db, 'service_role', `insert into cast_performers(name) values ('俳優') on conflict(name) do nothing returning id`);
    assert.equal((await db.query('select id from cast_performers')).rows[0].id, 1);
    await asRole(db, 'service_role', `insert into theater_logs(id,watched_on,work_title,user_id) values ('${logId}','2026-10-21','作品','${uid}') returning id`);
    await asRole(db, 'service_role', `update theater_logs set rating=5 where id='${logId}'`);
    await asRole(db, 'service_role', `insert into theater_log_casts(log_id,actor_name) values ('${logId}','俳優')`);
    await asRole(db, 'service_role', `insert into theater_log_photos(log_id,storage_path) values ('${logId}','photo.jpg')`);
    await asRole(db, 'service_role', `update theater_log_photos set caption='写真' where log_id='${logId}'`);
    await asRole(db, 'service_role', `insert into theater_log_companions(log_id,user_id) values ('${logId}','${uid}')`);
    await assert.rejects(asRole(db, 'service_role', `update theater_log_casts set actor_name='変更'`), /permission denied/);
    await assert.rejects(asRole(db, 'service_role', `update theater_log_companions set user_id='${uid}'`), /permission denied/);
    await assert.rejects(asRole(db, 'service_role', `insert into shiki_works(title,color_code) values ('不要','#000000')`), /permission denied/);
    assert.equal((await asRole(db,'anon',`select * from theater_logs where id='${logId}'`)).rows.length, 1);
    await asRole(db, 'service_role', `delete from theater_log_companions where log_id='${logId}'`);
    await asRole(db, 'service_role', `delete from theater_log_casts where log_id='${logId}'`);
    await asRole(db, 'service_role', `delete from theater_logs where id='${logId}'`);
    // RLSはACLとは独立: anonのSELECTを残してもPolicyがなければ行を返さない。
    await db.exec('drop policy "public read shiki_works" on shiki_works');
    assert.equal((await asRole(db, 'anon', 'select * from shiki_works')).rows.length, 0);
    // 新規ビューにも、古い自動GRANTの書き込み権限を残さない。
    for (const view of ['archive_people','archive_work_stats','archive_venue_stats','archive_actor_stats','archive_role_index','archive_runs_effective']) {
      for (const role of roles) for (const operation of operations) {
        const { rows: [row] } = await db.query('select has_table_privilege($1,$2,$3) as allowed', [role,view,operation]);
        assert.equal(row.allowed, role !== 'service_role' && operation === 'SELECT', `${view}: ${role} ${operation}`);
      }
    }
    // 再実行で既存表に独自に設定されたACLを奪わない。
    await db.exec('grant update on shiki_works to authenticated');
    await db.exec('grant update on theater_log_casts, theater_log_companions to authenticated');
    const aclQuery = `select relname, relacl::text as acl from pg_class
      where relname in ('shiki_works','shiki_theaters','theater_logs','theater_log_casts','theater_log_photos','theater_log_companions') order by relname`;
    const before = (await db.query(aclQuery)).rows;
    await db.exec(await sql('seed.sql'));
    await db.exec(await sql('theater-log.sql'));
    await db.exec(await sql('theater-log-social.sql'));
    assert.deepEqual((await db.query(aclQuery)).rows, before);
    assert.equal((await db.query("select has_table_privilege('authenticated','shiki_works','UPDATE') as allowed")).rows[0].allowed, true);
    await db.exec(await sql('check-data-api-privileges.sql'));
    // 実行し直してもIDENTITYの再追加や空表のsetval(0)で失敗しない。
    await db.exec(await sql('theater-log.sql'));
    await asRole(db, 'service_role', "insert into cast_performers(name) values ('俳優2')");
    assert.equal((await db.query("select id from cast_performers where name='俳優2'")).rows[0].id, 2);
  } finally { await db.close(); }
});

test('archive views and RPCs work as anon without write privileges', async () => {
  const db = await fixture();
  try {
    await db.exec(await sql('archive-runs-cast-staff.sql'));
    await db.exec(`insert into archive_runs(perf_key,year,seq,run_name,work,theater,start_date,end_date,performances)
      values ('run1',2026,1,'公演','作品','自由劇場','2026-01-01','2026-12-31',10);
      insert into archive_cast(perf_key,role,actor) values ('run1','役','俳優');
      insert into archive_staff(perf_key,section,job,person) values ('run1','作者','作詞','スタッフ');`);
    await db.exec(await sql('archive-works-venues.sql'));
    for (const role of ['anon', 'authenticated']) {
      for (const view of ['archive_people','archive_work_stats','archive_venue_stats','archive_actor_stats','archive_role_index','archive_runs_effective']) {
        assert((await asRole(db,role,`select * from ${view}`)).rows.length > 0, view);
      }
      for (const call of ["archive_actor_options()", "archive_staff_options()", "archive_role_options()",
        "archive_work_year_venue_stats(1)", "archive_work_role_stats(1)", "archive_work_staff_summary(1)",
        "archive_role_actor_stats(1,'役')", "archive_actor_role_stats('俳優')",
        "archive_staff_summary_by_person('スタッフ')", "archive_venue_work_stats(1)"]) {
        assert((await asRole(db,role,`select * from ${call}`)).rows.length > 0, call);
      }
      await assert.rejects(asRole(db,role,"insert into archive_cast(perf_key,role,actor) values ('run1','役','別人')"), /permission denied/);
    }
    // 既存DB用の修復SQLも、追加の書き込み権限を付けない。
    await db.exec(await sql('archive-name-selection-read.sql'));
    await assertACL(db, Object.fromEntries(Object.keys(expectations).filter((name)=>name.startsWith('archive_')).map((name)=>[name,readonly])));
  } finally { await db.close(); }
});

test('historical archive_cast retains authenticated-only read access', async () => {
  const db = await fixture(true);
  try {
    await db.exec(await sql('archive-cast.sql'));
    await assertACL(db, { archive_cast: { anon: [], authenticated: ['SELECT'], service_role: [] } });
  } finally { await db.close(); }
});

for (const oldDefaults of [false, true]) test(`personal plans deny public access and preserve existing ACLs (old defaults: ${oldDefaults})`, async () => {
  const db = await fixture(oldDefaults);
  try {
    for (const file of reviewedMigrations.filter(f => f.endsWith('_personal_plans.sql'))) await db.exec(await sql(file));
    await assertACL(db, { personal_plans: { anon: [], authenticated: [], service_role: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'] } });
    await asRole(db, 'service_role', `insert into personal_plans(id,user_id,title,kind,date,source_uid) values ('${logId}','${uid}','観劇予定','theatre','2026-12-01','google-uid')`);
    for (const role of ['anon','authenticated']) {
      await assert.rejects(asRole(db, role, 'select * from personal_plans'), /permission denied/);
      await assert.rejects(asRole(db, role, `insert into personal_plans(user_id,title,kind,date) values ('${uid}','不可','concert','2026-12-01')`), /permission denied/);
      await assert.rejects(asRole(db, role, 'delete from personal_plans'), /permission denied/);
    }
    await asRole(db,'service_role', `update personal_plans set status='confirmed' where id='${logId}'`);
    assert.equal((await asRole(db,'service_role', 'select status from personal_plans')).rows[0].status,'confirmed');
    await assert.rejects(asRole(db,'service_role', `insert into personal_plans(user_id,title,kind,date,source_uid) values ('${uid}','二重','theatre','2026-12-01','google-uid')`), /duplicate key/);
    await db.exec('grant select on personal_plans to authenticated');
    // ACLがあっても公開Policyを作らないためRLSは行を返さない。
    assert.equal((await asRole(db, 'authenticated','select * from personal_plans')).rows.length,0);
    const before=(await db.query("select relacl::text as acl from pg_class where oid='personal_plans'::regclass")).rows;
    for (const file of reviewedMigrations.filter(f => f.endsWith('_personal_plans.sql'))) await db.exec(await sql(file));
    assert.deepEqual((await db.query("select relacl::text as acl from pg_class where oid='personal_plans'::regclass")).rows,before);
    await asRole(db, 'service_role', `delete from personal_plans where id='${logId}'`);
  } finally { await db.close(); }
});
