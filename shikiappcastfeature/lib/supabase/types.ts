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
