import { supabase } from "./client";
import type {
  TheaterLogWithRelations,
  TheaterLogYearStat,
  TheaterLogWorkStat,
  TheaterLogTheaterStat,
  TheaterLogActorStat,
} from "./types";

export type TheaterLogFilters = {
  from?: string;
  to?: string;
  work?: string;
  theater?: string;
  actor?: string;
};

/**
 * 検索画面向けの一覧取得。キャスト・写真をjoinし、観劇日の新しい順に返す。
 * 俳優名で絞り込む場合は、キャストを inner join にして該当行だけに絞る。
 */
export async function fetchTheaterLogs(
  filters: TheaterLogFilters
): Promise<TheaterLogWithRelations[]> {
  const castsRelation = filters.actor
    ? "casts:theater_log_casts!inner(*)"
    : "casts:theater_log_casts(*)";

  let query = supabase
    .from("theater_logs")
    .select(`*, ${castsRelation}, photos:theater_log_photos(*)`)
    .order("watched_on", { ascending: false });

  if (filters.from) query = query.gte("watched_on", filters.from);
  if (filters.to) query = query.lte("watched_on", filters.to);
  if (filters.work) query = query.ilike("work_title", `%${filters.work}%`);
  if (filters.theater) query = query.ilike("theater", `%${filters.theater}%`);
  if (filters.actor) {
    query = query.ilike("casts.actor_name", `%${filters.actor}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as unknown as TheaterLogWithRelations[];
  return rows.map((row) => ({
    ...row,
    casts: [...row.casts].sort((a, b) => a.sort_order - b.sort_order),
    photos: [...row.photos].sort((a, b) => a.sort_order - b.sort_order),
  }));
}

export async function fetchTheaterLogById(
  id: string
): Promise<TheaterLogWithRelations | null> {
  const { data, error } = await supabase
    .from("theater_logs")
    .select("*, casts:theater_log_casts(*), photos:theater_log_photos(*)")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as unknown as TheaterLogWithRelations;
  return {
    ...row,
    casts: [...row.casts].sort((a, b) => a.sort_order - b.sort_order),
    photos: [...row.photos].sort((a, b) => a.sort_order - b.sort_order),
  };
}

export async function fetchStatsTotal(): Promise<number> {
  const { count, error } = await supabase
    .from("theater_logs")
    .select("*", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

export async function fetchStatsByYear(): Promise<TheaterLogYearStat[]> {
  const { data, error } = await supabase.rpc("theater_log_stats_by_year");
  if (error) throw error;
  return (data ?? []) as TheaterLogYearStat[];
}

export async function fetchStatsByWork(): Promise<TheaterLogWorkStat[]> {
  const { data, error } = await supabase.rpc("theater_log_stats_by_work");
  if (error) throw error;
  return (data ?? []) as TheaterLogWorkStat[];
}

export async function fetchStatsByTheater(): Promise<TheaterLogTheaterStat[]> {
  const { data, error } = await supabase.rpc("theater_log_stats_by_theater");
  if (error) throw error;
  return (data ?? []) as TheaterLogTheaterStat[];
}

export async function fetchStatsByActor(): Promise<TheaterLogActorStat[]> {
  const { data, error } = await supabase.rpc("theater_log_stats_by_actor");
  if (error) throw error;
  return (data ?? []) as TheaterLogActorStat[];
}
