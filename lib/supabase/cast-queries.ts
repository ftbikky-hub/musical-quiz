import { supabase } from "./client";
import type {
  CastPerformer,
  CastRole,
  CastPerformanceWithRelations,
  CastAppearanceWithRelations,
  CastPinRoleStat,
  CastTheaterBreakdown,
  CastCoAppearanceRankingRow,
} from "./types";

/**
 * 出演者を全員取得（名前順）。全323人ぶんと少ないので、
 * 検索・ピン留め・共演系タブすべてで、この1回の取得結果を使い回す。
 */
export async function fetchCastPerformers(): Promise<CastPerformer[]> {
  const { data, error } = await supabase
    .from("cast_performers")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * 役を全件取得（演目→表示順）。全25役なので毎回まとめて取得する。
 */
export async function fetchCastRoles(): Promise<CastRole[]> {
  const { data, error } = await supabase
    .from("cast_roles")
    .select("*")
    .order("work_id", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * 公演を全件取得（演目・劇場情報つき、日付順）。
 * cast_appearances（8万行）には触れず、公演の骨組みだけを持ってくるので軽い。
 */
export async function fetchCastPerformances(): Promise<
  CastPerformanceWithRelations[]
> {
  const { data, error } = await supabase
    .from("cast_performances")
    .select(
      `
      *,
      work:shiki_works(*),
      theater:shiki_theaters(*)
    `
    )
    .order("performance_date", { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as CastPerformanceWithRelations[];
}

/**
 * 出演者を1人だけ取得（名前表示用）。
 */
export async function fetchCastPerformerById(
  performerId: number
): Promise<CastPerformer | null> {
  const { data, error } = await supabase
    .from("cast_performers")
    .select("*")
    .eq("id", performerId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * 特定の出演者の、出演履歴をすべて取得（役・公演情報つき）。
 * 出演者ページと、役ピン留め結果からの詳細確認で使う。
 */
export async function fetchPerformerAppearances(
  performerId: number
): Promise<CastAppearanceWithRelations[]> {
  const { data, error } = await supabase
    .from("cast_appearances")
    .select(
      `
      *,
      role:cast_roles(*),
      performer:cast_performers(*),
      performance:cast_performances(
        *,
        work:shiki_works(*),
        theater:shiki_theaters(*)
      )
    `
    )
    .eq("performer_id", performerId);

  if (error) throw error;
  const rows = (data ?? []) as unknown as CastAppearanceWithRelations[];
  return rows.sort((a, b) =>
    a.performance.performance_date.localeCompare(b.performance.performance_date)
  );
}

/**
 * 特定の公演1回ぶんの、全キャストを取得（その日の配役表用）。
 */
export async function fetchPerformanceCast(
  performanceId: number
): Promise<CastAppearanceWithRelations[]> {
  const { data, error } = await supabase
    .from("cast_appearances")
    .select(
      `
      *,
      role:cast_roles(*),
      performer:cast_performers(*),
      performance:cast_performances(
        *,
        work:shiki_works(*),
        theater:shiki_theaters(*)
      )
    `
    )
    .eq("performance_id", performanceId);

  if (error) throw error;
  const rows = (data ?? []) as unknown as CastAppearanceWithRelations[];
  return rows.sort((a, b) => {
    const roleOrder = a.role.sort_order - b.role.sort_order;
    if (roleOrder !== 0) return roleOrder;
    return (a.track_no ?? 0) - (b.track_no ?? 0);
  });
}

/**
 * 役ピン留め：選んだ役（複数可）ごとに、演者ごとの累計登板数を取得。
 * DB側の関数（cast_pin_role_stats）で集計するので、8万行の生データを
 * ブラウザに持ってくる必要がない。
 */
export async function fetchPinRoleStats(
  roleIds: number[]
): Promise<CastPinRoleStat[]> {
  if (roleIds.length === 0) return [];
  const { data, error } = await supabase.rpc("cast_pin_role_stats", {
    p_role_ids: roleIds,
  });

  if (error) throw error;
  return (data ?? []) as CastPinRoleStat[];
}

/**
 * 特定の出演者の、劇場ごとの登板数。
 */
export async function fetchTheaterBreakdown(
  performerId: number
): Promise<CastTheaterBreakdown[]> {
  const { data, error } = await supabase.rpc("cast_theater_breakdown", {
    p_performer_id: performerId,
  });

  if (error) throw error;
  return (data ?? []) as CastTheaterBreakdown[];
}

/**
 * 特定の出演者と、よく同じ公演に出ている人たちのランキング。
 */
export async function fetchCoAppearanceRanking(
  performerId: number,
  limit = 30
): Promise<CastCoAppearanceRankingRow[]> {
  const { data, error } = await supabase.rpc("cast_co_appearance_ranking", {
    p_performer_id: performerId,
    p_limit: limit,
  });

  if (error) throw error;
  return (data ?? []) as CastCoAppearanceRankingRow[];
}

/**
 * 選んだ複数の出演者が、全員そろって同じ公演に出た回数。
 */
export async function fetchCoAppearanceCheck(
  performerIds: number[]
): Promise<number> {
  if (performerIds.length < 2) return 0;
  const { data, error } = await supabase.rpc("cast_co_appearance_check", {
    p_performer_ids: performerIds,
  });

  if (error) throw error;
  const rows = (data ?? []) as { together_count: number }[];
  return rows[0]?.together_count ?? 0;
}
