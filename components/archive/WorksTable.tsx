"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { matchesArchiveSearch } from "@/lib/archive-search";
import { WorkBooks } from "./WorkBooks";
import styles from "./library.module.css";
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
  const [view, setView] = useState<"shelf" | "table">("shelf");
  const [filter, setFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("total_performances");
  const [desc, setDesc] = useState(true);

  const rows = useMemo(() => {
    const filtered = filter.trim()
      ? works.filter((w) => matchesArchiveSearch(w.work_name, filter))
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
      <div className={styles.shelfToolbar}>
      <input
        aria-label="作品名で絞り込み"
        type="search"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="作品名で絞り込み"
        className="w-full sm:w-80 border border-gray-300 rounded-lg px-3 py-2 text-sm"
      />
      <select aria-label="作品の並べ方" value={`${sortKey}:${desc ? "desc" : "asc"}`} onChange={(event) => {
        const [key, direction] = event.target.value.split(":");
        setSortKey(key as SortKey); setDesc(direction === "desc");
      }}>
        {COLUMNS.flatMap((column) => [<option key={`${column.key}:desc`} value={`${column.key}:desc`}>{column.label}：降順</option>, <option key={`${column.key}:asc`} value={`${column.key}:asc`}>{column.label}：昇順</option>])}
      </select>
      <div className={styles.viewToggle} role="group" aria-label="作品の表示形式">
        <button type="button" aria-pressed={view === "shelf"} onClick={() => setView("shelf")}>本棚</button>
        <button type="button" aria-pressed={view === "table"} onClick={() => setView("table")}>一覧表</button>
      </div>
      </div>
      <p className={styles.resultCount} role="status">{rows.length}作品{filter.trim() ? ` ／「${filter.trim()}」の検索結果` : "の公演記録"}</p>
      {rows.length === 0 && <p className={styles.notice}>該当する作品が見つかりません。別の言葉で探してみてください。</p>}
      {view === "shelf" ? <WorkBooks works={rows}/> : <div className="overflow-x-auto border border-gray-200 rounded-xl">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  aria-sort={sortKey === c.key ? (desc ? "descending" : "ascending") : undefined}
                  className="px-3 py-2 text-left font-medium text-gray-600 cursor-pointer select-none"
                >
                  <button type="button" className="w-full text-left" onClick={() => toggleSort(c.key)}>{c.label}
                  {sortKey === c.key && (desc ? " ▼" : " ▲")}</button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((w) => (
              <tr key={w.work_id} className="hover:bg-gray-50">
                <td className="px-3 py-2">
                  <Link href={`/archive/works/${w.work_id}`} className="text-blue-600 hover:underline">
                    {w.work_name}
                  </Link>
                </td>
                <td className="px-3 py-2">{w.total_performances}</td>
                <td className="px-3 py-2">
                  {w.first_year}〜{w.last_year}
                </td>
                <td className="px-3 py-2">{w.year_count}</td>
                <td className="px-3 py-2">{w.venue_count}</td>
                <td className="px-3 py-2">{w.run_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>}
    </div>
  );
}
