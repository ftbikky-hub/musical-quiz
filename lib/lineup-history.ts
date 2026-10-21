import type { LineupPerformance, LineupSnapshot } from "./lineup";

export interface ArchiveLineupRow {
  perf_key: string; year: number; work_id: number | null; work: string; theater: string | null;
  run_name: string; start_date: string | null; end_date: string | null;
  schedule_text: string | null; notes: string | null;
  archive_works: { name: string } | null;
  archive_venues: { name: string; venue_type: string } | null;
}
const validDate = (value: string | null): value is string => !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;

/** 元の日付を保持し、年をまたぐ通算期間は帯の表示だけを当該年に切る。 */
export function archiveLineupSnapshot(year: number, rows: ArchiveLineupRow[]): LineupSnapshot {
  const from = `${year}-01`, through = `${year}-12`;
  const colors = ["blue", "red", "teal", "gold", "brown", "green", "purple"];
  const performances: LineupPerformance[] = rows.filter((r) => r.year === year).map((r) => {
    const dated = validDate(r.start_date) && validDate(r.end_date) && r.start_date <= r.end_date
      && r.start_date <= `${year}-12-31` && r.end_date >= `${year}-01-01`;
    return {
      id: `archive:${r.perf_key}`, title: r.archive_works?.name || r.work || r.run_name,
      area: r.archive_venues?.venue_type || "会場未分類", city: r.run_name,
      venue: r.archive_venues?.name || r.theater || "会場記載なし",
      // 年境界の補間を本物の開幕日・千秋楽として表示しない。
      start: dated && r.start_date!.slice(0, 4) === String(year) ? r.start_date : null,
      end: dated && r.end_date!.slice(0, 4) === String(year) ? r.end_date : null,
      from: dated ? (r.start_date!.slice(0, 7) < from ? from : r.start_date!.slice(0, 7)) : from,
      through: dated ? (r.end_date!.slice(0, 7) > through ? through : r.end_date!.slice(0, 7)) : through,
      dateUnknown: !dated,
      note: [r.schedule_text && `日程原文：${r.schedule_text}`, r.theater && `会場・都市原文：${r.theater}`, r.notes].filter(Boolean).join("\n") || "日程の詳細は公演の歴史をご確認ください。",
      color: colors[Math.abs(r.work_id || 0) % colors.length],
      history: { year, workId: r.work_id, recordStart: r.start_date, recordEnd: r.end_date },
    };
  });
  return { checked: "", source: "/archive", displayFrom: from, displayThrough: through, featuredIds: [], performances, historyYear: year };
}
