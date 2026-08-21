"use client";

import { useMemo } from "react";
import type { Work, ScheduleWithRelations } from "@/lib/supabase/types";
import { readableTextColor, todayISO } from "@/lib/date-utils";

function toDate(iso: string): Date {
  return new Date(`${iso}T00:00:00+09:00`);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, d.getDate());
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function daysBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24);
}

export default function TimelineView({
  schedules,
  works,
}: {
  schedules: ScheduleWithRelations[];
  works: Work[];
}) {
  const today = useMemo(() => toDate(todayISO()), []);

  const { rangeStart, rangeEnd, months } = useMemo(() => {
    const starts = schedules.map((s) => toDate(s.start_date));
    const ends = schedules.map((s) =>
      s.end_date ? toDate(s.end_date) : addMonths(toDate(s.start_date), 6)
    );
    const minStart = starts.length
      ? new Date(Math.min(...starts.map((d) => d.getTime())))
      : today;
    const maxEnd = ends.length
      ? new Date(Math.max(...ends.map((d) => d.getTime())))
      : addMonths(today, 6);

    const rangeStart = startOfMonth(
      minStart < today ? minStart : startOfMonth(today)
    );
    const rangeEnd = startOfMonth(addMonths(maxEnd, 1));

    const months: Date[] = [];
    let cursor = rangeStart;
    while (cursor < rangeEnd) {
      months.push(cursor);
      cursor = addMonths(cursor, 1);
    }
    return { rangeStart, rangeEnd, months };
  }, [schedules, today]);

  const totalDays = Math.max(1, daysBetween(rangeStart, rangeEnd));

  // 劇場ごとに行をまとめる（会場軸で見た方が「今どこで何をやっているか」が分かりやすいため）
  const rows = useMemo(() => {
    const byTheater = new Map<
      string,
      { theaterName: string; region: string; items: ScheduleWithRelations[] }
    >();
    for (const s of schedules) {
      const key = s.theater_id;
      if (!byTheater.has(key)) {
        byTheater.set(key, {
          theaterName: s.theater.name,
          region: s.theater.region,
          items: [],
        });
      }
      byTheater.get(key)!.items.push(s);
    }
    return Array.from(byTheater.values()).sort((a, b) =>
      a.region.localeCompare(b.region, "ja")
    );
  }, [schedules]);

  if (schedules.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-400">
        条件に一致する公演が見つかりませんでした。
      </p>
    );
  }

  const todayOffsetPct =
    today >= rangeStart && today <= rangeEnd
      ? (daysBetween(rangeStart, today) / totalDays) * 100
      : null;

  return (
    <div className="flex flex-col gap-3">
      {/* 演目カラー凡例 */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2">
        {works.map((w) => (
          <span
            key={w.id}
            className="flex items-center gap-1.5 text-[11px] text-neutral-600"
          >
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: w.color_code }}
            />
            {w.title}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <div style={{ minWidth: `${months.length * 90 + 140}px` }}>
          {/* 月ヘッダー */}
          <div className="flex border-b border-neutral-200 text-xs font-bold text-neutral-500">
            <div className="w-[140px] shrink-0 border-r border-neutral-200 px-3 py-2">
              劇場
            </div>
            <div className="relative flex flex-1">
              {months.map((m, i) => (
                <div
                  key={i}
                  className="flex-1 border-r border-neutral-100 px-2 py-2 text-center last:border-r-0"
                >
                  {m.getFullYear()}/{m.getMonth() + 1}
                </div>
              ))}
            </div>
          </div>

          {/* 行 */}
          {rows.map((row, ri) => (
            <div
              key={ri}
              className="flex border-b border-neutral-100 last:border-b-0"
            >
              <div className="w-[140px] shrink-0 border-r border-neutral-200 px-3 py-3 text-xs">
                <p className="font-bold text-neutral-800">
                  {row.theaterName}
                </p>
                <p className="text-neutral-400">{row.region}</p>
              </div>
              <div className="relative flex-1" style={{ minHeight: 52 }}>
                {/* 月の区切り線 */}
                <div className="pointer-events-none absolute inset-0 flex">
                  {months.map((_, i) => (
                    <div
                      key={i}
                      className="flex-1 border-r border-neutral-100 last:border-r-0"
                    />
                  ))}
                </div>
                {/* 今日ライン */}
                {todayOffsetPct !== null && (
                  <div
                    className="pointer-events-none absolute top-0 bottom-0 w-px bg-red-400"
                    style={{ left: `${todayOffsetPct}%` }}
                  />
                )}
                {row.items.map((s) => {
                  const start = toDate(s.start_date);
                  const end = s.end_date
                    ? toDate(s.end_date)
                    : addMonths(start, 6);
                  const left = Math.max(
                    0,
                    (daysBetween(rangeStart, start) / totalDays) * 100
                  );
                  const width = Math.max(
                    1.2,
                    (daysBetween(start, end) / totalDays) * 100
                  );
                  const textColor = readableTextColor(s.work.color_code);
                  return (
                    <div
                      key={s.id}
                      title={`${s.work.title}：${s.start_date} 〜 ${
                        s.end_date ?? "未定"
                      }`}
                      className="absolute top-2 flex h-8 items-center overflow-hidden rounded-md px-2 text-[11px] font-bold shadow-sm"
                      style={{
                        left: `${left}%`,
                        width: `${width}%`,
                        backgroundColor: s.work.color_code,
                        color: textColor,
                      }}
                    >
                      <span className="truncate">{s.work.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
