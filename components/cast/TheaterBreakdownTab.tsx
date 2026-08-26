"use client";

import { useRef, useState } from "react";
import type { CastPerformer, CastTheaterBreakdown } from "@/lib/supabase/types";
import { fetchTheaterBreakdown } from "@/lib/supabase/cast-queries";
import PerformerPicker from "./PerformerPicker";

export default function TheaterBreakdownTab({
  performers,
}: {
  performers: CastPerformer[];
}) {
  const [performerId, setPerformerId] = useState<number | null>(null);
  const [rows, setRows] = useState<CastTheaterBreakdown[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  // 役者の選択イベントの中でそのままデータ取得まで行う（useEffectは使わない）。
  async function handleSelect(ids: number[]) {
    const id = ids[0] ?? null;
    setPerformerId(id);
    if (id === null) {
      setRows([]);
      return;
    }
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchTheaterBreakdown(id);
      if (requestIdRef.current === requestId) setRows(data);
    } catch (err) {
      if (requestIdRef.current === requestId) {
        setLoadError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      if (requestIdRef.current === requestId) setLoading(false);
    }
  }

  const selectedName = performers.find((p) => p.id === performerId)?.name;
  const total = rows.reduce((sum, r) => sum + r.appearance_count, 0);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-neutral-400">
        役者さんを1人選ぶと、劇場ごとの登板回数の内訳が出ます。
      </p>

      <PerformerPicker
        performers={performers}
        selectedIds={performerId === null ? [] : [performerId]}
        onChange={handleSelect}
      />

      {loading && <p className="text-xs text-neutral-400">集計中…</p>}
      {loadError && (
        <p className="text-xs text-red-600">集計に失敗しました：{loadError}</p>
      )}

      {!loading && !loadError && performerId !== null && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-bold">
            {selectedName} さんの劇場ごとの登板数（合計 {total} 回）
          </h3>
          {rows.length === 0 ? (
            <p className="text-xs text-neutral-400">
              出演記録が見つかりませんでした。
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {rows.map((row) => {
                const pct = total > 0 ? (row.appearance_count / total) * 100 : 0;
                return (
                  <div key={row.theater_id} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{row.theater_name}</span>
                      <span className="text-neutral-500">
                        {row.appearance_count} 回
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                      <div
                        className="h-full rounded-full bg-neutral-900"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
