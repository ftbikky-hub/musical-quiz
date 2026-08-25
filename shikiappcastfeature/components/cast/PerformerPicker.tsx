"use client";

import { useMemo, useState } from "react";
import type { CastPerformer } from "@/lib/supabase/types";

/**
 * 役者名で絞り込みながら選べる、共通の出演者選択コンポーネント。
 * multiple=false なら1人だけ、true なら複数人選べる。
 */
export default function PerformerPicker({
  performers,
  selectedIds,
  onChange,
  multiple = false,
  placeholder = "役者名で絞り込む…",
}: {
  performers: CastPerformer[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  multiple?: boolean;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return performers;
    return performers.filter((p) => p.name.includes(q));
  }, [performers, query]);

  function toggle(id: number) {
    if (multiple) {
      onChange(
        selectedIds.includes(id)
          ? selectedIds.filter((v) => v !== id)
          : [...selectedIds, id]
      );
    } else {
      onChange(selectedIds.includes(id) ? [] : [id]);
    }
  }

  const selectedPerformers = performers.filter((p) =>
    selectedIds.includes(p.id)
  );

  return (
    <div className="flex flex-col gap-2">
      {selectedPerformers.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedPerformers.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => toggle(p.id)}
              className="flex items-center gap-1 rounded-full border border-neutral-900 bg-neutral-900 px-3 py-1 text-xs font-bold text-white"
            >
              {p.name}
              <span aria-hidden>×</span>
            </button>
          ))}
        </div>
      )}

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
      />

      <div className="flex max-h-56 flex-col overflow-y-auto rounded-lg border border-neutral-200">
        {filtered.length === 0 ? (
          <p className="p-3 text-xs text-neutral-400">
            該当する役者さんが見つかりません。
          </p>
        ) : (
          filtered.map((p) => {
            const selected = selectedIds.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggle(p.id)}
                className={`flex items-center justify-between border-b border-neutral-100 px-3 py-2 text-left text-sm last:border-b-0 transition ${
                  selected
                    ? "bg-neutral-900 text-white"
                    : "hover:bg-neutral-50"
                }`}
              >
                {p.name}
                {selected && <span aria-hidden>✓</span>}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
