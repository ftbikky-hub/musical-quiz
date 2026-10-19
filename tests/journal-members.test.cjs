const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

function load(file, mocks = {}) {
  const module = { exports: {} };
  const output = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(output, {
    module, exports: module.exports, URL, TextEncoder, process: { env: { NODE_ENV: 'production' } },
    require(name) {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      if (name.startsWith('node:')) return require(name);
      throw Error(`Unexpected dependency: ${name}`);
    },
  }, { filename: file });
  return module.exports;
}
const names = load('lib/member-names.ts');
const id = '3d28dda6-79cb-4617-9589-6798afd39edd';
const member = { id, display_name: 'びっきぃ', avatar_url: null };
const navigation = { redirect(location) { throw Object.assign(Error('REDIRECT'), { location }); } };
function form(values) { const result = new FormData(); for (const [key, value] of Object.entries(values)) result.set(key, value); return result; }
function authHarness(initial = [], options = {}) {
  const profiles = [...initial], emails = new Set(), selected = [], removed = [], payloads = [];
  let serial = 0;
  const admin = {
    auth: { admin: {
      async createUser(payload) {
        payloads.push(payload);
        if (emails.has(payload.email)) return { data: { user: null }, error: { code: 'email_exists', message: 'already registered' } };
        emails.add(payload.email);
        const newId = `00000000-0000-4000-8000-${String(++serial).padStart(12, '0')}`;
        if (!options.noTrigger) profiles.push({ id: newId, display_name: payload.user_metadata.name, avatar_url: null });
        return { data: { user: { id: newId } }, error: null };
      },
      async deleteUser(target) { removed.push(target); return { error: null }; },
    } },
    from(table) {
      assert.equal(table, 'profiles');
      return { async insert(row) {
        if (options.profileFailure) return { error: { code: '23503' } };
        profiles.push({ ...row, avatar_url: null }); return { error: null };
      } };
    },
  };
  const actions = load('app/auth/actions.ts', {
    'next/navigation': navigation,
    '@/lib/supabase/admin': { supabaseAdmin: admin },
    '@/lib/member-names': names,
    '@/lib/journal-members': {
      listJournalMembers: async () => [...profiles],
      findJournalMember: async (target) => profiles.find((profile) => profile.id === target) ?? null,
      selectJournalMember: async (target) => selected.push(target),
      clearJournalMember: async () => selected.push(null),
    },
  });
  return { actions, profiles, selected, removed, payloads };
}

test('names normalize width/case/combining characters and reject invalid lengths', () => {
  assert.equal(names.normalizeMemberName(' びっきぃ　'), 'びっきぃ');
  assert.equal(names.memberNameKey(' Ｂｉｋｋｙ '), names.memberNameKey('bikky'));
  assert.equal(names.memberNameKey('ひ\u3099っきぃ'), names.memberNameKey('びっきぃ'));
  for (const value of ['', '  ', 'あ'.repeat(21), '名前\n改行']) assert(names.validateMemberName(value));
  assert.equal(names.validateMemberName('びっきぃ'), null);
});

test('redirects keep local search params and reject external targets', () => {
  assert.equal(names.journalRedirectTarget('/archive/date?d=2026-10-19'), '/archive/date?d=2026-10-19');
  for (const value of ['https://example.com', '//example.com', '/\\example.com', '/\nexample', null]) assert.equal(names.journalRedirectTarget(value), '/theater-log');
});

test('an existing member enters using the same ID without password or a new Auth account', async () => {
  const h = authHarness([member]);
  await assert.rejects(h.actions.login({}, form({ memberId: id, redirectTo: '/archive/works' })), (e) => e.location === '/archive/works');
  assert.deepEqual(h.selected, [id]);
  assert.equal(h.payloads.length, 0);
  const failed = await h.actions.login({}, form({ memberId: 'missing' }));
  assert(failed.error);
  assert.deepEqual(h.selected, [id]);
});

test('duplicate existing names are rejected before creating a new account', async () => {
  for (const [existing, attempt] of [['びっきぃ', ' びっきぃ '], ['Ｂｉｋｋｙ', 'bikky']]) {
    const h = authHarness([{ ...member, display_name: existing }]);
    const result = await h.actions.signup({}, form({ username: attempt }));
    assert.match(result.error, /登録済み/);
    assert.equal(h.payloads.length, 0);
  }
});

test('simultaneous normalized duplicates create exactly one name', async () => {
  const h = authHarness();
  const results = await Promise.allSettled(['NewName', 'ＮｅｗＮａｍｅ'].map((username) => h.actions.signup({}, form({ username }))));
  assert.equal(results.filter((r) => r.status === 'rejected' && r.reason.location === '/theater-log').length, 1);
  assert.equal(results.filter((r) => r.status === 'fulfilled' && /登録済み/.test(r.value.error)).length, 1);
  assert.equal(h.profiles.length, 1);
  assert.equal(h.selected.length, 1);
  assert.equal(h.payloads[0].email, h.payloads[1].email);
  assert.notEqual(h.payloads[0].password, h.payloads[1].password);
});

