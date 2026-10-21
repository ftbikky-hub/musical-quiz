/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const data = require('../data/shiki-lineup.json');
const exportsForTest = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve('../lib/lineup.ts'),'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, { exports: exportsForTest });
const { lineupMonths, lineupPeriod, lineupCellLabel, parseLineupFavorites } = exportsForTest;
const get = (id) => data.performances.find((p) => p.id === id);

test('snapshot preserves the 19 performance IDs and explicit unknown dates', () => {
  assert.equal(data.performances.length, 19);
  assert.equal(new Set(data.performances.map((p) => p.id)).size, 19);
  const months = lineupMonths(data.displayFrom, data.displayThrough);
  assert.equal(months.length, 13);
  assert.equal(months[0], '2026-10'); assert.equal(months[12], '2027-10');
  for (const p of data.performances) {
    assert(p.from <= p.through);
    assert(months.includes(p.from) && months.includes(p.through));
    for (const value of [p.start,p.end]) {
      if(value !== null) assert.equal(new Date(value).toISOString().slice(0,10),value);
    }
    if (p.open) assert.equal(p.end, null);
  }
  assert.equal(get('bell-yokohama').start, null);
  assert.equal(get('bttf').end, null);
  assert(data.featuredIds.every((id) => get(id)));
});

test('month-only and open-ended periods do not invent first or last days', () => {
  assert.match(lineupPeriod(get('bell-yokohama')), /2027年4月〜2027年8月予定（日付未発表）/);
  assert.match(lineupPeriod(get('wicked')), /2027年5月 開幕予定（日付・終演時期未発表）/);
  assert(!lineupPeriod(get('wicked')).includes('10月'));
  assert(!lineupPeriod(get('bttf')).includes('9月'));
  assert.match(lineupPeriod(get('bttf')), /終演日未発表/);
  assert.match(lineupPeriod(get('frozen-osaka')), /2027年6月20日 開幕 ／ 終演時期未発表/);
  assert.match(lineupPeriod(get('frozen-tokyo')), /開幕日は元資料に記載なし/);
});

test('month bands only display exact dates provided by the snapshot', () => {
  assert.equal(lineupCellLabel(get('bttf'), '2027-09'), '');
  assert.equal(lineupCellLabel(get('bttf'), '2026-10'), '');
  assert.equal(lineupCellLabel(get('bell-yokohama'), '2027-04'), '4月〜');
  assert.equal(lineupCellLabel(get('bell-yokohama'), '2027-08'), '');
  assert.equal(lineupCellLabel(get('jack'), '2027-07'), '7/17〜7/25');
  assert.equal(lineupCellLabel(get('cats'), '2027-09'), '〜9/23');
});

test('favorite storage tolerates damaged or unexpected values and keeps performances distinct', () => {
  for (const raw of ['broken', 'null', '{}', '"text"']) assert.equal(parseLineupFavorites(raw).length, 0);
  const ids = parseLineupFavorites('["bell-yokohama","bell-osaka","bell-osaka",1,{}]');
  assert.equal(ids.length,2); assert(ids.includes('bell-yokohama')); assert(ids.includes('bell-osaka'));
});

test('Japan month rollover advances upcoming view, with a stable server snapshot fallback', () => {
  const { lineupCurrentMonth, lineupRange, shiftLineupMonth } = exportsForTest;
  assert.equal(lineupCurrentMonth(new Date('2026-10-31T14:59:59Z')), '2026-10');
  assert.equal(lineupCurrentMonth(new Date('2026-10-31T15:00:00Z')), '2026-11');
  const next = lineupRange(data, '2026-11', 'upcoming');
  assert.equal(next.from, '2026-11'); assert.equal(next.through, '2027-11');
  assert.equal(shiftLineupMonth('2026-01', -1), '2025-12');
  assert.equal(shiftLineupMonth('2026-12', 1), '2027-01');
});

test('past and recorded ranges preserve older bands without extending uncertain dates', () => {
  const { lineupRange } = exportsForTest;
  const past = lineupRange(data, '2027-11', 'past');
  assert.equal(past.from, '2026-11'); assert.equal(past.through, '2027-10');
  const recorded = lineupRange(data, '2028-05', 'recorded');
  assert.equal(recorded.from, '2026-10'); assert.equal(recorded.through, '2027-10');
  const custom = lineupRange(data, '2026-11', 'upcoming', '2026-10');
  assert.equal(custom.from, '2026-10'); assert.equal(custom.through, '2027-10');
  // 未発表の終演を、表示窓の延長に合わせて補完しない。
  const future = lineupRange(data, '2028-01', 'upcoming');
  assert.equal(data.performances.filter(p => p.from <= future.through && p.through >= future.from).length, 0);
  assert.equal(get('bttf').end, null);
});

