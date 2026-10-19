/* eslint-disable @typescript-eslint/no-require-imports, @next/next/no-assign-module-variable */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
function load(file, mocks = {}) {
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, { module, exports: module.exports, require(name) {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    throw Error(`Unexpected dependency: ${name}`);
  } });
  return module.exports;
}
const { matchesArchiveSearch: matches } = load('lib/archive-search.ts');
test('search matches fullwidth/halfwidth, kana, mixed case, and spaces inside names', () => {
  for (const [text, query] of [
    ['飯田 達郎', '飯田達郎'], ['飯田達郎', '飯田　達郎'],
    ['ノートルダムの鐘', 'ﾉｰﾄﾙﾀﾞﾑ'], ['ノートルダムの鐘', 'のーとるだむ'],
    ['CATS キャッツ', 'ｃａｔｓ'], ['ノートルダムの鐘', 'ノートルダム 鐘'],
    ['びっきぃ', 'ひ\u3099っきぃ'],
  ]) assert(matches(text, query), `${text} / ${query}`);
  assert.equal(matches('ノートルダムの鐘', 'ノートルダム 王女'), false);
  assert.equal(matches('キャッツ', '.*'), false);
  assert(matches('作品', '  '));
});
function queries(result) {
  let chain;
  chain = new Proxy({}, { get(_, name) {
    if (name === 'then') return (resolve) => Promise.resolve(resolve(result));
    return () => chain;
  } });
  return load('app/archive/queries.ts', { '@/lib/supabase/server': { createClient: async () => ({
    from: () => chain, rpc: async () => result,
  }) } });
}
test('permission failures are not returned as empty lists or missing records', async () => {
  const api = queries({ data: null, error: { code: '42501' } });
  for (const [name, args] of Object.entries({
    fetchAllArchiveActorOptions: [], fetchAllArchiveStaffOptions: [], fetchAllArchiveRoleOptions: [],
    fetchAllArchiveWorkOptions: [], fetchAllArchiveVenueOptions: [], searchArchiveWorkNames: ['鐘'],
    fetchArchiveWorkStats: [], fetchArchiveWorkStat: [1], fetchArchiveWorkYearVenueStats: [1],
    fetchArchiveWorkRuns: [1], fetchArchiveWorkRoleStats: [1], fetchArchiveWorkStaffSummary: [1],
    fetchArchiveRoleActorStats: [1, 'カジモド'], fetchArchiveRoleCastHistory: [1, 'カジモド'],
    fetchArchiveActorStat: ['飯田達郎'], fetchArchiveActorHistory: ['飯田達郎'],
    fetchArchiveActorRoleStats: ['飯田達郎'], fetchArchiveStaffSummaryByPerson: ['浅利慶太'],
    fetchArchiveVenueStats: [], fetchArchiveVenueStat: [1], fetchArchiveVenueWorkStats: [1],
    fetchArchiveVenueRuns: [1], fetchArchiveRunsOnDate: ['2020-01-01'], fetchArchiveRunCasts: ['run'],
  })) await assert.rejects(api[name](...args), /42501/, name);
});
test('old stage names lead to the canonical actor and URLs encode special characters', async () => {
  const api = queries({ data: [{ actor: '今の名前', aliases: ['昔 の 名前', 'Ａ＆Ｂ'] }], error: null });
  const [option] = await api.fetchAllArchiveActorOptions();
  assert(matches(option.searchText, '昔の名前'));
  assert(matches(option.searchText, 'a&b'));
  assert.equal(option.href, '/archive/actors/' + encodeURIComponent('今の名前'));
});
test('real empty results remain empty and role links preserve both work and role', async () => {
  assert.equal((await queries({ data: [], error: null }).fetchAllArchiveActorOptions()).length, 0);
  const [option] = await queries({ data: [{ work_id: 42, work_name: '作品Ａ', role: '役 / 1' }], error: null }).fetchAllArchiveRoleOptions();
  assert.equal(option.href, '/archive/works/42/roles/' + encodeURIComponent('役 / 1'));
  assert(matches(option.label, '作品a'));
});