test('registration fills a missing profile trigger and rolls back a failed new profile', async () => {
  const successful = authHarness([], { noTrigger: true });
  await assert.rejects(successful.actions.signup({}, form({ username: '新しい名前' })), (e) => e.location === '/theater-log');
  assert.equal(successful.profiles[0].display_name, '新しい名前');
  assert.equal(successful.selected[0], successful.profiles[0].id);
  const failed = authHarness([member], { noTrigger: true, profileFailure: true });
  const result = await failed.actions.signup({}, form({ username: '別の名前' }));
  assert(result.error);
  assert.equal(failed.removed.length, 1);
  assert.notEqual(failed.removed[0], id);
  assert.equal(failed.selected.length, 0);
  assert.equal(failed.profiles[0].id, id);
});

test('member list and lookup use the working public connection even when an admin client is configured', async () => {
  const calls = [];
  const client = { from(table) {
    assert.equal(table, 'profiles');
    return { select(columns) {
      assert.equal(columns, 'id, display_name, avatar_url');
      return {
        order(column) { assert.equal(column, 'id'); return { async range(start, end) {
          calls.push(['list', start, end]);
          return { data: [member, { ...member, id: '00000000-0000-4000-8000-000000000002', display_name: '  ' }], error: null };
        } }; },
        eq(column, value) { assert.equal(column, 'id'); return { async maybeSingle() {
          calls.push(['find', value]); return { data: value === id ? member : null, error: null };
        } }; },
      };
    } };
  } };
  const session = load('lib/journal-members.ts', {
    'next/headers': {}, 'next/navigation': navigation,
    '@/lib/supabase/client': { supabase: client },
    '@/lib/supabase/admin': { supabaseAdmin: { from() { throw Error('Invalid admin credentials'); } } },
    './member-names': names,
  });
  const members = await session.listJournalMembers();
  assert.equal(members.length, 1);
  assert.equal(members[0].id, id);
  assert.equal((await session.findJournalMember(id)).display_name, 'びっきぃ');
  assert.deepEqual(calls, [['list', 0, 999], ['find', id]]);
});

test('selection cookie is HTTP-only and a deleted/invalid profile is not accepted', async () => {
  const values = new Map(), writes = [], profiles = [member];
  const cookies = async () => ({ get: (name) => values.has(name) ? { value: values.get(name) } : undefined,
    set: (name, value, options) => { values.set(name, value); writes.push(options); }, delete: (name) => values.delete(name) });
  const client = { from: () => ({ select: () => ({ eq: (_, target) => ({ maybeSingle: async () => ({ data: profiles.find((p) => p.id === target), error: null }) }) }) }) };
  const session = load('lib/journal-members.ts', { 'next/headers': { cookies }, 'next/navigation': navigation,
    '@/lib/supabase/client': { supabase: client }, '@/lib/supabase/admin': { supabaseAdmin: null }, './member-names': names });
  assert.equal(await session.getCurrentJournalMember(), null);
  await session.selectJournalMember(id);
  assert.equal((await session.getCurrentJournalMember()).id, id);
  assert.equal(writes[0].httpOnly, true); assert.equal(writes[0].sameSite, 'lax'); assert.equal(writes[0].secure, true);
  profiles.length = 0;
  assert.equal(await session.getCurrentJournalMember(), null);
  await assert.rejects(session.requireJournalMember('/archive'), (e) => e.location === '/login?redirectTo=%2Farchive');
  await session.clearJournalMember();
  assert.equal(values.size, 0);
});

test('a new log keeps the selected existing member ID; no selection blocks writes', async () => {
  const inserts = [];
  let current = member;
  const actions = load('app/theater-log/actions.ts', {
    'next/navigation': navigation, 'next/cache': { revalidatePath() {} },
    '@/lib/supabase/client': { supabase: {} }, '@/lib/supabase/server': { createClient: async () => ({}) },
    '@/lib/supabase/admin': { supabaseAdmin: { from: (table) => ({ insert: async (row) => { inserts.push({ table, row }); return { error: null }; } }) } },
    '@/lib/journal-members': { getCurrentJournalMember: async () => current },
    '@/lib/theater-log-format': load('lib/theater-log-format.ts'),
  });
  const input = { watchedOn: '2026-10-19', workTitle: 'ノートルダムの鐘', performanceSlot: 'matinee', theater: '', seat: '', rating: null, impression: '', casts: [] };
  await assert.rejects(actions.createTheaterLog('log-id', input, []), (e) => e.location === '/theater-log/log-id');
  assert.equal(inserts[0].row.user_id, id);
  current = null;
  await assert.rejects(actions.createTheaterLog('other-id', input, []), (e) => /名前/.test(e.message));
  assert.equal(inserts.length, 1);
});

test('middleware preserves destinations and allows name switching', async () => {
  const middleware = load('lib/supabase/middleware.ts', { '@/lib/member-names': names,
    'next/server': { NextResponse: { next: () => ({ kind: 'next' }), redirect: (url) => ({ kind: 'redirect', url }) } } });
  const request = (target, cookie) => {
    const nextUrl = new URL(target, 'https://theatre.example'); nextUrl.clone = () => new URL(nextUrl.href);
    return { nextUrl, cookies: { get: () => cookie ? { value: cookie } : undefined } };
  };
  const response = await middleware.updateSession(request('/archive/date?d=2026-10-19'));
  assert.equal(response.url.searchParams.get('redirectTo'), '/archive/date?d=2026-10-19');
  assert.equal((await middleware.updateSession(request('/login', id))).kind, 'next');
  assert.equal((await middleware.updateSession(request('/theater-log', id))).kind, 'next');
  assert.equal((await middleware.updateSession(request('/theater-log', 'invalid'))).kind, 'redirect');
});