const historyExports = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve('../lib/lineup-history.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, { exports: historyExports });
const historyRow = (extra = {}) => ({ perf_key: '2000-01', year: 2000, work_id: 1, work: '作品', theater: '劇場', run_name: '作品 東京',
  start_date: '1998-12-20', end_date: '2017-05-28', schedule_text: '通算の期間', notes: null,
  archive_works: { name: '作品' }, archive_venues: { name: '劇場', venue_type: '専用劇場' }, ...extra });

test('archive annual bands do not turn year boundaries into opening/closing dates', () => {
  const { archiveLineupSnapshot } = historyExports;
  const snapshot = archiveLineupSnapshot(2000, [historyRow(), historyRow({ year: 2001, perf_key: '2001-01' })]);
  assert.equal(snapshot.performances.length, 1);
  const p = snapshot.performances[0];
  assert.equal(p.from, '2000-01'); assert.equal(p.through, '2000-12');
  assert.equal(p.start, null); assert.equal(p.end, null);
  assert.equal(lineupCellLabel(p, '2000-01'), ''); assert.equal(lineupCellLabel(p, '2000-12'), '');
  assert.match(lineupPeriod(p), /1998年12月20日/);
  assert.match(lineupPeriod(p), /開幕日・千秋楽とは限りません/);
  assert.equal(p.id, 'archive:2000-01');
});

test('missing, invalid and reversed archive dates keep the source text without a full-year band', () => {
  for (const dates of [{ start_date: null }, { end_date: null }, { start_date: '2000-02-30' }, { start_date: '2018-01-01' }, { end_date: '1997-01-01' }]) {
    const p = historyExports.archiveLineupSnapshot(2000, [historyRow(dates)]).performances[0];
    assert.equal(p.dateUnknown, true); assert.match(lineupPeriod(p), /月別の期間は未確認/);
    assert.match(p.note, /通算の期間/);
  }
  const nationwide = historyExports.archiveLineupSnapshot(2000, [historyRow({ archive_venues: { name: '全国', venue_type: '全国公演' }, theater: '大阪、広島、福岡' })]).performances;
  assert.equal(nationwide.length, 1); // 全国の各都市へ期間を複製しない。
  assert.equal(nationwide[0].area, '全国公演');
  assert.equal(historyExports.archiveLineupSnapshot(2026, []).performances.length, 0);
});

function historyRoute(db) {
  const result = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve('../app/api/lineup/history/route.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, { exports: result, Response, URL, require: (id) => {
    if (id === '@/lib/supabase/server') return { createClient: async () => db };
    if (id === '@/lib/lineup') return exportsForTest;
    if (id === '@/lib/lineup-history') return historyExports;
    throw new Error(`Unexpected import: ${id}`);
  } });
  return result.GET;
}

test('history API reads all pages for a year, reports DB failure, and rejects invalid years', async () => {
  const ranges = [];
  let failing = false;
  const db = { from: (table) => {
    assert.equal(table, 'archive_runs');
    const query = { select: () => query, eq: (key, value) => { assert.equal(key, 'year'); assert.equal(value, 2000); return query; }, order: () => query,
      range: async (from, through) => { ranges.push([from, through]); return failing ? { data: null, error: { code: '42501' } } : { data: Array.from({ length: from === 0 ? 1000 : 1 }, (_, i) => historyRow({ perf_key: `2000-${from + i}` })), error: null }; } };
    return query;
  } };
  const get = historyRoute(db);
  const response = await get(new Request('https://test/api/lineup/history?year=2000'));
  assert.equal(response.status, 200); assert.equal((await response.json()).performances.length, 1001);
  assert.deepEqual(ranges, [[0, 999], [1000, 1999]]);
  failing = true;
  assert.equal((await get(new Request('https://test/api/lineup/history?year=2000'))).status, 503);
  for (const year of ['NaN', '2000.1', '1800', '9999', '']) assert.equal((await get(new Request(`https://test/api/lineup/history?year=${year}`))).status, 400);
});
