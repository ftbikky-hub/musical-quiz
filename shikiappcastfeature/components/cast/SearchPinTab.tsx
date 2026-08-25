"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import type {
  Work,
  Theater,
  CastRole,
  CastPerformanceWithRelations,
  CastPinRoleStat,
} from "@/lib/supabase/types";
import { fetchPinRoleStats } from "@/lib/supabase/cast-queries";
import { fmtYMD } from "@/lib/date-utils";

const SESSIONS = ["マチネ", "ソワレ"] as const;

function Chip({
  label,
  selected,
  onClick,
  color,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  color?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-bold transition ${
        selected
          ? "border-neutral-900 bg-neutral-900 text-white"
          : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300"
      }`}
    >
      {color && (
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
      )}
      {label}
    </button>
  );
}

export default function SearchPinTab({
  works,
  theaters,
  roles,
  performances,
}: {
  works: Work[];
  theaters: Theater[];
  roles: CastRole[];
  performances: CastPerformanceWithRelations[];
}) {
  const [workId, setWorkId] = useState<string>(works[0]?.id ?? "");
  const [theaterIds, setTheaterIds] = useState<string[]>([]);
  const [session, setSession] = useState<string | null>(null);
  const [pinnedRoleIds, setPinnedRoleIds] = useState<number[]>([]);
  const [performerQuery, setPerformerQuery] = useState("");

  const [stats, setStats] = useState<CastPinRoleStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  // 操作が連続で起きても、古いリクエストの結果で新しい選択を上書きしないようにする。
  const requestIdRef = useRef(0);

  // 日付から公演を探すミニ検索。
  const [dateQuery, setDateQuery] = useState("");

  const rolesForWork = useMemo(
    () => roles.filter((r) => r.work_id === workId),
    [roles, workId]
  );

  const pinnedRoles = useMemo(
    () => rolesForWork.filter((r) => pinnedRoleIds.includes(r.id)),
    [rolesForWork, pinnedRoleIds]
  );

  // 役ピン留めの集計は「役を選ぶ」というユーザー操作そのものなので、
  // useEffectで監視するのではなく、操作イベントの中でそのまま取得する。
  async function refreshStats(roleIds: number[]) {
    if (roleIds.length === 0) {
      setStats([]);
      return;
    }
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setLoadError(null);
    try {
      const rows = await fetchPinRoleStats(roleIds);
      if (requestIdRef.current === requestId) setStats(rows);
    } catch (err) {
      if (requestIdRef.current === requestId) {
        setLoadError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      if (requestIdRef.current === requestId) setLoading(false);
    }
  }

  function selectWork(id: string) {
    setWorkId(id);
    // 役は演目ごとに別物なので、演目を切り替えたらピン留めは一旦リセットする。
    setPinnedRoleIds([]);
    setStats([]);
  }

  function toggleTheater(id: string) {
    setTheaterIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  }

  function toggleRole(id: number) {
    const next = pinnedRoleIds.includes(id)
      ? pinnedRoleIds.filter((v) => v !== id)
      : [...pinnedRoleIds, id];
    setPinnedRoleIds(next);
    void refreshStats(next);
  }

  // 演者ごとに、役ごとの登板数 + 合計 を組み立てる。
  const pivotRows = useMemo(() => {
    const byPerformer = new Map<
      number,
      { performerName: string; perRole: Map<number, number>; total: number }
    >();
    for (const row of stats) {
      let entry = byPerformer.get(row.performer_id);
      if (!entry) {
        entry = {
          performerName: row.performer_name,
          perRole: new Map(),
          total: 0,
        };
        byPerformer.set(row.performer_id, entry);
      }
      entry.perRole.set(row.role_id, row.appearance_count);
      entry.total += row.appearance_count;
    }
    let rows = Array.from(byPerformer.entries()).map(([performerId, v]) => ({
      performerId,
      ...v,
    }));
    if (performerQuery.trim()) {
      rows = rows.filter((r) => r.performerName.includes(performerQuery));
    }
    return rows.sort((a, b) => b.total - a.total);
  }, [stats, performerQuery]);

  // 絞り込み条件に合う公演（日付検索用）。
  const matchingPerformances = useMemo(() => {
    return performances
      .filter((p) => p.work_id === workId)
      .filter(
        (p) => theaterIds.length === 0 || theaterIds.includes(p.theater_id)
      )
      .filter((p) => !session || p.session === session)
      .filter((p) => !dateQuery || p.performance_date.includes(dateQuery))
      .sort((a, b) => b.performance_date.localeCompare(a.performance_date))
      .slice(0, 30);
  }, [performances, workId, theaterIds, session, dateQuery]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold text-neutral-400">演目</span>
          <div className="flex flex-wrap gap-1.5">
            {works.map((w) => (
              <Chip
                key={w.id}
                label={w.title}
                color={w.color_code}
                selected={workId === w.id}
                onClick={() => selectWork(w.id)}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold text-neutral-400">
            劇場（指定なしで両方）
          </span>
          <div className="flex flex-wrap gap-1.5">
            {theaters.map((t) => (
              <Chip
                key={t.id}
                label={t.name}
                selected={theaterIds.includes(t.id)}
                onClick={() => toggleTheater(t.id)}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold text-neutral-400">
            マチネ／ソワレ（指定なしで両方）
          </span>
          <div className="flex flex-wrap gap-1.5">
            {SESSIONS.map((s) => (
              <Chip
                key={s}
                label={s}
                selected={session === s}
                onClick={() => setSession(session === s ? null : s)}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold text-neutral-400">
            役名（複数ピン留めできます）
          </span>
          <div className="flex flex-wrap gap-1.5">
            {rolesForWork.map((r) => (
              <Chip
                key={r.id}
                label={r.role_name}
                selected={pinnedRoleIds.includes(r.id)}
                onClick={() => toggleRole(r.id)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold">
            {pinnedRoles.length === 0
              ? "役名を選ぶと、役者ごとの累計登板数が出ます"
              : `ピン留め中：${pinnedRoles.map((r) => r.role_name).join(" ／ ")}`}
          </h3>
          {pinnedRoles.length > 0 && (
            <input
              type="text"
              value={performerQuery}
              onChange={(e) => setPerformerQuery(e.target.value)}
              placeholder="役者名で絞り込む…"
              className="w-48 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs outline-none focus:border-neutral-400"
            />
          )}
        </div>

        {loading && (
          <p className="text-xs text-neutral-400">集計中…</p>
        )}
        {loadError && (
          <p className="text-xs text-red-600">
            集計に失敗しました：{loadError}
          </p>
        )}

        {!loading && !loadError && pinnedRoles.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs text-neutral-400">
                  <th className="py-2 pr-2 font-bold">役者名</th>
                  {pinnedRoles.map((r) => (
                    <th key={r.id} className="py-2 pr-2 text-right font-bold">
                      {r.role_name}
                    </th>
                  ))}
                  <th className="py-2 pl-2 text-right font-bold">合計</th>
                </tr>
              </thead>
              <tbody>
                {pivotRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={pinnedRoles.length + 2}
                      className="py-4 text-center text-xs text-neutral-400"
                    >
                      該当する役者さんがいません。
                    </td>
                  </tr>
                ) : (
                  pivotRows.map((row) => (
                    <tr
                      key={row.performerId}
                      className="border-b border-neutral-100 last:border-b-0"
                    >
                      <td className="py-2 pr-2">
                        <Link
                          href={`/cast/performer/${row.performerId}`}
                          className="font-bold text-neutral-900 hover:underline"
                        >
                          {row.performerName}
                        </Link>
                      </td>
                      {pinnedRoles.map((r) => (
                        <td key={r.id} className="py-2 pr-2 text-right">
                          {row.perRole.get(r.id) ?? 0}
                        </td>
                      ))}
                      <td className="py-2 pl-2 text-right font-bold">
                        {row.total}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-4">
        <h3 className="mb-2 text-sm font-bold">日付から公演を探す</h3>
        <p className="mb-2 text-xs text-neutral-400">
          優先度は低めの機能ですが、日付の一部（例：2024-05）を入れると、選んだ演目・劇場・マチネ/ソワレ条件に合う公演が下に出ます。クリックするとその日の配役表を見られます。
        </p>
        <input
          type="text"
          value={dateQuery}
          onChange={(e) => setDateQuery(e.target.value)}
          placeholder="例：2024-05-10 や 2024-05"
          className="mb-3 w-full max-w-xs rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
        />
        <div className="flex flex-col gap-1">
          {matchingPerformances.length === 0 ? (
            <p className="text-xs text-neutral-400">
              条件に合う公演が見つかりません。
            </p>
          ) : (
            matchingPerformances.map((p) => (
              <Link
                key={p.id}
                href={`/cast/performance/${p.id}`}
                className="flex items-center justify-between rounded-lg border border-neutral-100 px-3 py-2 text-sm hover:border-neutral-300 hover:bg-neutral-50"
              >
                <span>
                  {fmtYMD(p.performance_date)}（{p.weekday}）
                  {p.session ? ` ${p.session}` : ""}
                </span>
                <span className="text-xs text-neutral-400">
                  {p.theater.name}
                </span>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
