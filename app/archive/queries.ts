"use server";

import { createClient } from "@/lib/supabase/server";
import type {
  ArchiveWorkStat,
  ArchiveVenueStat,
  ArchiveActorStat,
  ArchiveWorkYearVenueStat,
  ArchiveWorkRoleStat,
  ArchiveWorkStaffSummary,
  ArchiveRoleActorStat,
  ArchiveActorRoleStat,
  ArchiveVenueWorkStat,
} from "@/lib/supabase/types";

function trim(q: string) {
  return q.trim();
}

// --- トップページ: 候補一覧(全件を一度だけ取得し、絞り込みはクライアント側で行う) ---
// ILIKEによる部分一致検索は、日本語の短い検索語だとインデックス
// (pg_trgm含む)がほぼ効かず毎回全件スキャンになってしまうため、
// 候補を一度だけ丸ごと取得してブラウザ側でフィルタする方式にしている。

// searchText: 検索マッチに使うテキスト(labelだけでなく芸名・旧名も含める)。
// 省略時はlabelがそのまま使われる。
export type SearchOption = { label: string; href: string; searchText?: string };

// archive_cast(約6.8万行)・archive_staff(約4.3万行)・archive_role_index
// (約4千行)はいずれもSupabaseのデフォルト上限(1リクエストあたり1000行)を
// 超えるため、.range()で全件を取得し終えるまでページングする。
const PAGE_SIZE = 1000;

export async function fetchAllArchiveActorOptions(): Promise<SearchOption[]> {
  const supabase = await createClient();
  const aliasesByActor = new Map<string, Set<string>>();
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("archive_cast")
      .select("actor, actor_alias")
      .range(from, from + PAGE_SIZE - 1);
    if (error || !data) break;
    for (const row of data) {
      if (!row.actor) continue;
      const set = aliasesByActor.get(row.actor) ?? new Set<string>();
      if (row.actor_alias) set.add(row.actor_alias);
      aliasesByActor.set(row.actor, set);
    }
    if (data.length < PAGE_SIZE) break;
  }
  return [...aliasesByActor.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([actor, aliases]) => ({
      label: actor,
      href: `/archive/actors/${encodeURIComponent(actor)}`,
      searchText: [actor, ...aliases].join(" "),
    }));
}

export async function fetchAllArchiveStaffOptions(): Promise<SearchOption[]> {
  const supabase = await createClient();
  const names = new Set<string>();
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("archive_staff")
      .select("person")
      .range(from, from + PAGE_SIZE - 1);
    if (error || !data) break;
    for (const row of data) names.add(row.person);
    if (data.length < PAGE_SIZE) break;
  }
  return [...names].sort().map((n) => ({ label: n, href: `/archive/staff/${encodeURIComponent(n)}` }));
}

export async function fetchAllArchiveRoleOptions(): Promise<SearchOption[]> {
  const supabase = await createClient();
  const options: SearchOption[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("archive_role_index")
      .select("work_id, work_name, role")
      .range(from, from + PAGE_SIZE - 1);
    if (error || !data) break;
    for (const r of data) {
      options.push({
        label: `${r.role}（${r.work_name}）`,
        href: `/archive/works/${r.work_id}/roles/${encodeURIComponent(r.role)}`,
      });
    }
    if (data.length < PAGE_SIZE) break;
  }
  return options;
}

export async function searchArchiveWorkNames(query: string): Promise<{ id: number; name: string }[]> {
  const q = trim(query);
  const supabase = await createClient();
  let req = supabase.from("archive_works").select("id, name").order("name").limit(500);
  if (q) req = req.ilike("name", `%${q}%`);
  const { data, error } = await req;
  if (error || !data) return [];
  return data;
}

// --- 作品一覧・詳細 ----------------------------------------------------------

export async function fetchArchiveWorkStats(): Promise<ArchiveWorkStat[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("archive_work_stats")
    .select("*")
    .order("run_count", { ascending: false });
  if (error || !data) return [];
  return data as ArchiveWorkStat[];
}

export async function fetchArchiveWorkStat(workId: number): Promise<ArchiveWorkStat | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("archive_work_stats")
    .select("*")
    .eq("work_id", workId)
    .maybeSingle();
  if (error || !data) return null;
  return data as ArchiveWorkStat;
}

