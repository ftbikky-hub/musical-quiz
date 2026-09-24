-- ============================================================================
-- 観劇記録「実績」拡張: 記録者(user_id)・同行者・集計RPC
--
-- 適用前提: theater_logs はこの時点で0件(未登録)。既存データの移行は不要。
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. theater_logs に記録者(user_id)を追加
-- ----------------------------------------------------------------------------

alter table theater_logs
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table theater_logs
  alter column user_id set not null;

create index if not exists idx_theater_logs_user_id on theater_logs (user_id);

-- ----------------------------------------------------------------------------
-- 2. 同行者テーブル
-- ----------------------------------------------------------------------------

create table if not exists theater_log_companions (
  log_id uuid not null references theater_logs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (log_id, user_id)
);

create index if not exists idx_theater_log_companions_user_id on theater_log_companions (user_id);
create index if not exists idx_theater_log_companions_log_id on theater_log_companions (log_id);

alter table theater_log_companions enable row level security;

drop policy if exists "public read theater_log_companions" on theater_log_companions;
create policy "public read theater_log_companions" on theater_log_companions for select using (true);

grant select, insert, update, delete on theater_log_companions to service_role;
grant select on theater_log_companions to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3. 集計RPC
-- ----------------------------------------------------------------------------

-- 記録者 or 同行者として当事者になっている記録の一覧(個人タイムライン・二人比較の元データ)
create or replace function theater_log_participant_logs(p_user_id uuid)
returns setof theater_logs
language sql stable as $$
  select tl.* from theater_logs tl
  where tl.user_id = p_user_id
     or exists (
       select 1 from theater_log_companions c
       where c.log_id = tl.id and c.user_id = p_user_id
     )
  order by tl.watched_on desc;
$$;

-- ユーザー別の総観劇数ランキング(記録者 or 同行者としての参加数)
create or replace function theater_log_ranking_by_user()
returns table(user_id uuid, display_name text, log_count bigint)
language sql stable as $$
  with participation as (
    select user_id, id as log_id from theater_logs
    union
    select user_id, log_id from theater_log_companions
  )
  select p.user_id, coalesce(pr.display_name, '(不明)'), count(distinct p.log_id)::bigint
  from participation p
  left join profiles pr on pr.id = p.user_id
  group by p.user_id, pr.display_name
  order by count(distinct p.log_id) desc;
$$;

-- ユーザーが当事者になっている記録に登場する俳優の頻度(推し被り集計の元データ)
create or replace function theater_log_actor_frequency(p_user_id uuid)
returns table(actor_name text, watch_count bigint)
language sql stable as $$
  select c.actor_name, count(distinct c.log_id)::bigint
  from theater_log_casts c
  join theater_logs tl on tl.id = c.log_id
  where tl.user_id = p_user_id
     or exists (
       select 1 from theater_log_companions comp
       where comp.log_id = tl.id and comp.user_id = p_user_id
     )
  group by c.actor_name
  order by count(distinct c.log_id) desc;
$$;

-- 全ユーザーペアのうち、同じ作品に評価をつけている場合の平均評価差ランキング
create or replace function theater_log_rating_gap_ranking()
returns table(
  user_a_id uuid,
  user_a_name text,
  user_b_id uuid,
  user_b_name text,
  common_count bigint,
  avg_gap numeric
)
language sql stable as $$
  with rated as (
    select user_id, work_title, avg(rating)::numeric as rating
    from theater_logs
    where rating is not null
    group by user_id, work_title
  )
  select
    a.user_id as user_a_id,
    pa.display_name as user_a_name,
    b.user_id as user_b_id,
    pb.display_name as user_b_name,
    count(*)::bigint as common_count,
    round(avg(abs(a.rating - b.rating)), 2) as avg_gap
  from rated a
  join rated b on a.work_title = b.work_title and a.user_id < b.user_id
  join profiles pa on pa.id = a.user_id
  join profiles pb on pb.id = b.user_id
  group by a.user_id, pa.display_name, b.user_id, pb.display_name
  order by avg_gap desc;
$$;

grant execute on function theater_log_participant_logs(uuid) to anon, authenticated;
grant execute on function theater_log_ranking_by_user() to anon, authenticated;
grant execute on function theater_log_actor_frequency(uuid) to anon, authenticated;
grant execute on function theater_log_rating_gap_ranking() to anon, authenticated;
