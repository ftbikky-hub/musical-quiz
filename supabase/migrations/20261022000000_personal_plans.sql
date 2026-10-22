-- 個人・知人用の名前選択を前提とする予定。公開Data APIには開放しない。
-- 既存のauth.usersを参照する追加テーブルのみ。既存表・権限は変更しない。
begin;
do $create_table$
begin
  if to_regclass('public.personal_plans') is null then
    create table public.personal_plans (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references auth.users(id) on delete cascade,
      title text not null check (length(title) between 1 and 200),
      kind text not null check (kind in ('theatre','concert','deadline','result')),
      status text not null default 'planned' check (status in ('planned','applied','confirmed','not_selected','cancelled','done')),
      date date not null,
      time time without time zone,
      end_date date,
      end_time time without time zone,
      venue text not null default '',
      memo text not null default '',
      url text not null default '',
      work_id bigint,
      deadline_date date,
      deadline_time time without time zone,
      result_date date,
      result_time time without time zone,
      source_uid text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      check (end_date is null or end_date >= date),
      check (time is not null or end_time is null),
      check (deadline_time is null or deadline_date is not null),
      check (result_time is null or result_date is not null),
      unique (user_id, source_uid)
    );
    create index personal_plans_user_date on public.personal_plans(user_id, date);
    alter table public.personal_plans enable row level security;
    revoke all on table public.personal_plans from public, anon, authenticated, service_role;
    grant select, insert, update, delete on table public.personal_plans to service_role;
    -- 名前選択Cookieはauth.uid()ではない。本人認証のPolicyを捏造しない。
    -- 公開ロール向けPolicyなし。サーバーが選択名IDで全操作を絞る。
  end if;
end;
$create_table$;
commit;