export async function fetchArchiveWorkYearVenueStats(
  workId: number
): Promise<ArchiveWorkYearVenueStat[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("archive_work_year_venue_stats", {
    p_work_id: workId,
  });
  if (error || !data) return [];
  return data as ArchiveWorkYearVenueStat[];
}

export type ArchiveWorkRunRow = {
  perf_key: string;
  year: number;
  run_name: string;
  venue_id: number | null;
  venue_name: string | null;
  start_date: string | null;
  end_date: string | null;
  performances: number | null;
  schedule_text: string | null;
  notes: string | null;
};

export async function fetchArchiveWorkRuns(workId: number): Promise<ArchiveWorkRunRow[]> {
  const supabase = await createClient();
  // archive_runs_effective: 長期連続公演の「通算」start_date/end_dateを
  // その年のカレンダー年にクランプした実効期間を返すビュー(詳しくはSQL側参照)。
  const { data, error } = await supabase
    .from("archive_runs_effective")
    .select(
      "perf_key, year, run_name, venue_id, venue_name, start_date, end_date, performances, schedule_text, notes"
    )
    .eq("work_id", workId)
    .order("start_date", { ascending: true });
  if (error || !data) return [];
  return data as ArchiveWorkRunRow[];
}

export async function fetchArchiveWorkRoleStats(workId: number): Promise<ArchiveWorkRoleStat[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("archive_work_role_stats", { p_work_id: workId });
  if (error || !data) return [];
  return data as ArchiveWorkRoleStat[];
}

export async function fetchArchiveWorkStaffSummary(
  workId: number
): Promise<ArchiveWorkStaffSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("archive_work_staff_summary", {
    p_work_id: workId,
  });
  if (error || !data) return [];
  return data as ArchiveWorkStaffSummary[];
}

// --- 役詳細 ------------------------------------------------------------------

export async function fetchArchiveRoleActorStats(
  workId: number,
  role: string
): Promise<ArchiveRoleActorStat[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("archive_role_actor_stats", {
    p_work_id: workId,
    p_role: role,
  });
  if (error || !data) return [];
  return data as ArchiveRoleActorStat[];
}

export type ArchiveRoleCastHistoryRow = {
  perf_key: string;
  year: number;
  run_name: string;
  venue_name: string | null;
  team: string | null;
  actor: string;
  actor_alias: string | null;
};

export async function fetchArchiveRoleCastHistory(
  workId: number,
  role: string
): Promise<ArchiveRoleCastHistoryRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("archive_cast")
    .select(
      "team, actor, actor_alias, archive_runs!inner(perf_key, year, run_name, work_id, archive_venues(name))"
    )
    .eq("role", role)
    .eq("archive_runs.work_id", workId)
    .order("archive_runs(year)", { ascending: true });
  if (error || !data) return [];
  type Row = {
    team: string | null;
    actor: string;
    actor_alias: string | null;
    archive_runs: {
      perf_key: string;
      year: number;
      run_name: string;
      archive_venues: { name: string } | null;
    } | null;
  };
  return (data as unknown as Row[])
    .filter((r) => r.archive_runs)
    .map((r) => ({
      perf_key: r.archive_runs!.perf_key,
      year: r.archive_runs!.year,
      run_name: r.archive_runs!.run_name,
      venue_name: r.archive_runs!.archive_venues?.name ?? null,
      team: r.team,
      actor: r.actor,
      actor_alias: r.actor_alias,
    }));
}

// --- 出演者詳細 ---------------------------------------------------------------

export async function fetchArchiveActorStat(actor: string): Promise<ArchiveActorStat | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("archive_actor_stats")
    .select("*")
    .eq("actor", actor)
    .maybeSingle();
  if (error || !data) return null;
  return data as ArchiveActorStat;
}

export type ArchiveActorHistoryRow = {
  perf_key: string;
  year: number;
  work_id: number;
  work_name: string;
  role: string;
  venue_name: string | null;
  actor_alias: string | null;
  team: string | null;
};

