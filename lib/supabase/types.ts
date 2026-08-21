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
