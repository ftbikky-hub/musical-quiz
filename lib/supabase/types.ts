// Supabase のテーブル定義に対応する型。
// テーブルは既存の Supabase プロジェクトに `shiki_` プレフィックス付きで
// 同居させているため、テーブル名にも shiki_ が付く点に注意。

export type TheaterType = "dedicated" | "semi_dedicated" | "tour";

export interface Work {
  id: string;
  title: string;
  color_code: string;
  official_url: string | null;
  sort_order: number;
  created_at: string;
}

export interface Theater {
  id: string;
  name: string;
  region: string;
  theater_type: TheaterType;
  lat: number | null;
  lng: number | null;
  sort_order: number;
  created_at: string;
}

export interface Schedule {
  id: string;
  work_id: string;
  theater_id: string;
  start_date: string; // ISO date (YYYY-MM-DD)
  end_date: string | null;
  start_confirmed: boolean;
  end_confirmed: boolean;
  tour_city: string | null;
  tour_pref: string | null;
  note: string | null;
  created_at: string;
}

export interface TicketRelease {
  id: string;
  schedule_id: string;
  target_period: string;
  presale_date: string | null;
  general_date: string | null;
  created_at: string;
}

// フロント側で使う、joinして組み立てた表示用の型。
export interface ScheduleWithRelations extends Schedule {
  work: Work;
  theater: Theater;
}

export interface TicketReleaseWithRelations extends TicketRelease {
  schedule: ScheduleWithRelations;
}

// ---------------------------------------------------------------------------
// 過去キャスト一覧（cast_* テーブル）
// 数字IDのテーブル。work_id / theater_id は既存の shiki_works / shiki_theaters
// （uuid）をそのまま参照している。
// ---------------------------------------------------------------------------

export type CastRoleGroup = "lead" | "ensemble";
export type CastSession = "マチネ" | "ソワレ" | null;

export interface CastPerformer {
  id: number;
  name: string;
  created_at: string;
}

export interface CastRole {
  id: number;
  work_id: string;
  role_name: string;
  role_group: CastRoleGroup;
  sort_order: number;
  created_at: string;
}

export interface CastPerformance {
  id: number;
  work_id: string;
  theater_id: string;
  performance_date: string; // ISO date (YYYY-MM-DD)
  session: CastSession;
  weekday: string;
  created_at: string;
}

export interface CastAppearance {
  id: number;
  performance_id: number;
  role_id: number;
  performer_id: number;
  // アンサンブル・クワイヤ役で、同じ役に複数人が入る時の番号（1〜8）。
  // 「その公演でのアンサンブル内の並び順」であり、固定チームの意味ではない。
  track_no: number | null;
}

export interface CastPerformanceWithRelations extends CastPerformance {
  work: Work;
  theater: Theater;
}

// 出演者ページ・その日の配役表で使う、役・公演情報つきの出演記録。
export interface CastAppearanceWithRelations extends CastAppearance {
  role: CastRole;
  performer: CastPerformer;
  performance: CastPerformanceWithRelations;
}

// 役ピン留め機能：選んだ役ごと・演者ごとの累計登板数（DB関数 cast_pin_role_stats の戻り値）。
export interface CastPinRoleStat {
  performer_id: number;
  performer_name: string;
  role_id: number;
  role_name: string;
  appearance_count: number;
}

// 劇場ごとの登板数（DB関数 cast_theater_breakdown の戻り値）。
export interface CastTheaterBreakdown {
  theater_id: string;
  theater_name: string;
  appearance_count: number;
}

// 共演ランキングの1行（DB関数 cast_co_appearance_ranking の戻り値）。
export interface CastCoAppearanceRankingRow {
  performer_id: number;
  performer_name: string;
  co_count: number;
}

// ---------------------------------------------------------------------------
// 観劇記録(theater_log_* テーブル)
// ---------------------------------------------------------------------------

export type PerformanceSlot = "matinee" | "soiree" | "other";

