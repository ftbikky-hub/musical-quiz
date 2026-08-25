"use client";

import { useRef, useState } from "react";
import type { CastPerformer } from "@/lib/supabase/types";
import { fetchCoAppearanceCheck } from "@/lib/supabase/cast-queries";
import PerformerPicker from "./PerformerPicker";

export default function CoAppearanceCheckTab({
  performers,
}: {
  performers: CastPerformer[];
}) {
  const [performerIds, setPerformerIds] = useState<number[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  // 選択（チェックのON/OFF）というユーザー操作の中でそのまま集計まで行う。
  async function handleSelect(ids: number[]) {
    setPerformerIds(ids);
    if (ids.length < 2) {
      setCount(null);
      return;
    }
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setLoadError(null);
    try {
      const n = await fetchCoAppearanceCheck(ids);
      if (requestIdRef.current === requestId) setCount(n);
    } catch (err) {
      if (requestIdRef.current === requestId) {
        setLoadError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      if (requestIdRef.current === requestId) setLoading(false);
    }
  }

  const selectedNames = performers
    .filter((p) => performerIds.includes(p.id))
    .map((p) => p.name);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-neutral-400">
        役者さんを2人以上選ぶと、全員がそろって同じ公演に出た回数が出ます。
      </p>

      <PerformerPicker
        performers={performers}
        selectedIds={performerIds}
        onChange={handleSelect}
        multiple
        placeholder="役者名で絞り込んで、2人以上選んでください…"
      />

      {loading && <p className="text-xs text-neutral-400">集計中…</p>}
      {loadError && (
        <p className="text-xs text-red-600">集計に失敗しました：{loadError}</p>
      )}

      {!loading && !loadError && performerIds.length >= 2 && count !== null && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-center">
          <p className="mb-1 text-xs text-neutral-400">
            {selectedNames.join("・")}
          </p>
          <p className="text-3xl font-bold">{count} 回</p>
          <p className="mt-1 text-xs text-neutral-400">全員そろって同じ公演に出た回数</p>
        </div>
      )}

      {!loading && !loadError && performerIds.length === 1 && (
        <p className="text-xs text-neutral-400">
          あと1人以上選んでください。
        </p>
      )}
    </div>
  );
}