export async function fetchArchiveActorHistory(actor: string): Promise<ArchiveActorHistoryRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("archive_cast")
    .select(
      "role, team, actor_alias, archive_runs!inner(perf_key, year, work_id, archive_works(name), archive_venues(name))"
    )
    .eq("actor", actor)
    .order("archive_runs(year)", { ascending: false });
  if (error || !data) return [];
  type Row = {
    role: string;
    team: string | null;
    actor_alias: string | null;
    archive_runs: {
      perf_key: string;
      year: number;
      work_id: number;
      archive_works: { name: string } | null;
      archive_venues: { name: string } | null;
    } | null;
  };
  return (data as unknown as Row[])
    .filter((r) => r.archive_runs)
    .map((r) => ({
      perf_key: r.archive_runs!.perf_key,
      year: r.archive_runs!.year,
      work_id: r.archive_runs!.work_id,
      work_name: r.archive_runs!.archive_works?.name ?? "",
      role: r.role,
      venue_name: r.archive_runs!.archive_venues?.name ?? null,
      actor_alias: r.actor_alias,
      team: r.team,
    }));
}

export async function fetchArchiveActorRoleStats(actor: string): Promise<ArchiveActorRoleStat[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("archive_actor_role_stats", { p_actor: actor });
  if (error || !data) return [];
  return data as ArchiveActorRoleStat[];
}

export type ArchiveStaffSummaryRow = {
  job: string;
  work_id: number;
  work_name: string;
  first_year: number;
  last_year: number;
  run_count: number;
};

export async function fetchArchiveStaffSummaryByPerson(
  person: string
): Promise<ArchiveStaffSummaryRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("archive_staff_summary_by_person", {
    p_person: person,
  });
  if (error || !data) return [];
  return data as ArchiveStaffSummaryRow[];
}

// --- スタッフ詳細 -------------------------------------------------------------
// (fetchArchiveStaffSummaryByPerson を /archive/staff/[name] からも利用する)

// --- 会場一覧・詳細 -----------------------------------------------------------

export async function fetchArchiveVenueStats(): Promise<ArchiveVenueStat[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("archive_venue_stats")
    .select("*")
    .order("run_count", { ascending: false });
  if (error || !data) return [];
  return data as ArchiveVenueStat[];
}

export async function fetchArchiveVenueStat(venueId: number): Promise<ArchiveVenueStat | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("archive_venue_stats")
    .select("*")
    .eq("venue_id", venueId)
    .maybeSingle();
  if (error || !data) return null;
  return data as ArchiveVenueStat;
}

export async function fetchArchiveVenueWorkStats(venueId: number): Promise<ArchiveVenueWorkStat[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("archive_venue_work_stats", {
    p_venue_id: venueId,
  });
  if (error || !data) return [];
  return data as ArchiveVenueWorkStat[];
}

export type ArchiveVenueRunRow = {
  perf_key: string;
  year: number;
  work_id: number;
  work_name: string;
  run_name: string;
  theater: string | null;
  start_date: string | null;
  end_date: string | null;
  performances: number | null;
};

export async function fetchArchiveVenueRuns(venueId: number): Promise<ArchiveVenueRunRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("archive_runs_effective")
    .select("perf_key, year, work_id, work_name, run_name, theater, start_date, end_date, performances")
    .eq("venue_id", venueId)
    .order("year", { ascending: true });
  if (error || !data) return [];
  return data as ArchiveVenueRunRow[];
}

// --- 日付から見る --------------------------------------------------------------

export type ArchiveRunOnDateRow = {
  perf_key: string;
  work_id: number;
  work_name: string;
  run_name: string;
  venue_name: string | null;
  venue_type: string | null;
  theater: string | null;
  start_date: string | null;
  end_date: string | null;
  performances: number | null;
};

export async function fetchArchiveRunsOnDate(date: string): Promise<ArchiveRunOnDateRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("archive_runs_effective")
    .select(
      "perf_key, work_id, work_name, run_name, venue_name, venue_type, theater, start_date, end_date, performances"
    )
    .lte("start_date", date)
    .gte("end_date", date)
    .order("start_date", { ascending: true });
  if (error || !data) return [];
  return data as ArchiveRunOnDateRow[];
}

export type ArchiveRunCastRow = {
  role: string;
  team: string | null;
  actor: string;
  actor_alias: string | null;
};

export async function fetchArchiveRunCasts(perfKey: string): Promise<ArchiveRunCastRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("archive_cast")
    .select("role, team, actor, actor_alias")
    .eq("perf_key", perfKey)
    .order("id", { ascending: true });
  if (error || !data) return [];
  return data as ArchiveRunCastRow[];
}
