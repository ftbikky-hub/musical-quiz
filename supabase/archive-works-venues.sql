-- ============================================================================
-- アーカイブ閲覧機能(/archive)向け: works / venues マスタと集計用VIEW/RPC
--
-- 既存の archive_runs.work / archive_runs.theater(元の表記)は残したまま、
-- 正規化済みの work_id / venue_id を追加する。
-- venue分類は単純な名前マッチによる判断(詳細は実装時のやり取りを参照)。
-- ============================================================================

create table public.archive_works (
  id bigint generated always as identity primary key,
  name text not null unique
);

create table public.archive_venues (
  id bigint generated always as identity primary key,
  name text not null unique,
  venue_type text not null  -- '専用劇場' | '一般劇場' | '全国公演'
);

alter table public.archive_runs
  add column work_id bigint references public.archive_works(id),
  add column venue_id bigint references public.archive_venues(id);

-- works backfill
insert into public.archive_works (name)
select distinct work from public.archive_runs;

update public.archive_runs r
set work_id = w.id
from public.archive_works w
where r.work = w.name;

-- venues backfill: 単独会場名はそのまま1件、都市名列記・NULL・「全国公演」はまとめて1件
insert into public.archive_venues (name, venue_type)
select distinct theater,
  case
    when theater ~ '(四季劇場|自由劇場|キャナルシティ劇場|京都劇場|新名古屋ミュージカル劇場|福岡シティ劇場|大阪ＭＢＳ劇場)'
      then '専用劇場'
    else '一般劇場'
  end
from public.archive_runs
where theater is not null and theater not like '%、%' and theater <> '全国公演';

insert into public.archive_venues (name, venue_type) values ('全国公演', '全国公演');

update public.archive_runs r
set venue_id = v.id
from public.archive_venues v
where r.theater = v.name;

update public.archive_runs r
set venue_id = (select id from public.archive_venues where name = '全国公演')
where r.venue_id is null;

-- インデックス(既存分を除く不足分のみ)
create index on public.archive_cast (role);
create index on public.archive_runs (work_id);
create index on public.archive_runs (venue_id);
create index on public.archive_runs (start_date, end_date);

-- RLS: 既存のarchive_*と同じく authenticated のみ(anonからは不可)
alter table public.archive_works enable row level security;
alter table public.archive_venues enable row level security;

grant select on public.archive_works to authenticated;
grant select on public.archive_venues to authenticated;

create policy "authenticated read works" on public.archive_works
  for select to authenticated using (true);
create policy "authenticated read venues" on public.archive_venues
  for select to authenticated using (true);

-- ============================================================================
-- 集計用VIEW(security_invoker = true: RLSを呼び出し元の権限で評価)
-- ============================================================================

create view public.archive_work_stats with (security_invoker = true) as
select
  w.id as work_id,
  w.name as work_name,
  count(r.perf_key) as run_count,
  coalesce(sum(r.performances), 0) as total_performances,
  count(distinct r.venue_id) as venue_count,
  min(r.year) as first_year,
  max(r.year) as last_year,
  count(distinct r.year) as year_count
from public.archive_works w
join public.archive_runs r on r.work_id = w.id
group by w.id, w.name;

create view public.archive_venue_stats with (security_invoker = true) as
select
  v.id as venue_id,
  v.name as venue_name,
  v.venue_type,
  count(r.perf_key) as run_count,
  coalesce(sum(r.performances), 0) as total_performances,
  min(r.year) as first_year,
  max(r.year) as last_year,
  count(distinct r.work_id) as work_count
from public.archive_venues v
join public.archive_runs r on r.venue_id = v.id
group by v.id, v.name, v.venue_type;

create view public.archive_actor_stats with (security_invoker = true) as
select
  c.actor,
  count(distinct c.perf_key) as run_count,
  count(distinct r.work_id) as work_count,
  min(r.year) as first_year,
  max(r.year) as last_year
from public.archive_cast c
join public.archive_runs r on r.perf_key = c.perf_key
group by c.actor;

grant select on public.archive_work_stats to authenticated;
grant select on public.archive_venue_stats to authenticated;
grant select on public.archive_actor_stats to authenticated;

-- ============================================================================
-- 集計用RPC(パラメータ付き。language sql stable、authenticatedのみ実行可)
-- ============================================================================

create or replace function public.archive_work_year_venue_stats(p_work_id bigint)
returns table (year int, venue_name text, performances bigint)
language sql stable security invoker
as $$
  select r.year, v.name as venue_name, coalesce(sum(r.performances), 0) as performances
  from public.archive_runs r
  join public.archive_venues v on v.id = r.venue_id
  where r.work_id = p_work_id
  group by r.year, v.name
  order by r.year, v.name;
$$;

create or replace function public.archive_work_role_stats(p_work_id bigint)
returns table (role text, actor_count bigint, run_count bigint)
language sql stable security invoker
as $$
  select c.role, count(distinct c.actor) as actor_count, count(distinct c.perf_key) as run_count
  from public.archive_cast c
  join public.archive_runs r on r.perf_key = c.perf_key
  where r.work_id = p_work_id
  group by c.role
  order by min(c.id);
$$;

