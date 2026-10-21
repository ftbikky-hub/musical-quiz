-- ============================================================================
-- 観劇記録機能: theater_logs / theater_log_casts / theater_log_photos
--
-- 既存プロジェクト(NotreDameProject)に相乗りさせるスクリプト。
-- Supabaseダッシュボード > SQL Editor に貼り付けて実行、または
-- supabase db execute -f supabase/theater-log.sql で実行できます。
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. テーブル定義
-- ----------------------------------------------------------------------------

-- 新規作成時だけACLを確定する。既存テーブルの権限は変更しない。
do $create_table$
begin
  if to_regclass('public.theater_logs') is null then
    create table public.theater_logs (
      id uuid primary key default gen_random_uuid(),
      watched_on date not null,
      performance_slot text check (performance_slot in ('matinee', 'soiree', 'other')),
      work_title text not null,
      theater text,
      seat text,
      rating smallint check (rating between 1 and 5),
      impression text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
    alter table public.theater_logs enable row level security;
    revoke all on table public.theater_logs from public, anon, authenticated, service_role;
    grant select on table public.theater_logs to anon, authenticated;
    grant select, insert, update, delete on table public.theater_logs to service_role;
  end if;
end;
$create_table$;

-- 新規作成時だけACLを確定する。既存テーブルの権限は変更しない。
do $create_table$
begin
  if to_regclass('public.theater_log_casts') is null then
    create table public.theater_log_casts (
      id uuid primary key default gen_random_uuid(),
      log_id uuid not null references theater_logs(id) on delete cascade,
      role_name text,
      actor_name text not null,
      sort_order int not null default 0
    );
    alter table public.theater_log_casts enable row level security;
    revoke all on table public.theater_log_casts from public, anon, authenticated, service_role;
    grant select on table public.theater_log_casts to anon, authenticated;
    grant select, insert, delete on table public.theater_log_casts to service_role;
  end if;
end;
$create_table$;

-- 新規作成時だけACLを確定する。既存テーブルの権限は変更しない。
do $create_table$
begin
  if to_regclass('public.theater_log_photos') is null then
    create table public.theater_log_photos (
      id uuid primary key default gen_random_uuid(),
      log_id uuid not null references theater_logs(id) on delete cascade,
      storage_path text not null,
      caption text,
      sort_order int not null default 0,
      created_at timestamptz not null default now()
    );
    alter table public.theater_log_photos enable row level security;
    revoke all on table public.theater_log_photos from public, anon, authenticated, service_role;
    grant select on table public.theater_log_photos to anon, authenticated;
    grant select, insert, update, delete on table public.theater_log_photos to service_role;
  end if;
end;
$create_table$;

create index if not exists idx_theater_logs_watched_on on theater_logs (watched_on);
create index if not exists idx_theater_logs_work_title on theater_logs (work_title);
create index if not exists idx_theater_log_casts_actor_name on theater_log_casts (actor_name);
create index if not exists idx_theater_log_casts_log_id on theater_log_casts (log_id);
create index if not exists idx_theater_log_photos_log_id on theater_log_photos (log_id);

-- ----------------------------------------------------------------------------
-- 2. RLS(読み取りはpublic、書き込みはservice_roleのみ)
-- ----------------------------------------------------------------------------

alter table theater_logs enable row level security;
alter table theater_log_casts enable row level security;
alter table theater_log_photos enable row level security;

drop policy if exists "public read theater_logs" on theater_logs;
create policy "public read theater_logs" on theater_logs for select using (true);

drop policy if exists "public read theater_log_casts" on theater_log_casts;
create policy "public read theater_log_casts" on theater_log_casts for select using (true);

drop policy if exists "public read theater_log_photos" on theater_log_photos;
create policy "public read theater_log_photos" on theater_log_photos for select using (true);


-- ----------------------------------------------------------------------------
-- 3. 既存 cast_performers の調整
--    - service_role に select/insert が付与されていなかったため追加
--      (手入力した俳優名をここに自動登録するために必要)
--    - id が手動採番(IDENTITYなし)だったため、既存323件を維持したまま
--      続きの値からIDENTITY自動採番に切り替える
-- ----------------------------------------------------------------------------

grant select, insert on cast_performers to service_role;

-- 既にIDENTITYがある場合は再追加しない。空テーブルからの再構築にも対応。
do $performer_identity$
begin
  if exists (select 1 from pg_attribute
    where attrelid = 'public.cast_performers'::regclass and attname = 'id' and attidentity = '') then
    alter table public.cast_performers alter column id add generated by default as identity;
  end if;
end;
$performer_identity$;

select setval(
  pg_get_serial_sequence('public.cast_performers', 'id'),
  greatest(coalesce(max(id), 1), 1),
  max(id) is not null
) from public.cast_performers;

-- BYPASSRLSでもテーブルACLと採番用シーケンスのUSAGEは必要。
do $performer_sequence$
begin
  execute format('grant usage on sequence %s to service_role',
    pg_get_serial_sequence('public.cast_performers', 'id'));
end;
$performer_sequence$;

-- ----------------------------------------------------------------------------
-- 4. 実績画面向け集計RPC
--    全件をブラウザに送らず、DB側でgroup byして集計する。
-- ----------------------------------------------------------------------------

create or replace function theater_log_stats_by_year()
returns table(year int, log_count bigint)
language sql stable as $$
  select extract(year from watched_on)::int as year, count(*)::bigint
  from theater_logs
  group by 1
  order by 1 desc;
$$;

create or replace function theater_log_stats_by_work()
returns table(work_title text, log_count bigint)
language sql stable as $$
  select work_title, count(*)::bigint
  from theater_logs
  group by work_title
  order by count(*) desc;
$$;

create or replace function theater_log_stats_by_theater()
returns table(theater text, log_count bigint)
language sql stable as $$
  select theater, count(*)::bigint
  from theater_logs
  where theater is not null
  group by theater
  order by count(*) desc;
$$;

create or replace function theater_log_stats_by_actor()
returns table(actor_name text, log_count bigint)
language sql stable as $$
  select actor_name, count(distinct log_id)::bigint
  from theater_log_casts
  group by actor_name
  order by count(distinct log_id) desc;
$$;

grant execute on function theater_log_stats_by_year() to anon, authenticated;
grant execute on function theater_log_stats_by_work() to anon, authenticated;
grant execute on function theater_log_stats_by_theater() to anon, authenticated;
grant execute on function theater_log_stats_by_actor() to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 5. 写真用Storageバケット(公開バケット)
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('theater-photos', 'theater-photos', true)
on conflict (id) do nothing;
