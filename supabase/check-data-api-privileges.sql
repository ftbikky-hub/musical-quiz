-- 読み取り専用の権限監査。対象DBのSQL Editorで実行できる。
-- 新旧すべてのpublicテーブルについて、ロールの実効権限とRLSを表示する。
-- Policyが行を許可するかは別途確認が必要。結果にテーブルのデータは含めない。
select c.relname as table_name, r.role_name,
       c.relrowsecurity as rls_enabled,
       has_table_privilege(r.role_name, c.oid, 'SELECT') as can_select,
       has_table_privilege(r.role_name, c.oid, 'INSERT') as can_insert,
       has_table_privilege(r.role_name, c.oid, 'UPDATE') as can_update,
       has_table_privilege(r.role_name, c.oid, 'DELETE') as can_delete
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
cross join (values ('anon'), ('authenticated'), ('service_role')) as r(role_name)
where n.nspname = 'public' and c.relkind in ('r', 'p')
order by c.relname, r.role_name;

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies where schemaname = 'public'
order by tablename, policyname;

select c.relname as sequence_name, r.role_name,
       has_sequence_privilege(r.role_name, c.oid, 'USAGE') as can_use
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
cross join (values ('anon'), ('authenticated'), ('service_role')) as r(role_name)
where n.nspname = 'public' and c.relkind = 'S'
order by c.relname, r.role_name;