create or replace function public.archive_work_staff_summary(p_work_id bigint)
returns table (job text, person text, first_year int, last_year int, run_count bigint)
language sql stable security invoker
as $$
  select s.job, s.person, min(r.year) as first_year, max(r.year) as last_year,
         count(distinct s.perf_key) as run_count
  from public.archive_staff s
  join public.archive_runs r on r.perf_key = s.perf_key
  where r.work_id = p_work_id
  group by s.job, s.person
  order by s.job, first_year;
$$;

create or replace function public.archive_role_actor_stats(p_work_id bigint, p_role text)
returns table (actor text, run_count bigint, first_year int, last_year int)
language sql stable security invoker
as $$
  select c.actor, count(distinct c.perf_key) as run_count,
         min(r.year) as first_year, max(r.year) as last_year
  from public.archive_cast c
  join public.archive_runs r on r.perf_key = c.perf_key
  where r.work_id = p_work_id and c.role = p_role
  group by c.actor
  order by run_count desc;
$$;

create or replace function public.archive_actor_role_stats(p_actor text)
returns table (work_id bigint, work_name text, role text, run_count bigint, first_year int, last_year int)
language sql stable security invoker
as $$
  select r.work_id, w.name as work_name, c.role, count(distinct c.perf_key) as run_count,
         min(r.year) as first_year, max(r.year) as last_year
  from public.archive_cast c
  join public.archive_runs r on r.perf_key = c.perf_key
  join public.archive_works w on w.id = r.work_id
  where c.actor = p_actor
  group by r.work_id, w.name, c.role
  order by last_year desc;
$$;

create or replace function public.archive_venue_work_stats(p_venue_id bigint)
returns table (work_id bigint, work_name text, run_count bigint, total_performances bigint, first_year int, last_year int)
language sql stable security invoker
as $$
  select r.work_id, w.name as work_name, count(r.perf_key) as run_count,
         coalesce(sum(r.performances), 0) as total_performances,
         min(r.year) as first_year, max(r.year) as last_year
  from public.archive_runs r
  join public.archive_works w on w.id = r.work_id
  where r.venue_id = p_venue_id
  group by r.work_id, w.name
  order by last_year desc;
$$;

revoke all on function public.archive_work_year_venue_stats(bigint) from public;
revoke all on function public.archive_work_role_stats(bigint) from public;
revoke all on function public.archive_work_staff_summary(bigint) from public;
revoke all on function public.archive_role_actor_stats(bigint, text) from public;
revoke all on function public.archive_actor_role_stats(text) from public;
revoke all on function public.archive_venue_work_stats(bigint) from public;

grant execute on function public.archive_work_year_venue_stats(bigint) to authenticated;
grant execute on function public.archive_work_role_stats(bigint) to authenticated;
grant execute on function public.archive_work_staff_summary(bigint) to authenticated;
grant execute on function public.archive_role_actor_stats(bigint, text) to authenticated;
grant execute on function public.archive_actor_role_stats(text) to authenticated;
grant execute on function public.archive_venue_work_stats(bigint) to authenticated;

-- 追加RPC(トップページの役検索・出演者詳細のスタッフ担当一覧用)

create or replace function public.archive_staff_summary_by_person(p_person text)
returns table (job text, work_id bigint, work_name text, first_year int, last_year int, run_count bigint)
language sql stable security invoker
as $$
  select s.job, r.work_id, w.name as work_name,
         min(r.year) as first_year, max(r.year) as last_year,
         count(distinct s.perf_key) as run_count
  from public.archive_staff s
  join public.archive_runs r on r.perf_key = s.perf_key
  join public.archive_works w on w.id = r.work_id
  where s.person = p_person
  group by s.job, r.work_id, w.name
  order by s.job, first_year;
$$;

create or replace function public.archive_search_roles(p_query text)
returns table (work_id bigint, work_name text, role text, actor_count bigint, run_count bigint)
language sql stable security invoker
as $$
  select r.work_id, w.name as work_name, c.role,
         count(distinct c.actor) as actor_count,
         count(distinct c.perf_key) as run_count
  from public.archive_cast c
  join public.archive_runs r on r.perf_key = c.perf_key
  join public.archive_works w on w.id = r.work_id
  where c.role ilike '%' || p_query || '%'
  group by r.work_id, w.name, c.role
  order by run_count desc
  limit 50;
$$;

revoke all on function public.archive_staff_summary_by_person(text) from public;
revoke all on function public.archive_search_roles(text) from public;
grant execute on function public.archive_staff_summary_by_person(text) to authenticated;
grant execute on function public.archive_search_roles(text) to authenticated;

-- 検索ボックスの高速化用: 役の(作品,役名)一覧をまとめて取得するビュー
-- (ILIKE部分一致は日本語の短い検索語ではpg_trgmも効かず全件スキャンになる
--  ため、候補を一度だけ全件取得してクライアント側で絞り込む方式に変更した)

create or replace view public.archive_role_index with (security_invoker = true) as
select distinct r.work_id, w.name as work_name, c.role
from public.archive_cast c
join public.archive_runs r on r.perf_key = c.perf_key
join public.archive_works w on w.id = r.work_id;

grant select on public.archive_role_index to authenticated;
