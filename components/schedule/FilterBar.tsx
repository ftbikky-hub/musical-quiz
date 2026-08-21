"use client";

import type { Work } from "@/lib/supabase/types";
import { REGION_GROUPS, type RegionGroupKey } from "@/lib/region-groups";

// この3演目は全国ツアー作品なので、チップのラベルに（全国）を付けて区別する。
const TOUR_WORK_TITLES = new Set([
  "コーラスライン",
  "はじまりの樹の神話",
  "王様の耳はロバの耳",
]);

function Chip({
  label,
  color,
  selected,
  onClick,
}: {
  label: string;
  color?: string;
  selected: boolean;
  onClick: () => void;
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

export default function FilterBar({
  works,
  selectedRegionGroups,
  onChangeRegionGroups,
  selectedWorkIds,
  onChangeWorkIds,
  includePast,
  onChangeIncludePast,
}: {
  works: Work[];
  selectedRegionGroups: RegionGroupKey[];
  onChangeRegionGroups: (v: RegionGroupKey[]) => void;
  selectedWorkIds: string[];
  onChangeWorkIds: (v: string[]) => void;
  includePast: boolean;
  onChangeIncludePast: (v: boolean) => void;
}) {
  const hasFilter =
    selectedRegionGroups.length > 0 || selectedWorkIds.length > 0;

  function toggleRegionGroup(key: RegionGroupKey) {
    onChangeRegionGroups(
      selectedRegionGroups.includes(key)
        ? selectedRegionGroups.filter((k) => k !== key)
        : [...selectedRegionGroups, key]
    );
  }

  function toggleWork(id: string) {
    onChangeWorkIds(
      selectedWorkIds.includes(id)
        ? selectedWorkIds.filter((w) => w !== id)
        : [...selectedWorkIds, id]
    );
  }

  return (
    <div className="relative z-10 flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            onChangeRegionGroups([]);
            onChangeWorkIds([]);
          }}
          disabled={!hasFilter}
          className={`flex w-fit shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
            hasFilter
              ? "border-neutral-900 bg-white text-neutral-900 hover:bg-neutral-900 hover:text-white"
              : "cursor-default border-neutral-200 bg-neutral-100 text-neutral-300"
          }`}
        >
          ↺ リセット（すべて表示）
        </button>

        {/* 過去の公演（終了済み）を表示するかどうかのトグル。デフォルトはオフ
            （現在上演中・これからの公演のみ表示）。 */}
        <label className="flex w-fit shrink-0 cursor-pointer items-center gap-2 text-xs font-bold text-neutral-500">
          <span className="relative inline-flex h-5 w-9 shrink-0 items-center">
            <input
              type="checkbox"
              checked={includePast}
              onChange={(e) => onChangeIncludePast(e.target.checked)}
              className="peer sr-only"
            />
            <span className="absolute inset-0 rounded-full bg-neutral-200 transition peer-checked:bg-neutral-900" />
            <span className="absolute left-0.5 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-4" />
          </span>
          過去の公演も含める
        </label>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-bold text-neutral-400">地域</span>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {REGION_GROUPS.map((g) => (
            <Chip
              key={g.key}
              label={g.label}
              selected={selectedRegionGroups.includes(g.key)}
              onClick={() => toggleRegionGroup(g.key)}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-bold text-neutral-400">演目</span>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {works.map((w) => (
            <Chip
              key={w.id}
              label={
                TOUR_WORK_TITLES.has(w.title) ? `${w.title}（全国）` : w.title
              }
              color={w.color_code}
              selected={selectedWorkIds.includes(w.id)}
              onClick={() => toggleWork(w.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
