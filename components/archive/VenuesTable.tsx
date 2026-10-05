"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ArchiveVenueStat } from "@/lib/supabase/types";

type SortKey = keyof Pick<
  ArchiveVenueStat,
  "venue_name" | "venue_type" | "run_count" | "total_performances" | "first_year" | "work_count"
>;

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "venue_name", label: "会場名" },
  { key: "venue_type", label: "区分" },
  { key: "run_count", label: "公演期間数" },
  { key: "total_performances", label: "総公演回数" },
  { key: "first_year", label: "最初〜最後の年" },
  { key: "work_count", label: "上演作品数" },
];

export function VenuesTable({ venues }: { venues: ArchiveVenueStat[] }) {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("run_count");
  const [desc, setDesc] = useState(true);

  const types = useMemo(() => [...new Set(venues.map((v) => v.venue_type))].sort(), [venues]);

  const rows = useMemo(() => {
    const filtered = typeFilter === "all" ? venues : venues.filter((v) => v.venue_type === typeFilter);
    const sorted = [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return desc ? -cmp : cmp;
    });
    return sorted;
  }, [venues, typeFilter, sortKey, desc]);

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
      <select
        value={typeFilter}
        onChange={(e) => setTypeFilter(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
      >
        <option value="all">すべての区分</option>
        {types.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
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
            {rows.map((v) => (
              <tr key={v.venue_id} className="hover:bg-gray-50">
                <td className="px-3 py-2 whitespace-nowrap">
                  <Link href={`/archive/venues/${v.venue_id}`} className="text-blue-600 hover:underline">
                    {v.venue_name}
                  </Link>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">{v.venue_type}</td>
                <td className="px-3 py-2 whitespace-nowrap">{v.run_count}</td>
                <td className="px-3 py-2 whitespace-nowrap">{v.total_performances}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {v.first_year}〜{v.last_year}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">{v.work_count}</td>
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
