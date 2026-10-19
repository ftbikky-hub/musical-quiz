-- 名前選択方式の「舞台の図書室」向け読み取り権限。
-- Supabase SQL Editorで実行。再実行可能。データの変更・削除は行わない。
-- 名前選択CookieはSupabase Authセッションではないため、anonの読み取りを許可する。
-- 対象は公演アーカイブのみ。個人の観劇記録・profiles・Authには触れない。
begin;

grant usage on schema public to anon;
grant select on public.archive_works, public.archive_venues,
  public.archive_runs, public.archive_cast, public.archive_staff to anon;

drop policy if exists "name selection read works" on public.archive_works;
create policy "name selection read works" on public.archive_works for select to anon using (true);
drop policy if exists "name selection read venues" on public.archive_venues;
create policy "name selection read venues" on public.archive_venues for select to anon using (true);
drop policy if exists "name selection read runs" on public.archive_runs;
create policy "name selection read runs" on public.archive_runs for select to anon using (true);
drop policy if exists "name selection read cast" on public.archive_cast;
create policy "name selection read cast" on public.archive_cast for select to anon using (true);
drop policy if exists "name selection read staff" on public.archive_staff;
create policy "name selection read staff" on public.archive_staff for select to anon using (true);

grant select on public.archive_work_stats, public.archive_venue_stats,
  public.archive_actor_stats, public.archive_role_index, public.archive_runs_effective to anon;

grant execute on function public.archive_actor_options() to anon;
grant execute on function public.archive_staff_options() to anon;
grant execute on function public.archive_role_options() to anon;
grant execute on function public.archive_work_year_venue_stats(bigint) to anon;
grant execute on function public.archive_work_role_stats(bigint) to anon;
grant execute on function public.archive_work_staff_summary(bigint) to anon;
grant execute on function public.archive_role_actor_stats(bigint, text) to anon;
grant execute on function public.archive_actor_role_stats(text) to anon;
grant execute on function public.archive_staff_summary_by_person(text) to anon;
grant execute on function public.archive_venue_work_stats(bigint) to anon;

commit;
