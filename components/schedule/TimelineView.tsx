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

function fmtRange(start: string, end: string | null): string {
  return `${start} 〜 ${end ?? "未定"}`;
}

// 「北から南」の並び順判定用。固定劇場の region はエリア名（東京・舞浜・横浜、名古屋 など）、
// 全国ツアーの region は都道府県名で入っているため、両方をこの並びに含めている。
const NORTH_TO_SOUTH_ORDER = [
  "北海道",
  "青森県",
  "岩手県",
  "宮城県",
  "秋田県",
  "山形県",
  "福島県",
  "茨城県",
  "栃木県",
  "群馬県",
  "埼玉県",
  "千葉県",
  "東京都",
  "東京・舞浜・横浜",
  "神奈川県",
  "横浜",
  "新潟県",
  "富山県",
  "石川県",
  "福井県",
  "山梨県",
  "長野県",
  "岐阜県",
  "静岡県",
  "愛知県",
  "名古屋",
  "三重県",
  "滋賀県",
  "京都府",
  "京都",
  "大阪府",
  "兵庫県",
  "奈良県",
  "和歌山県",
  "関西",
  "鳥取県",
  "島根県",
  "岡山県",
  "広島県",
  "広島",
  "山口県",
  "徳島県",
  "香川県",
  "愛媛県",
  "高知県",
  "福岡県",
  "福岡",
  "佐賀県",
  "長崎県",
  "熊本県",
  "大分県",
  "宮崎県",
  "鹿児島県",
  "沖縄県",
];

function regionRank(region: string): number {
  const idx = NORTH_TO_SOUTH_ORDER.indexOf(region);
  return idx === -1 ? 999 : idx;
}

// 公演日数が短い（1〜3日程度）バーは、幅が狭すぎて文字が潰れるため
// テキストなしのマーカー表示に切り替える。
const SHORT_STAY_MAX_DAYS = 3;

type DedicatedRow = {
  key: string;
  label: string;
  region: string;
  items: ScheduleWithRelations[];
};

type TourRow = {
  key: string;
  label: string;
  sortOrder: number;
  color: string;
  items: ScheduleWithRelations[];
};

function Bar({
  schedule,
  left,
  width,
}: {
  schedule: ScheduleWithRelations;
  left: number;
  width: number;
}) {
  const durationDays =
    daysBetween(toDate(schedule.start_date), toDate(schedule.end_date ?? schedule.start_date)) + 1;
  const isShort = durationDays <= SHORT_STAY_MAX_DAYS;
  const textColor = readableTextColor(schedule.work.color_code);

  return (
    <div
      className="group/bar absolute top-2"
      style={{ left: `${left}%`, width: `${Math.max(width, isShort ? 0.6 : 1.2)}%` }}
    >
      <div
        className="flex h-8 items-center justify-center overflow-hidden rounded-md shadow-sm"
        style={{
          backgroundColor: schedule.work.color_code,
          color: textColor,
          minWidth: isShort ? "10px" : undefined,
        }}
      >
        {!isShort && (
          <span className="truncate px-2 text-[11px] font-bold">
            {schedule.work.title}
          </span>
        )}
      </div>

      {/* ホバー時のツールチップ */}
      <div className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-neutral-900 px-3 py-2 text-[11px] leading-relaxed text-white shadow-lg group-hover/bar:block">
        <p className="font-bold">{schedule.work.title}</p>
        <p className="text-neutral-300">{schedule.theater.name}</p>
        <p className="text-neutral-300">
          {fmtRange(schedule.start_date, schedule.end_date)}
        </p>
        <div className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-neutral-900" />
      </div>
    </div>
  );
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

  // 上段：固定劇場（dedicated / semi_dedicated）→ 劇場ごとに1行、北から南の順。
  const dedicatedRows = useMemo<DedicatedRow[]>(() => {
    const byTheater = new Map<string, DedicatedRow>();
    for (const s of schedules) {
      if (s.theater.theater_type === "tour") continue;
      const key = s.theater_id;
      if (!byTheater.has(key)) {
        byTheater.set(key, {
          key,
          label: s.theater.name,
          region: s.theater.region,
          items: [],
        });
      }
      byTheater.get(key)!.items.push(s);
    }
    return Array.from(byTheater.values()).sort((a, b) => {
      const r = regionRank(a.region) - regionRank(b.region);
      return r !== 0 ? r : a.label.localeCompare(b.label, "ja");
    });
  }, [schedules]);

  // 下段：全国ツアー（tour）→ 会場ごとではなく演目ごとに1行にまとめる。
  const tourRows = useMemo<TourRow[]>(() => {
    const byWork = new Map<string, TourRow>();
    for (const s of schedules) {
      if (s.theater.theater_type !== "tour") continue;
      const key = s.work_id;
      if (!byWork.has(key)) {
        byWork.set(key, {
          key,
          label: `${s.work.title}（全国ツアー）`,
          sortOrder: s.work.sort_order,
          color: s.work.color_code,
          items: [],
        });
      }
      byWork.get(key)!.items.push(s);
    }
    return Array.from(byWork.values()).sort(
      (a, b) => a.sortOrder - b.sortOrder
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

  const monthGridWidth = `${months.length * 90 + 160}px`;

  const renderRow = (
    rowKey: string,
    label: string,
    sublabel: string | null,
    items: ScheduleWithRelations[]
  ) => (
    <div key={rowKey} className="flex border-b border-neutral-100 last:border-b-0">
      <div className="w-[160px] shrink-0 border-r border-neutral-200 px-3 py-3 text-xs">
        <p className="font-bold text-neutral-800">{label}</p>
        {sublabel && <p className="text-neutral-400">{sublabel}</p>}
      </div>
      <div className="relative flex-1" style={{ minHeight: 52 }}>
        <div className="pointer-events-none absolute inset-0 flex">
          {months.map((_, i) => (
            <div
              key={i}
              className="flex-1 border-r border-neutral-100 last:border-r-0"
            />
          ))}
        </div>
        {todayOffsetPct !== null && (
          <div
            className="pointer-events-none absolute top-0 bottom-0 w-px bg-red-400"
            style={{ left: `${todayOffsetPct}%` }}
          />
        )}
        {items.map((s) => {
          const start = toDate(s.start_date);
          const end = s.end_date ? toDate(s.end_date) : addMonths(start, 6);
          const left = Math.max(
            0,
            (daysBetween(rangeStart, start) / totalDays) * 100
          );
          const width = (daysBetween(start, end) / totalDays) * 100;
          return <Bar key={s.id} schedule={s} left={left} width={width} />;
        })}
      </div>
    </div>
  );

  const sectionHeader = (label: string) => (
    <div className="flex border-b border-neutral-200 bg-neutral-50">
      <div className="w-full px-3 py-1.5 text-[11px] font-bold tracking-wide text-neutral-500">
        {label}
      </div>
    </div>
  );

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
        <div style={{ minWidth: monthGridWidth }}>
          {/* 月ヘッダー */}
          <div className="flex border-b border-neutral-200 text-xs font-bold text-neutral-500">
            <div className="w-[160px] shrink-0 border-r border-neutral-200 px-3 py-2">
              劇場 / 演目
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

          {dedicatedRows.length > 0 && (
            <>
              {sectionHeader("固定劇場")}
              {dedicatedRows.map((row) =>
                renderRow(row.key, row.label, `（${row.region}）`, row.items)
              )}
            </>
          )}

          {tourRows.length > 0 && (
            <>
              {sectionHeader("全国ツアー")}
              {tourRows.map((row) =>
                renderRow(row.key, row.label, null, row.items)
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