export interface TheaterLog {
  id: string;
  user_id: string;
  watched_on: string; // ISO date (YYYY-MM-DD)
  performance_slot: PerformanceSlot | null;
  work_title: string;
  theater: string | null;
  seat: string | null;
  rating: number | null;
  impression: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

export interface TheaterLogCompanion {
  log_id: string;
  user_id: string;
}

export interface TheaterLogCast {
  id: string;
  log_id: string;
  role_name: string | null;
  actor_name: string;
  sort_order: number;
}

export interface TheaterLogPhoto {
  id: string;
  log_id: string;
  storage_path: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
}

export interface TheaterLogWithRelations extends TheaterLog {
  casts: TheaterLogCast[];
  photos: TheaterLogPhoto[];
  companions: TheaterLogCompanion[];
}

// 日付+作品からの自動キャスト取得(候補となる公演回1つぶん)。
export interface AutoCastCandidate {
  performanceId: number;
  session: string | null;
  casts: { role_name: string; actor_name: string }[];
}

export interface TheaterLogYearStat {
  year: number;
  log_count: number;
}

export interface TheaterLogWorkStat {
  work_title: string;
  log_count: number;
}

export interface TheaterLogTheaterStat {
  theater: string;
  log_count: number;
}

export interface TheaterLogActorStat {
  actor_name: string;
  log_count: number;
}

// --- 実績(複数ユーザー)関連 ---------------------------------------------

export interface TheaterLogUserRanking {
  user_id: string;
  display_name: string;
  log_count: number;
}

export interface TheaterLogActorFrequency {
  actor_name: string;
  watch_count: number;
}

export interface TheaterLogRatingGap {
  user_a_id: string;
  user_a_name: string;
  user_b_id: string;
  user_b_name: string;
  common_count: number;
  avg_gap: number;
}

export interface AutoMatchCandidate {
  watched_on: string;
  work_title: string;
  logIdA: string;
  logIdB: string;
}

export interface TwoUserComparison {
  together: TheaterLog[];
  onlyA: TheaterLog[];
  onlyB: TheaterLog[];
  autoMatches: AutoMatchCandidate[];
  summaryA: { total: number; topTheater: string | null };
  summaryB: { total: number; topTheater: string | null };
  commonActors: { actor_name: string; countA: number; countB: number }[];
}

// --- 公演アーカイブ(/archive)関連 -----------------------------------------

export interface ArchiveRun {
  perf_key: string;
  year: number;
  seq: number;
  run_name: string;
  work: string;
  work_id: number | null;
  theater: string | null;
  venue_id: number | null;
  start_date: string | null;
  end_date: string | null;
  performances: number | null;
  schedule_text: string | null;
  notes: string | null;
}

export interface ArchiveCast {
  id: number;
  perf_key: string;
  team: string | null;
  role: string;
  actor: string;
  actor_alias: string | null;
}

export interface ArchiveStaff {
  id: number;
  perf_key: string;
  section: string;
  group_label: string | null;
  job: string;
  person: string;
  note: string | null;
}

export interface ArchiveWorkStat {
  work_id: number;
  work_name: string;
  run_count: number;
  total_performances: number;
  venue_count: number;
  first_year: number;
  last_year: number;
  year_count: number;
}

export interface ArchiveVenueStat {
  venue_id: number;
  venue_name: string;
  venue_type: string;
  run_count: number;
  total_performances: number;
  first_year: number;
  last_year: number;
  work_count: number;
}

export interface ArchiveActorStat {
  actor: string;
  run_count: number;
  work_count: number;
  first_year: number;
  last_year: number;
}

export interface ArchiveWorkYearVenueStat {
  year: number;
  venue_name: string;
  performances: number;
}

export interface ArchiveWorkRoleStat {
  role: string;
  actor_count: number;
  run_count: number;
}

export interface ArchiveWorkStaffSummary {
  job: string;
  person: string;
  first_year: number;
  last_year: number;
  run_count: number;
}

export interface ArchiveRoleActorStat {
  actor: string;
  run_count: number;
  first_year: number;
  last_year: number;
}

export interface ArchiveActorRoleStat {
  work_id: number;
  work_name: string;
  role: string;
  run_count: number;
  first_year: number;
  last_year: number;
}

export interface ArchiveVenueWorkStat {
  work_id: number;
  work_name: string;
  run_count: number;
  total_performances: number;
  first_year: number;
  last_year: number;
}

export interface ArchiveRunWithRelations extends ArchiveRun {
  venue_name: string | null;
}
