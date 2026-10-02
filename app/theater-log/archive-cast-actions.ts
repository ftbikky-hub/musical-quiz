"use server";

import { createClient } from "@/lib/supabase/server";
import { trimField } from "@/lib/theater-log-format";

export type ArchiveCastRoleOption = { role: string };
export type ArchiveCastActorOption = {
  actor: string;
  lastYear: number;
  years: number;
};

/**
 * 選んだ作品の役一覧。アーカイブの掲載順(主役→アンサンブル)に近づけるため、
 * 作品・役ごとの最小id順で並べる(archive_castに順番の列が無いための目安)。
 */
export async function fetchArchiveCastRoles(
  workTitle: string
): Promise<ArchiveCastRoleOption[]> {
  const title = trimField(workTitle);
  if (!title) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("archive_cast")
    .select("id, role")
    .eq("work", title)
    .order("id", { ascending: true });
  if (error) return [];

  const seen = new Set<string>();
  const roles: ArchiveCastRoleOption[] = [];
  for (const row of data ?? []) {
    if (!seen.has(row.role)) {
      seen.add(row.role);
      roles.push({ role: row.role });
    }
  }
  return roles;
}

/**
 * 選んだ作品・役に出たことがある出演者。最後に出た年が新しい順、
 * 同じなら出演年数(重複しない年の数)が多い順。
 */
export async function fetchArchiveCastActors(
  workTitle: string,
  role: string
): Promise<ArchiveCastActorOption[]> {
  const title = trimField(workTitle);
  if (!title || !role) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("archive_cast")
    .select("actor, year")
    .eq("work", title)
    .eq("role", role);
  if (error) return [];

  const byActor = new Map<string, { lastYear: number; years: Set<number> }>();
  for (const row of data ?? []) {
    const entry = byActor.get(row.actor) ?? { lastYear: 0, years: new Set<number>() };
    entry.lastYear = Math.max(entry.lastYear, row.year);
    entry.years.add(row.year);
    byActor.set(row.actor, entry);
  }

  return [...byActor.entries()]
    .map(([actor, v]) => ({ actor, lastYear: v.lastYear, years: v.years.size }))
    .sort((a, b) => b.lastYear - a.lastYear || b.years - a.years);
}

/** 候補にいない場合の、全出演者からの名前部分一致検索。 */
export async function searchArchiveCastActors(query: string): Promise<string[]> {
  const q = trimField(query);
  if (!q) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("archive_cast")
    .select("actor")
    .ilike("actor", `%${q}%`)
    .limit(100);
  if (error) return [];

  return [...new Set((data ?? []).map((r) => r.actor))].sort().slice(0, 20);
}
