-- ============================================================================
-- 劇団四季ツール集（非公式） - 共有マスタのスキーマ + シードデータ
--
-- このファイルは単体で実行可能です。新規 Supabase プロジェクトに直接流し込む
-- ことも、既存プロジェクトに相乗りさせる場合はテーブル名の `shiki_` プレフィ
-- ックスをそのまま使うこともできます（衝突を避けるため既にこの命名にして
-- あります）。
--
-- 実行方法：
--   Supabase ダッシュボード > SQL Editor に貼り付けて実行、または
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/seed.sql
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. テーブル定義
-- ----------------------------------------------------------------------------

-- 新規作成時だけACLを確定する。既存テーブルの権限は変更しない。
do $create_table$
begin
  if to_regclass('public.shiki_works') is null then
    create table public.shiki_works (
      id uuid primary key default gen_random_uuid(),
      title text not null,
      color_code text not null,              -- 例: '#0070B8'（公式パンフレット準拠）
      official_url text,
      sort_order int not null default 0,
      created_at timestamptz not null default now()
    );
    alter table public.shiki_works enable row level security;
    revoke all on table public.shiki_works from public, anon, authenticated, service_role;
    grant select on table public.shiki_works to anon, authenticated;
    grant select on table public.shiki_works to service_role;
  end if;
end;
$create_table$;

-- 新規作成時だけACLを確定する。既存テーブルの権限は変更しない。
do $create_table$
begin
  if to_regclass('public.shiki_theaters') is null then
    create table public.shiki_theaters (
      id uuid primary key default gen_random_uuid(),
      name text not null,
      region text not null,                  -- 例: 東京・舞浜・横浜 / 関西 / 全国 など
      theater_type text not null check (theater_type in ('dedicated', 'semi_dedicated', 'tour')),
      lat numeric,                           -- 劇場の緯度（概略値）
      lng numeric,
      sort_order int not null default 0,
      created_at timestamptz not null default now()
    );
    alter table public.shiki_theaters enable row level security;
    revoke all on table public.shiki_theaters from public, anon, authenticated, service_role;
    grant select on table public.shiki_theaters to anon, authenticated;
    grant select on table public.shiki_theaters to service_role;
  end if;
end;
$create_table$;

-- ----------------------------------------------------------------------------
-- 2. Row Level Security（読み取り専用の公開データとして扱う）
-- ----------------------------------------------------------------------------

alter table shiki_works enable row level security;
alter table shiki_theaters enable row level security;

drop policy if exists "public read shiki_works" on shiki_works;
create policy "public read shiki_works" on shiki_works for select using (true);

drop policy if exists "public read shiki_theaters" on shiki_theaters;
create policy "public read shiki_theaters" on shiki_theaters for select using (true);

-- 書き込みポリシーは意図的に用意していません（このアプリはanonキーでの読み取り専用）。
-- データ投入・更新はSupabase SQL Editorで行います。アプリのservice_roleもこの2表はSELECTのみです。

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
