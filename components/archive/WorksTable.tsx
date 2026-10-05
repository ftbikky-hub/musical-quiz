"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ArchiveWorkStat } from "@/lib/supabase/types";

type SortKey = keyof Pick<
  ArchiveWorkStat,
  "work_name" | "total_performances" | "first_year" | "year_count" | "venue_count" | "run_count"
>;

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "work_name", label: "作品名" },
  { key: "total_performances", label: "総公演回数" },
  { key: "first_year", label: "初演年〜最終年" },
  { key: "year_count", label: "上演年数" },
  { key: "venue_count", label: "会場数" },
  { key: "run_count", label: "公演期間数" },
];

export function WorksTable({ works }: { works: ArchiveWorkStat[] }) {
  const [filter, setFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("total_performances");
  const [desc, setDesc] = useState(true);

  const rows = useMemo(() => {
    const filtered = filter.trim()
      ? works.filter((w) => w.work_name.includes(filter.trim()))
      : works;
    const sorted = [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return desc ? -cmp : cmp;
    });
    return sorted;
  }, [works, filter, sortKey, desc]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setDesc((d) => !d);
    } else {
      setSortKey(key);
      setDesc(true);
    }
  }

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="作品名で絞り込み"
        className="w-full sm:w-80 border border-gray-300 rounded-lg px-3 py-2 text-sm"
      />
      <div className="overflow-x-auto border border-gray-200 rounded-xl">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  onClick={() => toggleSort(c.key)}
                  className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap cursor-pointer select-none"
                >
                  {c.label}
                  {sortKey === c.key && (desc ? " ▼" : " ▲")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((w) => (
              <tr key={w.work_id} className="hover:bg-gray-50">
                <td className="px-3 py-2 whitespace-nowrap">
                  <Link href={`/archive/works/${w.work_id}`} className="text-blue-600 hover:underline">
                    {w.work_name}
                  </Link>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">{w.total_performances}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {w.first_year}〜{w.last_year}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">{w.year_count}</td>
                <td className="px-3 py-2 whitespace-nowrap">{w.venue_count}</td>
                <td className="px-3 py-2 whitespace-nowrap">{w.run_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 mt-1">← 横にスクロールできます →</p>
      <p className="text-xs text-gray-400">{rows.length}件</p>
    </div>
  );
}
