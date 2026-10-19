-- 劇団四季スケジュール機能の既存DB用削除SQL。
-- 対象DBでは未実施。実行手順は supabase/README.md を参照。
-- 先に check-schedule-dependencies.sql で参照関係を確認し、
-- スケジュール機能を削除したアプリの反映後に実行する。
-- shiki_works / shiki_theaters と、そのデータは変更しない。

begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- 子テーブルから削除。各テーブルの索引・RLSポリシー・制約も削除される。
-- CASCADE は使わず、想定外の依存があれば全体をロールバックする。
drop table if exists public.shiki_ticket_releases restrict;
drop table if exists public.shiki_schedules restrict;

commit;

-- 実行後の確認：削除対象は null、共有マスタはテーブル名が返ること。
select to_regclass('public.shiki_ticket_releases') as removed_ticket_releases,
       to_regclass('public.shiki_schedules') as removed_schedules,
       to_regclass('public.shiki_works') as retained_works,
       to_regclass('public.shiki_theaters') as retained_theaters;
