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
