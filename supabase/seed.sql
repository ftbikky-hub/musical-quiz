-- ============================================================================
-- 劇団四季スケジュール確認アプリ（非公式） - スキーマ + シードデータ
--
-- このファイルは単体で実行可能です。新規 Supabase プロジェクトに直接流し込む
-- ことも、既存プロジェクトに相乗りさせる場合はテーブル名の `shiki_` プレフィ
-- ックスをそのまま使うこともできます（衝突を避けるため既にこの命名にして
-- あります）。
--
-- 実行方法：
--   Supabase ダッシュボード > SQL Editor に貼り付けて実行、または
--   supabase db execute -f supabase/seed.sql （Supabase CLI）
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. テーブル定義
-- ----------------------------------------------------------------------------

create table if not exists shiki_works (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  color_code text not null,              -- 例: '#0070B8'（公式パンフレット準拠）
  official_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists shiki_theaters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  region text not null,                  -- 例: 東京・舞浜・横浜 / 関西 / 全国 など
  theater_type text not null check (theater_type in ('dedicated', 'semi_dedicated', 'tour')),
  lat numeric,                           -- マップビュー用（概略値）
  lng numeric,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists shiki_schedules (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references shiki_works(id) on delete cascade,
  theater_id uuid not null references shiki_theaters(id) on delete cascade,
  start_date date not null,
  end_date date,
  start_confirmed boolean not null default true,
  end_confirmed boolean not null default true,
  tour_city text,                        -- 全国ツアーの場合の開催都市（CSVインポート用）
  tour_pref text,                        -- 全国ツアーの場合の都道府県（CSVインポート用）
  note text,
  created_at timestamptz not null default now()
);

create table if not exists shiki_ticket_releases (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references shiki_schedules(id) on delete cascade,
  target_period text not null,           -- 例: '2027年1月〜6月分'
  presale_date date,                     -- 四季の会先行
  general_date date,                     -- 一般発売
  created_at timestamptz not null default now()
);

create index if not exists idx_shiki_schedules_work_id on shiki_schedules (work_id);
create index if not exists idx_shiki_schedules_theater_id on shiki_schedules (theater_id);
create index if not exists idx_shiki_schedules_start_date on shiki_schedules (start_date);
create index if not exists idx_shiki_ticket_releases_schedule_id on shiki_ticket_releases (schedule_id);
create index if not exists idx_shiki_ticket_releases_general_date on shiki_ticket_releases (general_date);

-- ----------------------------------------------------------------------------
-- 2. Row Level Security（読み取り専用の公開データとして扱う）
-- ----------------------------------------------------------------------------

alter table shiki_works enable row level security;
alter table shiki_theaters enable row level security;
alter table shiki_schedules enable row level security;
alter table shiki_ticket_releases enable row level security;

drop policy if exists "public read shiki_works" on shiki_works;
create policy "public read shiki_works" on shiki_works for select using (true);

drop policy if exists "public read shiki_theaters" on shiki_theaters;
create policy "public read shiki_theaters" on shiki_theaters for select using (true);

drop policy if exists "public read shiki_schedules" on shiki_schedules;
create policy "public read shiki_schedules" on shiki_schedules for select using (true);

drop policy if exists "public read shiki_ticket_releases" on shiki_ticket_releases;
create policy "public read shiki_ticket_releases" on shiki_ticket_releases for select using (true);

-- 書き込みポリシーは意図的に用意していません（このアプリはanonキーでの読み取り専用）。
-- データ投入・更新は Supabase ダッシュボード／サービスロールキー経由で行ってください。

-- ----------------------------------------------------------------------------
-- 3. シードデータ：演目マスタ（11演目、公式パンフレット準拠のテーマカラー）
-- ----------------------------------------------------------------------------

insert into shiki_works (title, color_code, sort_order) values
  ('アナと雪の女王',              '#0070B8', 10),
  ('バック・トゥ・ザ・フューチャー', '#E60012', 20),
  ('アラジン',                    '#5C2483', 30),
  ('ライオンキング',               '#F3C700', 40),
  ('リトルマーメイド',             '#0055A4', 50),
  ('ロボット・イン・ザ・ガーデン',  '#1A2C5B', 60),
  ('オペラ座の怪人',               '#1A1A38', 70),
  ('ノートルダムの鐘',             '#5C3A21', 80),
  ('マンマ・ミーア！',             '#004C97', 90),
  ('コーラスライン',               '#C6A847', 100),
  ('はじまりの樹の神話',           '#005B43', 110)
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- 4. シードデータ：劇場マスタ（固定劇場8 + 準専用4）
--    全国ツアーの個別会場（theater_type='tour'）は別途CSVから投入する想定。
-- ----------------------------------------------------------------------------

insert into shiki_theaters (name, region, theater_type, lat, lng, sort_order) values
  ('JR東日本四季劇場［春］',   '東京・舞浜・横浜', 'dedicated', 35.6762, 139.6503, 10),
  ('JR東日本四季劇場［秋］',   '東京・舞浜・横浜', 'dedicated', 35.6762, 139.6503, 20),
  ('自由劇場',                 '東京・舞浜・横浜', 'dedicated', 35.6586, 139.7454, 30),
  ('電通四季劇場［海］',       '東京・舞浜・横浜', 'dedicated', 35.6250, 139.7738, 40),
  ('有明四季劇場',             '東京・舞浜・横浜', 'dedicated', 35.6328, 139.7930, 50),
  ('舞浜アンフィシアター',     '東京・舞浜・横浜', 'dedicated', 35.6329, 139.8804, 60),
  ('MTG名古屋四季劇場',        '名古屋',           'dedicated', 35.1263, 136.9088, 70),
  ('大阪四季劇場',             '関西',             'dedicated', 34.6937, 135.5023, 80),
  ('KAAT神奈川芸術劇場',       '横浜',             'semi_dedicated', 35.4478, 139.6425, 90),
  ('京都劇場',                 '京都',             'semi_dedicated', 34.9855, 135.7588, 100),
  ('上野学園ホール（広島）',   '広島',             'semi_dedicated', 34.3853, 132.4553, 110),
  ('キャナルシティ劇場（福岡）', '福岡',           'semi_dedicated', 33.5898, 130.4108, 120)
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- 5. シードデータ：固定・準専用劇場の公演スケジュール（9件）
--    「上演中」のものは start_date に暫定で 2026-01-01 を設定しています。
--    正確な初日が分かり次第、該当行を UPDATE してください。
-- ----------------------------------------------------------------------------

insert into shiki_schedules (work_id, theater_id, start_date, end_date, start_confirmed, end_confirmed)
select w.id, t.id, s.start_date::date, s.end_date::date, s.start_confirmed, true
from (values
  ('アナと雪の女王',              'JR東日本四季劇場［春］', '2026-01-01', '2027-01-17', false),
  ('バック・トゥ・ザ・フューチャー', 'JR東日本四季劇場［秋］', '2026-01-01', '2027-03-31', false),
  ('ロボット・イン・ザ・ガーデン',  '自由劇場',               '2026-11-07', '2027-02-13', true),
  ('アラジン',                    '電通四季劇場［海］',      '2026-01-01', '2027-06-30', false),
  ('ライオンキング',               '有明四季劇場',            '2026-01-01', '2026-12-31', false),
  ('リトルマーメイド',             '舞浜アンフィシアター',    '2026-08-26', '2027-09-30', true),
  ('オペラ座の怪人',               'MTG名古屋四季劇場',       '2026-01-01', '2027-03-31', false),
  ('ノートルダムの鐘',             '大阪四季劇場',            '2026-01-01', '2027-02-07', false),
  ('マンマ・ミーア！',             '上野学園ホール（広島）',  '2026-10-04', '2026-11-23', true)
) as s(work_title, theater_name, start_date, end_date, start_confirmed)
join shiki_works w on w.title = s.work_title
join shiki_theaters t on t.name = s.theater_name
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- 6. シードデータ：チケット発売予定（デモ用に一部のみ。実データは随時更新）
-- ----------------------------------------------------------------------------

insert into shiki_ticket_releases (schedule_id, target_period, presale_date, general_date)
select sch.id, r.target_period, r.presale_date::date, r.general_date::date
from (values
  ('アラジン',                    '電通四季劇場［海］',     '2027年1月〜3月分', '2026-11-10', '2026-11-24'),
  ('リトルマーメイド',             '舞浜アンフィシアター',   '2026年10月〜12月分', '2026-08-10', '2026-08-24'),
  ('オペラ座の怪人',               'MTG名古屋四季劇場',      '2027年1月〜3月分', '2026-11-05', '2026-11-19'),
  ('ノートルダムの鐘',             '大阪四季劇場',           '2026年12月〜2月分', '2026-10-15', '2026-10-29'),
  ('ロボット・イン・ザ・ガーデン',  '自由劇場',              '2026年11月〜2027年2月分', '2026-09-01', '2026-09-15')
) as r(work_title, theater_name, target_period, presale_date, general_date)
join shiki_works w on w.title = r.work_title
join shiki_theaters t on t.name = r.theater_name
join shiki_schedules sch on sch.work_id = w.id and sch.theater_id = t.id
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- 7. 全国ツアーデータの投入について
-- ----------------------------------------------------------------------------
-- 全国ツアー（コーラスライン、はじまりの樹の神話、王様の耳はロバの耳 など）の
-- 個別公演データは、別途 CSV から本テーブルへ直接インポートしてください。
-- その際、shiki_theaters に theater_type='tour' の行を追加し、
-- shiki_schedules.tour_city / tour_pref に開催都市・都道府県を入れると、
-- マップビュー・タイムラインビューでツアー公演として区別表示されます。
