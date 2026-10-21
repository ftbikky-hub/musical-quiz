export interface LineupPerformance {
  id: string; title: string; area: string; city: string; venue: string;
  start: string | null; end: string | null;
  /** 月の表示範囲。厳密な開幕日・千秋楽日を表さない。 */
  from: string; through: string;
  monthly?: boolean; open?: boolean; note: string; color: string;
  dateUnknown?: boolean;
  history?: { year: number; workId: number | null; recordStart: string | null; recordEnd: string | null };
}
export interface LineupSnapshot {
  checked: string; source: string; displayFrom: string; displayThrough: string;
  featuredIds: string[]; performances: LineupPerformance[];
  historyYear?: number;
}
/** ブラウザやサーバーの現地時刻によらず、日本時間の月を返す。 */
export function lineupCurrentMonth(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit" }).formatToParts(now);
  return `${parts.find((p) => p.type === "year")!.value}-${parts.find((p) => p.type === "month")!.value}`;
}
export function shiftLineupMonth(month: string, offset: number): string {
  const [year, value] = month.split("-").map(Number);
  const index = year * 12 + value - 1 + offset;
  return `${Math.floor(index / 12)}-${String((index % 12 + 12) % 12 + 1).padStart(2, "0")}`;
}
export type LineupRangeMode = "upcoming" | "past" | "recorded";
export function lineupRange(snapshot: LineupSnapshot, currentMonth: string, mode: LineupRangeMode, anchor?: string) {
  if (mode === "recorded") return { from: snapshot.displayFrom, through: snapshot.displayThrough };
  const from = anchor || (mode === "past" ? shiftLineupMonth(currentMonth, -12) : currentMonth);
  return { from, through: shiftLineupMonth(from, mode === "past" ? 11 : 12) };
}
export function lineupMonths(from: string, through: string): string[] {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = through.split("-").map(Number);
  const first = fy * 12 + fm - 1, last = ty * 12 + tm - 1;
  if (!Number.isInteger(first) || !Number.isInteger(last) || last < first || last - first > 59) throw new Error("表示月の範囲が不正です");
  return Array.from({ length: last - first + 1 }, (_, index) => {
    const value = first + index;
    return `${Math.floor(value / 12)}-${String(value % 12 + 1).padStart(2, "0")}`;
  });
}
export function lineupMonthText(value: string): string {
  const [year, month] = value.split("-"); return `${year}年${Number(month)}月`;
}
export function lineupDateText(value: string): string {
  const [year, month, day] = value.split("-"); return `${year}年${Number(month)}月${Number(day)}日`;
}
export function lineupPeriod(p: LineupPerformance): string {
  if (p.history) return p.dateUnknown ? "月別の期間は未確認（日程原文を参照）"
    : `記録上の期間：${lineupDateText(p.history.recordStart!)} 〜 ${lineupDateText(p.history.recordEnd!)}（開幕日・千秋楽とは限りません）`;
  if (p.start && p.end) return `${lineupDateText(p.start)} 〜 ${lineupDateText(p.end)}`;
  if (p.start) return `${lineupDateText(p.start)} 開幕 ／ 終演時期未発表`;
  if (p.monthly) return p.open
    ? `${lineupMonthText(p.from)} 開幕予定（日付・終演時期未発表）`
    : `${lineupMonthText(p.from)}〜${lineupMonthText(p.through)}予定（日付未発表）`;
  if (p.end) return `${lineupDateText(p.end)} 千秋楽（開幕日は元資料に記載なし）`;
  return p.note.includes("上演中") ? "上演中・終演日未発表" : "開幕日の記載なし・終演日未発表";
}
export function lineupCellLabel(p: LineupPerformance, month: string): string {
  const first = month === p.from, last = month === p.through;
  const short = (value: string) => value.split("-").slice(1).map(Number).join("/");
  if (first && last && p.start && p.end) return `${short(p.start)}〜${short(p.end)}`;
  if (first && p.start) return `${short(p.start)}〜`;
  if (last && p.end) return `〜${short(p.end)}`;
  if (first && p.monthly) return `${Number(month.slice(5))}月〜`;
  return "";
}
export function parseLineupFavorites(raw: string): string[] {
  try { const value: unknown = JSON.parse(raw); return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === "string"))] : []; }
  catch { return []; }
}
