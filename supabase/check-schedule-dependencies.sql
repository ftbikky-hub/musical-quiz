-- 既存DBで実行する読み取り専用の事前確認。DBの変更は行わない。
-- 外部キー・ビュー以外に、関数本体や定期ジョブからの参照も確認する。

-- 削除対象と、必ず残す共有マスタの存在。
select name, to_regclass(name) as existing_relation
from (values
  ('public.shiki_ticket_releases'),
  ('public.shiki_schedules'),
  ('public.shiki_works'),
  ('public.shiki_theaters')
) as targets(name);

-- 削除対象に依存する外部キー。ticket_releases → schedules 以外は要調査。
select conrelid::regclass as referencing_table,
       conname as constraint_name,
       confrelid::regclass as referenced_table,
       pg_get_constraintdef(oid) as definition
from pg_constraint
where contype = 'f'
  and confrelid in (
    to_regclass('public.shiki_schedules'),
    to_regclass('public.shiki_ticket_releases')
  );

-- ビュー・マテリアライズドビューを含む、PostgreSQLが追跡する依存。
select distinct pg_describe_object(d.classid, d.objid, d.objsubid) as dependent_object,
       d.refobjid::regclass as referenced_table,
       d.deptype as dependency_type
from pg_depend d
where d.refclassid = 'pg_class'::regclass
  and d.refobjid in (
    to_regclass('public.shiki_schedules'),
    to_regclass('public.shiki_ticket_releases')
  )
order by referenced_table, dependent_object;

-- 文字列で記述された関数本体の参照は DROP RESTRICT が検出しない場合がある。
-- 該当関数があれば、用途と呼び出し元を確認してから削除SQLを実行する。
select n.nspname as schema_name,
       p.proname as routine_name,
       pg_get_function_identity_arguments(p.oid) as arguments
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where p.prokind in ('f', 'p')
  and n.nspname not in ('pg_catalog', 'information_schema')
  and p.prosrc ~* '\mshiki_(schedules|ticket_releases)\M'
order by schema_name, routine_name, arguments;

-- pg_cron を使用している場合のみ、次のクエリを別途実行する。
-- select jobid, jobname, schedule, command, active
-- from cron.job
-- where command ~* '\mshiki_(schedules|ticket_releases)\M';
