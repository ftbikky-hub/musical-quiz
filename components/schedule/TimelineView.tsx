"use client";

import { useEffect, useMemo, useState } from "react";
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

// end_date（千秋楽）が未定（NULL）の公演は、開幕日から1年間続くものとして
// 便宜上の終了日を補って扱う。データから除外せず、必ずバーを描画するための仕組み。
const NULL_END_FALLBACK_MONTHS = 12;

// タイムラインの表示期間（X軸）は、データ上の一番遅い日付からさらにこの月数分
// 先までスクロールできるように余白を持たせる。
const TRAILING_BUFFER_MONTHS = 3;

// end_date が NULL の場合は「開幕日から1年後」を仮の終了日として返す。
function resolveEndDate(schedule: ScheduleWithRelations): Date {
  return schedule.end_date
    ? toDate(schedule.end_date)
    : addMonths(toDate(schedule.start_date), NULL_END_FALLBACK_MONTHS);
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
  isActive,
  onToggle,
  onClose,
}: {
  schedule: ScheduleWithRelations;
  left: number;
  width: number;
  isActive: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const durationDays =
    daysBetween(toDate(schedule.start_date), resolveEndDate(schedule)) + 1;
  const isShort = durationDays <= SHORT_STAY_MAX_DAYS;
  const textColor = readableTextColor(schedule.work.color_code);

  return (
    <div
      data-timeline-bar
      className="group/bar absolute top-2"
      style={{
        left: `${left}%`,
        width: `${Math.max(width, isShort ? 0.6 : 1.2)}%`,
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex h-8 w-full items-center justify-center overflow-hidden rounded-md shadow-sm"
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
      </button>

      {/* ツールチップ：PCはホバー、スマホはタップで表示 */}
      <div
        className={`absolute bottom-full left-1/2 z-40 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-lg bg-neutral-900 px-3 py-2 text-[11px] leading-relaxed text-white shadow-lg ${
          isActive ? "block" : "hidden group-hover/bar:block"
        }`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="閉じる"
          className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-neutral-700 text-[9px] leading-none text-white"
        >
          ✕
        </button>
        <p className="pr-2 font-bold">{schedule.work.title}</p>
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
  const [activeBarId, setActiveBarId] = useState<string | null>(null);

  // タップでツールチップを開いている間、バー以外（テーブルの余白や画面の他の場所）を
  // タップしたら閉じる。バー自身のクリックは data-timeline-bar でマークして除外する。
  useEffect(() => {
    if (!activeBarId) return;
    function handleDocClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target?.closest("[data-timeline-bar]")) {
        setActiveBarId(null);
      }
    }
    document.addEventListener("click", handleDocClick);
    return () => document.removeEventListener("click", handleDocClick);
  }, [activeBarId]);

  const { rangeStart, rangeEnd, months } = useMemo(() => {
    const starts = schedules.map((s) => toDate(s.start_date));
    // end_date が NULL の公演も resolveEndDate() で仮の終了日（開幕+1年）を
    // 補って、必ず範囲計算の対象に含める（除外しない）。
    const ends = schedules.map((s) => resolveEndDate(s));

    const minStart = starts.length
      ? starts.reduce((min, d) => (d < min ? d : min))
      : today;
    const maxEnd = ends.length
      ? ends.reduce((max, d) => (d > max ? d : max))
      : addMonths(today, NULL_END_FALLBACK_MONTHS);

    const rangeStart = startOfMonth(minStart < today ? minStart : today);
    // 一番遅い日付から、さらに数ヶ月分の余白（TRAILING_BUFFER_MONTHS）を足して、
    // 直近のデータぎりぎりで途切れないようにする。
    const rangeEnd = startOfMonth(
      addMonths(maxEnd, TRAILING_BUFFER_MONTHS + 1)
    );

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
      <div className="sticky left-0 z-10 w-[160px] shrink-0 border-r border-neutral-200 bg-white px-3 py-3 text-xs shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
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
          const end = resolveEndDate(s);
          const left = Math.max(
            0,
            (daysBetween(rangeStart, start) / totalDays) * 100
          );
          const width = (daysBetween(start, end) / totalDays) * 100;
          return (
            <Bar
              key={s.id}
              schedule={s}
              left={left}
              width={width}
              isActive={activeBarId === s.id}
              onToggle={() =>
                setActiveBarId((prev) => (prev === s.id ? null : s.id))
              }
              onClose={() => setActiveBarId(null)}
            />
          );
        })}
      </div>
    </div>
  );

  const sectionHeader = (label: string) => (
    <div className="flex border-b border-neutral-200 bg-neutral-50">
      <div className="sticky left-0 w-full px-3 py-1.5 text-[11px] font-bold tracking-wide text-neutral-500">
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

      <div
        className="relative overflow-auto rounded-xl border border-neutral-200 bg-white"
        style={{ maxHeight: "70vh" }}
      >
        <div style={{ minWidth: monthGridWidth }}>
          {/* 月ヘッダー（縦スクロールしても上部に固定） */}
          <div className="sticky top-0 z-20 flex border-b border-neutral-200 bg-white text-xs font-bold text-neutral-500 shadow-[0_2px_4px_-2px_rgba(0,0,0,0.06)]">
            <div className="sticky left-0 z-30 w-[160px] shrink-0 border-r border-neutral-200 bg-white px-3 py-2">
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
