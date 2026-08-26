"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type {
  CastPerformer,
  CastCoAppearanceRankingRow,
} from "@/lib/supabase/types";
import { fetchCoAppearanceRanking } from "@/lib/supabase/cast-queries";
import PerformerPicker from "./PerformerPicker";

export default function CoAppearanceRankingTab({
  performers,
}: {
  performers: CastPerformer[];
}) {
  const [performerId, setPerformerId] = useState<number | null>(null);
  const [rows, setRows] = useState<CastCoAppearanceRankingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  // 選択が連続で変わっても、古いリクエストの結果で新しい選択を上書きしないようにする。
  const requestIdRef = useRef(0);

  // 役者の選択は「ユーザーの操作」そのものなので、useEffectで監視するのではなく、
  // 選択が変わったこのイベントハンドラの中でそのままデータを取得する。
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
      const data = await fetchCoAppearanceRanking(id);
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

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-neutral-400">
        役者さんを1人選ぶと、その人と一番よく同じ公演の舞台に立っている人たちのランキングが出ます。
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
            {selectedName} さんとの共演ランキング
          </h3>
          {rows.length === 0 ? (
            <p className="text-xs text-neutral-400">
              共演記録が見つかりませんでした。
            </p>
          ) : (
            <ol className="flex flex-col gap-1">
              {rows.map((row, i) => (
                <li
                  key={row.performer_id}
                  className="flex items-center justify-between rounded-lg border border-neutral-100 px-3 py-2 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-5 shrink-0 text-right text-xs text-neutral-400">
                      {i + 1}
                    </span>
                    <Link
                      href={`/cast/performer/${row.performer_id}`}
                      className="font-bold hover:underline"
                    >
                      {row.performer_name}
                    </Link>
                  </span>
                  <span className="text-xs text-neutral-500">
                    {row.co_count} 回共演
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
